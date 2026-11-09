import { traceContours, type ContourPoint } from "../../../../shared/motion/contours";
import type { MotionPath } from "../../../../shared/motion/graph";
import { motionVectorAsset } from "../../../../shared/motion/assets";
import type { TraceWorkerRequest } from "./reference-trace";

function area(points: ContourPoint[]) {
    return Math.abs(points.reduce((sum, a, i) => {
        const b = points[(i + 1) % points.length];
        return sum + a[0] * b[1] - b[0] * a[1];
    }, 0)) / 2;
}

function smoothPath(points: ContourPoint[]): MotionPath {
    const count = Math.min(62, points.length);
    const loop = Array.from({ length: count }, (_, index) => points[Math.floor(index * points.length / count)]);
    const first = loop[0], last = loop.at(-1)!;
    const path: MotionPath = [{ op: "M", x: (first[0] + last[0]) / 2, y: (first[1] + last[1]) / 2 }];
    for (let i = 0; i < loop.length; i++) {
        const a = loop[i], b = loop[(i + 1) % loop.length];
        path.push({ op: "Q", cx: a[0], cy: a[1], x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 });
    }
    path.push({ op: "Z" });
    return path;
}

async function trace({ options, frames }: TraceWorkerRequest) {
    const { start, end } = options.interval;
    const colors = options.colors.map((color) => [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16)));
    const width = 160, height = 90;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is unavailable in the trace worker.");
    const traced = [];
    for (const frame of frames) {
        const at = Math.min(1, Math.max(0, (frame.sourceTime - start) / (end - start)));
        if (traced.length && traced.at(-1)!.at >= at) continue;
        const image = await createImageBitmap(frame.image);
        try { ctx.drawImage(image, 0, 0, width, height); } finally { image.close(); }
        const pixels = ctx.getImageData(0, 0, width, height).data;
        const field = new Float32Array(width * height);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                let distance = 255 * Math.sqrt(3);
                for (const [r, g, b] of colors) {
                    distance = Math.min(distance, Math.hypot(pixels[i * 4] - r, pixels[i * 4 + 1] - g, pixels[i * 4 + 2] - b));
                }
                field[i] = 1 - distance / (255 * Math.sqrt(3));
            }
        }
        const paths = traceContours(field, width, height, 1 - options.tolerance)
            .map((loop) => ({ loop, area: area(loop) })).filter(({ area }) => area >= 0.002 && area <= 0.65)
            .sort((a, b) => b.area - a.area).slice(0, 4);
        if (paths.length) traced.push({ at, shapes: paths.map(({ loop }, index) => ({
            path: smoothPath(loop), fill: index === 0 ? "primary" : "accent",
        })) });
    }
    if (traced.length < Math.max(2, Math.ceil(frames.length / 4))) {
        throw new Error("The selected colors did not isolate enough shapes. Adjust the sample interval or colors.");
    }
    return motionVectorAsset.parse({ version: 1, interpolate: false, frames: traced });
}

self.onmessage = (event: MessageEvent<TraceWorkerRequest>) => {
    void trace(event.data).then((result) => self.postMessage(result)).catch((error: unknown) => {
        self.postMessage({ error: error instanceof Error ? error.message : "Reference tracing failed." });
    });
};
