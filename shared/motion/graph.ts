import { z } from "zod";

const coordinate = z.number().min(-2).max(3);
const opacity = z.number().min(0).max(1);
const scale = z.number().min(0).max(8);
const rotation = z.number().min(-1440).max(1440);
const paint = z.enum(["background", "foreground", "primary", "accent", "muted"]);
const point = { x: coordinate, y: coordinate };
const pathCommand = z.discriminatedUnion("op", [
    z.object({ op: z.literal("M"), ...point }).strict(),
    z.object({ op: z.literal("L"), ...point }).strict(),
    z.object({ op: z.literal("Q"), ...point, cx: coordinate, cy: coordinate }).strict(),
    z.object({ op: z.literal("C"), ...point, c1x: coordinate, c1y: coordinate, c2x: coordinate, c2y: coordinate }).strict(),
    z.object({ op: z.literal("Z") }).strict(),
]);
export const vectorPath = z.array(pathCommand).min(2).max(96).refine((commands) => commands[0]?.op === "M",
    "A path must begin with a move command.");
export type MotionPath = z.infer<typeof vectorPath>;
const size = z.number().min(0.001).max(2);
const transform = z.object({
    x: coordinate.optional(),
    y: coordinate.optional(),
    scale: scale.optional(),
    rotation: rotation.optional(),
    opacity: opacity.optional(),
}).strict();
const keyframe = transform.extend({
    at: opacity,
    ease: z.enum(["linear", "ease_in", "ease_out", "smooth"]).default("linear"),
});
const keyframes = z.array(keyframe).max(12).refine((values) =>
    values.every((value, i) => i === 0 || value.at > values[i - 1].at), "Keyframes must be in ascending order.");
const common = {
    id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/),
    transform: transform.default({}),
    keyframes: keyframes.default([]),
};
const leafSchema = z.discriminatedUnion("kind", [
    z.object({ ...common, kind: z.literal("text"), text: z.string().trim().min(1).max(180),
        color: paint.default("foreground"), size: z.number().min(0.015).max(0.4), maxWidth: size.default(0.85) }).strict(),
    z.object({ ...common, kind: z.literal("rect"), width: size, height: size,
        color: paint, radius: z.number().min(0).max(0.5).default(0), audioReactive: z.boolean().optional() }).strict(),
    z.object({ ...common, kind: z.literal("ellipse"), width: size, height: size, color: paint }).strict(),
    z.object({ ...common, kind: z.literal("path"), commands: vectorPath, color: paint,
        stroke: z.number().min(0.001).max(0.1).optional() }).strict(),
]);

export type MotionGraphNode = z.infer<typeof leafSchema> | {
    kind: "group";
    id: string;
    transform: z.infer<typeof transform>;
    keyframes: z.infer<typeof keyframes>;
    children: MotionGraphNode[];
    mask?: z.infer<typeof vectorPath>;
};

const nodeSchema: z.ZodType<MotionGraphNode> = z.lazy(() => z.union([
    leafSchema,
    z.object({
        ...common, kind: z.literal("group"), children: z.array(nodeSchema).min(1).max(16),
        mask: vectorPath.optional(),
    }).strict(),
]));

const MAX_GRAPH_NODES = 24;
const MAX_GRAPH_DEPTH = 4;
const MAX_GRAPH_COMMANDS = 384;
export const graphLayers = z.unknown().superRefine((value, ctx) => {
    if (!Array.isArray(value)) {
        ctx.addIssue({ code: "custom", message: "Graph layers must be an array." });
        return;
    }
    const stack = [{ nodes: value, depth: 1 }];
    const ids = new Set<unknown>();
    let count = 0;
    let commands = 0;
    while (stack.length) {
        const { nodes, depth } = stack.pop()!;
        count += nodes.length;
        if (depth > MAX_GRAPH_DEPTH || count > MAX_GRAPH_NODES) {
            ctx.addIssue({ code: "custom", message: "Motion graph layer or nesting limit exceeded." });
            return;
        }
        for (const node of nodes) {
            if (!node || typeof node !== "object") continue;
            if (ids.has(node.id)) {
                ctx.addIssue({ code: "custom", message: "Graph layer IDs must be unique." });
                return;
            }
            ids.add(node.id);
            if (node.kind === "group" && Array.isArray(node.children)) stack.push({ nodes: node.children, depth: depth + 1 });
            if (Array.isArray(node.mask)) commands += node.mask.length;
            if (Array.isArray(node.commands)) commands += node.commands.length;
        }
        if (commands > MAX_GRAPH_COMMANDS) {
            ctx.addIssue({ code: "custom", message: "Motion graph path complexity exceeded." });
            return;
        }
    }
}).pipe(z.array(nodeSchema).min(1).max(MAX_GRAPH_NODES));

export function graphGeometryCost(nodes: readonly MotionGraphNode[]): number {
    return nodes.reduce((count, node) => count + 1 +
        (node.kind === "path" ? node.commands.length
            : node.kind === "group" ? (node.mask?.length ?? 0) + graphGeometryCost(node.children)
                : 0), 0);
}
