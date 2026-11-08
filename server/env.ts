import fs from "node:fs";
import path from "node:path";
export const root = path.resolve(import.meta.dirname, "..");
export const runtime = path.resolve(root, "../runtime");
for (const line of (fs.existsSync(path.join(root, ".env"))
    ? fs.readFileSync(path.join(root, ".env"), "utf8")
    : ""
).split(/[\r\n]+/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined)
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
export const mediaRoot =
    process.env.NODE_MEDIA_ROOT || path.join(runtime, "node-media");
fs.mkdirSync(mediaRoot, { recursive: true });
export const origin = process.env.NODE_APP_ORIGIN || "http://127.0.0.1:8100";
