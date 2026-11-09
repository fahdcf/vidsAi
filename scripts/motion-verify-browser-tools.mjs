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
const { document } = await import("../server/document.ts");
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
    const page = await context.newPage();
    await page.route(base + "/__motion_tool", (r) => r.fulfill({ contentType: "text/html",
        body: '<!doctype html><meta name="csrf-token" content="' + a.csrf + '"><title>Motion tools</title>' }));
    await page.goto(base + "/__motion_tool");
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
    assert.equal(preview.payload.result.frames.length, 12);
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
    const { stages, reasoning, restore } = mockMotionProviders(graphic);
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
    assert.equal(document(project(graphProject)).tracks.motion_graphics[0].params.impactAt, 0.42);
    assert.equal(document(project(graphProject)).tracks.motion_graphics[1].id, graphic[1].id);
    const events = motionEvents(graphRun.id, 0);
    assert.ok(events.some(({ data }) => data.outcome === "invalid_output"));
    assert.ok(events.some(({ data }) => data.role === "visualCritic" && data.reasoningObserved));
    assert.ok(!JSON.stringify(events).includes(reasoning));
    assert.ok(stages.includes("repair"));
    console.log("Browser evidence, ownership, idempotency, leases, restart, cancellation, steering, draft recovery and stale revision passed.");
    console.log("Complete mocked specialist handoffs with real reference/preview evidence, malformed JSON fallback, and targeted repair passed.");
} finally {
    await browser?.close();
    await server.close();
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
    db.close();
}
