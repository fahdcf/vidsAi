import type { z } from "zod";
import type { Document } from "../../shared/contracts";
import { MotionBudgetError, type ModelReservation, type MotionModelBudget } from "./budget";
import { buildMotionPrompt, type MotionPromptRole } from "./prompts";
import { MotionProviderError, motionRoleMode, requestMotionJson } from "./providers/chat";
import type { MotionRoute } from "./providers/inventory";
import { qualifiedMotionProviders } from "./providers/qualified";

export type MotionAgentContext = {
    brief: string;
    document: Document;
    budget: MotionModelBudget;
    signal: AbortSignal;
    onProgress?: MotionAgentProgress;
};
export type MotionVisionImage = { mime: "image/jpeg" | "image/png"; bytes: Uint8Array };
export type MotionAgentProgress = (data: {
    role: MotionPromptRole | "referenceObserver";
    model: string;
    mode: "deep" | "off";
    state: "requesting" | "responding" | "accepted" | "rejected";
    promptVersion?: number;
    promptHash?: string;
    maxTokens?: number;
    elapsedMs?: number;
    tokens?: number;
    reasoningObserved?: boolean;
    outcome?: string;
}) => void;

export async function runMotionAgent<T>(
    context: MotionAgentContext,
    role: MotionPromptRole,
    route: MotionRoute,
    input: unknown,
    schema: z.ZodType<T>,
    options: { images?: readonly MotionVisionImage[]; validate?: (value: T) => void } = {},
) {
    const { document, brief, budget, signal, onProgress } = context;
    const mode = role === "repair" ? "deep" : motionRoleMode[role];
    const images = options.images ?? [];
    const maxTokens = mode === "off" ? 2048 : 8192;
    const providers = await qualifiedMotionProviders(route, [
        images.length ? "image" : "text", "stream", ...(mode === "deep" ? ["thinking" as const] : []),
    ]);
    if (!providers.length) throw new Error(`No qualified model is available for ${role}.`);
    const prompt = buildMotionPrompt(role, {
        brief, revision: document.revision, width: document.width, height: document.height,
        fps: document.fps, frames: document.total_frames, input, maxOutputTokens: maxTokens,
    }, schema);
    const promptTokens = Math.max(1, Math.ceil((prompt.prompt.length + prompt.instruction.length) / 3) + 2048 * images.length);
    let providerBudget: MotionBudgetError | undefined;
    for (const provider of providers) {
        signal.throwIfAborted();
        let attempt: ModelReservation;
        try { attempt = budget.reserveModel(promptTokens, maxTokens, provider.alias); } catch (error) {
            if (!(error instanceof MotionBudgetError) || error.scope !== "provider") throw error;
            providerBudget = error;
            continue;
        }
        let actual: number | undefined;
        const diagnostic = { role, model: provider.alias, mode, promptVersion: prompt.version.promptVersion,
            promptHash: prompt.version.promptHash, maxTokens };
        const started = performance.now();
        try {
            onProgress?.({ ...diagnostic, state: "requesting" });
            const result = await requestMotionJson(provider, {
                ...prompt, images, mode, schema, maxTokens, stream: true, signal,
                timeoutMs: attempt.timeoutMs, firstTokenTimeoutMs: attempt.firstTokenTimeoutMs,
                onFirstToken: (elapsedMs) => onProgress?.({ ...diagnostic, state: "responding", elapsedMs }),
            });
            actual = result.usage?.total_tokens;
            if (mode === "deep" && !result.reasoningObserved) {
                onProgress?.({ ...diagnostic, state: "rejected", outcome: "missing_reasoning", elapsedMs: result.latencyMs, tokens: actual });
                continue;
            }
            options.validate?.(result.value);
            onProgress?.({ ...diagnostic, state: "accepted", elapsedMs: result.latencyMs, tokens: actual, reasoningObserved: result.reasoningObserved });
            return {
                value: result.value, promptVersion: prompt.version, model: provider.alias,
                mode, reasoningObserved: result.reasoningObserved, latencyMs: result.latencyMs, usage: result.usage,
            };
        } catch (error) {
            signal.throwIfAborted();
            onProgress?.({ ...diagnostic, state: "rejected", elapsedMs: Math.round(performance.now() - started), tokens: actual,
                outcome: error instanceof MotionProviderError ? error.status === 429 ? "rate_limited" : error.code : "artifact_validation" });
            if (error instanceof MotionProviderError && error.retryAfterMs !== undefined) {
                attempt.backoff?.(error.retryAfterMs);
                providerBudget = new MotionBudgetError("This motion provider is waiting for its rate limit to reset.", "provider");
            }
        } finally {
            attempt.release(actual);
        }
    }
    throw providerBudget ?? new Error(`The ${role} stage could not produce a valid artifact within the configured routes.`);
}
