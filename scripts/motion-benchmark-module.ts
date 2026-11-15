import "../server/env";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { build, preview } from "vite";
import { z } from "zod";
import { runtime } from "../server/env";
import { motionLimits, MotionRunBudget } from "../server/motion/budget";
import { compileMotionProgram } from "../server/motion/programs";
import { configuredMotionProviders } from "../server/motion/providers/inventory";
import { MotionProviderError, motionReasoningEffort, requestMotionJson } from "../server/motion/providers/chat";
import { motionSdkModule } from "../shared/motion/scene-program";

const [flag, ...arguments_] = process.argv.slice(2);
const sdkTypes = arguments_.includes("--sdk-types");
const repair = arguments_.includes("--repair");
const aliases = arguments_.filter((item) => !["--sdk-types", "--repair"].includes(item));
if (flag !== "--live" || !aliases.length || aliases.length > 3) {
    throw new Error("Use --live, up to three configured NVIDIA provider aliases, and optional --sdk-types or --repair.");
}
const providers = [...new Set(aliases)].map((alias) => {
    const provider = configuredMotionProviders().find((item) => item.alias === alias && item.credential && item.family === "chat" &&
        item.endpoint === "https://integrate.api.nvidia.com/v1/chat/completions");
    if (!provider) throw new Error(`No configured NVIDIA chat provider matches ${alias}.`);
    return provider;
});
const directory = path.join(runtime, "motion-verification");
await mkdir(directory, { recursive: true });
const evidence = await mkdtemp(path.join(directory, "module-benchmark-"));
const outDir = path.join(evidence, "probe");
const config = { configFile: false as const, publicDir: false as const, logLevel: "error" as const, worker: { format: "es" as const },
    build: { outDir, rollupOptions: { input: "shared/motion/runtime/probe.ts", preserveEntrySignatures: "strict" as const,
        output: { entryFileNames: "probe.js" } } } };
await build(config);
await writeFile(path.join(outDir, "index.html"), "<!doctype html><title>Module benchmark</title>");
const server = await preview({ ...config, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const sourceSchema = z.object({ source: z.string().min(1).max(6000) }).strict();
const patchSchema = z.object({ find: z.string().min(1).max(600), replace: z.string().min(1).max(1000) }).strict();
const sourcePrompt = `Write a TypeScript scene module for a 30 fps 3-second loading animation. Import types MotionFrameInput and MotionSceneSdk from "${motionSdkModule}". Export function frame(input: MotionFrameInput, sdk: MotionSceneSdk), returning an array. Use these only: sdk.rect(id, x, y, width, height, color) and sdk.text(id, text, x, y, size, maxWidth, color).
Return a label with ID load-label at [0.5,0.7], reading input.properties.label; a static background bar ID track centered at [0.5,0.5], width 0.6 height 0.07 color #384150; and a green bar ID meter, height 0.05. Start with width 0.12, reach 0.36 at frame 30, and reach 0.60 at frame 60. Hold at that width through frame 89. Its left edge must always be 0.20 and the color comes from input.properties.accent. Put the bar after the track in the returned array. Return only JSON { "source": "..." }.`
    + (sdkTypes ? " Properties have type string | number | boolean. Use String(input.properties.label) and String(input.properties.accent) for the string arguments to the SDK." : "");
const properties = [
    { id: "label", label: "Loading label", kind: "text" as const, default: "Building preview" },
    { id: "accent", label: "Accent color", kind: "color" as const, default: "#55cc99" },
];
const broken = `import type { MotionFrameInput, MotionSceneSdk } from "${motionSdkModule}";
export function frame(input: MotionFrameInput, sdk: MotionSceneSdk) {
    const progress = Math.min(1, input.frame / 60);
    const width = 0.12 + 0.48 * progress;
    return [
        sdk.text("load-label", input.properties.label, 0.5, 0.7, 0.06, 0.8, "#ffffff"),
        sdk.rect("track", 0.5, 0.5, 0.6, 0.07, "#384150"),
        sdk.rect("meter", 0.2 + width / 2, 0.5, width, 0.05, String(input.properties.accent)),
    ];
}`;
const frames = [0, 30, 60, 89];
const expected = [0.12, 0.36, 0.6, 0.6];
const limits = new MotionRunBudget(motionLimits());
const attempts: Record<string, unknown>[] = [];
try {
    const page = await browser.newPage();
    await page.goto(server.resolvedUrls!.local[0]);
    const failure = repair ? await compileMotionProgram({ version: 1, properties, assets: [], source: broken }) : null;
    if (repair && !failure?.diagnostics.some(({ code }) => code === "TS2345")) throw new Error("The repair fixture lost its expected compiler diagnostic.");
    const prompt = repair ? `Repair the loading animation using one exact source replacement. Keep all timing, colors, dimensions and IDs. Return JSON with find (an exact unique source fragment) and replace. The compiler reports: ${JSON.stringify(failure?.diagnostics)}
Source:
${broken}` : sourcePrompt;
    const schema: z.ZodType<unknown> = repair ? patchSchema : sourceSchema;
    for (const provider of providers) {
        for (const effort of ["standard", "extended"] as const) {
            const maxTokens = effort === "standard" ? 4096 : 6400;
            const record: Record<string, unknown> = {
                model: provider.model, alias: provider.alias, effort, maxTokens, sdkTypes, task: repair ? "diagnostic-repair" : "author",
                effectiveEffort: motionReasoningEffort(provider.model, "deep", effort === "standard"),
            };
            attempts.push(record);
            let reservation: ReturnType<typeof limits.reserveModel> | undefined;
            let tokens: number | undefined;
            const started = performance.now();
            try {
                reservation = limits.reserveModel(Math.ceil(prompt.length / 3) + 100, maxTokens);
                const answer = await requestMotionJson(provider, { instruction: "Follow the fixed module contract.", prompt, schema,
                    mode: "deep", reasoning: effort, maxTokens, stream: true, signal: AbortSignal.timeout(95_000),
                    timeoutMs: Math.min(reservation.timeoutMs, 90_000), firstTokenTimeoutMs: 30_000 });
                tokens = answer.usage?.total_tokens;
                record.providerLatencyMs = answer.latencyMs;
                record.reasoningObserved = answer.reasoningObserved;
                let source: string;
                if (repair) {
                    const patch = patchSchema.safeParse(answer.value);
                    if (!patch.success || broken.split(patch.data.find).length !== 2) { record.outcome = "unusable_patch"; continue; }
                    source = broken.replace(patch.data.find, () => patch.data.replace);
                } else source = sourceSchema.parse(answer.value).source;
                const compiled = await compileMotionProgram({ version: 1, properties, assets: [], source });
                record.compiler = compiled.diagnostics;
                if (!compiled.program) { record.outcome = "compile_failure"; continue; }
                const review = await page.evaluate(async ({ program, frames }) => {
                    const probe = "/probe.js";
                    const { runCompiledMotionProbe } = await import(/* @vite-ignore */ probe);
                    return runCompiledMotionProbe(program, frames, 30);
                }, { program: compiled.program, frames });
                if (!review.ok) { record.outcome = review.reason; continue; }
                const scores = review.frames.map((commands: Record<string, unknown>[], index: number) => {
                    const label = commands.find(({ id }) => id === "load-label");
                    const track = commands.find(({ id }) => id === "track");
                    const meter = commands.find(({ id }) => id === "meter");
                    const close = (a: unknown, b: number) => typeof a === "number" && Math.abs(a - b) <= 0.002;
                    return Number(commands.length === 3) + Number(label?.text === "Building preview" && close(label.x, 0.5) && close(label.y, 0.7)) +
                        Number(track?.color === "#384150" && close(track.width, 0.6) && commands.indexOf(track) < commands.indexOf(meter!)) +
                        Number(meter?.color === "#55cc99" && close(meter.width, expected[index]) && close(meter.height, 0.05)) +
                        Number(close(Number(meter?.x) - Number(meter?.width) / 2, 0.2));
                });
                record.score = scores.reduce((total: number, points: number) => total + points, 0);
                record.maximum = frames.length * 5;
                record.outcome = "scored";
                record.compiledHash = compiled.program.buildHash;
            } catch (error) {
                const failure = error instanceof MotionProviderError ? error : undefined;
                tokens = failure?.artifact?.totalTokens;
                record.outcome = failure?.code ?? "benchmark_failure";
                record.httpStatus = failure?.status;
                record.artifactFailure = failure?.artifact?.reason;
            } finally {
                reservation?.release(tokens);
                record.accountedTokens = reservation ? tokens ?? Math.ceil(prompt.length / 3) + 100 + maxTokens : 0;
                record.latencyMs = Math.round(performance.now() - started);
                await writeFile(path.join(evidence, "results.json"), JSON.stringify({ attempts, budget: limits.summary() }, null, 2));
                console.log(JSON.stringify(record));
            }
        }
    }
} finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
}
console.log(evidence);
