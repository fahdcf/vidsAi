const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const runtime = path.resolve(root, "../runtime");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const old = process.env.NODE_IMPORT_APP_ROOT;
function main() {
    if (!old)
        throw new Error(
            "Set NODE_IMPORT_APP_ROOT to the original application folder first.",
        );
    for (const [source, target] of [
        [
            path.join(old, "storage/app/public"),
            path.join(runtime, "node-media/legacy-public"),
        ],
        [
            path.join(old, "storage/app/private"),
            path.join(runtime, "node-media/legacy-private"),
        ],
        [
            process.env.NODE_IMPORT_RENDER_ROOT,
            path.join(runtime, "node-renders"),
        ],
    ]) {
        if (source && fs.existsSync(source)) {
            if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink())
                fs.renameSync(target, target + ".import-link.bak");
            fs.mkdirSync(target, { recursive: true });
            fs.cpSync(fs.realpathSync(source), target, {
                recursive: true,
                dereference: true,
                force: false,
                errorOnExist: false,
            });
        }
    }
    console.log(
        "Existing media and selected historical MP4s copied.",
    );
}
try {
    main();
} catch (e) {
    console.error("Media import failed:", e.code, e.message);
    process.exitCode = 1;
}
