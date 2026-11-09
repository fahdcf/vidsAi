import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, open, readFile, rename, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "motion-toolchain.json"), "utf8"));

async function sha256(file) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest("hex");
}

function run(command, args, options) {
    const result = spawnSync(command, args, { windowsHide: true, ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}.`);
    return result;
}

const spec = manifest.ffmpeg;
if (process.platform !== spec.platform || process.arch !== spec.architecture) {
    throw new Error("The pinned development FFmpeg installer supports Windows x64.");
}
const destination = path.resolve(root, "../runtime", spec.runtimePath);
const directory = path.dirname(destination);
await mkdir(directory, { recursive: true });

if (await sha256(destination).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
}) !== spec.sha256) {
    const temp = await mkdtemp(path.join(directory, "download-"));
    const archive = path.join(temp, "ffmpeg.zip");
    const executable = path.join(temp, "ffmpeg.exe");
    try {
        if (process.env.MOTION_FFMPEG_SOURCE) {
            await copyFile(process.env.MOTION_FFMPEG_SOURCE, executable);
        } else {
            const response = await fetch(spec.url, { signal: AbortSignal.timeout(120000) });
            if (!response.ok || !response.body) throw new Error(`FFmpeg download failed: HTTP ${response.status}.`);
            await pipeline(Readable.fromWeb(response.body), createWriteStream(archive, { flags: "wx" }));
            if (await sha256(archive) !== spec.archiveSha256) throw new Error("FFmpeg archive checksum mismatch.");
            const output = await open(executable, "wx");
            try {
                run("tar.exe", ["-xOf", archive, spec.entry], { stdio: ["ignore", output.fd, "inherit"] });
            } finally {
                await output.close();
            }
        }
        if (await sha256(executable) !== spec.sha256) throw new Error("FFmpeg binary checksum mismatch.");
        await rename(executable, destination);
    } finally {
        for (const file of [archive, executable]) {
            await unlink(file).catch((error) => {
                if (error.code !== "ENOENT") throw error;
            });
        }
        await rmdir(temp);
    }
}

const version = run(destination, ["-version"], { encoding: "utf8" }).stdout.split(/\r?\n/, 1)[0];
if (!version.startsWith(`ffmpeg version ${spec.version}`)) throw new Error("Unexpected FFmpeg version.");
console.log(`${version}\nDevelopment verifier: ${destination}`);
