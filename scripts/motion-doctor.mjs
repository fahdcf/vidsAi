import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

async function checkAppPort() {
    const env = await readFile(path.join(root, ".env"), "utf8").catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return "";
    });
    const saved = env.match(/^NODE_APP_ORIGIN=(.*)$/m)?.[1].trim().replace(/^['"]|['"]$/g, "");
    const origin = new URL(process.env.NODE_APP_ORIGIN || saved || "http://127.0.0.1:8100");
    if (origin.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(origin.hostname) ||
        origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
        throw new Error("Set NODE_APP_ORIGIN to a local HTTP origin such as http://127.0.0.1:8100.");
    }
    const port = Number(origin.port) || 8100;
    const probe = net.createServer();
    try {
        await new Promise((resolve, reject) => {
            probe.once("error", reject);
            probe.listen(port, "127.0.0.1", resolve);
        });
    } catch (error) {
        if (error.code !== "EADDRINUSE") throw error;
        const health = await fetch(`http://127.0.0.1:${port}/health`, {
            redirect: "error",
            signal: AbortSignal.timeout(2500),
        }).then((response) => response.ok ? response.json() : null).catch(() => null);
        if (health?.status === "ok" && health.runtime === "node-typescript") {
            return { port, status: "VidsAI is already serving" };
        }
        throw new Error(`Port ${port} is occupied. Select a free NODE_APP_ORIGIN port or resolve the conflict.`);
    }
    await new Promise((resolve) => probe.close(resolve));
    return { port, status: "available" };
}

async function doctor() {
    if (Number(process.versions.node.split(".")[0]) < 24) {
        throw new Error(`Node 24 or later is required. This shell selected ${process.version}.`);
    }
    const appPort = await checkAppPort();
    const { fonts } = JSON.parse(await readFile(path.join(root, "motion-toolchain.json"), "utf8"));
    const { chromium } = await import("playwright");
    const { createServer } = await import("vite");
    const { default: Database } = await import("better-sqlite3");
    const database = new Database(":memory:");
    try {
        database.prepare("SELECT 1").get();
    } finally {
        database.close();
    }
    const server = await createServer({
        root,
        configFile: false,
        cacheDir: path.join(root, "node_modules/.cache/motion-doctor"),
        optimizeDeps: { noDiscovery: true, include: ["mediabunny", "@remotion/web-renderer"] },
        server: { host: "127.0.0.1", port: 0, hmr: false },
        plugins: [{
            name: "motion-doctor-page",
            configureServer(vite) {
                vite.middlewares.use("/__motion_doctor", (_request, response) => {
                    response.setHeader("Content-Type", "text/html");
                    response.end("<!doctype html><title>VidsAI browser capability check</title>");
                });
            },
        }],
    });
    const results = [];
    try {
        await server.listen();
        const { port } = server.httpServer.address();
        for (const channel of ["chrome", "msedge"]) {
            let browser;
            try {
                browser = await chromium.launch({ channel, headless: true, timeout: 15000 });
                const page = await browser.newPage();
                await page.goto(`http://127.0.0.1:${port}/__motion_doctor`, { timeout: 15000 });
                await page.evaluate(async (fonts) => {
                    const { checkBrowserOutput } = await import("/resources/js/editor/browser-export/capabilities.ts");
                    const signal = AbortSignal.timeout(20000);
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    for (const [index, filename] of fonts.entries()) {
                        const face = await new FontFace(`MotionProbe${index}`, `url(/${filename})`).load();
                        document.fonts.add(face);
                        ctx.font = `18px ${face.family}`;
                        if (ctx.measureText("Motion").width <= 0) throw new Error("Canvas font measurement failed.");
                    }
                    await checkBrowserOutput({ width: 1280, height: 720, fps: 30, muted: false, outputTarget: "web-fs" }, signal);
                    const directory = await navigator.storage.getDirectory();
                    const name = `motion-doctor-${crypto.randomUUID()}`;
                    const file = await directory.getFileHandle(name, { create: true });
                    try {
                        const output = await file.createWritable();
                        try {
                            await output.write("VidsAI");
                            await output.close();
                        } catch (error) {
                            await output.abort().catch(() => {});
                            throw error;
                        }
                        if (await (await file.getFile()).text() !== "VidsAI") throw new Error("Local file readback failed.");
                    } finally {
                        await directory.removeEntry(name);
                    }
                }, fonts);
                results.push({ channel, version: browser.version(), passed: true });
            } catch (error) {
                results.push({ channel, passed: false, message: error.message });
            } finally {
                await browser?.close();
            }
        }
    } finally {
        await server.close();
    }
    console.log(JSON.stringify({ node: process.version, appPort, browsers: results }, null, 2));
    if (results.some(({ passed }) => !passed)) process.exitCode = 1;
}

doctor().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
