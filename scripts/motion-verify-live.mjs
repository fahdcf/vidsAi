import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const source = process.argv[2];
if (!source) throw new Error("Supply the folder containing the original reference and soundtrack.");
const manifest = JSON.parse(await readFile(path.join(root, "docs/MOTION_ACCEPTANCE_BRIEF.json"), "utf8"));
const exactCopy = Object.fromEntries(manifest.scenes.filter(({ copy }) => copy.length).map(({ type, copy }) => [type, copy]));
const brief = `${manifest.brief}\nExact on-screen text by component follows. Punctuation inside each quoted string is literal. ${JSON.stringify(exactCopy)}`;
const runtime = path.resolve(root, "../runtime/motion-verification");
await mkdir(runtime, { recursive: true });
const evidence = process.env.MOTION_LIVE_DIRECTORY || await mkdtemp(path.join(runtime, "live-"));
const statePath = path.join(evidence, "workspace.json");
const loginPath = path.join(evidence, "local-test-login.json");
const origin = process.env.MOTION_LIVE_ORIGIN || "http://127.0.0.1:8120";
const url = new URL(origin);
if (url.hostname !== "127.0.0.1" || url.protocol !== "http:" || !url.port) throw new Error("Use a loopback HTTP origin with a port.");
for (const entry of [manifest.reference, manifest.soundtrack, manifest.comparison]) {
    const hash = createHash("sha256").update(await readFile(path.join(source, entry.file))).digest("hex");
    assert.equal(hash, entry.sha256, "A frozen acceptance asset changed.");
}
process.env.NODE_APP_ORIGIN = origin;
process.env.NODE_SKIP_LEGACY_IMPORT = "1";
process.env.NODE_DATABASE_PATH = path.join(evidence, "test.sqlite");
process.env.NODE_MEDIA_ROOT = path.join(evidence, "media");
const { app } = await import("../server/app.ts");
const { startMotionJobs } = await import("../server/motion/service.ts");
const { db, project } = await import("../server/database.ts");
const { document } = await import("../server/document.ts");
const { motionRun, motionSteps } = await import("../server/motion/store.ts");
const { motionRunDraft } = await import("../server/motion/orchestrator.ts");
const server = app.listen(Number(url.port), "127.0.0.1");
await once(server, "listening");
const jobs = startMotionJobs();
console.log("Live motion verification files", evidence);
let browser, page;
let state = await readFile(statePath, "utf8").then(JSON.parse, () => null);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForMotion(runId) {
    const deadline = Date.now() + 20 * 60_000;
    let last = "";
    for (;;) {
        const current = motionRun(runId);
        assert.ok(current, "The live motion run was not found.");
        const working = motionSteps(runId).filter(({ status }) => status === "running").map(({ name }) => name);
        const phase = [current.status, ...working].join(" ");
        if (phase !== last) console.log("Follow-up", phase);
        last = phase;
        if (["ready", "failed", "cancelled"].includes(current.status)) return current;
        if (Date.now() > deadline) throw new Error("The follow-up run did not finish within the verification window.");
        await pause(1200);
    }
}

async function saveReport() {
    if (!state) return;
    const current = motionRun(state.runId);
    if (!current) return;
    const events = db.prepare("SELECT type,data,created_at FROM motion_events WHERE run_id=? ORDER BY id").all(state.runId)
        .map(({ type, data, created_at }) => ({ type, data: JSON.parse(data), createdAt: created_at }));
    const draft = motionRunDraft(current);
    const snapshot = document(project(state.projectId));
    const report = { origin, ...state, status: current.status, error: current.error,
        publishedRevision: snapshot.revision, startingRevision: current.starting_revision,
        stages: motionSteps(state.runId).map(({ name, lane, status, attempts, error }) => ({ name, lane, status, attempts, error })),
        events, finalDocument: snapshot.tracks.motion_graphics.length ? snapshot : null, reviewDraft: draft?.document ?? null };
    await writeFile(path.join(evidence, "live-run.json"), JSON.stringify(report, null, 2));
    return report;
}

try {
    if (process.argv.includes("--serve")) {
        assert.ok(state, "This directory has no live test workspace to reopen.");
        console.log(origin + `/projects/${state.projectId}/motion?run=${state.runId}`);
        await once(server, "close");
    } else {
        let login = await readFile(loginPath, "utf8").then(JSON.parse, () => null);
        const existing = Boolean(login);
        if (!login) {
            login = { email: "motion-acceptance@example.test", password: randomUUID() };
            await writeFile(loginPath, JSON.stringify(login, null, 2), { flag: "wx" });
        }
        browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
        page = await browser.newPage({ viewport: { width: 1440, height: 980 }, acceptDownloads: true });
        await page.goto(origin + (existing ? "/login" : "/register"));
        if (!existing) await page.locator("#name").fill("Motion acceptance");
        await page.locator("#email").fill(login.email);
        await page.locator("#password").fill(login.password);
        await page.getByRole("button", { name: existing ? "Sign in" : "Create account", exact: true }).click();
        await page.waitForURL("**/dashboard");
        if (state) {
            await page.goto(origin + `/projects/${state.projectId}/motion?run=${state.runId}`);
        } else {
            await page.getByRole("link", { name: "Create video", exact: true }).click();
            await page.getByRole("link", { name: "Motion graphics video" }).click();
            await page.getByLabel("Project name").fill(manifest.projectName);
            await page.getByLabel("Video brief").fill(brief);
            await page.getByRole("radio", { name: "Match a reference" }).check();
            await page.getByLabel("Reference video or image").setInputFiles(path.join(source, manifest.reference.file));
            await page.getByRole("spinbutton", { name: "End (seconds)" }).waitFor();
            await page.getByLabel("Start (seconds)").fill(String(manifest.reference.interval.start));
            await page.getByLabel("End (seconds)").fill(String(manifest.reference.interval.end));
            await page.getByText("Logo and soundtrack").click();
            await page.getByLabel("Soundtrack (optional)").setInputFiles(path.join(source, manifest.soundtrack.file));
            await page.getByLabel("Soundtrack preview").waitFor();
            await page.getByRole("button", { name: "Start creating" }).click();
            await page.waitForURL(/\/projects\/\d+\/motion\?run=/);
            const created = new URL(page.url());
            state = { projectId: Number(created.pathname.split("/")[2]), runId: created.searchParams.get("run"),
                briefSha256: createHash("sha256").update(brief).digest("hex") };
            await writeFile(statePath, JSON.stringify(state, null, 2));
        }
        if (process.argv.includes("--retry") && motionRun(state.runId)?.status === "failed") {
            await page.getByRole("button", { name: "Retry failed stage" }).click();
        }
        const deadline = Date.now() + 25 * 60_000;
        let last = "";
        for (;;) {
            const current = motionRun(state.runId);
            const stages = motionSteps(state.runId);
            const phase = current.status + " " + stages.filter(({ status }) => status === "running").map(({ name }) => name).join(", ");
            if (phase !== last) {
                console.log(phase);
                last = phase;
                await saveReport();
            }
            if (["ready", "failed", "cancelled"].includes(current.status)) break;
            if (Date.now() > deadline) throw new Error("The acceptance run did not finish within the verification window.");
            await pause(1200);
        }
        let report = await saveReport();
        await page.screenshot({ path: path.join(evidence, "live-chat.png"), fullPage: true });
        const accepted = report.events.filter(({ type, data }) => type === "provider_progress" && data.state === "accepted");
        for (const role of ["referenceObserver", "referenceAnalyst", "director", "visualDesigner", "motionEngineer", "visualCritic"]) {
            assert.ok(accepted.some(({ data }) => data.role === role && data.mode === "deep" && data.reasoningObserved),
                `No successful thinking-enabled artifact was recorded for ${role}.`);
        }
        assert.ok(accepted.some(({ data }) => data.role === "copywriter" && data.mode === "off"), "No accepted copy artifact was recorded.");
        assert.ok(report.stages.some(({ name, lane, status }) => name.startsWith("preview:") && lane === "browser" && status === "done"),
            "No browser-rendered preview was reviewed.");
        assert.ok(accepted.some(({ data }) => data.role === "visualCritic" && data.phase === "observe") &&
            report.stages.some(({ name, status }) => name.startsWith("critique:") && status === "done"), "The live visual review is incomplete.");
        if (report.status !== "ready" && process.argv.includes("--approve-review") && !state.approvedPartial) {
            assert.equal(report.reviewDraft?.tracks.motion_graphics.length, manifest.scenes.length, "No complete editable draft is available.");
            await page.getByRole("button", { name: "Open saved partial draft", exact: true }).click();
            await page.waitForURL("**/projects/*/editor");
            await page.screenshot({ path: path.join(evidence, "review-approved-editor.png"), fullPage: true });
            state = { ...state, approvedPartial: true };
            await writeFile(statePath, JSON.stringify(state, null, 2));
            report = await saveReport();
        }
        assert.ok(report.status === "ready" || state.approvedPartial, report.error ?? "The live run did not publish.");
        assert.equal(report.finalDocument?.tracks.motion_graphics.length, manifest.scenes.length, "The live run did not save the expected editable scenes.");
        const liquid = report.finalDocument.tracks.motion_graphics.find(({ type }) => type === "liquid");
        assert.equal(liquid?.params.mode, "vectors", "The browser trace did not produce editable liquid vectors.");
        console.log("Live model workflow saved an editable draft.", origin + `/projects/${state.projectId}/motion?run=${state.runId}`);
        if (process.argv.includes("--revisions")) {
            const base = origin + `/projects/${state.projectId}`;
            const load = () => document(project(state.projectId));
            const edits = [
                { index: 0, title: "Impact", key: "impactAt", value: 0.55, instruction: "Move the impact later. Change only impactAt to 0.55." },
                { index: 4, title: "Depth tunnel", key: "rings", value: 20, instruction: "Use exactly 20 tunnel rings. Change only the rings count." },
            ];
            const revisionsPath = path.join(evidence, "live-revisions.json");
            const existing = await readFile(revisionsPath, "utf8").then(JSON.parse, () => []);
            const results = Array.isArray(existing) ? existing : existing.results;
            let previousRun = results.at(-1)?.runId ?? state.runId;
            for (const edit of edits) {
                if (results.some(({ key }) => key === edit.key)) continue;
                const before = load();
                const target = before.tracks.motion_graphics[edit.index];
                const brief = `${edit.instruction} Keep every other scene field and the timeline, palette and copy exactly as saved.`;
                let runId = db.prepare("SELECT id FROM motion_runs WHERE project_id=? AND starting_revision=? AND target_scene_id=? AND brief=? ORDER BY rowid DESC LIMIT 1")
                    .get(state.projectId, before.revision, target.id, brief)?.id;
                if (runId && !process.argv.includes("--restart-revision")) {
                    await page.goto(base + `/motion?run=${runId}`);
                } else {
                    await page.goto(base + `/motion?run=${previousRun}`);
                    const storyboard = page.getByRole("region", { name: "Storyboard" });
                    await storyboard.getByText(`Scene ${edit.index + 1} · ${edit.title}`, { exact: true }).click();
                    await storyboard.getByRole("button", { name: "Revise this scene" }).click();
                    await page.getByLabel("Message").fill(brief);
                    await page.getByRole("button", { name: "Start a revision", exact: true }).click();
                    await page.waitForURL((value) => value.searchParams.get("run") !== previousRun);
                    runId = new URL(page.url()).searchParams.get("run");
                }
                const result = await waitForMotion(runId);
                const { document: draft } = motionRunDraft(result) ?? {};
                const expected = before.tracks.motion_graphics.map((scene, index) => index === edit.index
                    ? { ...scene, params: { ...scene.params, [edit.key]: edit.value } } : scene);
                assert.equal(result.target_scene_id, target.id);
                assert.ok(isDeepStrictEqual(draft?.tracks, { ...before.tracks, motion_graphics: expected }),
                    `The focused revision did not make exactly the requested ${edit.key} edit. ${result.error ?? ""}`);
                assert.deepEqual(load(), before, "The proposal was applied without approval.");
                const acceptedReview = motionSteps(runId).some(({ name, status }) => name.startsWith("critique:") && status === "done");
                assert.ok(motionSteps(runId).some(({ name, status }) => name === "revise" && status === "done") &&
                    motionSteps(runId).some(({ name, status }) => name.startsWith("preview:") && status === "done"), "The live revision or browser preview is missing.");
                if (result.status === "ready") {
                    await page.getByRole("button", { name: "Apply scene revision", exact: true }).click();
                    await page.getByText("Revision applied", { exact: true }).waitFor();
                } else {
                    await page.getByRole("button", { name: "Open saved partial draft", exact: true }).click();
                    await page.waitForURL("**/projects/*/editor");
                }
                assert.deepEqual(load().tracks, draft.tracks);
                results.push({ runId, status: result.status, acceptedReview, sceneId: target.id, key: edit.key, value: edit.value, revision: load().revision });
                await writeFile(revisionsPath, JSON.stringify(results, null, 2));
                previousRun = runId;
            }
            const revised = load();
            await page.goto(base + "/editor");
            await page.getByRole("button", { name: "Select motion scene 1", exact: true }).click();
            const cut = revised.tracks.motion_graphics[0].end_frame - 2;
            await page.getByLabel("End frame", { exact: true }).fill(String(cut));
            await page.getByRole("button", { name: "Save scene", exact: true }).click();
            await page.waitForFunction(() => document.querySelector(".editor-toolbar [aria-live=polite]")?.textContent === "Saved");
            const cutTracks = load().tracks;
            assert.equal(cutTracks.motion_graphics[0].end_frame, cut);
            assert.equal(cutTracks.motion_graphics[1].start_frame, cut);
            await page.getByRole("button", { name: "Undo", exact: true }).click();
            await page.waitForFunction(() => !document.querySelector('button[aria-label="Redo"]')?.disabled);
            assert.deepEqual(load().tracks, revised.tracks);
            await page.getByRole("button", { name: "Redo", exact: true }).click();
            await page.waitForFunction(() => document.querySelector(".editor-toolbar [aria-live=polite]")?.textContent === "Saved");
            assert.deepEqual(load().tracks, cutTracks);
            await page.reload();
            await page.getByRole("button", { name: "Select motion scene 1", exact: true }).click();
            assert.equal(await page.getByLabel("End frame", { exact: true }).inputValue(), String(cut));
            await writeFile(revisionsPath, JSON.stringify({ results, baselineRevision: results[0].revision - 1,
                finalRevision: load().revision, cut, undoRedoReopen: true }, null, 2));
            console.log("Two live focused revisions, a manual cut, undo, redo and reopen passed.");
        }
        if (process.argv.includes("--variations")) {
            const edits = JSON.parse(await readFile(path.join(evidence, "live-revisions.json"), "utf8"));
            assert.equal(edits.undoRedoReopen, true, "Verify focused revisions and history first.");
            const headline = "MAKE SMALL IDEAS IMPOSSIBLE TO IGNORE";
            const variations = [
                { name: "Portrait typography acceptance", format: "9:16", type: "identity",
                    brief: `Create a single five-second portrait identity scene. Use a warm orange mark on dark ink and display the exact title "${headline}". Leave the supporting text blank. Give the long title safe margins and a clear reading hold.` },
                { name: "Square geometry acceptance", format: "1:1", type: "grid",
                    brief: "Create a single five-second geometric grid scene in square format. Grow an 8 by 8 radial grid that morphs from squares to dots and back. Use midnight navy, mint, white and peach. Use no text and hold the final grid clearly." },
            ];
            const output = path.join(evidence, "live-variations.json");
            const results = await readFile(output, "utf8").then(JSON.parse, () => []);
            for (const variation of variations) {
                let item = results.find(({ name }) => name === variation.name);
                if (item?.verified) continue;
                if (item) {
                    await page.goto(origin + `/projects/${item.projectId}/motion?run=${item.runId}`);
                } else {
                    await page.goto(origin + "/dashboard");
                    await page.getByRole("link", { name: "Create video", exact: true }).click();
                    await page.getByRole("link", { name: "Motion graphics video" }).click();
                    await page.getByLabel("Project name").fill(variation.name);
                    await page.getByLabel("Video brief").fill(variation.brief);
                    await page.getByLabel("Aspect ratio").selectOption(variation.format);
                    await page.getByLabel("Duration").selectOption("5");
                    await page.getByRole("radio", { name: "Brief only" }).check();
                    await page.getByRole("button", { name: "Start creating", exact: true }).click();
                    await page.waitForURL(/\/projects\/\d+\/motion\?run=/);
                    const url = new URL(page.url());
                    item = { name: variation.name, projectId: Number(url.pathname.split("/")[2]), runId: url.searchParams.get("run") };
                    results.push(item);
                    await writeFile(output, JSON.stringify(results, null, 2));
                }
                if (process.argv.includes("--retry-variation") && motionRun(item.runId)?.status === "failed") {
                    await page.getByRole("button", { name: "Retry failed stage", exact: true }).click();
                }
                const result = await waitForMotion(item.runId);
                assert.ok(motionSteps(item.runId).some(({ name, status }) => name.startsWith("critique:") && status === "done"),
                    result.error ?? "The variation has no live critique.");
                if (result.status !== "ready" && document(project(item.projectId)).tracks.motion_graphics.length === 0) {
                    await page.getByRole("button", { name: "Open saved partial draft", exact: true }).click();
                    await page.waitForURL("**/projects/*/editor");
                }
                const snapshot = document(project(item.projectId));
                const scene = snapshot.tracks.motion_graphics[0];
                assert.equal(snapshot.tracks.motion_graphics.length, 1);
                assert.equal(scene.type, variation.type);
                assert.equal(snapshot.total_frames, snapshot.fps * 5);
                const [width, height] = variation.format.split(":").map(Number);
                assert.equal(snapshot.width * height, snapshot.height * width);
                if (scene.type === "identity") assert.equal(scene.params.title, headline);
                await page.goto(origin + `/projects/${item.projectId}/editor`);
                await page.getByRole("button", { name: "Select motion scene 1", exact: true }).waitFor();
                await page.screenshot({ path: path.join(evidence, `variation-${variation.type}.png`), fullPage: true });
                Object.assign(item, { status: result.status, verified: true, width: snapshot.width, height: snapshot.height, scene });
                await writeFile(output, JSON.stringify(results, null, 2));
            }
            console.log("Live portrait typography and square geometry variations passed.");
        }
        if (process.argv.includes("--inspect-variations")) {
            const variations = JSON.parse(await readFile(path.join(evidence, "live-variations.json"), "utf8"));
            assert.equal(variations.filter(({ verified }) => verified).length, 2);
            for (const variation of variations) {
                await page.goto(origin + `/projects/${variation.projectId}/motion-review`);
                const preview = page.getByRole("region", { name: "Live preview" });
                await preview.getByRole("button", { name: "Play video", exact: true }).click();
                await page.waitForTimeout(3000);
                await preview.getByRole("button", { name: "Pause video", exact: true }).click();
                await preview.screenshot({ path: path.join(evidence, `variation-${variation.scene.type}-hold.png`) });
            }
            console.log("Captured the live variation previews during playback.");
        }
        if (process.argv.includes("--polish-review")) {
            const before = document(project(state.projectId));
            const identity = before.tracks.motion_graphics.find(({ type }) => type === "identity");
            const [title, detail, tag] = exactCopy.identity;
            assert.equal(identity.params.title, title);
            assert.equal(identity.params.detail, detail);
            const projectUrl = origin + `/projects/${state.projectId}`;
            if (identity.params.tag !== tag) {
                await page.goto(projectUrl + "/motion-review");
                await page.getByLabel("Scene", { exact: true }).selectOption(identity.id);
                await page.getByLabel("Tagline", { exact: true }).fill(tag);
                await page.getByRole("button", { name: "Save scene", exact: true }).click();
                await page.getByText("Saved to this project.", { exact: true }).waitFor();
            }
            const changedEntrances = before.tracks.motion_graphics.filter(({ transitionIn }) => transitionIn).map(({ id }) => id);
            for (const id of changedEntrances) {
                await page.goto(projectUrl + "/motion-style");
                await page.getByLabel("Scene", { exact: true }).selectOption(id);
                await page.getByLabel("Entrance transition").selectOption("none");
                await page.getByRole("button", { name: "Save scene", exact: true }).click();
                await page.getByText("Saved to this project.", { exact: true }).waitFor();
            }
            const after = document(project(state.projectId));
            const expected = before.tracks.motion_graphics.map((item) => {
                const { transitionIn, ...scene } = item;
                if (scene.type === "identity") scene.params = { ...scene.params, tag };
                return scene;
            });
            assert.deepEqual(after.tracks, { ...before.tracks, motion_graphics: expected });
            await writeFile(path.join(evidence, "visual-review-edits.json"), JSON.stringify({ previousRevision: before.revision,
                revision: after.revision, previousTag: identity.params.tag, tag, changedEntrances }, null, 2));
            await saveReport();
        }
        if (process.argv.includes("--restore-benchmark")) {
            const edits = JSON.parse(await readFile(path.join(evidence, "live-revisions.json"), "utf8"));
            const variations = JSON.parse(await readFile(path.join(evidence, "live-variations.json"), "utf8"));
            assert.equal(edits.undoRedoReopen, true);
            assert.equal(variations.filter(({ verified }) => verified).length, 2);
            const { document: saved } = db.prepare("SELECT document FROM edit_revisions WHERE project_id=? AND revision=?")
                .get(state.projectId, edits.baselineRevision);
            const expected = JSON.parse(saved);
            const load = () => document(project(state.projectId));
            await page.goto(origin + `/projects/${state.projectId}/editor`);
            const undo = page.getByRole("button", { name: "Undo", exact: true });
            for (let step = 0; step < 30 && !isDeepStrictEqual(load().tracks, expected.tracks); step++) {
                const previous = load().revision;
                await undo.click({ timeout: 10000 });
                const deadline = Date.now() + 10000;
                while (load().revision === previous && Date.now() < deadline) await pause(60);
                assert.ok(load().revision > previous, "The editor did not save its undo.");
            }
            assert.deepEqual(load().tracks, expected.tracks, "The reviewed benchmark could not be restored from history.");
            await writeFile(path.join(evidence, "export-benchmark-revision.json"), JSON.stringify({ reviewedRevision: expected.revision,
                restoredRevision: load().revision, verifiedTracks: true }, null, 2));
            await saveReport();
        }
        const qualityFlag = process.argv.indexOf("--export");
        if (qualityFlag !== -1) {
            const quality = process.argv[qualityFlag + 1];
            assert.ok(["standard", "motion1080smooth"].includes(quality), "Supply a supported export profile.");
            const fps = quality === "standard" ? 30 : 60;
            const resolution = quality === "standard" ? "1280x720" : "1920x1080";
            const serverRenderRequests = [];
            page.on("request", (request) => {
                if (request.method() === "POST" && /\/(?:exports?|render)(?:\/|$)/.test(new URL(request.url()).pathname)) {
                    serverRenderRequests.push(request.url());
                }
            });
            await page.goto(origin + `/projects/${state.projectId}/editor`);
            await page.getByLabel("Motion export quality").selectOption(quality);
            const revision = document(project(state.projectId)).revision;
            await page.getByRole("button", { name: "Export video" }).click();
            await page.getByText("Export: done", { exact: true }).waitFor({ timeout: 180_000 });
            const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download MP4" }).click()]);
            const video = path.join(evidence, `live-revision-${revision}-${resolution}-${fps}.mp4`);
            await download.saveAs(video);
            assert.equal(serverRenderRequests.length, 0);
            assert.equal(document(project(state.projectId)).revision, revision);
            const { ffmpeg } = JSON.parse(await readFile(path.join(root, "motion-toolchain.json"), "utf8"));
            const result = spawnSync(path.join(runtime, "..", ffmpeg.runtimePath), [
                "-nostdin", "-hide_banner", "-i", video, "-f", "null", "-",
            ], { encoding: "utf8", windowsHide: true, timeout: 90_000 });
            await writeFile(`${video}.decode.log`, result.stderr ?? "");
            assert.equal(result.status, 0, result.stderr);
            assert.match(result.stderr, new RegExp(`Video: h264.*${resolution}.*${fps} fps`));
            assert.match(result.stderr, /Audio: aac/);
            assert.equal(Number([...result.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1]), manifest.seconds * fps);
            await writeFile(`${video}.json`, JSON.stringify({ revision, resolution, fps, serverRenderRequests }, null, 2));
            console.log("Browser export decoded successfully.", video);
        }
    }
} catch (error) {
    await saveReport();
    if (page) await page.screenshot({ path: path.join(evidence, "live-error.png"), fullPage: true }).catch(() => {});
    throw error;
} finally {
    await browser?.close();
    clearInterval(jobs);
    if (server.listening) {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
    db.close();
}
