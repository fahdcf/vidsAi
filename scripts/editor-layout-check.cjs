const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const runtime = path.resolve(__dirname, "../../runtime");
const config = JSON.parse(
    fs.readFileSync(path.join(runtime, "node-local-config.json")),
);
const account = JSON.parse(
    fs.readFileSync(path.join(runtime, "ui-demo-account.json")),
);
const origin = config.origin;
const directory = path.join(runtime, "editor-verification");
fs.mkdirSync(directory, { recursive: true });
const report = { checks: [], screenshots: [], layouts: [] };
async function main() {
    const browser = await chromium.launch({
        executablePath: config.browserExe,
        headless: true,
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = `/projects/${account.projectId}`;
    const apply = page.getByRole("button", { name: /^Apply \d+ changes?$/ });
    async function state() {
        const r = await page.request.get(origin + base + "/edit-state");
        assert.equal(r.status(), 200);
        return (await r.json()).edit_state;
    }
    async function capture(name) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
            path: path.join(directory, name + ".png"),
            fullPage: false,
        });
        report.screenshots.push(name + ".png");
    }
    async function visibleApproval(name) {
        await page.waitForFunction(
            () =>
                document
                    .querySelector(".assistant-panel")
                    .classList.contains("assistant-overlay") ===
                innerWidth < 1180,
        );
        const metrics = await page.evaluate(() => {
            const box = (s) => {
                const r = document.querySelector(s).getBoundingClientRect();
                return {
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height,
                    bottom: r.bottom,
                    right: r.right,
                };
            };
            return {
                viewport: { width: innerWidth, height: innerHeight },
                panel: box(".assistant-panel"),
                actions: box(".assistant-approval-actions"),
                composer: box(".assistant-composer"),
                font: parseFloat(
                    getComputedStyle(
                        document.querySelector(".conversation-message p"),
                    ).fontSize,
                ),
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
            };
        });
        assert.ok(
            metrics.actions.y >= 0 &&
                metrics.actions.bottom <= metrics.viewport.height,
            `${name}: approval must fit viewport: ${JSON.stringify(metrics)}`,
        );
        assert.ok(
            metrics.composer.bottom <= metrics.viewport.height,
            `${name}: composer must fit viewport: ${JSON.stringify(metrics)}`,
        );
        assert.ok(
            metrics.actions.right <= metrics.viewport.width,
            `${name}: approval width`,
        );
        assert.ok(metrics.font >= 14, `${name}: readable messages`);
        assert.equal(
            metrics.overflow,
            false,
            `${name}: no horizontal overflow`,
        );
        if (metrics.viewport.width >= 1180)
            assert.ok(metrics.panel.width >= 350, `${name}: wide chat`);
        assert.equal(await apply.isVisible(), true);
        assert.equal(
            await page
                .getByRole("button", { name: "Discard", exact: true })
                .isVisible(),
            true,
        );
        report.layouts.push({ name, ...metrics });
    }
    try {
        await page.goto(origin + "/login");
        await page.locator("#email").fill(account.email);
        await page.locator("#password").fill(account.password);
        await page
            .getByRole("button", { name: "Sign in", exact: true })
            .click();
        await page.waitForURL("**/dashboard");
        await page.goto(origin + base + "/editor");
        await page
            .getByRole("heading", { name: "Editing assistant", exact: true })
            .waitFor();
        if (await apply.count()) {
            await page
                .getByRole("button", { name: "Discard", exact: true })
                .click();
            await apply.waitFor({ state: "hidden" });
        }
        await capture("editor-desktop");
        if (process.env.EDITOR_LAYOUT_INSPECT_ONLY) return;
        const before = await state();
        await page
            .getByLabel("Your request", { exact: true })
            .fill("Set caption font size to 62 and use fade transitions.");
        const planned = page.waitForResponse(
            (r) =>
                r.url().endsWith(base + "/agent-runs") &&
                r.request().method() === "POST",
        );
        await page
            .getByRole("button", { name: "Prepare edits", exact: true })
            .click();
        const response = await planned;
        assert.equal(response.status(), 200);
        const proposal = await response.json();
        assert.ok(proposal.plan.operations.length > 0);
        await apply.waitFor({ timeout: 90000 });
        assert.equal(
            (await state()).revision,
            before.revision,
            "Preparing a plan must not edit the video",
        );
        await page.waitForFunction(() => {
            const el = document.querySelector(".assistant-conversation");
            return el.scrollHeight - el.scrollTop - el.clientHeight < 2;
        });
        await visibleApproval("live-plan-desktop");
        await capture("approval-desktop");
        await page.reload();
        await apply.waitFor();
        assert.ok(
            await page
                .getByRole("log")
                .innerText()
                .then((t) => t.includes("Set caption font size to 62")),
        );
        await visibleApproval("restored-plan");
        const executed = page.waitForResponse(
            (r) =>
                r.url().includes("/execute") && r.request().method() === "POST",
        );
        await apply.click();
        assert.equal((await executed).status(), 200);
        await apply.waitFor({ state: "hidden" });
        const after = await state();
        assert.equal(after.revision, before.revision + 1);
        assert.equal(
            parseFloat(String(after.tracks.subtitles[0].config.fontSize)),
            62,
        );
        await page.reload();
        await page
            .getByText("Changes applied to your video.", { exact: true })
            .last()
            .waitFor();
        report.checks.push(
            "Live provider plan, visible approval, reload recovery, explicit apply and saved conversation",
        );
        await page
            .getByLabel("Your request", { exact: true })
            .fill("Set caption font size to 64.");
        await page
            .getByRole("button", { name: "Prepare edits", exact: true })
            .click();
        await apply.waitFor({ timeout: 90000 });
        const discarded = page.waitForResponse(
            (r) =>
                r.url().includes("/agent-runs/") &&
                r.request().method() === "DELETE",
        );
        await page
            .getByRole("button", { name: "Discard", exact: true })
            .click();
        assert.equal((await discarded).status(), 200);
        await apply.waitFor({ state: "hidden" });
        assert.equal(
            (await state()).revision,
            after.revision,
            "Discard must preserve the video",
        );
        await page.reload();
        assert.equal(await apply.count(), 0);
        await page
            .getByRole("log")
            .getByText("Proposal discarded.", { exact: true })
            .last()
            .waitFor();
        report.checks.push(
            "Live proposal discard preserves the video and survives reload",
        );
        // Layout fixture stresses long proposals without sending synthetic edits to the server.
        await page.route("**" + base + "/agent-runs", async (route) => {
            const input = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    runId: input.runId,
                    plan: {
                        reply: Array(18)
                            .fill(
                                "I prepared the changes for you to review. Your video stays as it is until you approve.",
                            )
                            .join("\n\n"),
                        operations: Array.from({ length: 30 }, (_, i) => ({
                            tool: "update_subtitle_config",
                            params: { config: { fontSize: 40 + i } },
                        })),
                    },
                }),
            });
        });
        await page.route("**" + base + "/agent-runs/*", async (route) => {
            if (route.request().method() === "DELETE")
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: '{"success":true}',
                });
            else await route.continue();
        });
        await page
            .getByLabel("Your request", { exact: true })
            .fill("Layout test: show a long proposal.");
        await page
            .getByRole("button", { name: "Prepare edits", exact: true })
            .click();
        await apply.waitFor();
        for (const viewport of [
            { width: 1440, height: 900 },
            { width: 1366, height: 768 },
            { width: 1366, height: 600 },
            { width: 768, height: 1024 },
            { width: 390, height: 844 },
        ]) {
            await page.setViewportSize(viewport);
            await page.evaluate(() => window.scrollTo(0, 0));
            await visibleApproval(
                `long-proposal-${viewport.width}x${viewport.height}`,
            );
            const y = (await apply.boundingBox()).y;
            await page.getByRole("log").evaluate((el) => (el.scrollTop = 0));
            await page
                .getByRole("list", { name: "Proposed changes" })
                .evaluate((el) => (el.scrollTop = el.scrollHeight));
            assert.equal(
                Math.round((await apply.boundingBox()).y),
                Math.round(y),
            );
            await capture(`approval-${viewport.width}x${viewport.height}`);
        }
        report.checks.push(
            "30-change proposal and long messages scroll independently; approval and composer visible at 1440, 1366, tablet and phone sizes",
        );
        await page.keyboard.press("Escape");
        await page
            .getByRole("dialog", { name: "Editing assistant" })
            .waitFor({ state: "hidden" });
        assert.equal(
            await page
                .locator("[data-assistant-toggle]")
                .evaluate((el) => el === document.activeElement),
            true,
        );
        await page.locator("[data-assistant-toggle]").click();
        await page.getByRole("dialog", { name: "Editing assistant" }).waitFor();
        await page
            .getByRole("button", { name: "Close assistant", exact: true })
            .focus();
        await page.keyboard.press("Shift+Tab");
        assert.equal(
            await page
                .getByRole("button", { name: "Discard", exact: true })
                .evaluate((el) => el === document.activeElement),
            true,
        );
        await page
            .getByRole("button", { name: "Discard", exact: true })
            .click();
        await apply.waitFor({ state: "hidden" });
        await capture("chat-phone");
        report.checks.push(
            "Mobile modal, keyboard focus containment, Escape and focus return, discard",
        );
        await page.keyboard.press("Escape");
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.reload();
        await page
            .getByRole("button", { name: "Expand chat", exact: true })
            .click();
        assert.ok(
            (await page.locator(".assistant-panel").boundingBox()).width >= 450,
        );
        await capture("chat-expanded");
        await page.getByRole("button", { name: "Tools", exact: true }).click();
        await page
            .getByRole("button", { name: "Captions", exact: true })
            .click();
        await capture("editor-tools");
        report.checks.push(
            "Chat expansion, optional editing tools and caption controls",
        );
        assert.deepEqual(errors, []);
        report.pageErrors = errors;
    } finally {
        await browser.close();
        fs.writeFileSync(
            path.join(runtime, "editor-layout-verification.json"),
            JSON.stringify(report, null, 2),
        );
        console.log(JSON.stringify(report, null, 2));
    }
}
main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
