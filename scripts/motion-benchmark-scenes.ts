import "../server/env";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { build, preview } from "vite";
import { z } from "zod";
import { runtime } from "../server/env";
import { MotionRunBudget, motionLimits } from "../server/motion/budget";
import { MotionProviderError, motionReasoningEffort, requestMotionJson } from "../server/motion/providers/chat";
import { configuredMotionProviders, motionRoutes, motionRouteProviders, optionalMotionProviders } from "../server/motion/providers/inventory";
import { benchmarkCandidate, benchmarkFrames, benchmarkLayout, benchmarkMotionScene, benchmarkScenes,
    scoreBenchmarkVisual, type renderBenchmarkFrames } from "./fixtures/motion-scene-benchmark";

const roles = ["reference", "design", "author", "critique"] as const;
const options = z.object({ live: z.boolean(), route: z.string().regex(/^[\w-]+$/).optional(),
    role: z.enum(roles).optional(), family: z.enum(["product", "typography", "data"]).optional(),
    mode: z.enum(["deep", "off"]).default("deep") }).strict();
const settings = options.parse(Object.fromEntries([["live", false], ...process.argv.slice(2).map((arg) => {
    if (arg === "--live") return ["live", true];
    const match = /^--([a-z]+)=([\w-]+)$/.exec(arg);
    if (!match) throw new Error(`Invalid option ${arg}`);
    return match.slice(1);
})]));
if (settings.live && !settings.route) throw new Error("Select one configured provider alias with --route=ALIAS.");
const activeRoutes = new Set(motionRoutes.flatMap((role) => motionRouteProviders(role).map(({ alias }) => alias)));
const provider = settings.route && [...configuredMotionProviders(), ...optionalMotionProviders()].find((route) =>
    route.alias === settings.route && route.credential &&
    ((activeRoutes.has(route.alias) && route.endpoint === "https://integrate.api.nvidia.com/v1/chat/completions") ||
        ["openrouter", "gemini"].includes(route.adapter ?? "")));
if (settings.route && !provider) throw new Error("The alias has no credentials or is outside configured motion routes.");
const cases = benchmarkScenes.filter(({ family }) => !settings.family || family === settings.family);
const scheduled = roles.filter((role) => !settings.role || role === settings.role);
const visualReference = z.object({
    frames: z.array(z.object({ frame: z.number().int(), elements: z.array(z.object({ id: z.string().max(32), x: z.number(),
        y: z.number(), text: z.string().max(65).nullable() }).strict()).min(1).max(10) }).strict()).length(3),
}).strict();
const critique = z.object({ defect: z.enum(["missing-copy", "wrong-color", "wrong-position", "none"]),
    subject: z.string().trim().min(1).max(65), frame: z.literal(59) }).strict();

const folder = path.join(runtime, "motion-verification");
await mkdir(folder, { recursive: true });
const directory = await mkdtemp(path.join(folder, "scene-model-evaluation-"));
const outDir = path.join(directory, "browser");
const config = { configFile: false as const, publicDir: false as const, logLevel: "error" as const, build: {
    outDir, rollupOptions: { input: "scripts/fixtures/motion-scene-benchmark.ts", preserveEntrySignatures: "strict" as const,
        output: { entryFileNames: "benchmark.js" } },
} };
await build(config);
await writeFile(path.join(outDir, "index.html"), "<!doctype html><title>Motion scene evaluation</title>");
const server = await preview({ ...config, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const budget = new MotionRunBudget(motionLimits());
const results: Record<string, unknown>[] = [];
const fixtures: Record<string, unknown>[] = [];
type Render = ReturnType<typeof renderBenchmarkFrames>;
const png = ({ png }: Render[number]) => ({ mime: "image/png" as const, bytes: Buffer.from(png, "base64") });
const normalized = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const report = () => writeFile(path.join(directory, "results.json"), JSON.stringify({
    version: 2, settings, checkedAt: new Date().toISOString(), fixtures, results, budget: budget.summary(),
}, null, 2));
try {
    const page = await browser.newPage();
    await page.goto(server.resolvedUrls!.local[0]);
    const render = (scene: ReturnType<typeof benchmarkMotionScene>, copy: string[]): Promise<Render> =>
        page.evaluate(async ({ scene, copy }) => {
            const moduleUrl = "/benchmark.js";
            const bundle = await import(/* @vite-ignore */ moduleUrl);
            return bundle.renderBenchmarkFrames(scene, copy);
        }, { scene, copy });
    let rateLimited = false;
    for (const entry of cases) {
        const copy = entry.layers.flatMap((layer) => layer.kind === "text" ? [layer.text] : []);
        const expected = await render(benchmarkMotionScene(entry.family, entry.background, { layers: entry.layers }), copy);
        const candidate = await render(benchmarkMotionScene(entry.family, entry.background, benchmarkCandidate(entry)), copy);
        const exact = scoreBenchmarkVisual(expected, expected);
        assert.equal(exact.passed, exact.total, `Invalid benchmark fixture for ${entry.family}`);
        assert.ok(scoreBenchmarkVisual(expected, candidate).passed < exact.total, `The seeded defect is not measurable in ${entry.family}`);
        const images = expected.map(png);
        fixtures.push({ family: entry.family, frames: benchmarkFrames, sha256: images.map(({ bytes }) =>
            createHash("sha256").update(bytes).digest("hex")) });
        for (const frame of expected) await writeFile(path.join(directory, `${entry.family}-source-${frame.frame}.png`), png(frame).bytes);
        await writeFile(path.join(directory, `${entry.family}-critique-59.png`), png(candidate.at(-1)!).bytes);
        if (!settings.live || !provider) continue;

        for (const role of scheduled) {
            const attached = role === "author" ? [] : role === "critique" ? [images.at(-1)!, png(candidate.at(-1)!)] : images;
            const brief = `Scene family ${entry.title}. Canvas 480 by 270. Background ${entry.background}. Roles in stacking order: ${entry.layers.map(({ id }) => id).join(", ")}.`;
            const schema: z.ZodType<unknown> = role === "reference" ? visualReference : role === "critique" ? critique : benchmarkLayout;
            const prompt = role === "reference" ? `${brief} Read the supplied images ordered as frames 0, 30 and 59. For each frame identify each role's center x and y as fractions of the canvas, and exact text or null for a shape.`
                : role === "critique" ? `${brief} Image 1 is the approved frame 59. Image 2 is the candidate frame 59. Identify the single seeded defect and give the role ID (or exact missing words) as subject.`
                    : `${brief} Return editable layers in paint order. Set at.x/at.y to normalized canvas coordinates. Use short-edge units for text size and rectangle dimensions, and canvas-width fractions for maxWidth. Use a bounded linear move with frame numbers and preserve all copy. No assets. ${role === "author" ? `Use this measured scene specification: ${JSON.stringify(entry.layers)}` : "Match the three source frames shown in order 0, 30, 59."}`;
            for (let attempt = 1; attempt <= 2; attempt++) {
                const maxTokens = settings.mode === "off" ? 2048 : role === "author" || role === "design" ? 4096 : 3072;
                const inputTokens = Math.ceil(prompt.length / 3) + 1200 + attached.length * 2048;
                const row: Record<string, unknown> = { alias: provider.alias, model: provider.model, adapter: provider.adapter,
                    family: entry.family, role, attempt, maxTokens, mode: settings.mode,
                    effectiveEffort: motionReasoningEffort(provider.model, settings.mode, true) };
                if (rateLimited) { results.push({ ...row, outcome: "rate-limit-skipped" }); break; }
                const started = performance.now();
                let reservation: ReturnType<typeof budget.reserveModel> | undefined;
                let tokens: number | undefined;
                let retry = false;
                try {
                    reservation = budget.reserveModel(inputTokens, maxTokens, provider.alias);
                    const answer = await requestMotionJson(provider, {
                        instruction: `Use only the supplied evidence. Return one JSON object matching ${JSON.stringify(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }))}.`,
                        prompt, images: attached, schema, mode: settings.mode, reasoning: "standard", stream: true, maxTokens,
                        timeoutMs: Math.min(55_000, reservation.timeoutMs), firstTokenTimeoutMs: Math.min(25_000, reservation.firstTokenTimeoutMs),
                        signal: AbortSignal.timeout(65_000),
                    });
                    tokens = answer.usage?.total_tokens;
                    row.reasoningObserved = answer.reasoningObserved;
                    if (role === "reference") {
                        const { frames } = visualReference.parse(answer.value);
                        const checks = expected.flatMap(({ frame, elements }) => elements.flatMap(({ id, text, x, y }) => {
                            const observed = frames.find((item) => item.frame === frame)?.elements.find((item) => item.id === id);
                            return [Boolean(observed && Math.abs(observed.x - x) <= 0.075 && Math.abs(observed.y - y) <= 0.075),
                                Boolean(observed && (observed.text ?? null) === (text ?? null))];
                        }));
                        row.score = { passed: checks.filter(Boolean).length, total: checks.length };
                    } else if (role === "critique") {
                        const diagnosis = critique.parse(answer.value);
                        const subjects = entry.defect === "missing-copy" ? [entry.subject, "action"] : [entry.subject];
                        row.score = { passed: Number(diagnosis.defect === entry.defect) +
                            Number(subjects.some((subject) => normalized(subject) === normalized(diagnosis.subject))), total: 2 };
                    } else {
                        const frames = await render(benchmarkMotionScene(entry.family, entry.background, answer.value), copy);
                        row.score = scoreBenchmarkVisual(expected, frames);
                        for (const frame of frames) await writeFile(path.join(directory, `${entry.family}-${role}-${frame.frame}.png`), png(frame).bytes);
                    }
                    row.outcome = "scored";
                } catch (error) {
                    const failure = error instanceof MotionProviderError ? error : undefined;
                    tokens = failure?.artifact?.totalTokens;
                    row.outcome = failure?.code ?? (reservation ? "artifact_failure" : "budget_exhausted");
                    row.httpStatus = failure?.status;
                    row.artifactFailure = failure?.artifact?.reason;
                    rateLimited ||= failure?.status === 429;
                    retry = Boolean(failure && !rateLimited &&
                        ["invalid_output", "transport", "request_timeout", "first_token_timeout"].includes(failure.code));
                } finally {
                    reservation?.release(tokens);
                    row.latencyMs = Math.round(performance.now() - started);
                    row.accountedTokens = reservation ? tokens ?? inputTokens + maxTokens : 0;
                    results.push(row);
                    await report();
                    console.log(JSON.stringify(row));
                }
                if (!retry) break;
            }
        }
    }
    await report();
    console.log(JSON.stringify({ directory, fixtures: fixtures.length, scored: results.filter(({ outcome }) => outcome === "scored").length }));
} finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
}
