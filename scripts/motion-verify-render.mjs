import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const runtime = path.resolve(root, "../runtime");
const { ffmpeg } = JSON.parse(await readFile(path.join(root, "motion-toolchain.json"), "utf8"));
const mixed = process.argv.indexOf("--mixed");
const trace = process.argv.indexOf("--trace");
const qualityIndex = process.argv.indexOf("--quality");
const quality = qualityIndex >= 0 ? process.argv[qualityIndex + 1] : "standard";
const background = process.argv.includes("--background");
const channel = process.env.MOTION_TEST_BROWSER || "chrome";
if (!["standard", "motion1080", "motion1080smooth"].includes(quality)) throw new Error("Unknown motion export quality.");
const source = mixed >= 0 || trace >= 0 ? await readFile(process.argv[(mixed >= 0 ? mixed : trace) + 1]) : null;
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
let browserProcess;
let backgroundCheck;
let gpu;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchBackgroundBrowser() {
    const program = channel === "msedge"
        ? path.join(process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)", "Microsoft/Edge/Application/msedge.exe")
        : path.join(process.env.ProgramFiles || "C:/Program Files", "Google/Chrome/Application/chrome.exe");
    const profile = path.join(directory, "browser-profile");
    browserProcess = spawn(program, ["--headless=new", "--no-first-run", "--remote-debugging-port=0",
        "--user-data-dir=" + profile, ...(process.env.MOTION_TEST_GPU === "integrated" ? ["--force-low-power-gpu"] : []), "about:blank"],
    { windowsHide: true, stdio: "ignore" });
    let launchError;
    browserProcess.once("error", (error) => { launchError = error; });
    for (let attempt = 0; attempt < 80; attempt++) {
        if (launchError) throw launchError;
        const endpoint = await readFile(path.join(profile, "DevToolsActivePort"), "utf8").catch(() => "");
        const port = endpoint.split(/\r?\n/)[0];
        if (port) return chromium.connectOverCDP("http://127.0.0.1:" + port, { noDefaults: true });
        await sleep(100);
    }
    throw new Error("The browser did not open a test debugging session.");
}

async function saveProbeFile(page, destination, bytes) {
    const file = await open(destination, "wx");
    try {
        for (let offset = 0; offset < bytes; offset += 512 * 1024) {
            const encoded = await page.evaluate(async (start) => {
                const data = new Uint8Array(await window.vidsaiMotionVerificationFile.slice(start, start + 512 * 1024).arrayBuffer());
                let binary = "";
                for (let index = 0; index < data.length; index += 8192) binary += String.fromCharCode(...data.subarray(index, index + 8192));
                return btoa(binary);
            }, offset);
            await file.writeFile(Buffer.from(encoded, "base64"));
        }
    } finally { await file.close(); }
}

try {
    await app.listen();
    const origin = `http://127.0.0.1:${app.httpServer.address().port}`;
    browser = background ? await launchBackgroundBrowser() : await chromium.launch({ channel, headless: true });
    const page = background ? browser.contexts()[0].pages()[0] : await browser.newPage({ acceptDownloads: true });
    const system = await browser.newBrowserCDPSession();
    const info = await system.send("SystemInfo.getInfo");
    gpu = { renderer: info.gpu.auxAttributes?.glRenderer ?? null, devices: info.gpu.devices.map(({ deviceString }) => deviceString) };
    const renderRequests = [];
    page.on("request", (request) => {
        if (request.method() === "POST" && /\/(render|export)$/.test(new URL(request.url()).pathname)) renderRequests.push(request.url());
    });
    await page.route(origin + "/__motion_benchmark", (route) => route.fulfill({
        contentType: "text/html", body: "<!doctype html><title>Motion benchmark</title><main id='probe'></main>",
    }));
    if (source) await page.route(origin + "/__motion_source.mp4", (route) => route.fulfill({ contentType: "video/mp4", body: source }));
    await page.goto(origin + "/__motion_benchmark");
    await page.bringToFront();
    const [download, report] = await Promise.all([
        background ? null : page.waitForEvent("download", { timeout: 150000 }),
        page.evaluate(async ({ full, mixed, trace, quality, sync, background }) => {
            const { verifyMotionBrowser, verifyMixedMotionBrowser, verifyMotionLayoutAndSync } = await import("/scripts/fixtures/motion-browser.tsx");
            if (sync) return verifyMotionLayoutAndSync();
            return mixed ? verifyMixedMotionBrowser() : verifyMotionBrowser(full, trace, quality, background);
        }, { full: process.argv.includes("--full") || trace >= 0 || quality !== "standard", mixed: mixed >= 0, trace: trace >= 0,
            quality, sync: process.argv.includes("--sync"), background }),
        (async () => {
            if (!background) return;
            await page.waitForFunction(() => document.documentElement.dataset.motionRender === "rendering", undefined, { timeout: 40_000 });
            const inspect = () => page.evaluate(() => ({ visibility: document.visibilityState,
                progress: Number(document.documentElement.dataset.motionProgress), phase: document.documentElement.dataset.motionRender }));
            const visible = await inspect();
            if (visible.visibility !== "visible") throw new Error("The render did not start in a visible tab.");
            const cover = await page.context().newPage();
            try {
                await cover.bringToFront();
                await sleep(250);
                const hidden = await inspect();
                if (hidden.visibility !== "hidden") throw new Error("The test browser did not background the render tab.");
                await sleep(2200);
                const hiddenAfter = await inspect();
                await page.bringToFront();
                await sleep(200);
                const restored = await inspect();
                if (restored.visibility !== "visible") throw new Error("The render tab could not return to the foreground.");
                backgroundCheck = { visible, hidden, hiddenAfter, restored };
            } finally { await cover.close(); }
        })(),
    ]);
    if (renderRequests.length) throw new Error("The motion benchmark sent a server render request.");
    const filename = path.join(directory, "motion-benchmark.mp4");
    if (download) await download.saveAs(filename);
    else await saveProbeFile(page, filename, report.bytes);
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
    if (!decode.stderr.includes(`${report.width}x${report.height}`) ||
        !new RegExp(`\\b${report.fps} fps\\b`).test(decode.stderr)) {
        throw new Error("The MP4 dimensions or frame rate differ from the selected profile.");
    }
    const outcome = { ...report, browser: browser.version(), channel, gpu, backgroundCheck, directory,
        serverRenderRequests: renderRequests.length, errors: [] };
    await writeFile(path.join(directory, "report.json"), JSON.stringify(outcome, null, 2));
    console.log(JSON.stringify(outcome, null, 2));
} catch (error) {
    await writeFile(path.join(directory, "failure.json"), JSON.stringify({ channel, quality, error: error.message }, null, 2));
    throw error;
} finally {
    await browser?.close();
    if (browserProcess && browserProcess.exitCode === null && browserProcess.pid) {
        browserProcess.kill();
        await once(browserProcess, "exit").catch(() => {});
    }
    await app.close();
}
