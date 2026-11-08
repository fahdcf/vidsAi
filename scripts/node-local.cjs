const fs = require("node:fs");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
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
    };
    const envFile = path.join(root, ".env");
    const localEnv = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
    for (const line of localEnv.split(/[\r\n]+/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
    if (config.databasePath && !process.env.NODE_DATABASE_PATH)
        env.NODE_DATABASE_PATH = config.databasePath;
    const port = Number(new URL(env.NODE_APP_ORIGIN).port) || 8100;
    await new Promise((resolve, reject) => {
        const socket = require("node:net").createServer();
        socket.once("error", () => reject(new Error("Port " + port + " is already in use.")));
        socket.listen(port, "127.0.0.1", () => socket.close(resolve));
    });
    const logfile = path.join(runtime, "node-control.log");
    const fd = fs.openSync(logfile, "a");
    const child = spawn(config.nodeExe, ["--import", "tsx", path.join(root, "server/start.ts")], {
        cwd: root,
        env,
        detached: true,
        windowsHide: true,
        stdio: ["ignore", fd, fd],
    });
    fs.closeSync(fd);
    await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
    });
    child.unref();
    fs.writeFileSync(statefile, JSON.stringify([{ name: "Control", pid: child.pid }]));
    for (let i = 0; i < 60; i++) {
        try {
            const response = await fetch(env.NODE_APP_ORIGIN + "/health", { signal: AbortSignal.timeout(1000) });
            if (response.ok) {
                console.log("VidsAI: " + env.NODE_APP_ORIGIN);
                return;
            }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Startup failed. See " + logfile);
}
main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
});
