import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import express from "express";
import { motionReferenceTimes } from "./fixtures/motion-benchmark.ts";

const [reference, generated, reconstructed] = process.argv.slice(2);
if (!reference || !generated) throw new Error("Supply the reference and generated MP4 files.");
const root = path.resolve(import.meta.dirname, "..");
const runtime = path.resolve(root, "../runtime");
const { ffmpeg } = JSON.parse(await readFile(path.join(root, "motion-toolchain.json"), "utf8"));
const base = path.join(runtime, "motion-verification");
await mkdir(base, { recursive: true });
const directory = await mkdtemp(path.join(base, "compare-"));
const width = 320, height = 180;
const groups = [
    ["Source", reference],
    ...(reconstructed ? [["Previous reconstruction", reconstructed]] : []),
    ["VidsAI browser export", generated],
];

function decode(file, seconds) {
    const result = spawnSync(path.join(runtime, ffmpeg.runtimePath), [
        "-v", "error", "-nostdin", "-ss", seconds.toFixed(3), "-i", file,
        "-frames:v", "1", "-vf", `scale=${width}:${height}`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
    ], { windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024 });
    if (result.error || result.status || result.stdout.length !== width * height * 3) {
        throw new Error(`Could not decode the frame at ${seconds.toFixed(3)} seconds.`);
    }
    return result.stdout.toString("base64");
}

const browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
let server;
try {
    const page = await browser.newPage();
    const records = [];
    for (let offset = 0; offset < motionReferenceTimes.length; offset += 8) {
        const times = motionReferenceTimes.slice(offset, offset + 8);
        const rows = times.map((seconds) => ({ seconds, images: groups.map(([, file]) => decode(file, seconds)) }));
        const png = await page.evaluate(({ rows, labels, width, height }) => {
            const cellW = width + 16, cellH = height + 30;
            const canvas = document.createElement("canvas");
            canvas.width = cellW * labels.length;
            canvas.height = 34 + cellH * rows.length;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#141417";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff1e9";
            ctx.font = "15px sans-serif";
            labels.forEach((label, index) => ctx.fillText(label, index * cellW + 8, 23));
            for (const [index, { images, seconds }] of rows.entries()) {
                for (const [column, image] of images.entries()) {
                    const raw = atob(image);
                    const pixels = ctx.createImageData(width, height);
                    for (let j = 0, k = 0; j < raw.length; j += 3, k += 4) {
                        pixels.data[k] = raw.charCodeAt(j);
                        pixels.data[k + 1] = raw.charCodeAt(j + 1);
                        pixels.data[k + 2] = raw.charCodeAt(j + 2);
                        pixels.data[k + 3] = 255;
                    }
                    const x = column * cellW + 8, y = 34 + index * cellH;
                    ctx.putImageData(pixels, x, y);
                    ctx.fillText(seconds.toFixed(2) + " s", x, y + height + 19);
                }
            }
            return canvas.toDataURL("image/png").split(",")[1];
        }, { rows, labels: groups.map(([label]) => label), width, height });
        const file = `landmarks-${offset / 8 + 1}.png`;
        await writeFile(path.join(directory, file), Buffer.from(png, "base64"));
        records.push({ file, times });
    }
    const playbackApp = express();
    playbackApp.get("/", (_req, res) => res.type("html").send("<!doctype html><title>Motion playback comparison</title>"));
    for (const [index, [, file]] of groups.entries()) {
        playbackApp.get(`/sample-${index}.mp4`, (_req, res) => res.sendFile(path.resolve(file)));
    }
    server = playbackApp.listen(0, "127.0.0.1");
    await once(server, "listening");
    const playbackOrigin = "http://127.0.0.1:" + server.address().port;
    await page.goto(playbackOrigin);
    const playback = await page.evaluate(async (labels) => Promise.all(labels.map(async (label, index) => {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.width = 320;
        video.height = 180;
        video.src = `/sample-${index}.mp4`;
        video.playbackRate = 2;
        document.body.append(video);
        const seen = [];
        const tick = (_now, metadata) => {
            seen.push(metadata.mediaTime);
            if (!video.ended) video.requestVideoFrameCallback(tick);
        };
        video.requestVideoFrameCallback(tick);
        const end = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Video playback did not finish.")), 25_000);
            video.addEventListener("ended", () => { clearTimeout(timeout); resolve(); }, { once: true });
            video.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Video playback failed.")); }, { once: true });
        });
        await Promise.all([video.play(), end]);
        if (seen.length < 40 || seen.at(-1) < 14.7) throw new Error("Video playback did not reach all scene intervals.");
        return { label, videoDuration: video.duration, presentedSamples: seen.length, finalPresentedTime: seen.at(-1) };
    })), groups.map(([label]) => label));
    await writeFile(path.join(directory, "landmarks.json"), JSON.stringify({ directory, records, playback }, null, 2));
    console.log(directory);
} finally {
    await browser.close();
    if (server) {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
}
