const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
    runtime = path.resolve(root, "../runtime");
const config = JSON.parse(
    fs.readFileSync(
        path.join(
            runtime,
            fs.existsSync(path.join(runtime, "node-local-config.json"))
                ? "node-local-config.json"
                : "local-config.json",
        ),
    ),
);
const origin =
    process.env.NODE_APP_ORIGIN || config.origin || "http://127.0.0.1:8100";
const script =
    "Discover our reusable bottle. Take it on adventures. Keep your water cold all day.";
async function main() {
    const browser = await chromium.launch({
        executablePath: config.browserExe,
        headless: true,
    });
    const errors = [];
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const report = { checks: [] };
    try {
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
            .getByRole("heading", { name: "Your video projects" })
            .waitFor();
        report.checks.push("existing password/account and imported projects");
        await page.goto(origin + "/profile");
        await page
            .getByRole("button", { name: "Sign out", exact: true })
            .click();
        await page.waitForURL("**/login");
        const email = `node-browser-${Date.now()}@example.test`,
            password = "Node-" + crypto.randomUUID();
        await page.goto(origin + "/register");
        await page.locator("#name").fill("Node browser verification");
        await page.locator("#email").fill(email);
        await page.locator("#password").fill(password);
        await page
            .getByRole("button", { name: "Create account", exact: true })
            .click();
        await page.waitForURL("**/dashboard");
        report.checks.push("registration and logout");
        fs.writeFileSync(
            path.join(runtime, "node-demo-account.json"),
            JSON.stringify({ email, password }),
        );
        await page.goto(origin + "/create");
        await page
            .getByLabel("Project name")
            .fill("Node-only workflow verification");
        await page.getByLabel("Category", { exact: true }).fill("Bottle");
        await page.getByLabel("Description", { exact: true }).fill(script);
        await page
            .getByRole("combobox", { name: /^Video format/ })
            .selectOption("16:9");
        await page.getByLabel("Your script", { exact: true }).fill(script);
        await page
            .getByLabel("Voiceover (MP3 or WAV, up to 10 MB)")
            .setInputFiles(path.join(runtime, "provider-test-voice.wav"));
        await page
            .getByRole("button", { name: "Generate scenes", exact: true })
            .click();
        await page.waitForURL(/\/processing\/\d+$/);
        report.projectId = page.url().match(/processing\/(\d+)/)[1];
        await page
            .getByRole("heading", { name: "Processing Your Video Ad" })
            .waitFor();
        report.checks.push("React creation and Node processing");
        console.log(
            JSON.stringify({
                projectId: report.projectId,
                stage: "processing",
            }),
        );
        await page.waitForURL(new RegExp(`/review/${report.projectId}$`), {
            timeout: 180000,
        });
        await page
            .getByRole("heading", { name: "Review your scenes" })
            .waitFor();
        assert.ok((await page.locator("video").count()) >= 2);
        await Promise.all([
            page.waitForEvent("load"),
            page
                .getByRole("button", { name: "Find another clip", exact: true })
                .first()
                .click(),
        ]);
        await page
            .getByRole("heading", { name: "Review your scenes" })
            .waitFor();
        await page
            .getByLabel("Replace media", { exact: true })
            .first()
            .setInputFiles(
                path.join(root, "public/migration-fixtures/green.png"),
            );
        await page.locator('img[alt="Scene 1"]').waitFor();
        const firstEnd = page
            .getByLabel("End (seconds)", { exact: true })
            .first();
        await firstEnd.fill(
            String(Math.max(0.5, Number(await firstEnd.inputValue()) - 0.1)),
        );
        report.checks.push(
            "stock regeneration, private replacement upload and source trimming",
        );
        await page.getByRole("button", { name: "Confirm All Scenes" }).click();
        await page.waitForURL(
            new RegExp(`/subtitle-styles/${report.projectId}$`),
        );
        report.checks.push(
            "Deepgram/NVIDIA/Pexels scene generation and confirmation",
        );
        await page
            .getByRole("button", { name: "Captions", exact: true })
            .click();
        await page.locator("input[name=size]").fill("32");
        await page.getByRole("button", { name: "Save caption style" }).click();
        await page.getByText(/Saved.*Revision/).waitFor();
        report.checks.push("caption editing and persistence");
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        await page.getByRole("button", { name: "Redo", exact: true }).waitFor();
        await page.getByRole("button", { name: "Redo", exact: true }).click();
        await page
            .getByLabel("Your request")
            .fill("Make captions bigger and use fade transitions");
        await page.getByRole("button", { name: "Prepare edits" }).click();
        await page
            .getByRole("button", { name: "Apply 2 changes" })
            .waitFor({ timeout: 70000 });
        await page.getByRole("button", { name: "Apply 2 changes" }).click();
        report.checks.push("undo/redo and approved agent operations");
        await page.getByRole("button", { name: "Audio", exact: true }).click();
        await page
            .getByLabel("Search music", { exact: true })
            .fill("ambient music");
        await page
            .getByRole("button", { name: "Search tracks", exact: true })
            .click();
        await page
            .getByRole("button", { name: "Use this track", exact: true })
            .first()
            .waitFor({ timeout: 45000 });
        await page
            .getByRole("button", { name: "Use this track", exact: true })
            .first()
            .click();
        await page.getByText(/Saved.*Revision/).waitFor();
        const state = await (
            await page.request.get(
                origin + `/projects/${report.projectId}/edit-state`,
            )
        ).json();
        assert.ok(
            state.edit_state.tracks.audio.some((t) => t.type === "music"),
        );
        report.checks.push(
            "FreeSound search, preview URLs and persisted music selection",
        );
        await page
            .getByRole("button", { name: "Export video", exact: true })
            .click();
        await page
            .getByRole("heading", { name: "Export: done", exact: true })
            .waitFor({ timeout: 240000 });
        const link = page.getByRole("link", { name: "Download MP4" });
        const download = await page.request.get(
            new URL(await link.getAttribute("href"), origin).href,
        );
        assert.equal(download.status(), 200);
        const bytes = await download.body();
        assert.ok(bytes.length > 1000);
        report.downloadBytes = bytes.length;
        report.checks.push("Node durable export and authorized MP4 download");
        assert.deepEqual(errors, []);
        report.browserErrors = errors;
        report.origin = origin;
        report.verifiedAt = new Date().toISOString();
        await page.screenshot({
            path: path.join(runtime, "node-browser-final.png"),
            fullPage: true,
        });
        fs.writeFileSync(
            path.join(runtime, "node-browser-verification.json"),
            JSON.stringify(report, null, 2),
        );
        fs.writeFileSync(
            path.join(runtime, "node-demo-account.json"),
            JSON.stringify({ email, password, projectId: report.projectId }),
        );
        console.log(JSON.stringify(report));
    } finally {
        await browser.close();
    }
}
main().catch((e) => {
    console.error("Node browser check:", e.message);
    process.exitCode = 1;
});
