import { z } from "zod";
import { graphGeometryCost } from "./graph";
import { motionComponentParams, type MotionScene, type MotionSceneType } from "./schema";

export const motionRendererVersion = 1;
const layouts = ["16:9", "9:16", "1:1"] as const;
export type MotionLayout = typeof layouts[number];
export type MotionDrawingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type MotionFrame<T extends MotionScene = MotionScene> = {
    ctx: MotionDrawingContext;
    scene: T;
    frame: number;
    fps: number;
    width: number;
    height: number;
    audioLevel?: number;
};

type Cost = { geometry: number; particles: number; vectors: number };
type Entry<T extends MotionSceneType> = {
    name: string;
    description: string;
    defaults: z.input<typeof motionComponentParams[T]>;
    editable: readonly (keyof Extract<MotionScene, { type: T }>["params"] | "mode" | "blobs" | "assetId")[];
    cost: (params: Extract<MotionScene, { type: T }>["params"]) => Cost;
};

const entries: { [K in MotionSceneType]: Entry<K> } = {
    impact: {
        name: "Impact and rings",
        description: "A bouncing shape opens into expanding rings, particles and a headline.",
        defaults: { headline: "MAKE IT MOVE" },
        editable: ["headline", "ringCount", "particles", "impactAt"],
        cost: ({ ringCount, particles }) => ({ geometry: ringCount + 8, particles, vectors: 0 }),
    },
    kinetic_words: {
        name: "Kinetic words",
        description: "Short words appear in sequence through a mask or impact reveal.",
        defaults: { words: ["TIMING", "SPACING", "EASING", "FEEL"] },
        editable: ["words", "entrance", "alternatePalette"],
        cost: () => ({ geometry: 32, particles: 0, vectors: 0 }),
    },
    grid: {
        name: "Morphing grid",
        description: "A rotating field of shapes morphs in a staggered wave.",
        defaults: {},
        editable: ["columns", "rows", "spin", "stagger"],
        cost: ({ columns, rows }) => ({ geometry: columns * rows, particles: 0, vectors: 0 }),
    },
    easing: {
        name: "Easing comparison",
        description: "A curve and trails demonstrate contrasting animation speeds.",
        defaults: {},
        editable: ["heading", "labels", "curve"],
        cost: () => ({ geometry: 96, particles: 0, vectors: 0 }),
    },
    tunnel: {
        name: "Tunnel and particle sphere",
        description: "Nested polygons lead into a sphere made from projected particles.",
        defaults: {},
        editable: ["sides", "rings", "sphereParticles", "revolutions"],
        cost: ({ sides, rings, sphereParticles }) => ({ geometry: sides * rings + 64, particles: sphereParticles, vectors: 0 }),
    },
    liquid: {
        name: "Liquid shapes",
        description: "Smooth morphing blobs or time-sampled vector contours.",
        defaults: { mode: "procedural" },
        editable: ["mode", "blobs", "assetId"],
        cost: (params) => ({ geometry: params.mode === "procedural" ? params.blobs * 32 : 0, particles: 0, vectors: params.mode === "vectors" ? 1 : 0 }),
    },
    identity: {
        name: "Identity card",
        description: "A closing title, supporting detail, and optional mark.",
        defaults: { title: "VIDSAI" },
        editable: ["title", "detail", "tag", "showMark"],
        cost: () => ({ geometry: 12, particles: 0, vectors: 0 }),
    },
    graph: {
        name: "Custom composition",
        description: "Compose animated text, shapes, paths, groups and masks from validated drawing primitives.",
        defaults: { layers: [{ id: "heading", kind: "text", text: "MAKE IT MOVE", size: 0.1 }] },
        editable: ["layers"],
        cost: ({ layers }) => ({ geometry: graphGeometryCost(layers), particles: 0, vectors: 0 }),
    },
};

export const motionComponentTypes = Object.keys(entries) as MotionSceneType[];

export function describeMotionComponent(type: MotionSceneType) {
    const entry = entries[type];
    const params = motionComponentParams[type];
    return {
        type, name: entry.name, description: entry.description,
        rendererVersion: motionRendererVersion, componentVersion: 1,
        layouts, editable: entry.editable, defaults: params.parse(entry.defaults),
        params: z.toJSONSchema(params, { io: "input" }),
    };
}

export function motionSceneCost(scene: MotionScene): Cost {
    switch (scene.type) {
        case "impact": return entries.impact.cost(scene.params);
        case "kinetic_words": return entries.kinetic_words.cost(scene.params);
        case "grid": return entries.grid.cost(scene.params);
        case "easing": return entries.easing.cost(scene.params);
        case "tunnel": return entries.tunnel.cost(scene.params);
        case "liquid": return entries.liquid.cost(scene.params);
        case "identity": return entries.identity.cost(scene.params);
        case "graph": return entries.graph.cost(scene.params);
    }
}
