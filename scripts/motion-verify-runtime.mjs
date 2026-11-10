import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { build, preview } from "vite";

const outDir = await mkdtemp(path.join(tmpdir(), "vidsai-runtime-"));
const config = { configFile: false, publicDir: false, worker: { format: "es" }, build: {
    outDir, rollupOptions: { input: "resources/js/editor/motion/runtime/probe.ts", preserveEntrySignatures: "strict",
        output: { entryFileNames: "probe.js" } },
} };
await build(config);
await writeFile(path.join(outDir, "index.html"), "<!doctype html><title>Motion runtime verification</title>");
const server = await preview({ ...config, preview: { host: "127.0.0.1", port: 0 } });
let browser;
try {
    browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
    const page = await browser.newPage();
    await page.goto(server.resolvedUrls.local[0]);
    const run = (source, frames = [0]) => page.evaluate(async ({ source, frames }) => {
        const { runMotionRuntimeProbe } = await import("/probe.js");
        return runMotionRuntimeProbe({ version: 1, fps: 30, frames, source, assetHandles: ["owned-logo"] });
    }, { source, frames });
    const source = `(input, sdk) => [sdk.rect(sdk.math.sin(input.frame / 30), 0.5, 0.3, 0.1, "#ffaa55"),
        sdk.asset(input.assetHandles[0], 0, 0, 0.1, 0.1)]`;
    const frames = [15, 0, 29, 15, 1, 5, 8, 3, 0, 60, 120, 150, 15, 17, 18, 19];
    const startup = performance.now();
    const sample = await run(source, frames);
    const elapsed = performance.now() - startup;
    assert.equal(sample.ok, true, JSON.stringify(sample));
    assert.equal(sample.heapBytes, 16 * 1024 * 1024);
    assert.deepEqual(sample.frames[0], sample.frames[3]);
    assert.deepEqual(sample.frames[0], sample.frames[12]);
    assert.deepEqual(sample.frames[1], sample.frames[8]);
    assert.notDeepEqual(sample.frames[0], sample.frames[1]);
    assert.deepEqual((await run(source, [15])).frames[0], sample.frames[0]);
    assert.ok(sample.frameMs.every((ms) => ms < 25), JSON.stringify(sample.frameMs));
    console.log(`16-frame request took ${elapsed.toFixed(1)} ms including startup. Slowest VM frame ${Math.max(...sample.frameMs).toFixed(1)} ms.`);

    const hostAccess = await run(`() => {
        if ([typeof fetch, typeof postMessage, typeof document, typeof navigator, typeof process, typeof WebAssembly,
            typeof Date, typeof performance, typeof Math.random, typeof Promise, typeof ArrayBuffer].some(value => value !== "undefined")) throw 1;
        return [];
    }`);
    assert.equal(hostAccess.ok, true, JSON.stringify(hostAccess));
    for (const [source, reason] of [
        ["() => { while (true) {} }", "interrupted"],
        ["() => { const recurse = () => 1 + recurse(); return recurse(); }", "execution"],
        ["() => ['x'.repeat(8 * 1024 * 1024)]", "execution"],
        ["() => ['é'.repeat(20000)]", "output"],
        ["(_, sdk) => Array.from({ length: 129 }, () => sdk.rect(0, 0, 1, 1, '#112233'))", "output"],
        ["(_, sdk) => [sdk.asset('other-logo', 0, 0, 1, 1)]", "output"],
        ["(_, sdk) => [sdk.rect(Infinity, 0, 1, 1, '#112233')]", "output"],
        ["() => import('https://example.test/probe')", "execution"],
    ]) {
        assert.deepEqual(await run(source), { ok: false, reason }, source);
    }
    await page.route("**/*.wasm", () => {});
    assert.deepEqual(await run(source), { ok: false, reason: "deadline" });
    await page.unroute("**/*.wasm");
    assert.equal((await run(source)).ok, true);
    console.log("Bundled worker passed isolation, VM limits, output validation, deadline termination and recovery checks.");
} finally {
    await browser?.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
}
