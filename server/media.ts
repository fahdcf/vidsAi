import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fail } from "./security";
const require = createRequire(import.meta.url);
const ffprobe = require("../../remotion-api/node_modules/ffprobe-static").path;
export async function mediaDuration(filename: string, mime: string) {
    if (mime.startsWith("image/")) return null;
    try {
        const { stdout } = await promisify(execFile)(
            ffprobe,
            [
                "-v",
                "error",
                "-show_entries",
                "format=duration:stream=codec_type",
                "-of",
                "json",
                filename,
            ],
            { timeout: 15000, windowsHide: true, maxBuffer: 1024 * 1024 },
        );
        const data = JSON.parse(stdout);
        const duration = Number(data.format?.duration);
        if (
            !Number.isFinite(duration) ||
            duration <= 0 ||
            !data.streams?.some((s: any) => s.codec_type === mime.split("/")[0])
        )
            throw new Error("Invalid media");
        return duration;
    } catch {
        fail(
            422,
            "The uploaded media could not be read. Choose a valid video or audio file.",
        );
    }
}
