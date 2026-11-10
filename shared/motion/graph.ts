import { z } from "zod";
import { graphColor, graphPaintFields, graphTextFields } from "./graph-style";
import { graphAnimation } from "./graph-animation";

const coordinate = z.number().min(-2).max(3);
const opacity = z.number().min(0).max(1);
const scale = z.number().min(0).max(8);
const rotation = z.number().min(-1440).max(1440);
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
    animation: graphAnimation.optional(),
};
const assetFields = { ...common, assetId: z.uuid(), width: size, height: size };
const leafSchema = z.discriminatedUnion("kind", [
    z.object({ ...common, ...graphPaintFields, ...graphTextFields, kind: z.literal("text"), text: z.string().trim().min(1).max(180),
        color: graphColor.default("foreground"), size: z.number().min(0.015).max(0.4), maxWidth: size.default(0.85) }).strict()
        .refine(({ spans, text }) => !spans || spans.map((span) => span.text).join("") === text, "Styled spans must preserve the complete layer text."),
    z.object({ ...common, ...graphPaintFields, kind: z.literal("rect"), width: size, height: size,
        color: graphColor, radius: z.number().min(0).max(0.5).default(0), audioReactive: z.boolean().optional() }).strict(),
    z.object({ ...common, ...graphPaintFields, kind: z.literal("ellipse"), width: size, height: size, color: graphColor }).strict(),
    z.object({ ...common, ...graphPaintFields, kind: z.literal("path"), commands: vectorPath, color: graphColor,
        stroke: z.number().min(0.001).max(0.1).optional() }).strict(),
    z.object({ ...assetFields, kind: z.literal("image") }).strict(),
    z.object({ ...assetFields, kind: z.literal("vector") }).strict(),
    z.object({ ...common, ...graphPaintFields, kind: z.literal("widget"),
        variant: z.enum(["button", "card", "play-icon", "text-row", "waveform"]), width: size, height: size,
        color: graphColor, label: z.string().trim().max(120).default(""), labelColor: graphColor.default("foreground"),
        bars: z.number().int().min(5).max(32).default(15),
        waveformCycles: z.number().min(0).max(12).optional(), waveformSeed: z.number().int().min(0).max(0xffffffff).optional() }).strict(),
]);

export type MotionGraphNode = z.infer<typeof leafSchema> | {
    kind: "group";
    id: string;
    transform: z.infer<typeof transform>;
    keyframes: z.infer<typeof keyframes>;
    animation?: z.infer<typeof graphAnimation>;
    children: MotionGraphNode[];
    mask?: z.infer<typeof vectorPath>;
};

const groupFields = z.object({ ...common, kind: z.literal("group"), mask: vectorPath.optional() }).strict();
const nodeSchema: z.ZodType<MotionGraphNode> = z.lazy(() => z.union([
    leafSchema,
    groupFields.extend({ children: z.array(nodeSchema).min(1).max(16) }),
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
            if (Array.isArray(node.animation) && node.animation.some((track: unknown) => track && typeof track === "object" && "property" in track && (
                (track.property === "draw" && (node.kind !== "path" || (!node.stroke && !node.outline))) ||
                (track.property === "textReveal" && node.kind !== "text") ||
                (track.property === "deform" && !["path", "rect", "ellipse"].includes(node.kind))))) {
                ctx.addIssue({ code: "custom", message: "The layer does not support the animated property." });
                return;
            }
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

export const motionGraphVersion = 1;
export const graphComposition = z.object({ version: z.literal(motionGraphVersion).optional(), layers: graphLayers }).strict();
const versionedGraph = graphComposition.required({ version: true });
const flatRecord = z.object({
    parentId: common.id.nullable(),
    order: z.number().int().min(0).max(MAX_GRAPH_NODES - 1),
    node: z.union([leafSchema, groupFields]),
}).strict();

export const graphAuthoringInput = z.object({
    version: z.literal(motionGraphVersion),
    nodes: z.array(flatRecord).min(1).max(MAX_GRAPH_NODES),
}).strict();
export const graphAuthoring = graphAuthoringInput.transform<z.input<typeof versionedGraph>>(({ version, nodes }, ctx) => {
    const byId = new Map(nodes.map((record) => [record.node.id, record]));
    if (byId.size !== nodes.length) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: "Graph node IDs must be unique." });
        return z.NEVER;
    }
    const byParent = new Map<string | null, typeof nodes>();
    for (const [index, record] of nodes.entries()) {
        const { node, parentId, order } = record;
        const ancestors = new Set([node.id]);
        for (let ancestorId = parentId; ancestorId !== null;) {
            const ancestor = byId.get(ancestorId);
            if (!ancestor || ancestor.node.kind !== "group" || ancestors.has(ancestorId) || ancestors.size >= MAX_GRAPH_DEPTH) {
                ctx.addIssue({ code: "custom", path: ["nodes", index, "parentId"], message: "Use a valid group parent without a cycle or excessive nesting." });
                return z.NEVER;
            }
            ancestors.add(ancestorId);
            ancestorId = ancestor.parentId;
        }
        const siblings = byParent.get(parentId) ?? [];
        if (siblings.some((sibling) => sibling.order === order)) {
            ctx.addIssue({ code: "custom", path: ["nodes", index, "order"], message: "Sibling layer order must be unique." });
            return z.NEVER;
        }
        siblings.push(record);
        byParent.set(parentId, siblings);
    }
    const layersFor = (parent: string | null): MotionGraphNode[] => (byParent.get(parent) ?? []).sort((a, b) => a.order - b.order)
        .map(({ node }) => node.kind === "group" ? { ...node, children: layersFor(node.id) } : node);
    return { version, layers: layersFor(null) };
}).pipe(versionedGraph);

export function graphGeometryCost(nodes: readonly MotionGraphNode[]): number {
    return nodes.reduce((count, node) => count + 1 +
        (node.kind === "path" ? node.commands.length
            : node.kind === "group" ? (node.mask?.length ?? 0) + graphGeometryCost(node.children)
                : node.kind === "widget" && node.variant === "waveform" ? node.bars
                : node.kind === "vector" ? 384
                : 0), 0);
}

export function graphCopy(nodes: readonly MotionGraphNode[]): string[] {
    return nodes.flatMap((node) => node.kind === "group" ? graphCopy(node.children)
        : node.kind === "text" ? [node.text] : node.kind === "widget" && node.label ? [node.label] : []);
}

export function graphAssetRefs(nodes: readonly MotionGraphNode[]): { id: string; kind: "image" | "vectors" }[] {
    return nodes.flatMap((node) => node.kind === "group" ? graphAssetRefs(node.children)
        : node.kind === "image" || node.kind === "vector" ? [{ id: node.assetId, kind: node.kind === "image" ? "image" : "vectors" }] : []);
}
