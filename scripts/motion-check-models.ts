import "../server/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { runtime } from "../server/env";
import { MotionRunBudget, motionLimits } from "../server/motion/budget";
import { MotionProviderError, requestMotionJson } from "../server/motion/providers/chat";
import {
    motionRouteProviders, publicMotionInventory,
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

if (process.argv.length === 2) {
    console.log(JSON.stringify(publicMotionInventory(), null, 2));
} else if (process.argv.length === 3 && process.argv[2] === "--live") {
    await live();
} else {
    console.error("Use npm run motion:check-models, or add -- --live to qualify the configured routes.");
    process.exitCode = 1;
}
