import { spawnSync } from "node:child_process";
import path from "node:path";

if (Number(process.versions.node.split(".")[0]) < 24) {
    console.error(`VidsAI requires Node 24 or later. This shell selected ${process.version}. Update PATH before running npm run motion:setup.`);
    process.exit(1);
}

const npm = process.env.npm_execpath;
if (!npm) {
    console.error("Run this setup through npm run motion:setup.");
    process.exit(1);
}

const result = spawnSync(process.execPath, [npm, "ci"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: {
        ...process.env,
        PATH: [path.dirname(process.execPath), process.env.PATH].join(path.delimiter),
    },
    stdio: "inherit",
    windowsHide: true,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import("./motion-tools.mjs");
await import("./motion-doctor.mjs");
