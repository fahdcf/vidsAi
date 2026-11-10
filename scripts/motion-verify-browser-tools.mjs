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
    optimizeDeps: { noDiscovery: true, include: ["mediabunny", "zod"] },
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
    complete("design", "provider", {});
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
    const { stages, reasoning, restore } = mockMotionProviders(graphic, { rejectReferenceOutline, rejectCopywriter, rejectGraphEngineer, rejectCritic, rejectCriticAfterRepair, rejectDetailVision });
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
    const detailStep = motionSteps(graphRun.id).find(({ name }) => name === "reference_detail");
    const detail = JSON.parse(motionArtifact(graphRun.id, detailStep.result_id).body.toString());
    assert.deepEqual(detail.samples.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
    assert.equal(new Set(detail.samples.map(({ time }) => time)).size, graphic.length);
    for (const { base64 } of detail.images) {
        assert.equal(await graphPage.evaluate(async (data) => {
            const bitmap = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${data}`)).blob());
            try { return Math.max(bitmap.width, bitmap.height); } finally { bitmap.close(); }
        }, base64), 960);
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
        assert.equal(document(project(graphProject)).tracks.motion_graphics[0].params.impactAt, 0.42);
        assert.ok(stages.includes("repair"));
    }
    const published = document(project(graphProject));
    assert.equal(published.tracks.motion_graphics[1].id, graphic[1].id);
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
