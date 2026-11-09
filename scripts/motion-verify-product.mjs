import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { mockMotionProviders } from "./fixtures/motion-provider.mjs";

const [reference, soundtrack] = process.argv.slice(2);
if (!reference || !soundtrack) throw new Error("Supply a local reference MP4 and soundtrack.");
const directory = path.resolve(import.meta.dirname, "../../runtime/motion-verification");
await mkdir(directory, { recursive: true });
const evidence = await mkdtemp(path.join(directory, "product-"));
process.env.NODE_SKIP_LEGACY_IMPORT = "1";
process.env.NODE_DATABASE_PATH = path.join(evidence, "test.sqlite");
process.env.NODE_MEDIA_ROOT = path.join(evidence, "media");
const { app } = await import("../server/app.ts");
const { db, insert, project } = await import("../server/database.ts");
const { hash } = await import("../server/security.ts");
const { document } = await import("../server/document.ts");
const { MotionOrchestrator, changeMotionRunStatus, startMotionStep, finishMotionStep } = await import("../server/motion/orchestrator.ts");
const { addMotionStep, appendMotionEvent, motionRun, motionSteps } = await import("../server/motion/store.ts");
const { motionBenchmark } = await import("./fixtures/motion-benchmark.ts");
const { startMotionJobs } = await import("../server/motion/service.ts");
const api = app.listen(0, "127.0.0.1");
await once(api, "listening");
process.env.NODE_APP_ORIGIN = "http://127.0.0.1:" + api.address().port;
const ui = await createServer({ configLoader: "native", cacheDir: "node_modules/.cache/motion-product",
    server: { host: "127.0.0.1", port: 5199, hmr: false } });
let browser, page;
const uploaded = Promise.withResolvers();
try {
    await ui.listen();
    const base = "http://127.0.0.1:" + ui.httpServer.address().port;
    const id = insert("users", { name: "Test", email: "test@example.test", password: "x" });
    const token = "motion-ui-test";
    insert("node_sessions", { id: hash(token), user_id: id, csrf: "test", expires: Date.now() + 300_000 });
    browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
    page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on("pageerror", (error) => console.error(error.message));
    await page.context().addCookies([{ name: "vidsai_session", value: token, url: base }]);
    await page.goto(base + "/create");
    await page.getByRole("link", { name: "Motion graphics video" }).click();
    await page.getByLabel("Project name").fill("Reference reel");
    await page.getByLabel("Video brief").fill("Animate the original example");
    await page.getByRole("radio", { name: "Match a reference" }).check();
    await page.getByLabel("Reference video or image").setInputFiles(reference);
    await page.getByRole("spinbutton", { name: "End (seconds)" }).waitFor();
    await page.getByText("Logo and soundtrack").click();
    const logo = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 96; canvas.height = 96;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f27b35";
        ctx.fillRect(0, 0, 96, 96);
        ctx.fillStyle = "#24170d";
        ctx.fillRect(24, 24, 48, 48);
        return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.getByLabel("Logo", { exact: true }).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(logo, "base64") });
    await page.getByLabel("Soundtrack (optional)").setInputFiles(soundtrack);
    await page.getByLabel("Soundtrack preview").waitFor();
    await page.route("**/projects/*/assets", async (route) => { await uploaded.promise; await route.continue(); });
    const creation = page.waitForRequest((req) => req.method() === "POST" && req.url().endsWith("/projects/motion"));
    await page.getByRole("button", { name: "Start creating" }).click();
    const body = (await creation).postDataJSON();
    await page.getByRole("heading", { name: "Preparing your project" }).waitFor();
    assert.match(page.url(), /\/projects\/\d+\/motion\?run=/);
    const runId = new URL(page.url()).searchParams.get("run");
    const noModel = new MotionOrchestrator(async () => { throw new Error("Must wait for uploads"); });
    await noModel.tick(runId);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM motion_steps WHERE run_id=?").get(runId).n, 0);
    const setup = page.waitForRequest((req) => req.method() === "POST" && req.url().includes("/setup") &&
        req.url().includes("/motion-runs/"), { timeout: 15_000 });
    uploaded.resolve();
    const setupRequest = await setup;
    await page.getByRole("heading", { name: "Preparing your project" }).waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: "Motion chat" }).waitFor();
    const row = db.prepare("SELECT * FROM motion_runs WHERE id=?").get(runId);
    const saved = document(project(row.project_id));
    assert.equal(saved.tracks.audio.length, 1);
    assert.equal(saved.tracks.overlays.length, 1);
    assert.ok(saved.metadata.motion_cues.length > 0);
    assert.ok(row.reference_binding_id);
    assert.deepEqual(JSON.parse(row.snapshot).tracks.audio, saved.tracks.audio);
    const headers = { "X-CSRF-TOKEN": "test" };
    const repeat = await page.request.post(base + "/projects/motion", { data: body, headers });
    assert.equal((await repeat.json()).id, runId);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM projects").get().n, 1);
    const again = await page.request.post(setupRequest.url(), { data: setupRequest.postDataJSON(), headers });
    assert.equal(again.status(), 200);
    await page.reload();
    await page.getByRole("heading", { name: "Motion chat" }).waitFor();
    await page.getByRole("list", { name: "Conversation history" }).getByText("Animate the original example").waitFor();
    const run = motionRun(runId);
    addMotionStep(runId, { name: "director", lane: "provider" });
    const director = startMotionStep(run, motionSteps(runId)[0], 30_000);
    changeMotionRunStatus(run, "working");
    const currentStages = page.getByRole("list", { name: "Current stages" });
    await currentStages.getByText("Motion director").waitFor();
    assert.equal(await currentStages.getByText(/Thinking/).count(), 0);
    appendMotionEvent(runId, "provider_progress", { step: "director", mode: "deep", model: "super_vl", state: "responding" });
    await currentStages.getByText("Thinking · super vl").waitFor();
    const draft = { ...saved, tracks: { ...saved.tracks, motion_graphics: motionBenchmark(true).tracks.motion_graphics } };
    db.transaction(() => {
        const live = motionRun(runId);
        finishMotionStep(live, director, { value: {}, summary: "Planned the opening and the final card." });
        addMotionStep(runId, { name: "assemble", lane: "local" });
        const assemble = motionSteps(runId).find(({ name }) => name === "assemble");
        finishMotionStep(live, startMotionStep(live, assemble, 10_000),
            { value: { plan: { title: "Motion study", scenes: draft.tracks.motion_graphics }, document: draft } });
        addMotionStep(runId, { name: "preview:1", lane: "browser", dependencies: ["assemble"], input: { round: 1 } });
        changeMotionRunStatus(live, "waiting_for_browser");
    }).immediate();
    await page.getByRole("region", { name: "Draft preview" }).locator("canvas[data-motion-frame]").first().waitFor();
    await page.getByText("The browser rendered 28 preview frames for review.").waitFor();
    assert.equal(motionSteps(runId).find(({ name }) => name === "preview:1").status, "done");
    await page.getByLabel("Message").fill("Keep the geometry.");
    await page.getByLabel("Message").press("End");
    await page.getByLabel("Message").press("Enter");
    await page.keyboard.insertText("Use an orange palette.");
    assert.equal(await page.getByLabel("Message").inputValue(), "Keep the geometry.\nUse an orange palette.");
    await page.getByLabel("Message").press("Control+Enter");
    await page.getByRole("list", { name: "Conversation history" }).getByText("Keep the geometry. Use an orange palette.").waitFor();
    await page.reload();
    await page.getByRole("list", { name: "Conversation history" }).getByText("Keep the geometry. Use an orange palette.").waitFor();
    await page.getByLabel("Project attachments").getByText("original.mp4").waitFor();
    await page.getByRole("button", { name: "Stop run" }).click();
    await page.getByRole("button", { name: "Stop run" }).waitFor({ state: "hidden" });
    assert.equal(db.prepare("SELECT status FROM motion_runs WHERE id=?").get(runId).status, "cancelled");
    await page.getByRole("button", { name: "Resume run" }).click();
    await page.getByRole("button", { name: "Stop run" }).waitFor();
    assert.equal(motionRun(runId).status, "queued");
    await page.getByRole("button", { name: "Stop run" }).click();
    await page.getByRole("button", { name: "Open saved partial draft" }).click();
    await page.waitForURL("**/projects/*/editor");
    assert.equal(document(project(row.project_id)).revision, saved.revision + 1);
    changeMotionRunStatus(motionRun(runId), "ready");
    const before = document(project(row.project_id));
    await page.goto(base + `/projects/${row.project_id}/motion?run=${runId}`);
    const storyboard = page.getByRole("region", { name: "Storyboard" });
    await storyboard.getByText("Scene 1 · Impact").click();
    await storyboard.getByText("I MAKE THINGS MOVE.").waitFor();
    await storyboard.getByRole("button", { name: "Preview scene" }).click();
    await storyboard.getByRole("button", { name: "Revise this scene" }).click();
    await page.getByText("Revising scene 1").waitFor();
    await page.getByLabel("Message").fill("Make the movement slower and say KEEP IT MOVING.");
    await page.getByRole("button", { name: "Start a revision" }).click();
    await page.waitForURL((url) => url.searchParams.get("run") !== runId);
    const focused = new URL(page.url()).searchParams.get("run");
    assert.equal(motionRun(focused).target_scene_id, before.tracks.motion_graphics[0].id);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        if (String(input) !== "https://integrate.api.nvidia.com/v1/chat/completions") return originalFetch(input, init);
        const request = JSON.parse(init.body);
        const system = request.messages[0].content;
        const user = request.messages[1].content;
        const context = JSON.parse(Array.isArray(user) ? user[0].text : user).context;
        const value = system.includes("VidsAI repair specialist")
            ? { decision: "Slowed the movement and updated the words.", approximation: null,
                scene: { ...context.input.scene, motionRate: 0.72, params: { ...context.input.scene.params, headline: "KEEP IT MOVING." } } }
            : { decision: "Reviewed the revised scene.", scores: { readability: 5, hierarchy: 5, palette: 5, motion: 5, pacing: 5, brief: 5 },
                issues: [], unresolved: [] };
        const event = (delta, finish_reason = null) => "data: " + JSON.stringify({ choices: [{ delta, finish_reason }] }) + "\n\n";
        return new Response(event({ reasoning_content: "Mock reasoning" }) + event({ content: JSON.stringify(value) }, "stop") + "data: [DONE]\n\n");
    };
    try {
        const graph = new MotionOrchestrator();
        for (let tick = 0; tick < 45 && motionRun(focused).status !== "ready"; tick++) {
            await graph.tick(focused);
            assert.notEqual(motionRun(focused).status, "failed", motionRun(focused).error);
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
    } finally { globalThis.fetch = originalFetch; }
    assert.equal(motionRun(focused).status, "ready");
    const changed = await (await page.request.get(base + "/motion-runs/" + focused + "/draft")).json();
    assert.equal(changed.draft.document.tracks.motion_graphics[0].params.headline, "KEEP IT MOVING.");
    assert.equal(changed.draft.document.tracks.motion_graphics[0].motionRate, 0.72);
    assert.deepEqual(changed.draft.document.tracks.motion_graphics.slice(1), before.tracks.motion_graphics.slice(1));
    assert.deepEqual(document(project(row.project_id)), before);
    await page.getByText("Compare before and after").click();
    await page.getByRole("region", { name: "Before" }).locator("canvas[data-motion-frame]").first().waitFor();
    await page.getByRole("region", { name: "After" }).locator("canvas[data-motion-frame]").first().waitFor();
    await page.getByRole("button", { name: "Apply scene revision" }).click();
    await page.getByText("Revision applied", { exact: true }).waitFor();
    const applied = document(project(row.project_id));
    assert.equal(applied.revision, before.revision + 1);
    assert.deepEqual(applied.tracks.audio, before.tracks.audio);
    assert.deepEqual(applied.tracks.overlays, before.tracks.overlays);
    const replay = await page.request.post(base + "/motion-runs/" + focused + "/apply", {
        data: { expectedRevision: before.revision, partial: false }, headers,
    });
    assert.equal(replay.status(), 200);
    assert.equal(document(project(row.project_id)).revision, applied.revision);
    await page.getByRole("link", { name: "Open editor", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Redo", exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('button[aria-label="Redo"]')?.disabled);
    assert.deepEqual(document(project(row.project_id)).tracks.motion_graphics, before.tracks.motion_graphics);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('button[aria-label="Undo"]')?.disabled);
    assert.deepEqual(document(project(row.project_id)).tracks.motion_graphics, applied.tracks.motion_graphics);
    await page.goto(base + `/projects/${row.project_id}/motion?run=${focused}`);
    await Promise.all([
        page.waitForURL("**/projects/*/motion-review"),
        page.getByRole("link", { name: "Review motion scenes" }).click(),
    ]);
    await page.getByRole("heading", { name: "Review motion scenes" }).waitFor();
    await page.getByLabel("Scene text").fill("A NEW FIRST SCENE");
    const originalCut = before.tracks.motion_graphics[0].end_frame;
    await page.getByLabel("End frame").fill(String(originalCut + 4));
    await page.getByRole("button", { name: "Save scene" }).click();
    await page.getByText("Saved to this project.").waitFor();
    const adjusted = document(project(row.project_id));
    assert.equal(adjusted.tracks.motion_graphics[0].params.headline, "A NEW FIRST SCENE");
    assert.equal(adjusted.tracks.motion_graphics[0].end_frame, originalCut + 4);
    assert.equal(adjusted.tracks.motion_graphics[1].start_frame, originalCut + 4);
    await page.getByRole("button", { name: "Move later" }).click();
    await page.waitForFunction((id) => document.querySelector("select option")?.value === id, before.tracks.motion_graphics[1].id);
    await page.getByRole("link", { name: "Continue to style" }).click();
    await page.getByRole("heading", { name: "Style motion graphics" }).waitFor();
    await page.getByLabel("Typography").selectOption("space_mono");
    await page.getByLabel("Motion pace").fill("0.8");
    await page.getByLabel("Entrance transition").selectOption("wipe");
    await page.getByRole("button", { name: "Save scene" }).click();
    await page.getByText("Saved to this project.").waitFor();
    const styled = document(project(row.project_id)).tracks.motion_graphics[0];
    assert.equal(styled.font, "space_mono");
    assert.equal(styled.motionRate, 0.8);
    assert.equal(styled.transitionIn.kind, "wipe");
    await page.route("**/api/music/popular?*", (route) => route.fulfill({ json: { total: 1, tracks: [
        { id: 1, name: "Suggested instrumental", artist: "Fixture", duration: 15, license: "https://example.test/license",
            preview_url: "https://example.test/sound.mp3" },
    ] } }));
    await page.getByRole("button", { name: "Music", exact: true }).click();
    await page.getByText("Suggested instrumental").waitFor();
    assert.equal(await page.getByRole("button", { name: "Captions", exact: true }).count(), 0);
    const focusUrl = base + `/projects/${row.project_id}/motion?run=${focused}`;
    await page.goto(focusUrl);
    await page.getByRole("region", { name: "Draft preview" }).locator("canvas[data-motion-frame]").first().waitFor();
    await page.screenshot({ path: path.join(evidence, "motion-chat-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.locator("body").evaluate((element) => element.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(evidence, "motion-chat-compact.png"), fullPage: true });
    const count = db.prepare("SELECT COUNT(*) AS n FROM motion_runs").get().n;
    await page.goBack();
    await page.getByRole("heading", { name: "Style motion graphics" }).waitFor();
    await page.goForward();
    await page.getByRole("heading", { name: "Motion chat" }).waitFor();
    assert.equal(page.url(), focusUrl);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM motion_runs").get().n, count);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("link", { name: "Open editor", exact: true }).click();
    const timelineScene = page.getByRole("button", { name: "Select motion scene 2" });
    await timelineScene.locator("canvas[data-motion-thumbnail]").waitFor();
    assert.equal(await timelineScene.locator("canvas").evaluate((canvas) => canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3]), 255);
    await timelineScene.click();
    assert.equal(await timelineScene.getAttribute("aria-pressed"), "true");
    await page.getByLabel("Rings", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Save scene" }).click();
    await page.waitForFunction(() => document.querySelector(".editor-toolbar [aria-live=polite]")?.textContent === "Saved");
    assert.equal(document(project(row.project_id)).tracks.motion_graphics[1].params.ringCount, 5);
    const persisted = document(project(row.project_id));
    assert.equal(persisted.metadata.motion_generation.runId, focused);
    assert.equal(persisted.metadata.motion_generation.rendererVersion, 1);
    assert.equal(persisted.metadata.motion_generation.skills.length, 9);
    assert.equal(persisted.metadata.motion_generation.reference.bindingId, row.reference_binding_id);
    assert.match(persisted.metadata.motion_generation.reference.sha256, /^[a-f0-9]{64}$/);
    const referenceRow = db.prepare(`SELECT a.id,a.path FROM project_assets a JOIN motion_references r ON r.asset_id=a.id WHERE r.project_id=?`)
        .get(row.project_id);
    const referencePath = path.join(process.env.NODE_MEDIA_ROOT, "public", referenceRow.path);
    await rename(referencePath, referencePath + ".missing");
    const cleanContext = await browser.newContext();
    await cleanContext.addCookies([{ name: "vidsai_session", value: token, url: base }]);
    const reopened = await cleanContext.newPage();
    await reopened.goto(focusUrl);
    await reopened.getByText("Relink the original reference file and interval to resume this run.").waitFor();
    await reopened.getByLabel("Reference video or image").setInputFiles(reference);
    await reopened.getByRole("button", { name: "Relink reference" }).click();
    await reopened.getByRole("button", { name: "Relink reference" }).waitFor({ state: "hidden" });
    const relinked = await (await reopened.request.get(base + `/projects/${row.project_id}/motion-reference`)).json();
    assert.equal(relinked.reference.bindingId, row.reference_binding_id);
    assert.notEqual(relinked.reference.assetId, referenceRow.id);
    assert.equal(relinked.reference.available, true);
    const otherId = insert("users", { name: "Other", email: "other@example.test", password: "x" });
    insert("node_sessions", { id: hash("other-motion-account"), user_id: otherId, csrf: "other", expires: Date.now() + 60_000 });
    await cleanContext.clearCookies();
    await cleanContext.addCookies([{ name: "vidsai_session", value: "other-motion-account", url: base }]);
    assert.equal((await reopened.request.get(base + "/motion-runs/" + focused + "/draft")).status(), 404);
    await cleanContext.close();
    const scratch = insert("projects", { user_id: id, name: "Scratch footage fixture", type: "product", category: "Demo", description: "Fixture",
        script_option: "paste", voiceover_option: "none", status: "reviewing", created_at: new Date().toISOString() });
    await page.goto(base + "/dashboard");
    const motionCard = page.getByRole("link", { name: /Reference reel/ });
    const footageCard = page.getByRole("link", { name: /Scratch footage fixture/ });
    await motionCard.locator("canvas[data-motion-thumbnail]").waitFor();
    assert.equal(await motionCard.getAttribute("href"), `/projects/${row.project_id}/editor`);
    assert.equal(await footageCard.getAttribute("href"), `/review/${scratch}`);
    await motionCard.getByText("Motion graphics").waitFor();
    await page.getByRole("button", { name: "Ready", exact: true }).click();
    assert.equal(await footageCard.count(), 0);
    await page.getByRole("searchbox", { name: "Search projects" }).fill("missing");
    await page.getByText("No matching projects").waitFor();
    await page.getByRole("searchbox", { name: "Search projects" }).fill("Reference reel");
    await motionCard.click();
    await page.waitForURL("**/projects/*/editor");
    let exportProjectId = row.project_id;
    let exportSceneId = before.tracks.motion_graphics[0].id;
    if (process.argv.includes("--journey")) {
        const fixture = motionBenchmark(true);
        const { stages, restore } = mockMotionProviders(fixture.tracks.motion_graphics);
        const jobs = startMotionJobs();
        try {
            await page.goto(base + "/create/motion-graphics");
            await page.getByLabel("Project name").fill("Verified motion journey");
            await page.getByLabel("Video brief").fill("Build a 15-second warm motion showreel from this visual reference.");
            await page.getByRole("radio", { name: "Match a reference" }).check();
            await page.getByLabel("Reference video or image").setInputFiles(reference);
            await page.getByRole("spinbutton", { name: "End (seconds)" }).waitFor();
            await page.getByText("Logo and soundtrack").click();
            await page.getByLabel("Soundtrack (optional)").setInputFiles(soundtrack);
            await page.getByLabel("Soundtrack preview").waitFor();
            await page.getByRole("button", { name: "Start creating" }).click();
            await page.getByText("Draft ready", { exact: true }).waitFor({ timeout: 90_000 });
            const generatedRun = new URL(page.url()).searchParams.get("run");
            const generated = motionRun(generatedRun);
            assert.equal(generated.status, "ready");
            exportProjectId = generated.project_id;
            const doc = document(project(exportProjectId));
            assert.equal(doc.tracks.motion_graphics.length, 7);
            assert.ok(doc.tracks.audio.length);
            for (const stage of ["observe", "reference-analyst", "director", "copywriter", "visual-designer", "motion-engineer", "visual-critic", "repair"]) {
                assert.ok(stages.includes(stage), stage);
            }
            exportSceneId = doc.tracks.motion_graphics[0].id;
            await page.screenshot({ path: path.join(evidence, "journey-chat.png"), fullPage: true });
            await Promise.all([page.waitForURL("**/projects/*/motion-review"), page.getByRole("link", { name: "Review motion scenes" }).click()]);
            await page.getByLabel("Scene text").fill("A VERIFIED MOTION JOURNEY");
            await page.getByRole("button", { name: "Save scene" }).click();
            await page.getByText("Saved to this project.").waitFor();
            await page.getByRole("link", { name: "Continue to style" }).click();
            await page.getByRole("link", { name: "Open editor", exact: true }).click();
            await page.waitForURL("**/projects/*/editor");
            await page.getByRole("button", { name: "Select motion scene 1" }).click();
            await page.getByLabel("Rings", { exact: true }).fill("4");
            await page.getByRole("button", { name: "Save scene" }).click();
            await page.waitForFunction(() => document.querySelector(".editor-toolbar [aria-live=polite]")?.textContent === "Saved");
            await page.reload();
            assert.equal(document(project(exportProjectId)).tracks.motion_graphics[0].params.ringCount, 4);
            assert.equal(document(project(exportProjectId)).tracks.motion_graphics[0].params.headline, "A VERIFIED MOTION JOURNEY");
            console.log("Authenticated Create → specialist chat → Review → Style → Editor → reopen passed on the generated seven-scene draft.");
        } finally {
            clearInterval(jobs);
            restore();
        }
    }
    if (process.argv.includes("--export")) {
        const serverRenderRequests = [];
        page.on("request", (request) => {
            if (request.method() === "POST" && /\/(?:exports?|render)(?:\/|$)/.test(new URL(request.url()).pathname)) {
                serverRenderRequests.push(request.url());
            }
        });
        const revision = document(project(exportProjectId)).revision;
        await page.getByRole("button", { name: "Export video" }).click();
        await page.getByText("Export: rendering", { exact: true }).waitFor({ timeout: 90_000 });
        await page.reload();
        await page.getByText("Export: interrupted", { exact: true }).waitFor({ timeout: 30_000 });
        await page.getByRole("button", { name: "Retry export" }).click();
        await page.getByText("Export: rendering", { exact: true }).waitFor({ timeout: 90_000 });
        await page.getByRole("button", { name: "Cancel export" }).click();
        await page.getByText("Export: cancelled", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Retry export" }).click();
        await page.getByText("Export: rendering", { exact: true }).waitFor({ timeout: 90_000 });
        const newer = await page.request.post(base + `/projects/${exportProjectId}/commands`, {
            headers, data: { commandId: crypto.randomUUID(), expectedRevision: revision,
                operations: [{ tool: "set_motion_text", params: { id: exportSceneId, text: "NEW SAVED REVISION" } }] },
        });
        assert.equal(newer.status(), 200);
        await page.getByText("Export: done", { exact: true }).waitFor({ timeout: 200_000 });
        const [file] = await Promise.all([
            page.waitForEvent("download"),
            page.getByRole("link", { name: "Download MP4" }).click(),
        ]);
        const video = path.join(evidence, "motion-product-720p.mp4");
        await file.saveAs(video);
        await page.reload();
        await page.getByRole("link", { name: "Download MP4" }).waitFor();
        await page.getByText("Older version").waitFor();
        assert.equal(serverRenderRequests.length, 0);
        const { ffmpeg } = JSON.parse(await readFile(path.resolve(import.meta.dirname, "../motion-toolchain.json"), "utf8"));
        const decoded = spawnSync(path.join(directory, "..", ffmpeg.runtimePath), [
            "-nostdin", "-hide_banner", "-i", video, "-f", "null", "-",
        ], { encoding: "utf8", windowsHide: true, timeout: 90_000 });
        await writeFile(path.join(evidence, "motion-product-decode.log"), decoded.stderr ?? "");
        assert.equal(decoded.status, 0, decoded.stderr);
        assert.match(decoded.stderr, /Video: h264.*1280x720/);
        assert.match(decoded.stderr, /Audio: aac/);
        assert.equal(Number([...decoded.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1]), 450);
        console.log("Browser export reload recovery, cancel/retry, immutable revision, persisted MP4, 720p H.264/AAC and no render API requests passed.");
    }
    console.log("Atomic browser creation, chat before uploads, attachments, persisted cues, idempotent replay and reload passed.");
    console.log("Multiline conversation, attachment chips, stop and persisted history passed.");
    console.log("Live events, qualified thinking display, browser tool results and real draft playback canvas passed.");
    console.log("Storyboard playback and focused revision kept other scenes and the current saved revision intact.");
    console.log("Stop/resume and recovery of a saved partial draft into the editor passed.");
    console.log("Motion Review and Style saved copy, cuts, order, typography, pacing and transitions, with suggested music.");
    console.log("Keyboard submission, compact layout, refresh, back and forward preserved the same run.");
    console.log("Editor motion timeline rendered real thumbnails and saved contextual effect parameters.");
    console.log("Before/after playback, explicit scene revision apply, idempotent replay, undo and redo passed.");
    console.log("Project provenance, clean-browser reopen, exact-reference relinking and account isolation passed.");
    console.log("Dashboard motion thumbnail, correct workspace/editor routing and existing footage filters passed.");
} catch (error) {
    console.error(page?.url(), (await page?.locator("#app").textContent())?.slice(0, 1200));
    throw error;
} finally {
    uploaded.resolve();
    await browser?.close();
    await ui.close();
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
    db.close();
}
