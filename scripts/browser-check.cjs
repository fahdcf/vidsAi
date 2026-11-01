const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "../..");
const config = JSON.parse(
    fs.readFileSync(path.join(root, "runtime/local-config.json")),
);
async function main() {
    const browser = await chromium.launch({
        executablePath:
            config.browserExe ||
            path.join(
                root,
                "remotion-api/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
            ),
        headless: true,
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
        const email = `migration-${Date.now()}@example.test`;
        const password = "Migration-" + crypto.randomUUID();
        await page.goto("http://127.0.0.1:8100/register");
        await page.locator("#name").fill("Migration verification");
        await page.locator("#email").fill(email);
        await page.locator("#password").fill(password);
        await page.locator("#password_confirmation").fill(password);
        await page.locator("button[type=submit]").click();
        await page.waitForURL("**/dashboard");
        await page
            .getByRole("heading", { name: "Your video projects" })
            .waitFor();
        const env = {
            ...process.env,
            PHPRC: path.join(root, "runtime/php.ini"),
            TEMP: config.tempDir,
            TMP: config.tempDir,
        };
        const id = execFileSync(
            config.phpExe,
            ["-c", env.PHPRC, "artisan", "editing:demo", email],
            { cwd: path.join(root, "vidsAi"), env, encoding: "utf8" },
        ).trim();
        assert.match(id, /^\d+$/);
        await page.goto(`http://127.0.0.1:8100/projects/${id}/editor`);
        await page
            .getByRole("heading", { name: /Migration verification/ })
            .waitFor();
        await page
            .getByRole("button", { name: "Captions", exact: true })
            .click();
        await page.locator("input[name=size]").fill("32");
        await page.getByRole("button", { name: "Save caption style" }).click();
        await page.getByText("Saved · Revision 2").waitFor();
        await page.getByRole("button", { name: "Undo", exact: true }).click();
        await page.getByText("Saved · Revision 3").waitFor();
        await page.getByRole("button", { name: "Redo", exact: true }).click();
        await page.getByText("Saved · Revision 4").waitFor();
        await page
            .getByLabel("Your request")
            .fill("Make captions bigger and use fade transitions");
        await page.getByRole("button", { name: "Prepare edits" }).click();
        await page
            .getByRole("button", { name: "Apply 2 changes" })
            .waitFor({ timeout: 70000 });
        await page.getByRole("button", { name: "Apply 2 changes" }).click();
        await page.getByText("Saved · Revision 5").waitFor();
        await page.reload();
        await page.getByText("Saved · Revision 5").waitFor();
        await page.getByRole("button", { name: "Scene", exact: true }).click();
        await page
            .getByLabel("Upload replacement media")
            .setInputFiles(
                path.join(
                    root,
                    "remotion-api/public/migration-fixtures/green.png",
                ),
            );
        await page.getByText("Saved · Revision 6").waitFor();
        await page
            .getByRole("button", { name: "Captions", exact: true })
            .click();
        await page.locator("input[name=size]").fill("45");
        await page.getByText("Saved · Revision 7").waitFor();
        await page.reload();
        await page.getByText("Saved · Revision 7").waitFor();
        await page.screenshot({
            path: path.join(root, "runtime/editor-desktop.png"),
            fullPage: true,
        });
        await page
            .getByRole("button", { name: "Export video", exact: true })
            .click();
        await page
            .getByRole("heading", { name: "Export: done", exact: true })
            .waitFor({ timeout: 180000 });
        const download = page.getByRole("link", { name: "Download MP4" });
        const url = await download.getAttribute("href");
        const response = await page.request.get(url);
        assert.equal(response.status(), 200);
        assert.match(response.headers()["content-type"], /video\/mp4/);
        const bytes = await response.body();
        assert.ok(bytes.length > 1000);
        fs.writeFileSync(path.join(root, "runtime/browser-export.mp4"), bytes);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
            path: path.join(root, "runtime/editor-mobile.png"),
            fullPage: true,
        });
        const outsider = await browser.newContext();
        const unauthorized = await outsider.request.get(
            `http://127.0.0.1:8100/projects/${id}/edit-state`,
            { headers: { Accept: "application/json" } },
        );
        assert.equal(unauthorized.status(), 401);
        await outsider.close();
        assert.deepEqual(errors, []);
        const result = {
            projectId: id,
            checks: [
                "registration",
                "React dashboard",
                "React editor",
                "manual caption edit",
                "undo",
                "redo",
                "multi-step assistant",
                "reload persistence",
                "private media upload",
                "ordered autosave",
                "real queued export",
                "authorized MP4 download",
                "mobile layout",
                "no browser errors",
            ],
            downloadBytes: bytes.length,
        };
        fs.writeFileSync(
            path.join(root, "runtime/browser-verification.json"),
            JSON.stringify(result, null, 2),
        );
        fs.writeFileSync(
            path.join(root, "runtime/demo-account.json"),
            JSON.stringify({ email, password, projectId: id }, null, 2),
        );
        console.log(JSON.stringify(result, null, 2));
    } finally {
        await browser.close();
    }
}
main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
