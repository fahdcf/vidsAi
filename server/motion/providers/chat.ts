import { z } from "zod";
import type { MotionProvider } from "./inventory";

const models: Record<string, { images: boolean; thinking: boolean }> = {
    "nvidia/nemotron-3.5-super-vl-120b-a12b": { images: true, thinking: true },
    "nvidia/nemotron-3-ultra-550b-a55b": { images: false, thinking: true },
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": { images: true, thinking: true },
    "nvidia/nemotron-3.5-lightning-30b-a3b": { images: false, thinking: true },
    "mistralai/mistral-large-4-1t-a52b": { images: true, thinking: false },
    "deepseek-ai/deepseek-v4.1-flash": { images: false, thinking: false },
    "google/gemma-4-31b-it": { images: true, thinking: false },
};

export const motionRoleMode = {
    director: "deep",
    referenceAnalyst: "deep",
    copywriter: "off",
    visualDesigner: "deep",
    motionEngineer: "deep",
    visualCritic: "deep",
} as const;

type MotionChatRequest<T> = {
    instruction: string;
    prompt: string;
    images?: readonly { mime: "image/jpeg" | "image/png"; bytes: Uint8Array }[];
    mode: "deep" | "off";
    schema: z.ZodType<T>;
    stream?: boolean;
    maxTokens: number;
    timeoutMs: number;
    firstTokenTimeoutMs?: number;
    signal: AbortSignal;
    onFirstToken?: () => void;
};

export class MotionProviderError extends Error {
    constructor(readonly code: "unsupported" | "http" | "invalid_output" | "transport", message: string, readonly status?: number) {
        super(message);
    }
}

const messageSchema = z.object({
    content: z.string().nullish(),
    reasoning: z.string().nullish(),
    reasoning_content: z.string().nullish(),
});
const responseSchema = z.object({
    choices: z.array(z.object({
        message: messageSchema.optional(),
        delta: messageSchema.optional(),
        finish_reason: z.string().nullish(),
    })).optional(),
    usage: z.object({
        prompt_tokens: z.number().nonnegative().optional(),
        completion_tokens: z.number().nonnegative().optional(),
        total_tokens: z.number().nonnegative().optional(),
        completion_tokens_details: z.object({ reasoning_tokens: z.number().nonnegative().optional() }).nullish(),
    }).nullish(),
});
type Packet = z.infer<typeof responseSchema>;

function packetFrom(text: string): Packet {
    try {
        return responseSchema.parse(JSON.parse(text));
    } catch {
        throw new MotionProviderError("invalid_output", "Provider returned an invalid response envelope.");
    }
}

async function* streamPackets(body: ReadableStream<Uint8Array>, signal: AbortSignal) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    try {
        for (;;) {
            signal.throwIfAborted();
            const chunk = await reader.read();
            pending += decoder.decode(chunk.value, { stream: !chunk.done });
            if (pending.length > 512_000) throw new MotionProviderError("invalid_output", "Provider event exceeded the size limit.");
            const lines = pending.split(/\r?\n/);
            pending = chunk.done ? "" : lines.pop() ?? "";
            for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (data === "[DONE]") return;
                if (data) yield packetFrom(data);
            }
            if (chunk.done) return;
        }
    } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
}

export async function requestMotionJson<T>(provider: MotionProvider, request: MotionChatRequest<T>) {
    const options = models[provider.model];
    if (!options || provider.family !== "chat" || !provider.endpoint || !provider.credential ||
        (request.images?.length && !options.images) || (request.mode === "deep" && !options.thinking)) {
        throw new MotionProviderError("unsupported", "This route does not support the requested motion capability.");
    }
    const endpoint = new URL(provider.endpoint);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
        throw new MotionProviderError("unsupported", "The motion endpoint must be a configured HTTPS chat endpoint.");
    }
    const images = request.images ?? [];
    if (images.length > 8 || images.reduce((total, image) => total + image.bytes.byteLength, 0) > 4 * 1024 * 1024) {
        throw new MotionProviderError("unsupported", "Reference images exceeded the provider request limit.");
    }
    const prompt = images.length ? [
        { type: "text", text: request.prompt },
        ...images.map(({ mime, bytes }) => ({
            type: "image_url",
            image_url: { url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}` },
        })),
    ] : request.prompt;
    const started = performance.now();
    const firstToken = new AbortController();
    const timeout = AbortSignal.timeout(request.timeoutMs);
    const signal = AbortSignal.any([request.signal, timeout, firstToken.signal]);
    const firstTokenTimer = request.firstTokenTimeoutMs
        ? setTimeout(() => firstToken.abort(new DOMException("Provider first token timed out.", "TimeoutError")), request.firstTokenTimeoutMs)
        : undefined;
    const stream = request.stream === true;
    let firstTokenMs: number | undefined;
    let reasoningObserved = false;
    let content = "";
    let finishReason: string | undefined;
    let usage: Packet["usage"];
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            redirect: "error",
            signal,
            headers: { Authorization: `Bearer ${provider.credential}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: provider.model,
                messages: [{ role: "system", content: request.instruction }, { role: "user", content: prompt }],
                max_tokens: request.maxTokens,
                stream,
                ...(options.thinking ? { chat_template_kwargs: { enable_thinking: request.mode === "deep" } } : {}),
            }),
        });
        if (!response.ok) {
            await response.body?.cancel();
            throw new MotionProviderError("http", `Motion provider returned HTTP ${response.status}.`, response.status);
        }
        const packets = stream && response.body
            ? streamPackets(response.body, signal)
            : [packetFrom(await response.text())];
        for await (const packet of packets) {
            usage = packet.usage ?? usage;
            const choice = packet.choices?.[0];
            const message = choice?.delta ?? choice?.message;
            const reasoning = Boolean(message?.reasoning_content || message?.reasoning);
            if (firstTokenMs === undefined && (reasoning || message?.content)) {
                firstTokenMs = Math.round(performance.now() - started);
                clearTimeout(firstTokenTimer);
                request.onFirstToken?.();
            }
            reasoningObserved ||= reasoning;
            content += message?.content ?? "";
            if (content.length > 512_000) throw new MotionProviderError("invalid_output", "Provider output exceeded the size limit.");
            finishReason = choice?.finish_reason ?? finishReason;
        }
        signal.throwIfAborted();
    } catch (error) {
        signal.throwIfAborted();
        if (error instanceof MotionProviderError) throw error;
        throw new MotionProviderError("transport", "The motion provider connection failed.");
    } finally {
        clearTimeout(firstTokenTimer);
    }
    if (finishReason && finishReason !== "stop") {
        throw new MotionProviderError("invalid_output", "The provider did not finish its final answer.");
    }
    const thinkEnd = content.lastIndexOf("</think>");
    if (thinkEnd >= 0) {
        reasoningObserved ||= content.slice(0, thinkEnd).replace("<think>", "").trim().length > 0;
        content = content.slice(thinkEnd + "</think>".length);
    }
    reasoningObserved ||= (usage?.completion_tokens_details?.reasoning_tokens ?? 0) > 0;
    try {
        const value = request.schema.parse(JSON.parse(content.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g, "")));
        return { value, requestedMode: request.mode, reasoningObserved, firstTokenMs, latencyMs: Math.round(performance.now() - started), usage };
    } catch {
        throw new MotionProviderError("invalid_output", "The model did not return a valid final JSON artifact.");
    }
}
