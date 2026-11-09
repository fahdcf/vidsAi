import { spawnSync } from "node:child_process";

if (process.argv.slice(2).join(" ") !== "--suite foundation") {
    console.error("Use npm run motion:test -- --suite foundation.");
    process.exit(1);
}
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "server/motion-foundation.test.ts"], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
