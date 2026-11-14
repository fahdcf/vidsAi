import { z } from "zod";
import { agentToolSchemas, agentToolStageLimit, MotionToolYield, parseAgentToolRequest, type AgentToolSession } from "./agent-tools";
import type { SpeechSpan } from "./speech";
import type { Document } from "../../shared/contracts";
import { MotionBudgetError, type ModelReservation, type MotionModelBudget } from "./budget";
import { buildMotionPrompt, type MotionPromptRole } from "./prompts";
import { MotionProviderError, motionReasoningEffort, motionRoleMode, requestMotionJson } from "./providers/chat";
import type { MotionRoute } from "./providers/inventory";
import { qualifiedMotionProviders } from "./providers/qualified";

export type MotionAgentContext = {
    brief: string;
    document: Document;
    budget: MotionModelBudget;
    signal: AbortSignal;
    onProgress?: MotionAgentProgress;
    speechTiming?: readonly SpeechSpan[];
    tools?: AgentToolSession;
    projectMemory?: unknown;
};
export type MotionVisionImage = { mime: "image/jpeg" | "image/png"; bytes: Uint8Array };
export class MotionAgentUnavailable extends Error {}
export type MotionAgentProgress = (data: {
    role: MotionPromptRole | "referenceObserver";
    model: string;
    mode: "deep" | "off";
    state: "requesting" | "responding" | "accepted" | "rejected";
    promptVersion?: number;
    promptHash?: string;
    maxTokens?: number;
    reasoningEffort?: ReturnType<typeof motionReasoningEffort>;
    phase?: "observe";
    elapsedMs?: number;
    tokens?: number;
    reasoningObserved?: boolean;
    outcome?: string;
    artifactFailure?: NonNullable<MotionProviderError["artifact"]>["reason"];
}) => void;

export async function runMotionAgent<T>(
    context: MotionAgentContext,
    role: MotionPromptRole,
    route: MotionRoute,
    input: unknown,
    schema: z.ZodType<T>,
    options: { images?: readonly MotionVisionImage[]; validate?: (value: T) => void; constrainedOutput?: boolean;
        requestTimeoutMs?: number; sceneId?: string } = {},
) {
    const { document, brief, budget, signal, onProgress } = context;
    const mode = role === "repair" ? "deep" : motionRoleMode[role];
    const history = context.tools?.history(role, options.sceneId) ?? [];
    const requests = context.tools?.available && history.length < agentToolStageLimit ? agentToolSchemas(role) : [];
    const requestSchema = requests.length ? z.object({ toolRequest: z.union(requests) }).strict() : null;
    const output = requestSchema ? z.union([schema, requestSchema]) : schema;
    const originalImages = options.images ?? [];
    const toolImages = history.flatMap(({ images }) => images ?? []).slice(0, Math.max(0, Math.min(2, 8 - originalImages.length)));
    const images = [...originalImages, ...toolImages];
    const maxTokens = mode === "off" ? 2048 : ["referenceAnalyst", "referenceSpec", "director", "visualCritic"].includes(role) ? 6400 : 4096;
    const providers = await qualifiedMotionProviders(route, [
        images.length ? "image" : "text", "stream", ...(mode === "deep" ? ["thinking" as const] : []),
    ]);
    if (!providers.length) throw new MotionAgentUnavailable(`No qualified model is available for ${role}.`);
    let imageIndex = originalImages.length + 1;
    const toolResults = history.map(({ request, result, images }) => {
        const count = Math.max(0, Math.min(images?.length ?? 0, originalImages.length + toolImages.length + 1 - imageIndex));
        const attachedImages = Array.from({ length: count }, () => imageIndex++);
        const summary = (request.name === "write_module" || request.name === "patch_module") && result && typeof result === "object"
            ? { ...result, candidate: undefined } : result;
        const { name, args: { sceneId } } = request;
        return { request: { name, args: { sceneId } }, result: summary, attachedImages };
    });
    const prompt = buildMotionPrompt(role, {
        brief, revision: document.revision, width: document.width, height: document.height,
        fps: document.fps, frames: document.total_frames, input, maxOutputTokens: maxTokens,
        projectMemory: context.projectMemory,
        toolResults: toolResults.length ? toolResults : undefined,
    }, output, requestSchema !== null);
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
            promptHash: prompt.version.promptHash, maxTokens, reasoningEffort: motionReasoningEffort(provider.model, mode, true) };
        const started = performance.now();
        try {
            onProgress?.({ ...diagnostic, state: "requesting" });
            const timeoutMs = Math.min(attempt.timeoutMs, options.requestTimeoutMs ?? attempt.timeoutMs);
            const result = await requestMotionJson(provider, {
                ...prompt, images, mode, conciseReasoning: true, constrainedOutput: options.constrainedOutput ?? true,
                schema: output, maxTokens, stream: true, signal,
                timeoutMs, firstTokenTimeoutMs: Math.min(attempt.firstTokenTimeoutMs, timeoutMs),
                onFirstToken: (elapsedMs) => onProgress?.({ ...diagnostic, state: "responding", elapsedMs }),
            });
            actual = result.usage?.total_tokens;
            if (mode === "deep" && !result.reasoningObserved) {
                onProgress?.({ ...diagnostic, state: "rejected", outcome: "missing_reasoning", elapsedMs: result.latencyMs, tokens: actual });
                continue;
            }
            if (requestSchema) {
                const tool = requestSchema.safeParse(result.value);
                if (tool.success) {
                    context.tools!.request(role, parseAgentToolRequest(role, tool.data.toolRequest), options.sceneId);
                }
            }
            const value = schema.parse(result.value);
            options.validate?.(value);
            onProgress?.({ ...diagnostic, state: "accepted", elapsedMs: result.latencyMs, tokens: actual, reasoningObserved: result.reasoningObserved });
            return {
                value, promptVersion: prompt.version, model: provider.alias,
                mode, reasoningObserved: result.reasoningObserved, latencyMs: result.latencyMs, usage: result.usage,
            };
        } catch (error) {
            signal.throwIfAborted();
            if (error instanceof MotionToolYield) {
                onProgress?.({ ...diagnostic, state: "accepted", outcome: "tool_requested", elapsedMs: Math.round(performance.now() - started), tokens: actual });
                throw error;
            }
            if (error instanceof MotionBudgetError) throw error;
            const providerFailure = error instanceof MotionProviderError ? error : undefined;
            actual ??= providerFailure?.artifact?.totalTokens;
            onProgress?.({ ...diagnostic, state: "rejected", elapsedMs: Math.round(performance.now() - started), tokens: actual,
                outcome: providerFailure?.status === 429 ? "rate_limited" : providerFailure?.code ?? "artifact_validation",
                artifactFailure: providerFailure?.artifact?.reason });
            if (error instanceof MotionProviderError && error.retryAfterMs !== undefined) {
                attempt.backoff?.(error.retryAfterMs);
                providerBudget = new MotionBudgetError("This motion provider is waiting for its rate limit to reset.", "provider");
            }
        } finally {
            attempt.release(actual);
        }
    }
    throw providerBudget ?? new MotionAgentUnavailable(`The ${role} stage could not produce a valid artifact within the configured routes.`);
}
