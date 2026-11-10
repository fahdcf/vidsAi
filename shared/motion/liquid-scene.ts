import { traceContours, type ContourPoint } from "./contours";
import { alpha, drawMotionPath, easeOut, lerp, line, seededNoise, tau } from "./draw";
import type { MotionFrame } from "./registry";
import type { MotionScene } from "./schema";
import type { MotionVectors } from "./assets";
import type { MotionPath } from "./graph";
import { resolveGraphColor } from "./graph-style";

type Frame = MotionFrame<Extract<MotionScene, { type: "liquid" }>>;

function contourPath(contours: ContourPoint[][], w: number, h: number) {
    const path = new Path2D();
    for (const loop of contours) {
        const first = loop[0], last = loop.at(-1)!;
        path.moveTo((first[0] + last[0] - 1) * w / 2, (first[1] + last[1] - 1) * h / 2);
        for (let i = 0; i < loop.length; i++) {
            const a = loop[i], b = loop[(i + 1) % loop.length];
            path.quadraticCurveTo((a[0] - 0.5) * w, (a[1] - 0.5) * h,
                (a[0] + b[0] - 1) * w / 2, (a[1] + b[1] - 1) * h / 2);
        }
        path.closePath();
    }
    return path;
}

function field(t: number, count: number, seed: number) {
    const w = 96, h = 72;
    const values = new Float32Array(w * h);
    for (let i = 0; i < count; i++) {
        const phase = i / count * tau + seededNoise(seed, i) * 0.3;
        const x = 0.27 * Math.cos(phase + t * 4.7) + 0.12 * Math.sin(t * 8 + phase);
        const y = 0.15 * Math.sin(phase + t * 5.1) + 0.12 * Math.cos(t * 6 - phase);
        const radius = 0.095 + seededNoise(seed, i + count) * 0.09;
        const cols = Array.from({ length: w }, (_, col) => Math.exp(-(((col / (w - 1) * 1.5 - 0.75 - x) / radius) ** 2)));
        for (let row = 0; row < h; row++) {
            const v = Math.exp(-(((row / (h - 1) * 1.12 - 0.56 - y) / radius) ** 2));
            for (let col = 0; col < w; col++) values[row * w + col] += cols[col] * v;
        }
    }
    return { w, h, values };
}

function interpolatePath(a: MotionPath, b: MotionPath, t: number): MotionPath {
    return a.map((command, index) => {
        const next = b[index];
        const output = { ...command } as Record<string, string | number>;
        for (const [key, value] of Object.entries(command)) {
            if (typeof value === "number") output[key] = lerp(value, (next as unknown as Record<string, number>)[key], t);
        }
        return output as MotionPath[number];
    });
}

export function chooseMotionVectorShapes(vectors: MotionVectors, t: number) {
    const frames = vectors.frames;
    const right = frames.findIndex((frame) => frame.at >= t);
    if (right < 0) return frames.at(-1)!.shapes;
    if (right === 0) return frames[0].shapes;
    const a = frames[right - 1], b = frames[right];
    const mix = (t - a.at) / (b.at - a.at);
    const compatible = a.shapes.length === b.shapes.length && a.shapes.every((shape, i) => {
        const other = b.shapes[i];
        return shape.fill === other.fill && shape.path.length === other.path.length &&
            shape.path.every((command, j) => command.op === other.path[j].op);
    });
    if (!vectors.interpolate || !compatible) return mix < 0.5 ? a.shapes : b.shapes;
    return a.shapes.map((shape, i) => ({
        ...shape,
        opacity: lerp(shape.opacity, b.shapes[i].opacity, mix),
        path: interpolatePath(shape.path, b.shapes[i].path, mix),
    }));
}

export function drawLiquid({ ctx, scene, width, height }: Frame, t: number, assets: Readonly<Record<string, MotionVectors>> = {}) {
    const { params, palette } = scene;
    const unit = Math.min(width, height);
    if (params.mode === "vectors") {
        const vectors = assets[params.assetId];
        if (!vectors) throw new Error("The liquid vector asset is not ready.");
        const w = Math.min(width, height * 16 / 9);
        const h = w * 9 / 16;
        ctx.save();
        ctx.translate((width - w) / 2, (height - h) / 2);
        const shapes = chooseMotionVectorShapes(vectors, t);
        const gradient = params.style === "liquid_gradient" ? ctx.createLinearGradient(w * 0.28, h * 0.23, w * 0.73, h * 0.8) : null;
        if (gradient) {
            gradient.addColorStop(0, palette.primary);
            gradient.addColorStop(0.55, palette.accent);
            gradient.addColorStop(1, palette.muted);
            ctx.save();
            ctx.translate(unit * 0.012, unit * 0.017);
            ctx.fillStyle = alpha(palette.accent, 0.48);
            for (const shape of shapes.filter(({ fill }) => fill !== "foreground")) {
                drawMotionPath(ctx, shape.path, w, h);
                ctx.fill("evenodd");
            }
            ctx.restore();
        }
        for (const shape of shapes) {
            drawMotionPath(ctx, shape.path, w, h);
            ctx.fillStyle = gradient && shape.fill !== "foreground" ? gradient : alpha(resolveGraphColor(palette, shape.fill), shape.opacity);
            ctx.fill("evenodd");
        }
        ctx.restore();
        return;
    }
    const step = unit * 0.08;
    for (let x = width * 0.1; x < width * 0.9; x += step) line(ctx, x, height * 0.17, x, height * 0.83, alpha(palette.foreground, 0.035));
    for (let y = height * 0.17; y < height * 0.83; y += step) line(ctx, width * 0.1, y, width * 0.9, y, alpha(palette.foreground, 0.035));
    const data = field(t, params.blobs, scene.seed);
    const body = contourPath(traceContours(data.values, data.w, data.h, 0.59), unit * 1.5, unit * 1.12);
    const core = contourPath(traceContours(data.values, data.w, data.h, 1.12), unit * 1.5, unit * 1.12);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    const reveal = easeOut(t / 0.16);
    ctx.scale(reveal, reveal);
    ctx.rotate(Math.sin(t * 3.8) * 0.13);
    ctx.save();
    ctx.translate(unit * 0.021, unit * 0.026);
    ctx.fillStyle = alpha(palette.accent, 0.44);
    ctx.fill(body, "evenodd");
    ctx.restore();
    const gradient = ctx.createLinearGradient(-unit * 0.45, -unit * 0.23, unit * 0.45, unit * 0.23);
    gradient.addColorStop(0, palette.primary);
    gradient.addColorStop(0.55, palette.accent);
    gradient.addColorStop(1, palette.muted);
    ctx.fillStyle = gradient;
    ctx.fill(body, "evenodd");
    ctx.clip(body, "evenodd");
    ctx.fillStyle = alpha(palette.foreground, 0.3);
    ctx.fill(core, "evenodd");
    ctx.restore();
}
