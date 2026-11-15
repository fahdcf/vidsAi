import "../server/env";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { runtime } from "../server/env";
import { MotionRunBudget, motionLimits } from "../server/motion/budget";
import { MotionProviderError, requestMotionJson } from "../server/motion/providers/chat";
import {
    motionRouteProviders, optionalMotionProviders, publicMotionInventory,
    type MotionCapability, type MotionEvidence, type MotionProvider,
} from "../server/motion/providers/inventory";

const planSchema = z.object({
    title: z.string().min(1).max(80),
    scenes: z.array(z.object({
        effect: z.enum(["rings", "kinetic_words"]),
        seconds: z.number().positive(),
    }).strict()).length(2),
}).strict().refine((plan) => plan.scenes[0].effect === "rings" &&
    plan.scenes[1].effect === "kinetic_words" &&
    plan.scenes.reduce((duration, scene) => duration + scene.seconds, 0) === 4);

const visionSchema = z.object({
    color: z.literal("red"),
    shape: z.literal("square"),
}).strict();

// A tiny synthetic red fixture keeps real reference media out of capability probes.
const redPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAACXBIWXMAAAABAAAAAQBPJcTWAAABP0lEQVR4nO3dwQnAIBQFQQ3pv+SYJoQFnWnAw/JuH5xrrUHnDd9GgJ4FxASICRATICZATICYADEBYgLEBIgJEBMgJkBMgJgAMQFiAsQEiAkQEyAmwCkBvjnHTZ5N91QWEBMgJkBMgJgAMQFiAsQEiAkQEyAmQEyAmAAxAWICxASICRATICZATICYADEBYgLEBIgJEBMgJkBMgJgAMQFiAsQEiAkQEyAmQEyAmAAxAWICxASICRATICZATICYADEBYgLEBIgJEBMgJkBMgJgAMQFiAsQEiAkQEyAmQEyAmAAxAWICxASICRATICZATICYADEBYgLEBIgJEBMgJkBMgJgAMQFiApwSYNf/urexgJgAMQFiAsQEiAkQEyAmQEyAmAAxAWICxASICRATICZATICYADEBYgLEBIgJEBNgtH4aDwn70/TaDAAAAABJRU5ErkJggg==",
    "base64",
);

async function live() {
    const complex = motionRouteProviders("AGENT_COMPLEX");
    const media = motionRouteProviders("MEDIA_UNDERSTANDING");
    const attempts: Record<string, unknown>[] = [];
    const evidence: MotionEvidence[] = [];
    const budget = new MotionRunBudget(motionLimits());
    const now = () => Math.round(performance.now());
    function observe(provider: MotionProvider, capabilities: MotionCapability[], result: MotionEvidence["result"]) {
        for (const capability of capabilities) {
            evidence.push({ model: provider.model, endpoint: provider.endpoint!, capability, result });
        }
    }
    async function check(role: string, provider: MotionProvider | undefined, image = false, cancel = false) {
        if (!provider) {
            attempts.push({ role, outcome: "unconfigured" });
            return false;
        }
        const controller = new AbortController();
        const started = now();
        let receivedToken = false;
        let reservation: ReturnType<MotionRunBudget["reserveModel"]> | undefined;
        let actualTokens: number | undefined;
        const capability: MotionCapability = image ? "image" : "text";
        try {
            reservation = budget.reserveModel(image ? 2048 : 512, 8192);
            const common = {
                instruction: "Return a single JSON object in the requested shape.",
                mode: "deep" as const,
                stream: true,
                maxTokens: 8192,
                timeoutMs: reservation.timeoutMs,
                firstTokenTimeoutMs: reservation.firstTokenTimeoutMs,
                signal: controller.signal,
                onFirstToken: () => {
                    receivedToken = true;
                    if (cancel) controller.abort();
                },
            };
            const result = image ? await requestMotionJson(provider, {
                ...common,
                prompt: 'The attached image shows a solid filled geometric shape. Identify its color and shape. Output {"color":"...","shape":"..."}.',
                images: [{ mime: "image/png", bytes: redPng }],
                schema: visionSchema,
            }) : await requestMotionJson(provider, {
                ...common,
                prompt: 'Plan a 4-second motion intro with rings first and kinetic words second. Give each 2 seconds. Return {"title":"...","scenes":[{"effect":"rings","seconds":2},{"effect":"kinetic_words","seconds":2}]} with a short title.',
                schema: planSchema,
            });
            actualTokens = result.usage?.total_tokens;
            observe(provider, [capability, "stream"], "qualified");
            observe(provider, ["thinking"], result.reasoningObserved ? "qualified" : "reachable");
            attempts.push({
                role, model: provider.alias, requestedMode: result.requestedMode,
                reasoningObserved: result.reasoningObserved, finalJsonValid: true,
                latencyMs: result.latencyMs, firstTokenMs: result.firstTokenMs,
                usage: result.usage, outcome: result.reasoningObserved ? "qualified" : "reasoning_unconfirmed",
            });
            return !cancel && result.reasoningObserved;
        } catch (error) {
            const cancelled = cancel && receivedToken && controller.signal.aborted && (error as Error).name === "AbortError";
            const code = error instanceof MotionProviderError ? error.code
                : (error as Error).name === "TimeoutError" ? "timeout" : "request_failed";
            const status = error instanceof MotionProviderError ? error.status : undefined;
            if (!cancelled) observe(provider, [capability], code === "unsupported" ? "unsupported" : "temporarily_unavailable");
            attempts.push({
                role, model: provider.alias, requestedMode: "deep", latencyMs: now() - started,
                receivedToken, outcome: cancelled ? "cancelled_as_expected" : code, status,
            });
            return cancelled;
        } finally {
            reservation?.release(actualTokens);
        }
    }

    const director = await check("director", complex[0]);
    const reference = await check("reference_analyst", media[0], true)
        || (media[1] ? await check("reference_analyst_fallback", media[1], true) : false);
    const fallback = await check("director_fallback", complex[1]);
    const cancellation = await check("stream_cancellation", director ? complex[0] : fallback ? complex[1] : undefined, false, true);
    const result = {
        checkedAt: new Date().toISOString(),
        passed: director && reference && fallback && cancellation,
        checks: { director, reference, fallback, cancellation },
        attempts,
        budget: budget.summary(),
        inventory: publicMotionInventory(process.env, evidence),
    };
    const folder = path.join(runtime, "motion-verification");
    await mkdir(folder, { recursive: true });
    const report = path.join(folder, "model-qualification.json");
    await writeFile(report, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ checks: result.checks, attempts, report }, null, 2));
    if (!result.passed) process.exitCode = 1;
}

const optionalChecks = [
    { capability: "text" },
    { capability: "structured", constrainedOutput: true },
    { capability: "image", image: true },
    { capability: "stream", stream: true },
    { capability: "thinking", stream: true, mode: "deep" },
] as const satisfies readonly {
    capability: MotionCapability;
    constrainedOutput?: boolean;
    image?: boolean;
    stream?: boolean;
    mode?: "deep";
}[];

async function checkOptional(alias: string) {
    const provider = optionalMotionProviders().find((candidate) => candidate.alias === alias);
    if (!provider?.credential) throw new Error("No optional motion route with credentials matches that alias.");
    const budget = new MotionRunBudget(motionLimits());
    const declared = new Set(provider.capabilities);
    const attempts: Record<string, unknown>[] = [];
    let halted = false;
    for (const check of optionalChecks) {
        const { capability } = check;
        const supported = declared.has("text") && declared.has(capability);
        const image = "image" in check;
        const stream = "stream" in check;
        const constrainedOutput = "constrainedOutput" in check;
        if (halted || !supported || (image && !provider.mediaAllowed) || (stream && !declared.has("stream"))) {
            attempts.push({ capability, outcome: halted ? "rate_limit_skipped" : !supported ? "undeclared"
                : image ? "media_disabled" : "stream_required" });
            continue;
        }
        const mode = "mode" in check ? check.mode : "off";
        const marker = constrainedOutput ? randomUUID() : "motion-ready";
        const maxTokens = mode === "deep" ? 2048 : 256;
        const estimatedPromptTokens = image ? 2048 : 512;
        const started = performance.now();
        let reservation: ReturnType<MotionRunBudget["reserveModel"]> | undefined;
        let tokens: number | undefined;
        const request = { instruction: "Return one JSON object.", mode, stream, maxTokens, constrainedOutput,
            signal: AbortSignal.timeout(65_000) };
        try {
            reservation = budget.reserveModel(estimatedPromptTokens, maxTokens);
            const timeouts = { timeoutMs: Math.min(reservation.timeoutMs, 60_000),
                firstTokenTimeoutMs: Math.min(reservation.firstTokenTimeoutMs, 25_000) };
            const result = image ? await requestMotionJson(provider, {
                ...request, ...timeouts,
                prompt: 'Identify the object color and shape as {"color":"...","shape":"..."}.',
                images: [{ bytes: redPng, mime: "image/png" }],
                schema: visionSchema,
            }) : await requestMotionJson(provider, {
                ...request, ...timeouts, prompt: 'Return {"marker":"motion-ready"}.',
                schema: z.object({ marker: z.literal(marker) }).strict(),
            });
            tokens = result.usage?.total_tokens;
            attempts.push({ capability, mode, maxTokens, latencyMs: result.latencyMs, firstTokenMs: result.firstTokenMs,
                outcome: mode !== "deep" || result.reasoningObserved ? "qualified" : "reasoning_unconfirmed",
                reportedTokens: tokens ?? null, accountedTokens: tokens ?? estimatedPromptTokens + maxTokens });
        } catch (error) {
            const failure = error instanceof MotionProviderError ? error : undefined;
            tokens = failure?.artifact?.totalTokens;
            halted = failure?.status === 429;
            attempts.push({ capability, mode, maxTokens, latencyMs: Math.round(performance.now() - started),
                outcome: failure?.code ?? "budget_or_timeout", status: failure?.status,
                artifactFailure: failure?.artifact?.reason, reportedTokens: tokens ?? null,
                accountedTokens: reservation ? tokens ?? estimatedPromptTokens + maxTokens : 0 });
        } finally {
            reservation?.release(tokens);
        }
    }
    for (const capability of ["audio", "tools"] as const) {
        attempts.push({ capability, outcome: declared.has(capability) ? "probe_unavailable" : "undeclared" });
    }
    const passed = attempts[0]?.outcome === "qualified" &&
        attempts.every(({ outcome }) => outcome === "qualified" || outcome === "undeclared");
    const folder = path.join(runtime, "motion-verification");
    await mkdir(folder, { recursive: true });
    const directory = await mkdtemp(path.join(folder, "optional-model-qualification-"));
    const report = path.join(directory, "results.json");
    const result = { checkedAt: new Date().toISOString(), alias, adapter: provider.adapter, model: provider.model,
        endpoint: provider.endpoint, providerSlug: provider.providerSlug, passed, attempts, budget: budget.summary() };
    await writeFile(report, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ report, ...result }, null, 2));
    if (!passed) process.exitCode = 1;
}

if (process.argv.length === 2) {
    console.log(JSON.stringify(publicMotionInventory(), null, 2));
} else if (process.argv.length === 3 && process.argv[2] === "--live") {
    await live();
} else if (process.argv.length === 4 && process.argv[2] === "--live" && /^--optional=[a-z0-9_]+$/.test(process.argv[3])) {
    await checkOptional(process.argv[3].slice("--optional=".length));
} else {
    console.error("Use npm run motion:check-models, -- --live for configured routes, or -- --live --optional=alias for a single optional route.");
    process.exitCode = 1;
}
