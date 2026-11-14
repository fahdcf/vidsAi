import "../server/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { z } from "zod";
import { runtime } from "../server/env";
import { MotionRunBudget, motionLimits } from "../server/motion/budget";
import { MotionProviderError, motionReasoningEffort, requestMotionJson } from "../server/motion/providers/chat";
import { configuredMotionProviders, motionRouteProviders, motionRoutes } from "../server/motion/providers/inventory";

const families = [
    { id: "product", label: "Start free", color: "#ff8755", shape: "button", placement: "bottom" },
    { id: "typography", label: "Make every word count", color: "#aa88ff", shape: "headline", placement: "center" },
    { id: "data", label: "Revenue +24%", color: "#88ee99", shape: "chart", placement: "top" },
] as const;
const stages = ["reference", "design", "author", "critique"] as const;
const placements = z.enum(["top", "center", "bottom"]);
const schema = z.object({ label: z.string().min(1).max(100), color: z.string().regex(/^#[\da-f]{6}$/i),
    shape: z.enum(["button", "headline", "chart"]), placement: placements,
    issue: z.enum(["none", "placement", "copy", "color"]) }).strict();
const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !["--live", "--extended"].includes(arg) && !/^--route=[\w-]+$/.test(arg))) {
    throw new Error("Use --live, --extended and an optional --route=alias.");
}
const filter = [...args].find((arg) => arg.startsWith("--route="))?.slice("--route=".length);
const configured = configuredMotionProviders().filter(({ credential, family, endpoint }) =>
    credential && family === "chat" && endpoint === "https://integrate.api.nvidia.com/v1/chat/completions");
const routed = new Set(motionRoutes.flatMap((route) => motionRouteProviders(route).map(({ alias }) => alias)));
const providers = configured.filter(({ alias }) => filter ? alias === filter : routed.has(alias));
if (!providers.length) throw new Error("No configured NVIDIA chat route matches.");
const tasks = providers.flatMap((provider) => families.flatMap((family) => stages.map((stage) => ({ provider, family, stage }))));
console.log(JSON.stringify({ live: args.has("--live"), tasks: tasks.map(({ provider, stage, family }) =>
    ({ alias: provider.alias, model: provider.model, stage, family: family.id })) }, null, 2));
if (!args.has("--live")) process.exit(0);

const budget = new MotionRunBudget(motionLimits());
const effort = args.has("--extended") ? "extended" : "standard";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const attempts: { outcome: string; [key: string]: unknown }[] = [];
const cooldown = new Set<string>();
try {
    const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
    async function draw(family: typeof families[number], placement: z.infer<typeof placements>) {
        const y = { top: 44, center: 108, bottom: 166 }[placement];
        const graphic = family.shape === "chart"
            ? `<path d="M42 ${y + 22} v-24 m12 24 v-35 m12 35 v-48" stroke="${family.color}" stroke-width="8"/>`
            : family.shape === "button" ? `<rect x="76" y="${y - 22}" width="232" height="44" rx="14" fill="${family.color}"/>` : "";
        await page.setContent(`<body style="margin:0"><svg width="384" height="216" xmlns="http://www.w3.org/2000/svg">
          <rect width="384" height="216" fill="#17181c"/>${graphic}
          <text x="192" y="${y + 6}" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700"
          fill="${family.shape === "button" ? "#17181c" : family.color}">${family.label}</text></svg></body>`);
        return { mime: "image/png" as const, bytes: await page.screenshot({ clip: { x: 0, y: 0, width: 384, height: 216 } }) };
    }
    for (const { provider, family, stage } of tasks) {
        const base = { provider: "nvidia", alias: provider.alias, model: provider.model, family: family.id, stage,
            maxTokens: effort === "extended" ? 6400 : 4096,
            requestedEffort: effort, effectiveEffort: motionReasoningEffort(provider.model, "deep", effort === "standard") };
        if (cooldown.has(provider.alias)) { attempts.push({ ...base, outcome: "cooldown" }); continue; }
        const started = performance.now();
        const images = stage === "author" ? [] : [await draw(family, family.placement)];
        if (stage === "critique") images.push(await draw(family, family.placement === "top" ? "bottom" : "top"));
        const goal = stage === "reference" ? "Read image 1. Give the exact label, accent color, kind of shape and vertical placement."
            : stage === "design" ? "Design an editable version of image 1. Preserve exact copy, accent color, object type and vertical placement."
            : stage === "author" ? `Return the structured scene fields for this specification: ${JSON.stringify(family)}.`
            : "Compare image 2 with image 1. Return the desired properties from image 1 and identify the one changed property in image 2.";
        const prompt = `${goal} Return JSON with label, color (#RRGGBB), shape (button, headline or chart), placement (top, center or bottom), and issue (none, placement, copy or color). Use none when no comparison is requested.`;
        let accountedTokens: number | undefined;
        let reservation: ReturnType<MotionRunBudget["reserveModel"]> | undefined;
        try {
            reservation = budget.reserveModel(512 + images.length * 2048, base.maxTokens);
            const { value, reasoningObserved, usage, latencyMs } = await requestMotionJson(provider, {
                instruction: "Follow the motion evaluation brief and return one JSON object.", prompt, images, schema,
                mode: "deep", reasoning: effort, maxTokens: base.maxTokens, stream: true, signal: AbortSignal.timeout(65_000),
                timeoutMs: Math.min(reservation.timeoutMs, 60_000), firstTokenTimeoutMs: Math.min(reservation.firstTokenTimeoutMs, 20_000),
            });
            accountedTokens = usage?.total_tokens;
            const score = Number(value.label === family.label) + Number(value.color.toLowerCase() === family.color) +
                Number(value.shape === family.shape) + Number(value.placement === family.placement) +
                Number(value.issue === (stage === "critique" ? "placement" : "none"));
            attempts.push({ ...base, outcome: "completed", latencyMs, reasoningObserved, score, total: 5, usage,
                accountedTokens: accountedTokens ?? 512 + images.length * 2048 + base.maxTokens });
        } catch (error) {
            const failure = error instanceof MotionProviderError ? error : undefined;
            accountedTokens = failure?.artifact?.totalTokens;
            if (failure?.status === 429) cooldown.add(provider.alias);
            attempts.push({ ...base, outcome: failure?.code ?? "budget_or_timeout", status: failure?.status,
                artifactFailure: failure?.artifact?.reason,
                accountedTokens: reservation ? accountedTokens ?? 512 + images.length * 2048 + base.maxTokens : 0,
                latencyMs: Math.round(performance.now() - started) });
        } finally { reservation?.release(accountedTokens); }
    }
} finally { await browser.close(); }
const folder = path.join(runtime, "motion-verification");
await mkdir(folder, { recursive: true });
const report = path.join(folder, `synthetic-model-benchmark-${Date.now()}.json`);
await writeFile(report, JSON.stringify({ version: 1, checkedAt: new Date().toISOString(), attempts, budget: budget.summary() }, null, 2));
console.log(JSON.stringify({ report, attempts: attempts.length, scored: attempts.filter((item) => item.outcome === "completed").length }));
