import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const runtime = path.resolve(root, "../runtime");
const { ffmpeg } = JSON.parse(await readFile(path.join(root, "motion-toolchain.json"), "utf8"));
const mixed = process.argv.indexOf("--mixed");
const mixedSource = mixed >= 0 ? await readFile(process.argv[mixed + 1]) : null;
const reportRoot = path.join(runtime, "motion-verification");
await mkdir(reportRoot, { recursive: true });
const directory = await mkdtemp(path.join(reportRoot, "render-"));
const app = await createServer({
    root, configLoader: "native", cacheDir: path.join(root, "node_modules/.cache/motion-verifier"),
    server: { host: "127.0.0.1", hmr: false },
    optimizeDeps: { noDiscovery: true, include: [
        "react", "react/jsx-runtime", "react-dom", "react-dom/client", "remotion", "@remotion/player",
        "@remotion/web-renderer", "@remotion/media", "mediabunny", "zod",
    ] },
});
let browser;
try {
    await app.listen();
    const origin = `http://127.0.0.1:${app.httpServer.address().port}`;
    browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
    const page = await browser.newPage({ acceptDownloads: true });
    const renderRequests = [];
    page.on("request", (request) => {
        if (request.method() === "POST" && /\/(render|export)$/.test(new URL(request.url()).pathname)) renderRequests.push(request.url());
    });
    await page.route(origin + "/__motion_benchmark", (route) => route.fulfill({
        contentType: "text/html", body: "<!doctype html><title>Motion benchmark</title><main id='probe'></main>",
    }));
    if (mixedSource) await page.route(origin + "/__motion_source.mp4", (route) => route.fulfill({ contentType: "video/mp4", body: mixedSource }));
    await page.goto(origin + "/__motion_benchmark");
    const [download, report] = await Promise.all([
        page.waitForEvent("download", { timeout: 150000 }),
        page.evaluate(async ({ full, mixed }) => {
            const { verifyMotionBrowser, verifyMixedMotionBrowser } = await import("/scripts/fixtures/motion-browser.tsx");
            return mixed ? verifyMixedMotionBrowser() : verifyMotionBrowser(full);
        }, { full: process.argv.includes("--full"), mixed: Boolean(mixedSource) }),
    ]);
    if (renderRequests.length) throw new Error("The motion benchmark sent a server render request.");
    const filename = path.join(directory, "motion-benchmark.mp4");
    await download.saveAs(filename);
    const decode = spawnSync(path.join(runtime, ffmpeg.runtimePath), [
        "-nostdin", "-hide_banner", "-i", filename, "-f", "null", "-",
    ], { encoding: "utf8", windowsHide: true, timeout: 120000 });
    await writeFile(path.join(directory, "decode.log"), decode.stderr ?? "");
    if (decode.error) throw decode.error;
    if (decode.status || !decode.stderr.includes("Video: h264") || !decode.stderr.includes("Audio: aac")) {
        throw new Error("The motion MP4 failed independent H.264/AAC validation.");
    }
    const frames = [...decode.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1];
    if (Number(frames) !== report.frames) throw new Error("The decoded frame count differs from the project.");
    const outcome = { ...report, browser: browser.version(), directory, serverRenderRequests: renderRequests.length };
    await writeFile(path.join(directory, "report.json"), JSON.stringify(outcome, null, 2));
    console.log(JSON.stringify(outcome, null, 2));
} finally {
    await browser?.close();
    await app.close();
}
