import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const [output, abstract, promo] = process.argv.slice(2);
if (!output || !abstract || !promo || process.argv.length !== 5) {
    throw new Error("Supply a new output directory, the original abstract reel and the dark UI promo.");
}
const toolchain = JSON.parse(await readFile(new URL("../motion-toolchain.json", import.meta.url)));
const ffmpeg = process.env.MOTION_FFMPEG || path.resolve(import.meta.dirname, "../../runtime", toolchain.ffmpeg.runtimePath);
const destination = path.resolve(output);
const fixtures = [
    { id: "light-product", group: "development", width: 640, height: 360 },
    { id: "mixed-type", group: "development", width: 360, height: 640 },
    { id: "data-chart", group: "held-out", width: 640, height: 360 },
    { id: "organic-orbit", group: "held-out", width: 640, height: 360, audio: true },
];
const fps = 30;
const seconds = 5;
const filename = (id) => path.join(destination, `${id}.mp4`);
const benchmark = JSON.parse(await readFile(new URL("../docs/MOTION_ACCEPTANCE_BRIEF.json", import.meta.url)));
const digest = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
assert.equal(await digest(abstract), benchmark.reference.sha256, "Supply the frozen abstract benchmark reference.");
assert.equal(await digest(promo), "94758d8ec21d81d216db6ba33602fc935669c8d322d5f0b1adca12b50f6b4939", "Supply the frozen dark UI promo reference.");
await mkdir(path.dirname(destination), { recursive: true });
await mkdir(destination);
await copyFile(abstract, filename("abstract-reel"));
await copyFile(promo, filename("dark-ui-promo"));

const browser = await chromium.launch({ channel: process.env.MOTION_TEST_BROWSER || "chrome", headless: true });
try {
    for (const { id, width, height, audio } of fixtures) {
        const page = await browser.newPage({ viewport: { width, height } });
        try {
            await page.setContent(`<body style="margin:0"><canvas width="${width}" height="${height}"></canvas></body>`);
            const encoder = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-n", "-framerate", String(fps), "-f", "image2pipe",
                "-vcodec", "png", "-i", "pipe:0",
                ...(audio ? ["-f", "lavfi", "-i",
                    "aevalsrc=0.4*sin(2*PI*320*t)*exp(-45*mod(t\\,1.25)):s=48000:d=5", "-c:a", "aac"] : ["-an"]),
                "-map_metadata", "-1", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                "-threads", "1", "-t", String(seconds), "-movflags", "+faststart", filename(id)], { stdio: ["pipe", "ignore", "inherit"] });
            const finished = once(encoder, "close").then(([code]) => assert.equal(code, 0, `Could not encode ${id}.`));
            // Handle a fast encoder failure while Playwright is still rendering an input frame.
            void finished.catch(() => {});
            encoder.stdin.on("error", () => {});
            try {
                for (let frame = 0; frame < fps * seconds; frame++) {
                    const base64 = await page.evaluate(({ id, t }) => {
                        const canvas = document.querySelector("canvas");
                        const ctx = canvas.getContext("2d");
                        const { width: w, height: h } = canvas;
                        const progress = (from, duration) => Math.max(0, Math.min(1, (t - from) / duration));
                        const ease = (p) => 1 - (1 - p) ** 3;
                        const fill = (color, x, y, width, height) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
                        const text = (copy, x, y, font, color, alpha = 1) => {
                            ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.globalAlpha = alpha;
                            ctx.fillText(copy, x, y); ctx.restore();
                        };
                        if (id === "light-product") {
                            fill("#f3efe8", 0, 0, w, h);
                            const x = w + (410 - w) * ease(progress(0.1, 1.1));
                            ctx.fillStyle = "#c75636"; ctx.beginPath(); ctx.roundRect(x, 65, 117, 216, 38); ctx.fill();
                            fill("#772e23", x + 25, 49, 66, 29);
                            text("EMBER / 01", x + 15, 198, "bold 15px Arial", "#fff5e5");
                            text("Carry less.", 52, 144, "bold 43px Arial", "#22221f", progress(0.65, 0.55));
                            fill("#322a26", 52, 176, 200 * ease(progress(1.3, 0.42)), 2);
                            text("Built for the daily refill.", 53, 219, "19px Arial", "#453a33", progress(1.5, 0.5));
                            text("Explore Ember", 53, 267, "bold 19px Arial", "#92371f", progress(2.8, 0.45));
                        } else if (id === "mixed-type") {
                            fill("#171520", 0, 0, w, h);
                            const lead = ease(progress(0.2, 0.6));
                            text("MOVE", 39, 159 - 25 * lead, "bold 74px Arial", "#ffc272", lead);
                            text("with purpose.", 39, 202, "italic 37px Georgia", "#fffaf0", progress(0.75, 0.5));
                            fill("#ff8fa8", 40, 225, 269 * ease(progress(1.1, 0.55)), 4);
                            ctx.direction = "rtl"; ctx.textAlign = "right";
                            text("الحركة تصنع المعنى", 321, 356, "bold 34px Arial", "#f5d5ff", progress(1.65, 0.55));
                            ctx.direction = "ltr"; ctx.textAlign = "left";
                            text("A small shift can change", 40, 469, "22px Arial", "#fffaf0", progress(2.4, 0.65));
                            text("the rhythm of the whole story.", 40, 499, "20px Arial", "#fffaf0", progress(2.4, 0.65));
                        } else if (id === "data-chart") {
                            fill("#102129", 0, 0, w, h);
                            text("Water saved", 45, 60, "bold 35px Arial", "#f2fee9");
                            text("Litres per week", 47, 91, "17px Arial", "#bcd2c8");
                            fill("#74938b", 48, 286, 492, 1);
                            [45, 83, 122, 162].forEach((height, index) => {
                                const bar = ease(progress(0.62 + index * 0.3, 0.63)) * height;
                                const x = 76 + index * 112;
                                fill(index === 3 ? "#c3ff90" : "#59bfa5", x, 285 - bar, 62, bar);
                                text(`W${index + 1}`, x + 17, 311, "16px Arial", "#eff7ed");
                            });
                            text("162 L", 496, 133, "bold 26px Arial", "#c3ff90", progress(2.2, 0.5));
                        } else {
                            fill("#281c3c", 0, 0, w, h);
                            const beat = Math.exp(-7 * (t % 1.25));
                            ctx.save();
                            ctx.translate(320, 172);
                            for (let i = 0; i < 3; i++) {
                                ctx.save(); ctx.rotate(t * (0.33 + i * 0.12) + i * 1.12);
                                ctx.strokeStyle = ["#ed9b91", "#f5d27d", "#ba97f6"][i];
                                ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 72 + beat * 15 + i * 13, 33 + i * 7, 0, 0, Math.PI * 2); ctx.stroke();
                                ctx.fillStyle = ctx.strokeStyle;
                                ctx.beginPath(); ctx.arc(72 + beat * 15 + i * 13, 0, 6, 0, Math.PI * 2); ctx.fill();
                                ctx.restore();
                            }
                            ctx.fillStyle = "#ffe7bd"; ctx.beginPath(); ctx.arc(0, 0, 19 + beat * 8, 0, Math.PI * 2); ctx.fill();
                            ctx.restore();
                            text("Orbit in bloom", 35, 305, "bold 31px Georgia", "#ffe7bd", progress(2.4, 0.55));
                        }
                        return canvas.toDataURL("image/png").split(",")[1];
                    }, { id, t: frame / fps });
                    if (!encoder.stdin.write(Buffer.from(base64, "base64"))) {
                        await Promise.race([once(encoder.stdin, "drain"), finished]);
                    }
                }
                encoder.stdin.end();
                await finished;
            } finally {
                encoder.stdin.destroy();
                if (encoder.exitCode === null) encoder.kill();
            }
        } finally { await page.close(); }
    }
} finally { await browser.close(); }

const assets = await Promise.all([
    { id: "abstract-reel", group: "development", origin: "user-supplied abstract benchmark" },
    { id: "dark-ui-promo", group: "development", origin: "user-supplied dark UI reference" },
    ...fixtures.map((fixture) => ({ ...fixture, seconds, fps, origin: "Original Canvas 2D fixture" })),
].map(async (entry) => ({ ...entry, file: `${entry.id}.mp4`, sha256: await digest(filename(entry.id)) })));
await writeFile(path.join(destination, "assets.json"), JSON.stringify({ version: 1, assets }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ directory: destination, assets }, null, 2));
