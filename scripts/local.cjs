const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { spawn, execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const runtime = path.join(root, "runtime");
const file = path.join(runtime, "services.json");
const configFile = path.join(runtime, "local-config.json");
if (!fs.existsSync(configFile))
    throw new Error(
        "Copy runtime/local-config.example.json to runtime/local-config.json and set executable paths.",
    );
const c = JSON.parse(fs.readFileSync(configFile));
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
    fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const env = {
    ...process.env,
    PHPRC: path.join(runtime, "php.ini"),
    TEMP: c.tempDir,
    TMP: c.tempDir,
    TMPDIR: c.tempDir,
    PORT: String(c.renderPort || 5101),
    HOST: "127.0.0.1",
    MAX_CONCURRENT: "1",
    FRAME_CONCURRENCY: "1",
};
if (c.browserExe) env.BROWSER_EXECUTABLE = c.browserExe;
for (const line of fs
    .readFileSync(path.join(root, "vidsAi/.env"), "utf8")
    .split(/[\r\n]+/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (
        m &&
        m[2].trim() &&
        /^(NVIDIA_[A-Z0-9_]+|WORKER_TOKEN|ASSET_ALLOWED_HOSTS|OPENROUTER_API_KEY|OPENROUTER_BASE_URL|OPENROUTER_MODELS?|OPENROUTER_MODEL[1-5]|GROQ_API_KEY|GROQ_MODEL|GROQ_BASE_URL)$/.test(
            m[1],
        )
    )
        env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
for (const k of Object.keys(env)) if (k.toLowerCase() === "path") delete env[k];
env.Path = [
    path.dirname(c.nodeExe),
    path.dirname(c.phpExe),
    process.env.Path || process.env.PATH || "",
].join(path.delimiter);
async function main() {
    fs.mkdirSync(c.tempDir, { recursive: true });
    if (action === "status") {
        console.table(
            saved().map((s) => ({
                name: s.name,
                pid: s.pid,
                running: alive(s.pid),
            })),
        );
        return;
    }
    if (action === "stop") {
        for (const s of saved()) {
            if (!alive(s.pid)) continue;
            const ps = path.join(
                process.env.SystemRoot,
                "System32/WindowsPowerShell/v1.0/powershell.exe",
            );
            const line = execFileSync(
                ps,
                [
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${s.pid}').CommandLine`,
                ],
                { encoding: "utf8", windowsHide: true },
            );
            if (!line.toLowerCase().includes(root.toLowerCase()))
                throw new Error(
                    `Process ${s.pid} no longer belongs to this project`,
                );
            execFileSync("taskkill.exe", ["/PID", String(s.pid), "/T", "/F"], {
                windowsHide: true,
                stdio: "ignore",
            });
        }
        fs.writeFileSync(file, "[]");
        return;
    }
    if (saved().some((s) => alive(s.pid)))
        throw new Error("Services are already running.");
    for (const port of [
        c.webPort || 8100,
        c.renderPort || 5101,
        c.agentPort || 5102,
    ])
        await new Promise((resolve, reject) => {
            const s = net.createServer();
            s.once("error", reject);
            s.listen(port, "127.0.0.1", () => s.close(resolve));
        });
    const app = path.join(root, "vidsAi");
    const render = path.join(root, "remotion-api");
    const definitions = [
        {
            name: "Laravel",
            exe: c.phpExe,
            args: [
                "-c",
                env.PHPRC,
                "-S",
                `127.0.0.1:${c.webPort || 8100}`,
                "-t",
                path.join(app, "public"),
                path.join(
                    app,
                    "vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php",
                ),
            ],
            cwd: app,
        },
        {
            name: "Queue",
            exe: c.phpExe,
            args: [
                "-c",
                env.PHPRC,
                path.join(app, "artisan"),
                "queue:work",
                "--sleep=1",
                "--tries=3",
                "--timeout=90",
            ],
            cwd: app,
        },
        {
            name: "Worker",
            exe: c.nodeExe,
            args: [
                "--import",
                "tsx",
                path.join(render, "apps/render-worker/server.ts"),
            ],
            cwd: render,
        },
    ];
    definitions.push({
        name: "Agent",
        exe: c.nodeExe,
        args: [
            "--import",
            "tsx",
            path.join(render, "apps/agent-worker/server.ts"),
        ],
        cwd: render,
    });
    env.AGENT_PORT = String(c.agentPort || 5102);
    env.APP_MEDIA_ORIGIN = `http://127.0.0.1:${c.webPort || 8100}`;
    const services = [];
    for (const d of definitions) {
        const logfile = path.join(runtime, d.name.toLowerCase() + ".log");
        const fd = fs.openSync(logfile, "a");
        const p = spawn(d.exe, d.args, {
            cwd: d.name === "Laravel" ? path.join(app, "public") : d.cwd,
            env,
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
        services.push({ name: d.name, pid: p.pid, logfile });
        fs.writeFileSync(file, JSON.stringify(services, null, 2));
    }
    for (const url of [
        `http://127.0.0.1:${c.webPort || 8100}/login`,
        `http://127.0.0.1:${c.renderPort || 5101}/health`,
        `http://127.0.0.1:${c.agentPort || 5102}/health`,
    ]) {
        let ok = false;
        for (let i = 0; i < 120; i++) {
            try {
                const r = await fetch(url, {
                    signal: AbortSignal.timeout(2000),
                });
                if (r.ok) {
                    ok = true;
                    break;
                }
            } catch {}
            await new Promise((r) => setTimeout(r, 500));
        }
        if (!ok)
            throw new Error(
                "Startup failed: " + url + ". Inspect runtime logs.",
            );
    }
    if (!services.every((service) => alive(service.pid)))
        throw new Error(
            "A service stopped during startup. Inspect runtime logs.",
        );
    console.log(`VidsAI: http://127.0.0.1:${c.webPort || 8100}`);
}
main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
});
