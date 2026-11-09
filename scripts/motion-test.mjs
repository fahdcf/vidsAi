import { spawnSync } from "node:child_process";

const suites = {
    foundation: "server/motion-foundation.test.ts",
    prompts: "server/motion-prompts.test.ts",
    product: "server/motion-product.test.ts",
};
const [flag, suite] = process.argv.slice(2);
if (process.argv.length !== 4 || flag !== "--suite" || !Object.hasOwn(suites, suite)) {
    console.error("Use npm run motion:test -- --suite foundation, --suite prompts or --suite product.");
    process.exit(1);
}
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", suites[suite]], {
    stdio: "inherit",
    env: { ...process.env, NODE_DATABASE_PATH: ":memory:", NODE_SKIP_LEGACY_IMPORT: "1" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
