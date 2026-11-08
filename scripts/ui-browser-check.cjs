const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
    runtime = process.env.UI_TEST_RUNTIME || path.resolve(root, "../runtime");
const config = JSON.parse(
    fs.readFileSync(path.join(runtime, "node-local-config.json")),
);
const origin = process.env.NODE_APP_ORIGIN || config.origin;
const recording = path.join(runtime, "provider-test-voice.wav");
const narration =
    "Discover our reusable bottle. Take it on adventures. Keep your water cold all day.";
async function main() {
    const browser = await chromium.launch({
        ...(process.env.UI_TEST_BROWSER_CHANNEL
            ? { channel: process.env.UI_TEST_BROWSER_CHANNEL }
            : { executablePath: config.browserExe }),
        headless: true,
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    const renderRequests = [];
    page.on("request", (r) => {
        if (r.method() === "POST" && /\/(?:export|render)$/.test(new URL(r.url()).pathname)) renderRequests.push(r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    const report = {
        origin,
        providers: process.env.UI_TEST_PROVIDER_MODE || "configured",
        checks: [],
        screenshots: [],
    };
    let count = 0;
    const directory = path.join(runtime, "ui-verification");
    fs.mkdirSync(directory, { recursive: true });
    const state = async () =>
        await (
            await page.request.get(
                `${origin}/projects/${report.projectId}/edit-state`,
            )
        ).json();
    async function capture(name) {
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: path.join(directory, name + ".png"),
            fullPage: true,
        });
        report.screenshots.push(name + ".png");
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${name}: page must not overflow horizontally`,
        );
    }
    async function saveClick(name) {
        const button = page.getByRole("button", { name, exact: true });
        if (
            page.url().includes("/subtitle-styles/") &&
            (await button.isDisabled())
        )
            return;
        const [response] = await Promise.all([
            page.waitForResponse(
                (r) =>
                    r
                        .url()
                        .endsWith(`/projects/${report.projectId}/commands`) &&
                    r.request().method() === "POST",
            ),
            button.click(),
        ]);
        assert.equal(response.status(), 200);
    }

    try {
        let account;
        if (process.env.UI_TEST_RESUME_PROJECT) {
            account = JSON.parse(
                fs.readFileSync(path.join(runtime, "ui-demo-account.json")),
            );
            await page.goto(origin + "/login");
            await page.locator("#email").fill(account.email);
            await page.locator("#password").fill(account.password);
            await page
                .getByRole("button", { name: "Sign in", exact: true })
                .click();
            await page.waitForURL("**/dashboard");
            report.projectId = process.env.UI_TEST_RESUME_PROJECT;
            count = (await state()).edit_state.tracks.video.length;
            await page.goto(`${origin}/subtitle-styles/${report.projectId}`);
            report.checks.push("Resumed prior local UI verification project");
        } else {
            await page.goto(origin);
            await page
                .getByRole("heading", { name: /A little idea/ })
                .waitFor();
            await capture("home-desktop");
            const old = JSON.parse(
                fs.readFileSync(path.join(runtime, "demo-account.json")),
            );
            await page.goto(origin + "/login");
            await page.locator("#email").fill(old.email);
            await page.locator("#password").fill(old.password);
            await page
                .getByRole("button", { name: "Sign in", exact: true })
                .click();
            await page.waitForURL("**/dashboard");
            await page
                .getByRole("heading", {
                    name: "Your video projects",
                    exact: true,
                })
                .waitFor();
            assert.ok((await page.locator(".project-card").count()) > 0);
            await page.getByLabel("Search projects").fill("does-not-exist-123");
            await page
                .getByRole("heading", { name: "No matching projects" })
                .waitFor();
            await page.getByLabel("Search projects").fill("");
            await capture("dashboard-desktop");
            report.checks.push(
                "Existing account, project cards, search and empty state",
            );
            await page.goto(origin + "/profile");
            await page
                .getByRole("button", { name: "Sign out", exact: true })
                .click();
            await page.waitForURL("**/login");
            account = {
                name: "Studio verification",
                email: `studio-${Date.now()}@example.test`,
                password: "Studio-" + crypto.randomUUID(),
            };
            await page.goto(origin + "/register");
            await page.locator("#name").fill(account.name);
            await page.locator("#email").fill(account.email);
            await page.locator("#password").fill(account.password);
            await page
                .getByRole("button", { name: "Create account", exact: true })
                .click();
            await page.waitForURL("**/dashboard");
            fs.writeFileSync(
                path.join(runtime, "ui-demo-account.json"),
                JSON.stringify(account),
            );
            report.checks.push("Registration and sign out");
            await page.goto(origin + "/create");
            const videoTypes = page.getByRole("list", { name: "Video types" });
            await videoTypes.waitFor();
            assert.equal(await videoTypes.getByRole("listitem").count(), 4);
            assert.equal(await videoTypes.getByText("Coming soon", { exact: true }).count(), 3);
            await capture("create-options-desktop");
            await videoTypes.getByRole("link", { name: "Video from scratch", exact: true }).click();
            await page.waitForURL("**/create/from-scratch");
            await page
                .getByLabel("Project name", { exact: true })
                .fill("Everyday adventures");
            await page
                .getByLabel("Category", { exact: true })
                .fill("Lifestyle");
            await page
                .getByLabel("Description", { exact: true })
                .fill(narration);
            await page
                .getByRole("button", { name: "Landscape 16:9", exact: true })
                .click();
            await page
                .getByLabel("Your script", { exact: true })
                .fill(narration);
            await page
                .getByLabel("Voiceover (MP3 or WAV, up to 10 MB)")
                .setInputFiles(recording);
            await capture("create-desktop");
            await page
                .getByRole("button", { name: "Generate scenes", exact: true })
                .click();
            await page.waitForURL(/\/processing\/\d+$/);
            report.projectId = page.url().match(/processing\/(\d+)/)[1];
            fs.writeFileSync(
                path.join(runtime, "ui-demo-account.json"),
                JSON.stringify({ ...account, projectId: report.projectId }),
            );
            console.log(
                JSON.stringify({
                    projectId: report.projectId,
                    stage: "generating",
                }),
            );
            await capture("processing-desktop");
            await page.waitForURL(new RegExp(`/review/${report.projectId}$`), {
                timeout: 210000,
            });
            await page
                .getByRole("heading", { name: "Review your scenes" })
                .waitFor();
            report.checks.push(
                "Grouped creation form, canvas selection, transcription, planning and stock footage",
            );
            count = await page
                .getByRole("button", { name: /^Review scene \d+$/ })
                .count();
            assert.ok(count >= 2);
            const end = page.getByLabel("End (seconds)", { exact: true });
            const edited = String(
                Math.max(0.5, Number(await end.inputValue()) - 0.1),
            );
            await end.fill(edited);
            await page
                .getByRole("button", {
                    name: "Confirm scene & next",
                    exact: true,
                })
                .click();
            await page
                .getByText(`1 of ${count} scenes confirmed`, { exact: true })
                .waitFor();
            await page.reload();
            await page.getByLabel("End (seconds)", { exact: true }).waitFor();
            assert.equal(
                Number(
                    await page
                        .getByLabel("End (seconds)", { exact: true })
                        .inputValue(),
                ),
                Number(edited),
            );
            await page
                .getByText(`1 of ${count} scenes confirmed`, { exact: true })
                .waitFor();
            await page.locator("h1").click();
            await page.keyboard.press("ArrowRight");
            assert.equal(
                await page
                    .getByRole("button", {
                        name: "Review scene 2",
                        exact: true,
                    })
                    .getAttribute("aria-current"),
                "true",
            );
            report.checks.push(
                "Scene slide navigation, confirmation and draft recovery after refresh",
            );
            const regen = page.waitForResponse(
                (r) =>
                    r.url().includes("/regenerate-proxy") &&
                    r.request().method() === "POST",
            );
            await page
                .getByRole("button", { name: "Find another clip", exact: true })
                .click();
            assert.equal((await regen).status(), 200);
            await page
                .getByText("A new clip is ready to review.", { exact: true })
                .waitFor();
            await page
                .getByRole("button", { name: "Review scene 1", exact: true })
                .click();
            assert.equal(
                Number(
                    await page
                        .getByLabel("End (seconds)", { exact: true })
                        .inputValue(),
                ),
                Number(edited),
            );
            await capture("review-desktop");
            report.checks.push(
                "Stock regeneration preserves other scene drafts",
            );
            await page
                .getByLabel("Replace media", { exact: true })
                .setInputFiles(
                    path.join(root, "public/migration-fixtures/green.png"),
                );
            await page.locator('img[alt="Scene 1"]').waitFor();
            await page
                .getByRole("button", {
                    name: "Confirm All Scenes",
                    exact: true,
                })
                .click();
            await page.waitForURL(
                new RegExp(`/subtitle-styles/${report.projectId}$`),
            );
            await page
                .getByRole("heading", { name: "Style your video", exact: true })
                .waitFor();
            assert.equal(
                await page
                    .getByRole("button", { name: /^Use (?!.*transition)/ })
                    .count(),
                7,
            );
            report.checks.push(
                "Private replacement upload and complete scene confirmation",
            );
        }
        await page
            .getByRole("button", {
                name: "Use Progressive Highlight",
                exact: true,
            })
            .click();
        await page.getByLabel("Font size", { exact: true }).fill("52");
        await page
            .getByRole("button", { name: "Captions at top", exact: true })
            .click();
        await saveClick("Save caption style");
        let d = (await state()).edit_state;
        assert.equal(d.tracks.subtitles[0].style, "progressive_highlight");
        assert.equal(d.tracks.subtitles[0].position, "top");
        assert.equal(d.tracks.subtitles[0].config.fontSize, "52px");
        await capture("styles-desktop");
        await page
            .getByRole("button", { name: "Transitions", exact: true })
            .click();
        await page
            .getByRole("button", { name: "Use Fade transition", exact: true })
            .click();
        await saveClick("Save transitions");
        assert.equal(
            (await state()).edit_state.tracks.video[0].transition_out.type,
            "fade",
        );
        report.checks.push(
            "Visual caption presets, live customization and persisted transitions",
        );
        await page
            .getByRole("button", { name: "Captions", exact: true })
            .click();
        await page
            .getByLabel("Caption 1", { exact: true })
            .fill("Discover our reusable bottle.");
        await page.getByRole("button", { name: "Styles", exact: true }).click();
        await page.getByRole("button", { name: "Music", exact: true }).click();
        await page
            .getByLabel("Search music", { exact: true })
            .fill("ambient music");
        await page
            .getByRole("button", { name: "Search tracks", exact: true })
            .click();
        const track = page
            .getByRole("button", { name: "Use this track", exact: true })
            .first();
        await track.waitFor({ timeout: 45000 });
        const musicResponse = page.waitForResponse(
            (r) =>
                r.url().endsWith(`/projects/${report.projectId}/commands`) &&
                r.request().method() === "POST",
        );
        await track.click();
        assert.equal((await musicResponse).status(), 200);
        assert.ok(
            (await state()).edit_state.tracks.audio.some(
                (a) => a.type === "music",
            ),
        );
        report.checks.push(
            "Caption text controls and FreeSound music selection",
        );
        await page
            .getByRole("button", { name: "Open editor", exact: true })
            .click();
        await page.waitForURL(
            new RegExp(`/projects/${report.projectId}/editor$`),
        );
        await page.getByRole("heading", { name: "Timeline" }).waitFor();
        await page
            .getByRole("button", { name: "Captions", exact: true })
            .click();
        await page.locator("input[name=size]").fill("56");
        await saveClick("Save caption style");
        const saved = page.getByText("Saved", { exact: true });
        await saved.waitFor();
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        await page.getByRole("button", { name: "Redo", exact: true }).waitFor();
        await page.getByRole("button", { name: "Redo", exact: true }).click();
        await saved.waitFor();
        assert.equal(
            (await state()).edit_state.tracks.subtitles[0].config.fontSize,
            "56px",
        );
        report.checks.push("Editor caption controls and undo/redo");
        await page
            .getByRole("button", { name: "Zoom in timeline", exact: true })
            .click();
        await page.getByText("125%", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Fit", exact: true }).click();
        const before = (await state()).edit_state.tracks.video.map((c) => c.id);
        if (count >= 3) {
            await page
                .getByRole("button", { name: "Select scene 2", exact: true })
                .dragTo(
                    page.getByRole("button", {
                        name: "Select scene 3",
                        exact: true,
                    }),
                );
            await saved.waitFor();
            const after = (await state()).edit_state.tracks.video.map(
                (c) => c.id,
            );
            assert.equal(after[2], before[1]);
            await page
                .getByRole("button", { name: "Select scene 3", exact: true })
                .click();
            await saveClick("Move earlier");
        }
        await page
            .getByRole("button", { name: "Select scene 1", exact: true })
            .click();
        report.checks.push(
            "Timeline zoom, scene selection, drag reorder and button alternative",
        );
        await page
            .getByLabel("Your request", { exact: true })
            .fill("Make captions bigger and use fade transitions");
        await page
            .getByRole("button", { name: "Prepare edits", exact: true })
            .click();
        const apply = page.getByRole("button", { name: /^Apply \d+ changes?$/ });
        await apply.waitFor({ timeout: 80000 });
        const beforeDiscard = (await state()).edit_state.revision;
        await page.getByRole("button", { name: "Discard", exact: true }).click();
        await apply.waitFor({ state: "hidden" });
        assert.equal((await state()).edit_state.revision, beforeDiscard);
        await page.getByLabel("Your request", { exact: true }).fill("Make captions bigger and use fade transitions");
        await page.getByRole("button", { name: "Prepare edits", exact: true }).click();
        await apply.waitFor({ timeout: 80000 });
        await apply.click();
        await apply.waitFor({ state: "hidden" });
        await saved.waitFor();
        await capture("editor-desktop");
        report.checks.push("Assistant proposal and explicit application");
        await page.getByRole("button", { name: "Export video", exact: true }).click();
        const completion = page.getByRole("heading", { name: "Export: done", exact: true });
        await completion.waitFor({ timeout: 120000 }).catch(async (e) => {
            console.error(await page.getByRole("region", { name: "Export status" }).innerText());
            throw e;
        });
        const link = page.getByRole("link", { name: "Download MP4", exact: true });
        assert.match(await link.getAttribute("href"), /^blob:/);
        const downloadPromise = page.waitForEvent("download");
        await link.click();
        const download = await downloadPromise;
        const mp4Path = path.join(directory, "browser-export.mp4");
        await download.saveAs(mp4Path);
        report.downloadBytes = fs.statSync(mp4Path).size;
        assert.ok(report.downloadBytes > 1000);
        assert.deepEqual(renderRequests, []);
        report.revision = (await state()).edit_state.revision;
        await page.reload();
        await page
            .getByRole("heading", { name: "Export: done", exact: true })
            .waitFor();
        assert.equal((await state()).edit_state.revision, report.revision);
        await page.getByRole("button", { name: "Export video", exact: true }).click();
        await page.getByRole("button", { name: "Cancel export", exact: true }).click();
        const retry = page.getByRole("button", { name: "Retry export", exact: true });
        await retry.waitFor();
        assert.match(await link.getAttribute("href"), /^blob:/);
        const restoredRevision = page.waitForResponse(r =>
            r.url().endsWith(`/projects/${report.projectId}/restore-revision`) && r.request().method() === "POST");
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        assert.equal((await restoredRevision).status(), 200);
        assert.ok((await state()).edit_state.revision > report.revision);
        await retry.click();
        await completion.waitFor({ timeout: 120000 });
        await page.getByText("Older version", { exact: true }).waitFor();
        assert.deepEqual(renderRequests, []);
        report.checks.push(
            "Browser export, local MP4 download, reload, cancellation, saved-revision retry",
        );
        await page.goto(`${origin}/final/${report.projectId}`);
        await page
            .getByRole("heading", { name: "Your video is ready", exact: true })
            .waitFor();
        await capture("final-desktop");
        for (const viewport of [
            { width: 390, height: 844 },
            { width: 768, height: 1024 },
        ]) {
            await page.setViewportSize(viewport);
            for (const [route, name] of [
                ["/dashboard", "dashboard"],
                ["/create", "create-options"],
                ["/create/from-scratch", "create"],
                [`/review/${report.projectId}`, "review"],
                [`/subtitle-styles/${report.projectId}`, "styles"],
                [`/projects/${report.projectId}/editor`, "editor"],
            ]) {
                await page.goto(origin + route);
                if (name === "editor")
                    await page.getByRole("heading", { name: "Timeline" }).waitFor();
                else
                    await page.getByRole("heading", { level: 1 }).waitFor();
                await capture(name + "-" + viewport.width);
            }
            if (viewport.width === 390) {
                await page
                    .getByRole("button", { name: "Assistant", exact: true })
                    .click();
                await page
                    .getByLabel("Your request", { exact: true })
                    .waitFor();
                await page
                    .getByRole("button", {
                        name: "Close assistant",
                        exact: true,
                    })
                    .click();
            }
        }
        report.checks.push(
            "390px phone and 768px tablet layouts, no horizontal overflow, accessible assistant toggle",
        );
        assert.deepEqual(errors, []);
        report.pageErrors = errors;
        report.verifiedAt = new Date().toISOString();
        fs.writeFileSync(
            path.join(runtime, "ui-browser-verification.json"),
            JSON.stringify(report, null, 2),
        );
        fs.writeFileSync(
            path.join(runtime, "node-demo-account.json"),
            JSON.stringify({ ...account, projectId: report.projectId }),
        );
        console.log(JSON.stringify(report));
    } catch (e) {
        await page
            .screenshot({
                path: path.join(directory, "failure.png"),
                fullPage: true,
            })
            .catch(() => {});
        throw e;
    } finally {
        await browser.close();
    }
}
main().catch((e) => {
    console.error("UI workflow check:", e.message);
    process.exitCode = 1;
});
