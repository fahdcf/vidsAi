import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const [corpus, ...options] = process.argv.slice(2);
if (!corpus || options.some((arg) => arg !== "--live" && !/^--case=[a-z-]+$/.test(arg))) {
    throw new Error("Supply the corpus directory, optionally --case=ID, and --live to call configured models.");
}
const filter = options.find((arg) => arg.startsWith("--case="))?.slice(7);
const manifestPath = new URL("../docs/MOTION_HELD_OUT_EVALUATION.json", import.meta.url);
const protocol = await readFile(manifestPath);
const manifest = JSON.parse(protocol);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const cases = manifest.cases.filter(({ id }) => !filter || id === filter);
assert.ok(cases.length, "Unknown held-out case.");
for (const entry of cases) {
    entry.file = path.resolve(corpus, `${entry.id}.mp4`);
    assert.equal(sha256(await readFile(entry.file)), entry.sha256, `Frozen reference changed for ${entry.id}.`);
}
const protocolSha256 = sha256(protocol);
const planned = cases.flatMap((entry) => Array.from({ length: manifest.protocol.runsPerCase }, (_, index) => ({
    entry, attempt: index + 1,
})));
console.log(JSON.stringify({ protocolSha256, attempts: planned.map(({ entry, attempt }) => ({ case: entry.id, attempt })) }));
if (!options.includes("--live")) process.exit(0);

const root = path.resolve(import.meta.dirname, "../../runtime");
const output = path.join(root, "motion-verification");
await mkdir(output, { recursive: true });
const evidence = await mkdtemp(path.join(output, "held-out-"));
process.env.NODE_SKIP_LEGACY_IMPORT = "1";
process.env.NODE_DATABASE_PATH = path.join(evidence, "test.sqlite");
process.env.NODE_MEDIA_ROOT = path.join(evidence, "media");
const { motionLimits } = await import("../server/motion/budget.ts");
const defaults = motionLimits({});
const limits = motionLimits();
assert.ok(Object.entries(defaults).every(([key, value]) => limits[key] <= value), "Use the default product budget or a lower limit.");
const { app } = await import("../server/app.ts");
const { db, project } = await import("../server/database.ts");
const { document } = await import("../server/document.ts");
const { motionArtifact, motionRun, motionSteps } = await import("../server/motion/store.ts");
const { motionRunDraft, motionRunQuality } = await import("../server/motion/orchestrator.ts");
const { motionRunUsage } = await import("../server/motion/ledger.ts");
const { startMotionJobs } = await import("../server/motion/service.ts");
const { ffmpeg: tool } = JSON.parse(await readFile(new URL("../motion-toolchain.json", import.meta.url)));
const ffmpeg = process.env.MOTION_FFMPEG || path.join(root, tool.runtimePath);
const api = app.listen(0, "127.0.0.1");
await once(api, "listening");
const origin = `http://127.0.0.1:${api.address().port}`;
process.env.NODE_APP_ORIGIN = origin;
const jobs = startMotionJobs();
const browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
const results = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
console.log(`Evidence directory ${evidence}`);
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, acceptDownloads: true });
    await page.goto(origin + "/register");
    await page.locator("#name").fill("Motion held-out evaluation");
    await page.locator("#email").fill("heldout@example.test");
    await page.locator("#password").fill(randomUUID());
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.waitForURL("**/dashboard");
    for (const { entry, attempt } of planned) {
        const label = `${entry.id}-${attempt}`;
        const started = Date.now();
        const record = { case: entry.id, attempt, status: "setup", automaticOnly: true };
        results.push(record);
        let runId;
        try {
            await page.goto(origin + "/create/motion-graphics");
            await page.getByLabel("Project name").fill(`Held-out ${label}`);
            await page.getByLabel("Video brief").fill(entry.brief);
            await page.getByLabel("Aspect ratio").selectOption(entry.format);
            await page.getByLabel("Duration").selectOption(String(entry.seconds));
            await page.getByRole("radio", { name: "Match a reference" }).check();
            await page.getByLabel("Reference video or image").setInputFiles(entry.file);
            await page.getByRole("spinbutton", { name: "End (seconds)" }).waitFor();
            await page.getByLabel("End (seconds)").fill(String(entry.seconds));
            await page.getByRole("button", { name: "Start creating" }).click();
            await page.waitForURL(/\/projects\/\d+\/motion\?run=/);
            runId = new URL(page.url()).searchParams.get("run");
            record.runId = runId;
            console.log(`${label} started ${runId}`);
            const deadline = Date.now() + limits.activeMs + 60_000;
            let current = motionRun(runId);
            while (!["ready", "failed", "cancelled"].includes(current.status)) {
                if (Date.now() >= deadline) throw new Error("Run exceeded the evaluation deadline.");
                await pause(1200);
                current = motionRun(runId);
            }
            record.status = current.status;
            record.error = current.error;
            record.generationMs = Date.now() - started;
            const stages = motionSteps(runId);
            const draft = motionRunDraft(current);
            record.quality = motionRunQuality(current, stages);
            record.usage = motionRunUsage(runId);
            record.retriedStages = stages.filter(({ attempts }) => attempts > 1).map(({ name, attempts }) => ({ name, attempts }));
            record.automaticFirstDraft = stages.find(({ name, status }) => name === "assemble" && status === "done")?.result_id ?? null;
            record.firstDraftReview = stages.find(({ name, status }) => name === "critique:1" && status === "done")?.result_id ?? null;
            for (const [artifactId, suffix] of [[record.automaticFirstDraft, "first-draft"], [record.firstDraftReview, "first-review"]]) {
                const artifact = artifactId && motionArtifact(runId, artifactId);
                if (artifact) await writeFile(path.join(evidence, `${label}-${suffix}.json`), artifact.body);
            }
            if (!draft) continue;
            await writeFile(path.join(evidence, `${label}-draft.json`), JSON.stringify(draft.document, null, 2));
            await page.screenshot({ path: path.join(evidence, `${label}-chat.png`) });
            if (!document(project(current.project_id)).tracks.motion_graphics.length) {
                const approval = page.getByRole("button", { name: /^(Open saved partial draft|Open draft in editor|Apply revision)$/ });
                const appliesInPlace = await approval.textContent() === "Apply revision";
                await approval.click();
                record.manualApprovalToExport = true;
                if (appliesInPlace) {
                    await page.getByRole("link", { name: "Open editor", exact: true }).first().click();
                }
                await page.waitForURL("**/projects/*/editor");
            } else {
                await page.getByRole("link", { name: "Open editor", exact: true }).first().click();
                await page.waitForURL("**/projects/*/editor");
            }
            const renderRequests = [];
            page.on("request", checkRender);
            function checkRender(request) {
                if (request.method() === "POST" && /\/(?:exports?|render)(?:\/|$)/.test(new URL(request.url()).pathname)) {
                    renderRequests.push(request.url());
                }
            }
            try {
                await page.getByRole("button", { name: "Export video" }).click();
                await page.getByText("Export: done", { exact: true }).waitFor({ timeout: 120_000 });
                const [download] = await Promise.all([page.waitForEvent("download"),
                    page.getByRole("link", { name: "Download MP4" }).click()]);
                const file = path.join(evidence, `${label}.mp4`);
                await download.saveAs(file);
                const decoded = spawnSync(ffmpeg, ["-hide_banner", "-i", file, "-f", "null", "NUL"],
                    { encoding: "utf8", windowsHide: true, timeout: 30_000 });
                assert.equal(decoded.status, 0, decoded.stderr);
                assert.equal(renderRequests.length, 0);
                assert.match(decoded.stderr, /Video: h264/);
                const frames = Number([...decoded.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1]);
                assert.equal(frames, entry.seconds * 30);
                const audio = /Audio: aac/.test(decoded.stderr);
                assert.equal(audio, entry.audio === "reference");
                record.export = { file: path.basename(file), sha256: sha256(await readFile(file)), frames, audio, serverRenderRequests: 0 };
            } finally { page.off("request", checkRender); }
        } catch (error) {
            record.failure = error instanceof Error ? error.message.split("\n")[0] : String(error);
            if (runId && !["ready", "failed", "cancelled"].includes(motionRun(runId)?.status)) {
                await page.getByRole("button", { name: "Stop run", exact: true }).first().click({ timeout: 5_000 }).catch(() => {});
            }
        } finally {
            console.log(JSON.stringify(record));
            await writeFile(path.join(evidence, "results.json"), JSON.stringify({ protocolSha256, limits, attempts: results }, null, 2));
        }
    }
} finally {
    clearInterval(jobs);
    await browser.close();
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
    db.close();
}
