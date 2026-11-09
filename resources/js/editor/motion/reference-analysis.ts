import type { MotionReferenceFrame } from "./reference-media";

type Bucket = { count: number; r: number; g: number; b: number };
const bucketKey = (r: number, g: number, b: number) => (r >> 5) << 6 | (g >> 5) << 3 | b >> 5;
const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");

export async function analyzeReferenceFrames(frames: readonly MotionReferenceFrame[], signal: AbortSignal) {
    if (!frames.length || frames.length > 32) throw new Error("Reference analysis needs one to 32 frames.");
    const canvas = new OffscreenCanvas(32, 18);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Reference pixel analysis is unavailable.");
    const palette = new Map<number, Bucket>();
    const differences: { time: number; score: number; before: number; after: number }[] = [];
    let previous: { pixels: Uint8ClampedArray; bins: Uint16Array; time: number } | undefined;
    for (const frame of frames) {
        signal.throwIfAborted();
        const bitmap = await createImageBitmap(frame.image);
        try {
            signal.throwIfAborted();
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        } finally {
            bitmap.close();
        }
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const bins = new Uint16Array(512);
        let spatial = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            const index = bucketKey(r, g, b);
            bins[index]++;
            const bucket = palette.get(index) ?? { count: 0, r: 0, g: 0, b: 0 };
            bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
            palette.set(index, bucket);
            if (previous) spatial += Math.abs(r - previous.pixels[i]) + Math.abs(g - previous.pixels[i + 1]) + Math.abs(b - previous.pixels[i + 2]);
        }
        if (previous) {
            const count = canvas.width * canvas.height;
            let histogram = 0;
            for (let i = 0; i < bins.length; i++) histogram += Math.abs(bins[i] - previous.bins[i]);
            const score = 0.7 * spatial / (count * 3 * 255) + 0.3 * histogram / (count * 2);
            differences.push({ time: (frame.sourceTime + previous.time) / 2, score, before: previous.time, after: frame.sourceTime });
        }
        previous = { pixels, bins, time: frame.sourceTime };
    }
    const cuts = differences.filter(({ score }, index) => score >= 0.17 &&
        score >= (differences[index - 1]?.score ?? 0) &&
        score >= (differences[index + 1]?.score ?? 0))
        .sort((a, b) => b.score - a.score).slice(0, 8).sort((a, b) => a.time - b.time);
    const swatches: { color: string; weight: number }[] = [];
    const chosen: number[][] = [];
    for (const bucket of [...palette.values()].sort((a, b) => b.count - a.count)) {
        const color = [bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count];
        if (chosen.some((other) => Math.hypot(...color.map((value, i) => value - other[i])) < 42)) continue;
        chosen.push(color);
        swatches.push({ color: "#" + color.map(hex).join(""), weight: bucket.count / (frames.length * canvas.width * canvas.height) });
        if (swatches.length >= 6) break;
    }
    return { cuts, palette: swatches };
}
