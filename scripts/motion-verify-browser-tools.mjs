import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { mockMotionProviders } from "./fixtures/motion-provider.mjs";

const source = process.argv[2];
if (!source) throw new Error("Supply a local H.264 reference MP4 of at least 12.5 seconds.");
const output = path.resolve(import.meta.dirname, "../../runtime/motion-verification");
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(output, "browser-tools-"));
process.env.NODE_SKIP_LEGACY_IMPORT = "1";
process.env.NODE_DATABASE_PATH = path.join(directory, "test.sqlite");
process.env.NODE_MEDIA_ROOT = path.join(directory, "media");

const { app } = await import("../server/app.ts");
const { db, insert, project } = await import("../server/database.ts");
const { hash } = await import("../server/security.ts");
const { commit, document } = await import("../server/document.ts");
const { createMotionProject } = await import("../server/motion/projects.ts");
const { bindMotionReference } = await import("../server/motion/references.ts");
const { addMotionStep, createMotionRun, motionArtifact, motionEvents, motionRun, motionSteps } = await import("../server/motion/store.ts");
const { finishMotionStep, startMotionStep, MotionOrchestrator, queueMotionFeedback, retryMotionRun, motionRunDraft } =
    await import("../server/motion/orchestrator.ts");
const { motionBenchmark } = await import("./fixtures/motion-benchmark.ts");

const api = app.listen(0, "127.0.0.1");
await once(api, "listening");
const target = "http://127.0.0.1:" + api.address().port;
process.env.NODE_APP_ORIGIN = target;
const server = await createServer({
    configLoader: "native",
    cacheDir: "node_modules/.cache/motion-tools-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
    optimizeDeps: { noDiscovery: true, include: ["mediabunny", "zod", ...(process.argv.includes("--graph-editor")
        ? ["react", "react-dom", "react-dom/client", "remotion", "@remotion/web-renderer"] : [])] },
});
let browser;
try {
    await server.listen();
    const base = "http://127.0.0.1:" + server.httpServer.address().port;
    const account = (name) => {
        const owner = Number(insert("users", { name, email: name + "@example.test", password: "x" }));
        const token = randomUUID(), csrf = randomUUID();
        insert("node_sessions", { id: hash(token), user_id: owner, csrf, expires: Date.now() + 300_000 });
        return { owner, token, csrf, headers: { cookie: "vidsai_session=" + token, "X-CSRF-TOKEN": csrf, "Content-Type": "application/json" } };
    };
    const a = account("a"), b = account("b");
    const p = createMotionProject(a.owner, { requestId: randomUUID(), name: "Motion", prompt: "Make it" });
    const asset = randomUUID();
    await mkdir(path.join(process.env.NODE_MEDIA_ROOT, "public"), { recursive: true });
    await copyFile(source, path.join(process.env.NODE_MEDIA_ROOT, "public/ref.mp4"));
    insert("project_assets", { id: asset, project_id: p, path: "ref.mp4", name: "ref.mp4", mime: "video/mp4",
        size: 2_000_000, duration_seconds: 15, created_at: "2026", updated_at: "2026" });
    const ref = await bindMotionReference(p, { assetId: asset, width: 1080, height: 1920, interval: { start: 0, end: 12.5 } });
    const run = createMotionRun(p, a.owner, { requestId: randomUUID(), brief: "Make it", referenceBindingId: ref.bindingId });
    const url = "/motion-runs/" + run.id + "/browser";
    addMotionStep(run.id, { name: "reference_capture", lane: "browser" });
    const claim = (account) => fetch(target + url + "/claim", { method: "POST", headers: account.headers, body: "{}" });
    assert.equal((await claim(b)).status, 404);
    browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
    const context = await browser.newContext();
    await context.addCookies([{ name: "vidsai_session", value: a.token, url: base }]);
    if (process.argv.includes("--reference-audio")) {
        await context.addCookies([{ name: "vidsai_session", value: a.token, url: target }]);
        const setupPage = await context.newPage();
        async function createWithReference(file, muted = false, replacement = null, speech = false, seconds = "5") {
            await setupPage.goto(target + "/create/motion-graphics");
            await setupPage.getByLabel("Project name").fill("Reference audio verification");
            await setupPage.getByLabel("Video brief").fill("Animate the reference with its original timing.");
            await setupPage.getByLabel("Duration").selectOption(seconds);
            await setupPage.getByRole("radio", { name: "Match a reference" }).check();
            await setupPage.getByLabel("Reference video or image").setInputFiles(file);
            await setupPage.getByRole("spinbutton", { name: "Start (seconds)" }).fill("1.25");
            await setupPage.getByRole("spinbutton", { name: "End (seconds)" }).fill("6.25");
            if (muted) await setupPage.getByRole("checkbox", { name: /Mute reference audio/ }).check();
            if (replacement || speech) await setupPage.getByText("Logo and soundtrack").click();
            if (replacement) {
                await setupPage.getByLabel("Soundtrack (optional)").setInputFiles(replacement);
                await setupPage.getByLabel("Soundtrack preview").waitFor();
            }
            if (speech) await setupPage.getByRole("checkbox", { name: /Analyze speech timing/ }).check();
            await setupPage.getByRole("button", { name: "Start creating" }).click();
            await setupPage.waitForURL("**/projects/*/motion?run=*");
            return new URL(setupPage.url()).searchParams.get("run");
        }
        await setupPage.route("**/projects/*/motion-assets", async (route) => {
            await route.fetch();
            await route.abort();
        }, { times: 1 });
        const audioRun = await createWithReference(source);
        await setupPage.getByRole("alert").getByText("The connection dropped during upload.").waitFor();
        const derivedCount = () => db.prepare("SELECT COUNT(*) AS count FROM project_assets WHERE project_id=? AND mime='audio/wav'")
            .get(motionRun(audioRun).project_id).count;
        assert.equal(derivedCount(), 1);
        await setupPage.reload();
        await setupPage.getByRole("button", { name: "Resume setup" }).click();
        await setupPage.getByText("Audio from reference", { exact: true }).waitFor();
        const saved = document(project(motionRun(audioRun).project_id));
        assert.equal(saved.metadata.motion_audio_source, "reference");
        assert.equal(saved.metadata.motion_audio_start, 1.25);
        await setupPage.getByText("The reference keeps its source pacing. The soundtrack keeps its original speed.", { exact: true }).waitFor();
        assert.ok(saved.metadata.motion_cues.length > 0);
        assert.equal(saved.metadata.motion_audio_analysis.energy.length, 50);
        const [track] = saved.tracks.audio;
        assert.equal(track.start_frame, 0);
        assert.equal(track.end_frame, 150);
        assert.equal(track.volume, 1);
        assert.equal(track.fade_in_frames + track.fade_out_frames, 0);
        const derived = db.prepare(`SELECT a.path, a.duration_seconds, m.provenance FROM project_assets a
            JOIN motion_asset_metadata m ON m.asset_id=a.id WHERE a.id=?`).get(track.url.slice("asset:".length));
        assert.equal(derived.duration_seconds, 5);
        const provenance = JSON.parse(derived.provenance);
        assert.equal(provenance.startSeconds, 1.25);
        assert.equal(provenance.audioExtraction.conversionVersion, 1);
        assert.ok(Number.isInteger(provenance.audioExtraction.trackId));
        assert.match(provenance.audioExtraction.sourceSha256, /^[a-f0-9]{64}$/);
        assert.equal(derivedCount(), 1);
        await setupPage.addInitScript(() => {
            if (sessionStorage.getItem("interrupt-audio-fixture") !== "armed") return;
            const decode = AudioDecoder.prototype.decode;
            AudioDecoder.prototype.decode = function (chunk) {
                if (sessionStorage.getItem("interrupt-audio-fixture") === "armed") {
                    sessionStorage.setItem("interrupt-audio-fixture", "interrupted");
                    location.reload();
                }
                return decode.call(this, chunk);
            };
        });
        await setupPage.evaluate(() => sessionStorage.setItem("interrupt-audio-fixture", "armed"));
        const interruptedRun = await createWithReference(source);
        await setupPage.getByRole("button", { name: "Resume setup" }).waitFor();
        assert.equal(await setupPage.evaluate(() => sessionStorage.getItem("interrupt-audio-fixture")), "interrupted");
        await setupPage.getByRole("button", { name: "Resume setup" }).click();
        await setupPage.getByText("Audio from reference", { exact: true }).waitFor();
        assert.equal(document(project(motionRun(interruptedRun).project_id)).metadata.motion_audio_source, "reference");
        const mutedRun = await createWithReference(source, true);
        await setupPage.getByRole("heading", { name: "Preparing your project" }).waitFor({ state: "hidden" });
        const muted = document(project(motionRun(mutedRun).project_id));
        assert.equal(muted.metadata.motion_audio_source, "muted");
        assert.equal(muted.tracks.audio.length, 0);
        const silentArg = process.argv.indexOf("--silent-reference");
        if (silentArg >= 0) {
            const silentRun = await createWithReference(process.argv[silentArg + 1]);
            await setupPage.getByRole("heading", { name: "Preparing your project" }).waitFor({ state: "hidden" });
            const silent = document(project(motionRun(silentRun).project_id));
            assert.equal(silent.metadata.motion_audio_source, "silent");
            assert.equal(silent.tracks.audio.length, 0);
        }
        const unsupportedArg = process.argv.indexOf("--unsupported-reference-audio");
        if (unsupportedArg >= 0) {
            const unsupportedRun = await createWithReference(process.argv[unsupportedArg + 1]);
            await setupPage.getByRole("alert").getByText(/reference audio could not be decoded/).waitFor();
            await setupPage.getByRole("checkbox", { name: "Mute reference audio", exact: true }).check();
            await setupPage.getByRole("button", { name: "Resume setup" }).click();
            await setupPage.getByRole("heading", { name: "Preparing your project" }).waitFor({ state: "hidden" });
            const recovered = document(project(motionRun(unsupportedRun).project_id));
            assert.equal(recovered.metadata.motion_audio_source, "muted");
            assert.equal(recovered.tracks.audio.length, 0);
            assert.ok(motionRun(unsupportedRun).reference_binding_id);
            console.log("An unsupported reference audio codec recovered through the mute control.");
        }
        const replacementArg = process.argv.indexOf("--replacement-audio");
        if (replacementArg >= 0) {
            const replacedRun = await createWithReference(source, false, process.argv[replacementArg + 1], false, "8");
            await setupPage.getByRole("heading", { name: "Preparing your project" }).waitFor({ state: "hidden" });
            await setupPage.getByText("Reference pacing is scaled to the project duration. The soundtrack keeps its original speed.", { exact: true }).waitFor();
            const replaced = document(project(motionRun(replacedRun).project_id));
            assert.equal(replaced.metadata.motion_audio_source, "uploaded");
            assert.equal(replaced.tracks.audio.length, 1);
            assert.equal(replaced.tracks.audio[0].end_frame, 240);
        }
        if (process.argv.includes("--speech-timing")) {
            const speechRun = await createWithReference(source, false, null, true);
            await setupPage.getByText("Audio from reference", { exact: true }).waitFor();
            const originalFetch = globalThis.fetch;
            const endpoint = process.env.DEEPGRAM_BASE_URL;
            const key = process.env.DEEPGRAM_API_KEY;
            process.env.DEEPGRAM_BASE_URL = "https://speech.fixture.invalid/v1/listen";
            process.env.DEEPGRAM_API_KEY = "fixture-only";
            let requested = false;
            globalThis.fetch = async (url, init) => {
                if (!String(url).startsWith("https://speech.fixture.invalid/")) return originalFetch(url, init);
                assert.equal(init.headers["Content-Type"], "audio/wav");
                assert.ok(init.signal && init.body.length > 44);
                requested = true;
                const words = [{ start: 0.5, end: 0.75, confidence: 0.98 }, { start: 0.8, end: 1, confidence: 0.93 },
                    { start: 1.6, end: 2, confidence: 0.95 }];
                return Response.json({ results: { channels: [{ alternatives: [{ transcript: "fixture", words }] }] } });
            };
            try { await new MotionOrchestrator().tick(speechRun); }
            finally {
                globalThis.fetch = originalFetch;
                if (endpoint === undefined) delete process.env.DEEPGRAM_BASE_URL; else process.env.DEEPGRAM_BASE_URL = endpoint;
                if (key === undefined) delete process.env.DEEPGRAM_API_KEY; else process.env.DEEPGRAM_API_KEY = key;
            }
            assert.ok(requested);
            const step = motionSteps(speechRun).find(({ name }) => name === "audio_speech");
            const artifact = JSON.parse(motionArtifact(speechRun, step.result_id).body.toString());
            assert.deepEqual(artifact.spans, [{ startFrame: 15, endFrame: 30, confidence: 0.93 },
                { startFrame: 48, endFrame: 60, confidence: 0.95 }]);
            console.log("Opt-in speech timing accepted the owned WAV and saved two phrase spans.");
        }
        if (process.argv.includes("--audio-export")) {
            const projectId = motionRun(audioRun).project_id;
            const { motionQualityCases } = await import("./fixtures/motion-quality-cases.ts");
            const { scene } = motionQualityCases.audioReactive;
            commit(project(projectId), { commandId: randomUUID(), expectedRevision: saved.revision, operations: [
                { tool: "replace_motion_plan", params: { title: "Reference audio export", scenes: [{ ...scene, end_frame: 150 }] } },
            ] });
            await setupPage.goto(target + `/projects/${projectId}/editor`);
            await setupPage.getByRole("button", { name: "Export video" }).click();
            await setupPage.getByText("Export: done", { exact: true }).waitFor({ timeout: 90_000 });
            const [file] = await Promise.all([
                setupPage.waitForEvent("download"), setupPage.getByRole("link", { name: "Download MP4" }).click(),
            ]);
            const exported = path.join(directory, "reference-audio-export.mp4");
            await file.saveAs(exported);
            console.log("Browser export with reference audio:", exported);
        }
        console.log("Reference audio extraction, trim, setup recovery, and mute passed. Extracted WAV:", path.join(process.env.NODE_MEDIA_ROOT, "private", derived.path));
        await setupPage.close();
    }
    const page = await context.newPage();
    await page.route(base + "/__motion_tool", (r) => r.fulfill({ contentType: "text/html",
        body: '<!doctype html><meta name="csrf-token" content="' + a.csrf + '"><title>Motion tools</title>' }));
    await page.goto(base + "/__motion_tool");
    if (process.argv.includes("--audio-timing")) {
        const timing = await page.evaluate(async () => (await import("/scripts/fixtures/motion-audio-timing.ts")).analyzeStereoRhythmFixture());
        assert.equal(timing.analysis.rhythm.bpm, 120);
        assert.ok(timing.analysis.silence.some(({ start, end }) => start === 0 && end >= 0.4));
        assert.ok(timing.analysis.silence.some(({ end }) => end === 4));
        assert.equal(timing.cues.length, 6);
        console.log("Stereo audio analysis found the expected onsets, silence and 120 BPM rhythm.");
    }
    if (process.argv.includes("--quality-fixtures")) {
        const checks = await page.evaluate(async () => {
            const { motionQualityCases } = await import("/scripts/fixtures/motion-quality-cases.ts");
            const { drawMotionFrame } = await import("/shared/motion/render.ts");
            const canvas = new OffscreenCanvas(640, 360);
            const ctx = canvas.getContext("2d");
            function inspect(scene, audioLevel) {
                drawMotionFrame({ ctx, scene, frame: 59, fps: 30, width: 640, height: 360, audioLevel }, { fontFamily: "Arial" });
                const pixels = ctx.getImageData(0, 0, 640, 360).data;
                let white = 0, lowerWhite = 0;
                for (let index = 0; index < pixels.length; index += 4) {
                    if (pixels[index] < 225 || pixels[index + 1] < 225 || pixels[index + 2] < 225) continue;
                    white++;
                    if (index >= 640 * 4 * 220) lowerWhite++;
                }
                return { white, lowerWhite, corner: Array.from(pixels.slice(0, 3)) };
            }
            return Object.fromEntries(Object.entries(motionQualityCases).map(([key, fixture]) =>
                [key, fixture.corrected ? [inspect(fixture.scene), inspect(fixture.corrected)] : [inspect(fixture.scene, 0), inspect(fixture.scene, 1)]]));
        });
        assert.equal(checks.occludedLabel[0].white, 0);
        assert.ok(checks.occludedLabel[1].white > 0);
        assert.ok(checks.clippedHeadline[0].white > 0 && checks.clippedHeadline[0].white < checks.clippedHeadline[1].white);
        assert.equal(checks.missingCta[0].lowerWhite, 0);
        assert.ok(checks.missingCta[1].lowerWhite > 0);
        assert.deepEqual(checks.wrongComponent.map(({ corner }) => corner), [[255, 34, 0], [16, 16, 16]]);
        assert.ok(checks.audioReactive[1].white > checks.audioReactive[0].white * 2);
        console.log("Browser fixtures reproduce covered labels, clipped copy, missing CTA and the wrong impact background.");
    }
    if (process.argv.includes("--graph-style")) {
        const painted = await page.evaluate(async () => {
            const { drawMotionFrame } = await import("/shared/motion/render.ts");
            const { motionSceneSchema } = await import("/shared/motion/schema.ts");
            const { prepareMotionFont } = await import("/shared/motion/browser-assets.ts");
            const scene = motionSceneSchema.parse({ id: "paint", type: "graph", componentVersion: 1, start_frame: 0, end_frame: 60,
                palette: { background: "#101010", foreground: "#ffffff", primary: "#ff2200", muted: "#333333", accent: "#ffffff" },
                params: { version: 1, layers: [
                    { kind: "rect", id: "panel", transform: { x: 0.5, y: 0.25 }, width: 0.9, height: 0.2, color: "primary",
                        gradient: { x0: -0.45, y0: 0, x1: 0.45, y1: 0, stops: [{ at: 0, color: "#ff0000" }, { at: 1, color: "#0000ff" }] },
                        outline: { color: "#ffffff", width: 0.01 }, shadow: { color: "#ffffff", opacity: 1, x: 0, y: 0.05, blur: 0.03 } },
                    { kind: "text", id: "status", transform: { x: 0.5, y: 0.65 }, size: 0.14, maxWidth: 0.9, text: "READY NOW",
                        typography: { family: "space_mono", boxHeight: 0.35, lineHeight: 1.2, align: "left" },
                        spans: [{ text: "READY ", color: "success", style: "italic", weight: 700 }, { text: "NOW", color: "#ff00ff" }] },
                ] } });
            const assets = await prepareMotionFont(scene, AbortSignal.timeout(5000));
            const ctx = new OffscreenCanvas(640, 360).getContext("2d");
            drawMotionFrame({ ctx, scene, frame: 0, fps: 30, width: 640, height: 360 }, assets);
            const pixel = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3);
            const samples = ctx.getImageData(0, 180, 640, 150).data;
            let green = 0, magenta = 0;
            for (let i = 0; i < samples.length; i += 4) {
                if (samples[i] < 50 && samples[i + 1] > 175 && samples[i + 2] < 120) green++;
                if (samples[i] > 230 && samples[i + 1] < 30 && samples[i + 2] > 230) magenta++;
            }
            return { left: pixel(170, 90), right: pixel(470, 90), outline: pixel(320, 54), glow: pixel(320, 142), green, magenta,
                fonts: [...document.fonts].filter(({ family, status }) => family.replace(/["']/g, "") === "VidsAI Space Mono" && status === "loaded")
                    .map(({ style, weight }) => `${style} ${weight}`).sort() };
        });
        assert.ok(painted.left[0] > 220 && painted.right[2] > 220);
        assert.ok(painted.outline.every((value) => value > 225));
        assert.ok(painted.glow.every((value) => value > 70));
        assert.ok(painted.green > 200 && painted.magenta > 200);
        assert.deepEqual(painted.fonts, ["italic 400", "italic 700", "normal 700", "normal normal"]);
        console.log("Canvas rendered a gradient, outline, glow and mixed styled spans with the bundled font faces and semantic status color.");
    }
    if (process.argv.includes("--graph-animation")) {
        const inspected = await page.evaluate(async () => {
            const { motionSceneSchema } = await import("/shared/motion/schema.ts");
            const { drawMotionFrame } = await import("/shared/motion/render.ts");
            const track = (property, from = 0, to = 1) => ({ property, start: 0.2, end: 0.8, from, to });
            const scene = motionSceneSchema.parse({ id: "timeline", type: "graph", componentVersion: 1, start_frame: 0, end_frame: 101,
                finish: { grain: 0, vignette: 0 }, params: { version: 1, layers: [
                    { id: "line", kind: "path", color: "#ff0000", stroke: 0.02, transform: { x: 0.2, y: 0.15 },
                        commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 0.6, y: 0 }], animation: [track("draw")] },
                    { id: "clip", kind: "rect", color: "#00ff00", width: 0.6, height: 0.16, transform: { x: 0.5, y: 0.35 },
                        animation: [track("reveal"), track("deform", 0.18, 0.18)] },
                    { id: "typing", kind: "text", text: "ONE TWO", color: "#ffffff", size: 0.15, maxWidth: 0.8,
                        transform: { x: 0.5, y: 0.6 }, animation: [track("textReveal")] },
                    { id: "wave", kind: "widget", variant: "waveform", color: "#ff00ff", width: 0.55, height: 0.15,
                        waveformCycles: 3, waveformSeed: 45, transform: { x: 0.5, y: 0.85 } },
                ] } });
            const ctx = new OffscreenCanvas(360, 360).getContext("2d");
            const frames = [];
            for (const frame of [50, 10, 90, 50]) {
                drawMotionFrame({ ctx, scene, frame, fps: 30, width: 360, height: 360 }, { fontFamily: "Arial" });
                const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3);
                const data = ctx.getImageData(0, 0, 360, 360).data;
                const digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].join(",");
                let white = 0;
                for (let i = 0; i < data.length; i += 4) if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) white++;
                frames.push({ whole: await digest(data), wave: await digest(ctx.getImageData(0, 280, 360, 70).data), white,
                    line: [pixel(125, 54), pixel(245, 54)], clip: [pixel(140, 126), pixel(235, 126)] });
            }
            return frames;
        });
        const [middle, early, late, again] = inspected;
        assert.deepEqual(middle, again);
        assert.notEqual(early.wave, late.wave);
        assert.equal(early.white, 0);
        assert.ok(middle.white > 0 && middle.white < late.white);
        assert.deepEqual(middle.line[0], [255, 0, 0]);
        assert.notDeepEqual(middle.line[1], middle.line[0]);
        assert.deepEqual(late.line[1], middle.line[0]);
        assert.deepEqual(middle.clip[0], [0, 255, 0]);
        assert.notDeepEqual(middle.clip[1], middle.clip[0]);
        assert.deepEqual(late.clip[1], middle.clip[0]);
        console.log("Explicit intervals revealed strokes, masks and text while a silent waveform animated. Seeking reproduced the same pixels.");
    }
    if (process.argv.includes("--graph-continuity")) {
        const cut = await page.evaluate(async () => {
            const { motionTrackSchema, defaultMotionPalette } = await import("/shared/motion/schema.ts");
            const { motionContinuityTarget } = await import("/shared/motion/continuity.ts");
            const { drawMotionFrame } = await import("/shared/motion/render.ts");
            const { motionBenchmark } = await import("/scripts/fixtures/motion-benchmark.ts");
            const { validateBrowserRenderProfile, prepareBrowserExportTimeline } = await import("/resources/js/editor/browser-export/profile.ts");
            const node = { id: "shared", kind: "rect", color: "#ff3300", width: 0.1, height: 0.15 };
            const common = { type: "graph", componentVersion: 1, finish: { grain: 0, vignette: 0 }, palette: defaultMotionPalette };
            const scenes = motionTrackSchema.parse([
                { ...common, id: "first", start_frame: 0, end_frame: 30, params: { layers: [{ ...node, transform: { x: 0.25 } }],
                    continuity: { nextSceneId: "second", frames: 15, nodeIds: ["shared"] } } },
                { ...common, id: "second", start_frame: 30, end_frame: 60,
                    params: { layers: [{ ...node, transform: { x: 0.75 } }] } },
            ]);
            const ctx = new OffscreenCanvas(320, 180).getContext("2d");
            const draw = (scene, frame, track = scenes) => {
                drawMotionFrame({ ctx, scene, nextScene: motionContinuityTarget(scene, track), frame, fps: 30, width: 320, height: 180 }, { fontFamily: "Arial" });
                const data = ctx.getImageData(0, 90, 320, 1).data;
                return Array.from({ length: 320 }, (_, x) => x).filter((x) => data[x * 4] === 255 && data[x * 4 + 1] === 51);
            };
            const draft = motionBenchmark(false);
            const snapshot = { ...draft, width: 1920, height: 1080, fps: 30, total_frames: 60,
                tracks: { ...draft.tracks, motion_graphics: scenes } };
            const scaled = prepareBrowserExportTimeline(snapshot, "motion1080smooth").tracks.motion_graphics;
            const shadow = { color: "#000000", x: 0, y: 0, opacity: 1, blur: 0.01 };
            const withEffects = (scene, count) => ({ ...scene, params: { layers: Array.from({ length: count }, (_, i) => ({ ...node, id: "shadow-" + i, shadow })) } });
            const costly = { ...snapshot, tracks: { ...snapshot.tracks, motion_graphics: [withEffects(scenes[0], 3), { ...withEffects(scenes[1], 3), start_frame: 24 }] } };
            return { end: draw(scenes[0], 29), early: draw(scenes[0], 0), middle: draw(scenes[0], 22),
                start: draw(scenes[1], 0), again: draw(scenes[0], 29), at60: draw(scaled[0], 59, scaled),
                scaledFrames: scaled[0].params.continuity.frames,
                budget: validateBrowserRenderProfile(costly, costly, "motion1080").filter(({ code }) => code === "motion_complexity") };
        });
        assert.deepEqual(cut.end, cut.start);
        assert.deepEqual(cut.end, cut.again);
        assert.deepEqual(cut.end, cut.at60);
        assert.ok(cut.early[0] < cut.middle[0] && cut.middle[0] < cut.end[0]);
        assert.equal(cut.scaledFrames, 30);
        assert.ok(cut.budget.some(({ message }) => message.includes("effects or assets")));
        console.log("A shared layer moved continuously across a cut at both frame rates and overlapping effects were charged to the browser budget.");
    }
    const runTool = async () => {
        const [submitted, result] = await Promise.all([
            page.waitForRequest((req) => req.method() === "PUT" && req.url().includes(url), { timeout: 45_000 }),
            page.evaluate(async (id) => (await import("/resources/js/editor/motion/browser-runner.ts"))
                .runNextMotionBrowserTask(id, AbortSignal.timeout(45_000)), run.id),
        ]);
        assert.equal(result, true);
        return { payload: submitted.postDataJSON(), route: new URL(submitted.url()).pathname };
    };
    const captured = await runTool();
    assert.ok(captured.payload.result.measured.timestamps.length >= 24);
    assert.ok(captured.payload.result.images.length >= 2);
    if (process.argv.includes("--subtle-reference")) {
        const { candidateChanges, timestamps } = captured.payload.result.measured;
        assert.ok(candidateChanges.length > 0);
        assert.ok(timestamps.length > 24 && timestamps.length <= 32);
        assert.ok(candidateChanges.some(({ score }) => score < 0.17));
        console.log(`Localized changes triggered ${timestamps.length - 24} additional browser samples.`);
    }
    const send = (data, route) => fetch(target + route, { method: "PUT", headers: a.headers, body: JSON.stringify(data) });
    assert.deepEqual(await (await send(captured.payload, captured.route)).json(), { duplicate: true });
    const different = structuredClone(captured.payload);
    different.result.images[0].sha256 = "0".repeat(64);
    assert.equal((await send(different, captured.route)).status, 409);
    const draft = motionBenchmark(false);
    draft.project_id = String(p);
    addMotionStep(run.id, { name: "assemble", lane: "local" });
    const assemble = motionSteps(run.id).find(({ name }) => name === "assemble");
    db.transaction(() => {
        assert.ok(finishMotionStep(run, startMotionStep(run, assemble, 10_000), { value: { document: draft } }));
    }).immediate();
    addMotionStep(run.id, { name: "preview:1", lane: "browser", input: { round: 1 }, dependencies: ["assemble"] });
    const preview = await runTool();
    assert.equal(preview.payload.result.frames.length, draft.tracks.motion_graphics.length * 3);
    assert.equal(preview.payload.result.images.length, Math.ceil(preview.payload.result.frames.length / preview.payload.result.framesPerSheet));
    assert.ok(preview.payload.result.images[0].base64.length > 10_000);
    const renderedAgain = await page.evaluate(async (snapshot) =>
        (await import("/resources/js/editor/motion/browser-runner.ts")).runMotionBrowserInput(
            { tool: "preview", document: snapshot }, AbortSignal.timeout(10_000)), draft);
    assert.deepEqual(renderedAgain, preview.payload.result);
    const changed = structuredClone(draft);
    changed.tracks.motion_graphics[0].palette.background = "#001030";
    const renderedChange = await page.evaluate(async (snapshot) =>
        (await import("/resources/js/editor/motion/browser-runner.ts")).runMotionBrowserInput(
            { tool: "preview", document: snapshot }, AbortSignal.timeout(10_000)), changed);
    assert.notEqual(renderedChange.images[0].sha256, renderedAgain.images[0].sha256);
    const completed = motionSteps(run.id).find(({ name }) => name === "preview:1");
    assert.ok(motionArtifact(run.id, completed.result_id).digest);
    addMotionStep(run.id, { name: "preview:2", lane: "browser", input: { round: 1 }, dependencies: ["assemble"] });
    const { task } = await (await claim(a)).json();
    assert.ok(task.token);
    assert.equal((await (await claim(a)).json()).task, null);
    const invalid = { token: task.token, expectedRevision: task.expectedRevision, result: structuredClone(preview.payload.result) };
    invalid.result.images[0].sha256 = "0".repeat(64);
    assert.equal((await send(invalid, url + "/" + task.id)).status, 422);
    const heartbeat = () => fetch(target + url + "/" + task.id + "/heartbeat", {
        method: "POST", headers: a.headers, body: JSON.stringify({ token: task.token }),
    });
    const renewed = await heartbeat();
    assert.ok((await renewed.json()).leaseExpires >= task.leaseExpires);
    await page.close();
    db.prepare("UPDATE motion_steps SET lease_expires=? WHERE id=?").run(Date.now() - 1, task.id);
    assert.equal((await heartbeat()).status, 409);
    const { task: recovered } = await (await claim(a)).json();
    assert.equal(recovered.id, task.id);
    assert.notEqual(recovered.token, task.token);
    assert.equal((await send({ ...invalid, result: preview.payload.result }, url + "/" + task.id)).status, 409);
    const current = document(project(p));
    db.prepare("UPDATE projects SET edit_state=? WHERE id=?")
        .run(JSON.stringify({ ...current, revision: current.revision + 1, version: current.version + 1 }), p);
    assert.equal((await send({ ...invalid, token: recovered.token, result: preview.payload.result }, url + "/" + task.id)).status, 409);
    const secondProject = createMotionProject(a.owner, { requestId: randomUUID(), name: "Recovery", prompt: "Test restart" });
    const secondRun = createMotionRun(secondProject, a.owner, { requestId: randomUUID(), brief: "Test restart" });
    addMotionStep(secondRun.id, { name: "director", lane: "provider" });
    const oldStep = motionSteps(secondRun.id)[0];
    const oldLease = startMotionStep(secondRun, oldStep, 1);
    await new Promise((resolve) => setTimeout(resolve, 4));
    const restarted = new MotionOrchestrator(async (_run, step) => {
        assert.equal(step.id, oldStep.id);
        assert.notEqual(step.lease_token, oldLease.lease_token);
        return { value: { value: "mocked provider output after restart" } };
    });
    await restarted.tick(secondRun.id);
    const resumed = motionSteps(secondRun.id).find(({ id }) => id === oldStep.id);
    assert.equal(resumed.attempts, 2);
    assert.equal(resumed.status, "done");
    const newRun = () => {
        const projectId = createMotionProject(a.owner, { requestId: randomUUID(), name: "Motion", prompt: "Make it" });
        return createMotionRun(projectId, a.owner, { requestId: randomUUID(), brief: "Make it" });
    };
    const third = newRun();
    const entered = Promise.withResolvers();
    const cancellable = new MotionOrchestrator(async (_run, _step, _budget, signal) => {
        entered.resolve(signal);
        await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
        return { value: "Late output" };
    });
    const inflight = cancellable.tick(third.id);
    const signal = await entered.promise;
    assert.equal(cancellable.cancel(third.id, a.owner).status, "cancelled");
    assert.equal(signal.aborted, true);
    await inflight;
    assert.ok(motionSteps(third.id).every(({ status }) => status === "cancelled"));
    assert.equal(retryMotionRun(third.id, a.owner).status, "queued");
    assert.equal(motionSteps(third.id)[0].attempts, 1);
    addMotionStep(third.id, { name: "assemble", lane: "local" });
    const draftStep = motionSteps(third.id).find(({ name }) => name === "assemble");
    db.transaction(() => {
        const snapshot = document(project(third.project_id));
        assert.ok(finishMotionStep(third, startMotionStep(third, draftStep, 1000),
            { value: { document: snapshot, plan: { title: "Saved draft", scenes: [] } } }));
    }).immediate();
    const feedback = { requestId: randomUUID(), text: "Use a warm orange palette." };
    assert.deepEqual(queueMotionFeedback(third.id, a.owner, feedback), { replacementRunId: null });
    assert.deepEqual(queueMotionFeedback(third.id, a.owner, feedback), { replacementRunId: null });
    const idle = new MotionOrchestrator(async () => { throw new Error("Apply feedback before taking work."); });
    await idle.tick(third.id);
    const { replacementRunId } = queueMotionFeedback(third.id, a.owner, feedback);
    assert.ok(replacementRunId);
    assert.equal(motionRun(third.id).status, "cancelled");
    assert.match(motionRun(replacementRunId).brief, /warm orange palette/);
    assert.equal(motionEvents(third.id, 0).filter(({ type }) => type === "feedback_queued").length, 1);
    assert.equal(motionRunDraft(third).plan.title, "Saved draft");
    assert.throws(() => retryMotionRun(third.id, a.owner));
    const fourth = newRun();
    queueMotionFeedback(fourth.id, a.owner, { ...feedback, requestId: randomUUID() });
    const edited = document(project(fourth.project_id));
    db.prepare("UPDATE projects SET edit_state=? WHERE id=?")
        .run(JSON.stringify({ ...edited, revision: edited.revision + 1, version: edited.version + 1 }), fourth.project_id);
    await idle.tick(fourth.id);
    assert.equal(motionRun(fourth.id).status, "failed");
    assert.match(motionRun(fourth.id).error, /project changed/i);
    assert.equal(document(project(fourth.project_id)).revision, edited.revision + 1);
    const fifth = newRun();
    const snapshot = document(project(fifth.project_id));
    const good = { ...draft.tracks.motion_graphics[0], end_frame: snapshot.total_frames };
    const bad = { ...good, palette: { ...good.palette, primary: good.palette.background } };
    const complete = (name, lane, value) => {
        addMotionStep(fifth.id, { name, lane });
        const step = motionSteps(fifth.id).find((step) => step.name === name);
        db.transaction(() => assert.ok(finishMotionStep(fifth, startMotionStep(fifth, step, 1000), { value }))).immediate();
    };
    complete("director", "provider", { value: { title: "Motion", summary: "Opening scene", look: "studio",
        scenes: [{ id: good.id, type: good.type, start_frame: 0, end_frame: good.end_frame, purpose: "Opening scene", copy: "" }] } });
    complete("copy", "provider", {});
    complete("design", "provider", { value: { decision: "Legacy design artifact", scenes: [{ id: good.id, palette: good.palette, layout: good.layout, font: good.font }] } });
    complete("engineer:" + good.id, "provider", { value: { scene: bad, approximation: null, decision: "First pass" } });
    const realAssembly = new MotionOrchestrator();
    await realAssembly.tick(fifth.id);
    assert.equal(motionRunDraft(fifth), null);
    const repair = new MotionOrchestrator(async (_run, step) => {
        assert.equal(step.name, "repair:1:" + good.id);
        assert.deepEqual(JSON.parse(step.dependencies), ["assemble"]);
        return { value: { value: { scene: good, approximation: null, decision: "Restored readable colors" } } };
    });
    await repair.tick(fifth.id);
    assert.ok(!motionSteps(fifth.id).some(({ name }) => name === "preview:1"));
    await realAssembly.tick(fifth.id);
    await realAssembly.tick(fifth.id);
    assert.equal(motionRun(fifth.id).status, "waiting_for_browser");
    assert.ok(motionSteps(fifth.id).some(({ name, status }) => name === "preview:2" && status === "pending"));
    assert.equal(motionRunDraft(fifth).plan.scenes[0].palette.primary, good.palette.primary);
    const graphProject = createMotionProject(a.owner, { requestId: randomUUID(), name: "Graph", prompt: "Make a reference reel" });
    const graphAsset = randomUUID();
    insert("project_assets", { id: graphAsset, project_id: graphProject, path: "ref.mp4", name: "ref.mp4", mime: "video/mp4",
        size: 2_000_000, duration_seconds: 15, created_at: "2026", updated_at: "2026" });
    const graphRef = await bindMotionReference(graphProject, { assetId: graphAsset, width: 1080, height: 1920, interval: { start: 0, end: 12.5 } });
    const graphRun = createMotionRun(graphProject, a.owner, { requestId: randomUUID(), brief: "Make a reference reel", referenceBindingId: graphRef.bindingId });
    const graphPage = await context.newPage();
    await graphPage.route(base + "/__motion_graph", (r) => r.fulfill({ contentType: "text/html",
        body: '<!doctype html><meta name="csrf-token" content="' + a.csrf + '"><title>Motion graph</title>' }));
    await graphPage.goto(base + "/__motion_graph");
    const graphic = [
        { ...draft.tracks.motion_graphics[0], end_frame: 225 },
        { ...draft.tracks.motion_graphics[2], start_frame: 225, end_frame: 450 },
    ];
    const rejectReferenceOutline = process.argv.includes("--reference-fallback");
    const rejectCopywriter = process.argv.includes("--copy-fallback");
    const rejectGraphEngineer = process.argv.includes("--engineer-fallback");
    const useGraphEngineer = rejectGraphEngineer || process.argv.includes("--graph-engineer");
    const rejectCritic = process.argv.includes("--review-fallback");
    const rejectCriticAfterRepair = process.argv.includes("--review-after-repair-fallback");
    if (useGraphEngineer) graphic[1] = { ...graphic[1], type: "graph" };
    const rejectDetailVision = process.argv.includes("--detail-vision-fallback");
    const rejectSpec = process.argv.includes("--reference-spec-fallback");
    const referenceMapping = process.argv.includes("--reference-mapping");
    const referenceFollowup = process.argv.includes("--reference-followup");
    const componentCompatibility = process.argv.includes("--component-compatibility");
    let graphAssets;
    if (process.argv.includes("--graph-assets")) {
        assert.ok(componentCompatibility, "Use --component-compatibility with --graph-assets.");
        const upload = (kind, name, file, headers = a.headers) => {
            const form = new FormData();
            form.set("kind", kind);
            form.set("provenance", JSON.stringify({ kind: "imported" }));
            form.set("file", file, name);
            return fetch(`${target}/projects/${graphProject}/motion-assets`, { method: "POST",
                headers: { cookie: headers.cookie, "X-CSRF-TOKEN": headers["X-CSRF-TOKEN"] }, body: form });
        };
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#2458ff" d="M 0 0 L 16 0 L 16 16 L 0 16 Z"/></svg>`;
        assert.equal((await upload("vectors", "foreign.svg", new Blob([svg]), b.headers)).status, 404);
        assert.equal((await upload("vectors", "unsupported.svg", new Blob(['<svg viewBox="0 0 10 10"><text x="1" y="1">label</text></svg>']))).status, 422);
        const vector = await upload("vectors", "shape.svg", new Blob([svg]));
        assert.equal(vector.status, 201);
        const vectorAsset = await vector.json();
        const stored = await fetch(`${target}/projects/${graphProject}/assets/${vectorAsset.id}`, { headers: a.headers });
        assert.match(stored.headers.get("content-type"), /^application\/json/);
        assert.match((await stored.json()).sourceSha256, /^[a-f0-9]{64}$/);
        assert.deepEqual(vectorAsset.provenance, { kind: "imported" });
        const png = await graphPage.evaluate(async () => {
            const canvas = new OffscreenCanvas(8, 8);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ff22a0";
            ctx.fillRect(0, 0, 8, 8);
            return [...new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer())];
        });
        const image = await upload("image", "square.png", new Blob([Uint8Array.from(png)], { type: "image/png" }));
        assert.equal(image.status, 201);
        graphAssets = { vector: vectorAsset.id, image: (await image.json()).id };
    }
    const { stages, reasoning, restore } = mockMotionProviders(graphic, { rejectReferenceOutline, rejectCopywriter, rejectGraphEngineer, rejectCritic, rejectCriticAfterRepair, rejectDetailVision, rejectSpec, referenceMapping, referenceFollowup, componentCompatibility, graphAssets });
    let rejectedFollowup = false;
    if (referenceFollowup) await graphPage.route(`**/motion-runs/${graphRun.id}/browser/*`, async (route) => {
        if (route.request().method() === "PUT") {
            const payload = route.request().postDataJSON();
            if (payload.result.followups?.length) {
                payload.result.followups[0].bounds.left = 0;
                const rejected = await route.fetch({ postData: payload });
                rejectedFollowup = rejected.status() === 422;
            }
        }
        await route.continue();
    });
    try {
        const graph = new MotionOrchestrator();
        for (let tick = 0; tick < 25 && motionRun(graphRun.id).status !== "ready"; tick++) {
            await graph.tick(graphRun.id);
            const current = motionRun(graphRun.id);
            assert.notEqual(current.status, "failed", current.error);
            if (current.status === "waiting_for_browser") {
                assert.equal(await graphPage.evaluate(async (id) =>
                    (await import("/resources/js/editor/motion/browser-runner.ts"))
                        .runNextMotionBrowserTask(id, AbortSignal.timeout(45_000)), graphRun.id), true);
            }
        }
    } finally {
        restore();
    }
    assert.equal(motionRun(graphRun.id).status, "ready");
    const specStep = motionSteps(graphRun.id).find(({ name }) => name === "reference_spec");
    const specification = JSON.parse(motionArtifact(graphRun.id, specStep.result_id).body.toString());
    assert.equal(specification.source, rejectSpec ? "observations" : "vision");
    assert.deepEqual(specification.specs.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
    if (rejectSpec) assert.ok(specification.specs.every(({ objects, events, uncertainties }) => !objects.length && !events.length && uncertainties.length));
    else assert.ok(specification.specs.every(({ objects, events }) => objects.length > 0 && events.length > 0));
    const detailStep = motionSteps(graphRun.id).find(({ name }) => name === "reference_detail");
    const detail = JSON.parse(motionArtifact(graphRun.id, detailStep.result_id).body.toString());
    assert.deepEqual(detail.samples.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
    assert.equal(new Set(detail.samples.map(({ time }) => time)).size, graphic.length);
    const followupStep = motionSteps(graphRun.id).find(({ name }) => name === "reference_followup");
    if (referenceFollowup) {
        assert.ok(rejectedFollowup);
        assert.equal(stages.filter((stage) => stage === "reference-spec").length, 1);
        assert.deepEqual(specification.requests.map(({ reason }) => reason), ["Read the control label.", "Check the later layout."]);
        const followup = JSON.parse(motionArtifact(graphRun.id, followupStep.result_id).body.toString());
        assert.equal(followup.bindingId, graphRef.bindingId);
        assert.deepEqual(followup.followups.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
        assert.deepEqual(followup.followups[0].bounds, { left: 0.125, top: 0.25, width: 0.625, height: 0.5 });
        assert.equal(followup.followups[1].bounds, undefined);
        assert.ok(Math.abs(followup.followups[1].sourceTime - detail.samples[1].time) > 0.04);
        assert.deepEqual(await graphPage.evaluate(async (images) => Promise.all(images.map(async ({ base64 }) => {
            const bitmap = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${base64}`)).blob());
            try { return Math.max(bitmap.width, bitmap.height); } finally { bitmap.close(); }
        })), followup.images), [640, 960]);
        console.log("Follow-up crop and full frame reached the assigned routes. An out-of-scene request and tampered crop were rejected.");
    } else assert.equal(followupStep, undefined);
    if (referenceMapping) {
        const director = motionSteps(graphRun.id).find(({ name }) => name === "director");
        const { value: plan } = JSON.parse(motionArtifact(graphRun.id, director.result_id).body.toString());
        assert.equal(plan.referenceIntent, "match");
        assert.equal(plan.timingMode, "source");
        assert.deepEqual(plan.scenes.map(({ referenceSceneIndex, end_frame }) => [referenceSceneIndex, end_frame]), [[0, 180], [1, 450]]);
        assert.ok(detail.samples[0].time < 5 && detail.samples[1].time >= 5);
        assert.deepEqual(specification.specs.map(({ sourceSceneIndex }) => sourceSceneIndex), [0, 1]);
        console.log("Reference mapping preserved the measured cut on the scaled timeline and sampled the correct source scenes.");
    }
    for (const { base64 } of detail.images) {
        assert.equal(await graphPage.evaluate(async (data) => {
            const bitmap = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${data}`)).blob());
            try { return Math.max(bitmap.width, bitmap.height); } finally { bitmap.close(); }
        }, base64), 960);
    }
    if (process.argv.includes("--reference-crops")) {
        assert.ok(detail.crops.length > 0);
        for (const crop of detail.crops) {
            assert.ok(detail.samples.some(({ sceneId, time }) => sceneId === crop.sceneId && time === crop.time));
            assert.equal(crop.bounds.width, 0.5);
            assert.equal(crop.bounds.height, 0.5);
            assert.deepEqual(await graphPage.evaluate(async (data) => {
                const bitmap = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${data}`)).blob());
                try { return [bitmap.width, bitmap.height]; } finally { bitmap.close(); }
            }, crop.image.base64), [640, 360]);
        }
        console.log(`${detail.crops.length} source-resolution crops were saved with matching scene IDs and timestamps.`);
    }
    if (rejectCritic || rejectCriticAfterRepair) {
        assert.equal(document(project(graphProject)).tracks.motion_graphics.length, 0);
        await graphPage.goto(target + `/projects/${graphProject}/motion?run=${graphRun.id}`);
        await graphPage.getByText("Ready for manual review", { exact: true }).waitFor();
        if (rejectCriticAfterRepair) await graphPage.getByRole("list", { name: "Visual review findings" }).getByText("Impact settles early").waitFor();
        await graphPage.getByRole("button", { name: "Open draft in editor", exact: true }).click();
        await graphPage.waitForURL("**/projects/*/editor");
        await graphPage.getByRole("button", { name: "Select motion scene 2", exact: true }).waitFor();
        const step = motionSteps(graphRun.id).find(({ name }) => name === (rejectCriticAfterRepair ? "critique:2" : "critique:1"));
        const review = JSON.parse(motionArtifact(graphRun.id, step.result_id).body.toString("utf8"));
        assert.deepEqual(review, { source: "review_unavailable" });
        assert.equal(stages.includes("repair"), rejectCriticAfterRepair);
        const quality = document(project(graphProject)).metadata.motion_generation.quality;
        assert.equal(quality.review, "unavailable");
        assert.deepEqual(quality.findings, rejectCriticAfterRepair ? ["Impact settles early"] : []);
        assert.equal(quality.generation, rejectGraphEngineer ? "approximated" : "rendered");
        assert.deepEqual(quality.approximations.map(({ sceneId }) => sceneId), rejectGraphEngineer ? [graphic[1].id] : []);
        console.log("Unavailable visual review preserved the draft and required approval before opening it in the editor.");
    } else {
        const firstScene = document(project(graphProject)).tracks.motion_graphics[0];
        if (componentCompatibility) assert.equal(firstScene.motionRate, 1.2);
        else assert.equal(firstScene.params.impactAt, 0.42);
        assert.ok(stages.includes("repair"));
    }
    const published = document(project(graphProject));
    assert.equal(published.tracks.motion_graphics[1].id, graphic[1].id);
    const scenes = published.tracks.motion_graphics;
    assert.deepEqual(scenes.map(({ type }) => type), componentCompatibility ? ["graph", "graph"] : graphic.map(({ type }) => type));
    if (componentCompatibility) {
        const steps = motionSteps(graphRun.id);
        const stage = (name) => steps.find((step) => step.name === name);
        const proposal = JSON.parse(motionArtifact(graphRun.id, stage("director").result_id).body.toString()).value;
        const design = JSON.parse(motionArtifact(graphRun.id, stage("design").result_id).body.toString()).value;
        assert.deepEqual(proposal.scenes.map(({ type }) => type), ["impact", "identity"]);
        assert.deepEqual(design.componentChecks.map(({ unsupported }) => unsupported), [["Slide a URL field into view"], ["Reveal a separate call-to-action button"]]);
        assert.ok(stages.indexOf("visual-designer") < stages.indexOf("copywriter"));
        assert.deepEqual(scenes.map(({ id, start_frame, end_frame }) => [id, start_frame, end_frame]),
            proposal.scenes.map(({ id, start_frame, end_frame }) => [id, start_frame, end_frame]));
        for (const [index, scene] of scenes.entries()) {
            if (graphAssets && index === 1) continue;
            assert.ok(scene.params.layers.some(({ kind, keyframes }) => kind === "rect" && keyframes.length));
            assert.ok(scene.params.layers.some(({ kind, text }) => kind === "text" && text === ["Get transcript", "Try it now"][index]));
        }
        console.log("The incompatible hook and closing card were published as editable custom graphs with their original copy and timing.");
    }
    if (graphAssets) {
        assert.deepEqual(scenes[1].assets.map(({ id }) => id).sort(), Object.values(graphAssets).sort());
        const pixels = await graphPage.evaluate(async ({ scene, projectId }) => {
            const { prepareMotionSceneAssets } = await import("/shared/motion/browser-assets.ts");
            const { drawMotionFrame } = await import("/shared/motion/render.ts");
            const assets = await prepareMotionSceneAssets(scene, projectId, AbortSignal.timeout(5000));
            try {
                const ctx = new OffscreenCanvas(360, 360).getContext("2d");
                drawMotionFrame({ ctx, scene: { ...scene, finish: { grain: 0, vignette: 0, framing: false } }, frame: 10, fps: 30, width: 360, height: 360 }, assets);
                return [[90, 108], [43, 108], [270, 108]].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3));
            } finally { assets.release(); }
        }, { scene: scenes[1], projectId: String(graphProject) });
        assert.deepEqual(pixels[0], [255, 34, 160]);
        assert.notDeepEqual(pixels[1], pixels[0]);
        assert.deepEqual(pixels[2], [36, 88, 255]);
        console.log("A generated graph rendered an owned PNG inside its group mask and an imported SVG as normalized vector data.");
    }
    if (process.argv.includes("--graph-editor")) {
        assert.ok(componentCompatibility, "Use --component-compatibility with --graph-editor.");
        graphPage.setDefaultTimeout(10_000);
        await graphPage.goto(`${target}/projects/${graphProject}/editor`);
        const tools = graphPage.getByRole("button", { name: "Tools", exact: true });
        if (await tools.getAttribute("aria-pressed") === "false") await tools.click();
        await graphPage.getByRole("region", { name: "Composition layers" }).waitFor({ timeout: 8_000 }).catch(async (error) => {
            throw new Error(await graphPage.locator("body").innerText(), { cause: error });
        });
        await graphPage.getByLabel("Composition layer", { exact: true }).selectOption("layer-2");
        await graphPage.getByLabel("Layer text", { exact: true }).fill("EDITED OPENING");
        await graphPage.getByLabel("Layer X", { exact: true }).fill("0.65");
        await graphPage.getByLabel("Layer paint", { exact: true }).selectOption("success");
        await graphPage.getByLabel("Layer font", { exact: true }).selectOption("space_mono");
        await graphPage.getByLabel("Font weight", { exact: true }).selectOption("700");
        await graphPage.getByText("Animation intervals", { exact: true }).click();
        await graphPage.getByRole("button", { name: "Add interval", exact: true }).click();
        await graphPage.getByRole("group", { name: "Interval 1" }).getByLabel("end", { exact: true }).fill("0.5");
        const save = async (button, endpoint = "commands") => {
            const [response] = await Promise.all([
                graphPage.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/${endpoint}`)),
                graphPage.getByRole("button", { name: button, exact: true }).click(),
            ]);
            assert.ok(response.ok(), await response.text());
        };
        await save("Save layer");
        const saved = document(project(graphProject));
        const changed = saved.tracks.motion_graphics[0].params.layers[1];
        assert.equal(changed.text, "EDITED OPENING");
        assert.equal(changed.transform.x, 0.65);
        assert.equal(changed.color, "success");
        assert.deepEqual(changed.typography, { family: "space_mono", weight: 700 });
        assert.equal(changed.animation[0].end, 0.5);
        await save("Send backward");
        assert.deepEqual(document(project(graphProject)).tracks.motion_graphics[0].params.layers.map(({ id }) => id), ["layer-2", "layer-1"]);
        await save("Undo", "restore-revision");
        assert.deepEqual(document(project(graphProject)).tracks.motion_graphics[0].params.layers.map(({ id }) => id), ["layer-1", "layer-2"]);
        await save("Undo", "restore-revision");
        assert.equal(document(project(graphProject)).tracks.motion_graphics[0].params.layers[1].text, "Get transcript");
        await graphPage.goto(base + "/__motion_graph");
        const exported = await graphPage.evaluate(async ({ saved, accountId }) => {
            const { runBrowserExport, loadBrowserExport } = await import("/resources/js/editor/browser-export/jobs.ts");
            const snapshot = { ...saved, width: 640, height: 360, total_frames: 30,
                tracks: { ...saved.tracks, motion_graphics: [{ ...saved.tracks.motion_graphics[0], end_frame: 30 }] } };
            const scope = { projectId: snapshot.project_id, accountId };
            const exportJob = runBrowserExport(scope, snapshot, {}, AbortSignal.timeout(60_000), () => {});
            snapshot.tracks.motion_graphics[0].params.layers[1].text = "Later edit";
            await exportJob;
            const job = await loadBrowserExport(scope);
            return { savedText: job.snapshot.tracks.motion_graphics[0].params.layers[1].text, state: job.state, size: job.output?.size };
        }, { saved, accountId: String(a.owner) });
        assert.equal(exported.savedText, "EDITED OPENING");
        assert.equal(exported.state, "succeeded");
        assert.ok(exported.size > 1_000);
        console.log("Editor layer changes, sibling reorder and undo passed. The exported MP4 used its immutable layer snapshot.");
    }
    if (process.argv.includes("--scene-program")) {
        assert.ok(componentCompatibility, "Use --component-compatibility with --scene-program.");
        const snapshot = document(project(graphProject));
        const source = `import type { MotionFrameInput, MotionSceneSdk } from "@vidsai/motion-sdk";
export function frame(input: MotionFrameInput, sdk: MotionSceneSdk) {
    return [sdk.rect("title-bar", 0.5 + 0.17 * sdk.math.sin(input.frame / input.fps), 0.18, 0.2, 0.1, String(input.properties.accent))];
}`;
        const input = { version: 1, source, assets: [], properties: [{ id: "accent", label: "Accent", kind: "color", default: "#ffaa11" }] };
        const request = { commandId: randomUUID(), expectedRevision: snapshot.revision, sceneId: scenes[0].id, input };
        const url = `${target}/projects/${graphProject}/motion-program`;
        const submit = (body, headers = a.headers) => fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
        assert.equal((await submit(request, b.headers)).status, 404);
        assert.equal((await submit({ ...request, expectedRevision: snapshot.revision - 1 })).status, 409);
        const invalid = await submit({ ...request, input: { ...input, source: source.replace("0.2, 0.1", '"bad", 0.1') } });
        assert.equal(invalid.status, 422);
        assert.ok((await invalid.json()).diagnostics.some(({ file, line, code }) => file === "scene.ts" && line === 3 && code === "TS2345"));
        const response = await submit(request);
        assert.equal(response.status, 200, await response.clone().text());
        const { program, revision } = await response.json();
        assert.match(program.buildHash, /^[a-f0-9]{64}$/);
        assert.deepEqual(program.dependencies, ["@vidsai/motion-sdk@1"]);
        assert.deepEqual(document(project(graphProject)).tracks.motion_graphics[0].params.program, program);
        assert.equal(revision, snapshot.revision + 1);
        const replay = await submit(request);
        assert.equal(replay.status, 200);
        assert.equal((await replay.json()).revision, revision);
        console.log("Scene compilation reported a TypeScript line diagnostic and persisted a deterministic build through a revision-checked command.");
        if (process.argv.includes("--program-render")) {
            await graphPage.goto(`${target}/projects/${graphProject}/editor`);
            const controls = graphPage.getByRole("button", { name: "Tools", exact: true });
            if (await controls.getAttribute("aria-pressed") === "false") await controls.click();
            const procedural = graphPage.getByRole("group", { name: "Procedural controls" });
            const sample = () => graphPage.locator('canvas[data-motion-frame="0"]').first().evaluate((canvas) =>
                [...canvas.getContext("2d").getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.18), 1, 1).data]);
            const initial = await sample();
            assert.ok(initial[0] > 225 && initial[1] < 200, JSON.stringify(initial));
            await procedural.getByLabel("Accent", { exact: true }).fill("#17ff22");
            const [changed] = await Promise.all([
                graphPage.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/commands")),
                procedural.getByRole("button", { name: "Save procedural controls", exact: true }).click(),
            ]);
            assert.ok(changed.ok(), await changed.text());
            await graphPage.waitForFunction(() => {
                const canvas = document.querySelector('canvas[data-motion-frame="0"]');
                if (!canvas) return false;
                const [red, green] = canvas.getContext("2d").getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.18), 1, 1).data;
                return red < 80 && green > 215;
            });
            const edited = document(project(graphProject)).tracks.motion_graphics[0].params;
            assert.equal(edited.programValues.accent, "#17ff22");
            assert.equal(edited.program.buildHash, program.buildHash);
            await graphPage.getByRole("button", { name: "Export video", exact: true }).click();
            await graphPage.getByText("Export: done", { exact: true }).waitFor({ timeout: 90_000 });
            const mp4 = await graphPage.getByRole("link", { name: "Download MP4", exact: true }).getAttribute("href");
            const encoded = await graphPage.evaluate(async (url) => {
                const video = document.createElement("video");
                video.muted = true;
                video.playsInline = true;
                document.body.append(video);
                const loaded = new Promise((resolve, reject) => {
                    video.onloadeddata = resolve;
                    video.onerror = reject;
                });
                video.src = url;
                await loaded;
                const decoded = new Promise((resolve) => video.requestVideoFrameCallback(resolve));
                await video.play();
                await decoded;
                video.pause();
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0);
                video.remove();
                return [...ctx.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.18), 1, 1).data];
            }, mp4);
            assert.ok(encoded[0] < 85 && encoded[1] > 205, JSON.stringify(encoded));
            console.log("The procedural property changed the production preview and the same color was present in the exported MP4.");
        }
    }
    const events = motionEvents(graphRun.id, 0);
    if (useGraphEngineer) {
        const step = motionSteps(graphRun.id).find(({ name }) => name === `engineer:${graphic[1].id}`);
        const artifact = JSON.parse(motionArtifact(graphRun.id, step.result_id).body.toString("utf8"));
        const scene = published.tracks.motion_graphics[1];
        assert.equal(published.tracks.audio.length, 0);
        assert.equal(scene.type, "graph");
        assert.ok(scene.params.layers.some((layer) => layer.kind === "text" && layer.text === "Get transcript" && layer.keyframes.length));
        assert.equal(artifact.source === "graph_fallback", rejectGraphEngineer);
        if (rejectGraphEngineer) {
            assert.ok(scene.params.layers.length > 4);
            assert.ok(events.filter(({ data }) => data.role === "motionEngineer" && data.artifactFailure === "schema").length >= 2);
        }
        console.log(`Reference-only project produced an editable custom scene ${rejectGraphEngineer ? "after both routes failed schema validation" : "from the flat model artifact"}.`);
    }
    if (rejectCopywriter) {
        const step = motionSteps(graphRun.id).find(({ name }) => name === "copy");
        const artifact = JSON.parse(motionArtifact(graphRun.id, step.result_id).body.toString("utf8"));
        assert.equal(artifact.source, "storyboard_fallback");
        assert.equal(artifact.value.scenes.length, graphic.length);
    }
    if (rejectReferenceOutline) {
        const step = motionSteps(graphRun.id).find(({ name }) => name === "reference_analysis");
        const artifact = JSON.parse(motionArtifact(graphRun.id, step.result_id).body.toString("utf8"));
        assert.equal(artifact.source, "measured_fallback");
        assert.ok(artifact.value.observations.length);
        assert.ok(events.some(({ data }) => data.role === "referenceAnalyst" && data.artifactFailure === "token_limit"));
    }
    assert.ok(events.some(({ data }) => data.outcome === "invalid_output"));
    assert.ok(events.some(({ data }) => data.role === "visualCritic" && data.reasoningObserved));
    assert.ok(!JSON.stringify(events).includes(reasoning));
    console.log("Browser evidence, ownership, idempotency, leases, restart, cancellation, steering, draft recovery and stale revision passed.");
    console.log("Complete mocked specialist handoffs with real reference/preview evidence, malformed JSON fallback, and targeted repair passed.");
} finally {
    await browser?.close();
    await server.close();
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
    db.close();
}
