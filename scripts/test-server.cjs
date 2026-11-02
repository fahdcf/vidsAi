const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const runtime = path.resolve(__dirname, "../../runtime");
fs.mkdirSync(runtime, { recursive: true });
const directory = fs.mkdtempSync(path.join(runtime, "node-tests-"));
const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "--test-concurrency=1", "server/*.test.ts"],
    {
        cwd: path.resolve(__dirname, ".."),
        env: {
            ...process.env,
            NODE_DATABASE_PATH: path.join(directory, "test.sqlite"),
            NODE_MEDIA_ROOT: path.join(directory, "media"),
            NODE_MAIL_OUTBOX: path.join(directory, "outbox"),
            MAIL_MAILER: "log",
            APP_KEY: crypto.randomBytes(32).toString("hex"),
            NODE_SKIP_LEGACY_IMPORT: process.argv.includes("--fresh")
                ? "1"
                : "0",
            TEMP: runtime,
            TMP: runtime,
        },
        stdio: "inherit",
        windowsHide: true,
    },
);
if (!directory.startsWith(path.join(runtime, "node-tests-")))
    throw new Error("Unexpected test directory");
fs.rmSync(directory, { recursive: true, force: true });
process.exitCode = result.status ?? 1;
