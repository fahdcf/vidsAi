const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");
const runtime = path.resolve(root, "../runtime");
const old = process.env.NODE_IMPORT_APP_ROOT;
async function main() {
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
            path.join(old, "../remotion-api/renders"),
            path.join(runtime, "node-renders"),
        ],
    ]) {
        if (fs.existsSync(source)) {
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
    const destination = path.join(runtime, "node-render/worker.db");
    const source = path.join(old, "../remotion-api/data/worker.db");
    let empty = !fs.existsSync(destination);
    if (!empty) {
        const check = new Database(destination, { readonly: true });
        empty =
            check.prepare("SELECT count(*) FROM renders").pluck().get() === 0;
        check.close();
    }
    if (fs.existsSync(source) && empty) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        const db = new Database(source, { readonly: true });
        await db.backup(destination);
        db.close();
    }
    console.log(
        "Existing media and render history copied; source files preserved.",
    );
}
main().catch((e) => {
    console.error("Media import failed:", e.code, e.message);
    process.exitCode = 1;
});
