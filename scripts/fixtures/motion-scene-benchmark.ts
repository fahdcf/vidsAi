import { z } from "zod";
import { graphAuthoring } from "../../shared/motion/graph";
import { diagnoseMotionLayout } from "../../shared/motion/layout-diagnostics";
import { measureMotionFrame } from "../../shared/motion/layout-measure";
import { motionSceneSchema, type MotionScene } from "../../shared/motion/schema";

export const benchmarkFrames = [0, 30, 59] as const;
const position = z.number().min(0).max(1);
const color = z.string().regex(/^#[a-f0-9]{6}$/i);
const placement = z.object({ x: position, y: position }).strict();
const movement = z.object({ axis: z.enum(["x", "y"]), from: position, to: position,
    startFrame: z.number().int().min(0).max(58), endFrame: z.number().int().min(1).max(59) }).strict()
    .refine(({ startFrame, endFrame }) => startFrame < endFrame);
const common = { id: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/), at: placement, color };
export const benchmarkLayout = z.object({
    layers: z.array(z.discriminatedUnion("kind", [
        z.object({ ...common, kind: z.literal("text"), text: z.string().trim().min(1).max(65),
            size: z.number().min(0.03).max(0.25), maxWidth: z.number().min(0.12).max(0.9) }).strict(),
        z.object({ ...common, kind: z.literal("rect"), width: z.number().min(0.03).max(1.5),
            height: z.number().min(0.015).max(0.8), move: movement.optional() }).strict(),
    ])).min(2).max(10),
}).strict();
type Layout = z.infer<typeof benchmarkLayout>;
type Layer = Layout["layers"][number];
const text = (id: string, text: string, x: number, y: number, color: string, size: number, maxWidth: number): Layer =>
    ({ id, kind: "text", text, at: { x, y }, color, size, maxWidth });
const rect = (id: string, x: number, y: number, color: string, width: number, height: number,
    move?: z.infer<typeof movement>): Layer => ({ id, kind: "rect", at: { x, y }, color, width, height, move });

export const benchmarkScenes = [
    { family: "product", title: "Product launch", background: "#162029", defect: "missing-copy", subject: "Start free", layers: [
        rect("control", 0.34, 0.68, "#f78350", 0.4, 0.12, { axis: "x", from: 0.19, to: 0.34, startFrame: 0, endFrame: 28 }),
        text("headline", "Make it yours", 0.5, 0.3, "#fff8ed", 0.14, 0.78),
        text("action", "Start free", 0.34, 0.68, "#172029", 0.065, 0.22),
    ] },
    { family: "typography", title: "Typography study", background: "#261e31", defect: "wrong-color", subject: "accent", layers: [
        rect("accent", 0.52, 0.68, "#ffac76", 0.58, 0.027, { axis: "x", from: 0.31, to: 0.52, startFrame: 7, endFrame: 42 }),
        text("headline", "MOVE", 0.5, 0.33, "#ffc4a0", 0.24, 0.74),
        text("support", "with purpose.", 0.5, 0.54, "#fff9f1", 0.09, 0.66),
    ] },
    { family: "data", title: "Resource dashboard", background: "#142c2d", defect: "wrong-position", subject: "highlight", layers: [
        rect("bar-one", 0.31, 0.68, "#58998b", 0.15, 0.21),
        rect("bar-two", 0.49, 0.63, "#58998b", 0.15, 0.31),
        rect("highlight", 0.67, 0.56, "#bcf481", 0.15, 0.45, { axis: "y", from: 0.62, to: 0.56, startFrame: 0, endFrame: 37 }),
        text("headline", "Water saved", 0.5, 0.19, "#f0ffec", 0.11, 0.75),
        text("callout", "162 L", 0.82, 0.42, "#bcf481", 0.085, 0.22),
    ] },
] as const;
export type BenchmarkCase = typeof benchmarkScenes[number];

export function benchmarkCandidate(entry: BenchmarkCase) {
    return { layers: entry.layers.filter((layer) => entry.defect !== "missing-copy" || layer.id !== "action").map((layer) =>
        layer.id !== entry.subject || layer.kind !== "rect" ? layer
            : entry.defect === "wrong-color" ? { ...layer, color: "#6daffa" }
                : { ...layer, at: { ...layer.at, x: 0.82 } }) };
}

export function benchmarkMotionScene(id: string, background: string, raw: unknown) {
    const { layers } = benchmarkLayout.parse(raw);
    const params = graphAuthoring.parse({ version: 1, nodes: layers.map(({ at, ...layer }, order) => {
        if (layer.kind === "text") return { parentId: null, order, node: { ...layer, transform: at } };
        const { move, ...shape } = layer;
        return { parentId: null, order, node: { ...shape, transform: at,
            animation: move ? [{ property: move.axis, from: move.from, to: move.to, start: move.startFrame / 59,
                end: move.endFrame / 59, ease: "linear" }] : undefined } };
    }) });
    return motionSceneSchema.parse({ id, type: "graph", componentVersion: 1, start_frame: 0, end_frame: 60,
        font: "system", palette: { background, foreground: "#ffffff", primary: "#ff8800", accent: "#ffc000", muted: "#666666" },
        finish: { grain: 0, vignette: 0 }, params });
}

export function renderBenchmarkFrames(scene: MotionScene, copy: string[]) {
    const width = 480, height = 270;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    return benchmarkFrames.map((frame) => {
        ctx.clearRect(0, 0, width, height);
        const measured = measureMotionFrame({ ctx, scene, frame, fps: 30, width, height }, { fontFamily: "Arial" });
        const findings = diagnoseMotionLayout(measured, width, height, { settled: frame === 59, requiredText: copy });
        return { frame, png: canvas.toDataURL("image/png").split(",")[1], findings,
            elements: measured.filter(({ id }) => id !== scene.id).map(({ id, kind, text, color, bounds }) => ({
                id, kind, text, color, x: (bounds.left + bounds.right) / (2 * width), y: (bounds.top + bounds.bottom) / (2 * height),
                width: (bounds.right - bounds.left) / width, height: (bounds.bottom - bounds.top) / height,
            })) };
    });
}

export function scoreBenchmarkVisual(expected: ReturnType<typeof renderBenchmarkFrames>, actual: ReturnType<typeof renderBenchmarkFrames>) {
    const near = (a: number, b: number, limit: number) => Math.abs(a - b) <= limit;
    const checks = expected.flatMap(({ elements }, index) => elements.flatMap((element) => {
        const candidate = actual[index].elements.find(({ id }) => id === element.id);
        if (!candidate) return [false, false, false];
        return [
            candidate.kind === element.kind && candidate.text === element.text,
            near(candidate.x, element.x, 0.055) && near(candidate.y, element.y, 0.055) &&
                near(candidate.width, element.width, 0.065) && near(candidate.height, element.height, 0.065),
            candidate.color === element.color,
        ];
    }));
    const final = actual.at(-1)!;
    checks.push(final.findings.length === 0);
    return { passed: checks.filter(Boolean).length, total: checks.length, finalFindings: final.findings,
        exactEditableCopy: expected.at(-1)!.elements.filter(({ kind }) => kind === "text")
            .every(({ id, text }) => final.elements.some((element) => element.id === id && element.text === text)) };
}
