import type { MotionReferenceFrame } from "./reference-media";

type Interval = { start: number; end: number };

function validateInterval({ start, end }: Interval) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > 30.001) {
        throw new Error("Reference interval is invalid.");
    }
}

export function sparseReferenceTimes(interval: Interval) {
    validateInterval(interval);
    const duration = interval.end - interval.start;
    const count = Math.min(24, Math.max(1, Math.ceil(duration * 2)));
    return Array.from({ length: count }, (_, i) => interval.start + duration * (i + 0.5) / count);
}

export function refineReferenceTimes(interval: Interval, candidates: readonly number[]) {
    validateInterval(interval);
    return [...new Set(candidates.slice(0, 8)
        .flatMap((candidate) => [candidate - 0.15, candidate, candidate + 0.15])
        .filter((time) => Number.isFinite(time) && time >= interval.start && time < interval.end))].sort((a, b) => a - b);
}

export async function createReferenceSheet(frames: readonly MotionReferenceFrame[], signal: AbortSignal) {
    if (!frames.length || frames.length > 32) throw new Error("A reference sheet needs one to 32 frames.");
    const columns = Math.min(4, frames.length);
    const cellWidth = 224, cellHeight = 150, mediaHeight = 126;
    const canvas = new OffscreenCanvas(columns * cellWidth, Math.ceil(frames.length / columns) * cellHeight);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable for the reference sheet.");
    context.fillStyle = "#151417";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "14px monospace";
    context.textBaseline = "middle";
    for (const [index, frame] of frames.entries()) {
        signal.throwIfAborted();
        const bitmap = await createImageBitmap(frame.image);
        const x = index % columns * cellWidth, y = Math.floor(index / columns) * cellHeight;
        try {
            signal.throwIfAborted();
            const scale = Math.min(cellWidth / bitmap.width, mediaHeight / bitmap.height);
            const w = bitmap.width * scale, h = bitmap.height * scale;
            context.drawImage(bitmap, x + (cellWidth - w) / 2, y + (mediaHeight - h) / 2, w, h);
            context.fillStyle = "#fff0d5";
            context.fillText(`${frame.sourceTime.toFixed(3)}s`, x + 10, y + mediaHeight + 12);
        } finally {
            bitmap.close();
        }
    }
    const image = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.79 });
    signal.throwIfAborted();
    return image;
}
