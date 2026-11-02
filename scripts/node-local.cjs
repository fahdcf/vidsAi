const fs = require("node:fs");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const renderer = path.resolve(root, "../remotion-api");
const runtime = path.resolve(root, "../runtime");
fs.mkdirSync(runtime, { recursive: true });
const configFile = path.join(runtime, "node-local-config.json");
const legacyFile = path.join(runtime, "local-config.json");
const config = fs.existsSync(configFile)
    ? JSON.parse(fs.readFileSync(configFile))
    : fs.existsSync(legacyFile)
      ? JSON.parse(fs.readFileSync(legacyFile))
      : {};
config.nodeExe ||= process.execPath;
config.tempDir ||= path.join(runtime, "tmp");
fs.mkdirSync(config.tempDir, { recursive: true });
const statefile = path.join(runtime, "node-services.json");
const action = process.argv[2] || "start";
const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};
const saved = () =>
    fs.existsSync(statefile) ? JSON.parse(fs.readFileSync(statefile)) : [];
async function main() {
    if (action === "status") {
        console.log(
            JSON.stringify(
                saved().map((s) => ({ name: s.name, running: alive(s.pid) })),
            ),
        );
        return;
    }
    if (action === "stop") {
        for (const s of saved()) {
            if (!alive(s.pid)) continue;
            const line = execFileSync(
                "powershell.exe",
                [
                    "-NoProfile",
                    "-Command",
                    `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${s.pid}').CommandLine`,
                ],
                { encoding: "utf8", windowsHide: true },
            );
            if (
                !line
                    .toLowerCase()
                    .includes(path.resolve(root, "..").toLowerCase())
            )
                throw new Error("Process no longer belongs to this workspace");
            execFileSync("taskkill.exe", ["/PID", String(s.pid), "/T", "/F"], {
                windowsHide: true,
                stdio: "ignore",
            });
        }
        fs.writeFileSync(statefile, "[]");
        return;
    }
    if (saved().some((s) => alive(s.pid)))
        throw new Error("Node services already running");
    const env = {
        ...process.env,
        TEMP: config.tempDir,
        TMP: config.tempDir,
        NODE_APP_ORIGIN:
            process.env.NODE_APP_ORIGIN ||
            config.origin ||
            "http://127.0.0.1:8100",
        NODE_RENDER_URL: "http://127.0.0.1:5211",
        NODE_AGENT_URL: "http://127.0.0.1:5212",
        HOST: "127.0.0.1",
        MAX_CONCURRENT: "1",
        FRAME_CONCURRENCY: "1",
        BROWSER_EXECUTABLE: config.browserExe,
    };
    for (const line of fs
        .readFileSync(path.join(root, ".env"), "utf8")
        .split(/[\r\n]+/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
    if (config.databasePath && !process.env.NODE_DATABASE_PATH)
        env.NODE_DATABASE_PATH = config.databasePath;
    if (!env.APP_KEY || !env.WORKER_TOKEN)
        throw new Error(
            "Set APP_KEY and WORKER_TOKEN in the private .env before starting.",
        );
    for (const port of [
        Number(new URL(env.NODE_APP_ORIGIN).port) || 8100,
        5211,
        5212,
    ])
        await new Promise((resolve, reject) => {
            const socket = require("node:net").createServer();
            socket.once("error", () =>
                reject(new Error(`Port ${port} is already in use.`)),
            );
            socket.listen(port, "127.0.0.1", () => socket.close(resolve));
        });
    env.APP_MEDIA_ORIGIN = env.NODE_APP_ORIGIN;
    const defs = [
        {
            name: "Control",
            cwd: root,
            args: ["--import", "tsx", path.join(root, "server/start.ts")],
            env,
        },
        {
            name: "Render",
            cwd: renderer,
            args: [
                "--import",
                "tsx",
                path.join(renderer, "apps/render-worker/server.ts"),
            ],
            env: {
                ...env,
                PORT: "5211",
                RENDER_DATA_DIR: path.join(runtime, "node-render"),
                RENDER_OUTPUT_DIR: path.join(runtime, "node-renders"),
            },
        },
        {
            name: "Agent",
            cwd: renderer,
            args: [
                "--import",
                "tsx",
                path.join(renderer, "apps/agent-worker/server.ts"),
            ],
            env: { ...env, AGENT_PORT: "5212" },
        },
    ];
    const services = [];
    for (const d of defs) {
        const logfile = path.join(runtime, `node-${d.name.toLowerCase()}.log`);
        const fd = fs.openSync(logfile, "a");
        const p = spawn(config.nodeExe, d.args, {
            cwd: d.cwd,
            env: d.env,
            detached: true,
            windowsHide: true,
            stdio: ["ignore", fd, fd],
        });
        fs.closeSync(fd);
        await new Promise((resolve, reject) => {
            p.once("spawn", resolve);
            p.once("error", reject);
        });
        p.unref();
        services.push({ name: d.name, pid: p.pid });
        fs.writeFileSync(statefile, JSON.stringify(services));
    }
    for (const url of [
        env.NODE_APP_ORIGIN + "/health",
        "http://127.0.0.1:5211/health",
        "http://127.0.0.1:5212/health",
    ]) {
        let ok = false;
        for (let i = 0; i < 60; i++) {
            try {
                ok = (await fetch(url, { signal: AbortSignal.timeout(1000) }))
                    .ok;
                if (ok) break;
            } catch {}
            await new Promise((r) => setTimeout(r, 500));
        }
        if (!ok) throw new Error("Startup failed. See node service logs.");
    }
    console.log("Node-only VidsAI: " + env.NODE_APP_ORIGIN);
}
main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
});
