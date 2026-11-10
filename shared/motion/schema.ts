import { z } from "zod";
import { graphComposition } from "./graph";

export const motionSceneId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/);
export const motionColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const motionPalette = z.object({
    background: motionColor,
    foreground: motionColor,
    primary: motionColor,
    accent: motionColor,
    muted: motionColor,
}).strict();
export const defaultMotionPalette = {
    background: "#151417", foreground: "#fff0d5", primary: "#ff691f",
    accent: "#ff2687", muted: "#ffb68f",
} as const;
export const motionStyleRecipes = {
    reference: defaultMotionPalette,
    studio: { background: "#151417", foreground: "#fff1e9", primary: "#ff8d64", accent: "#d8512b", muted: "#ffc09e" },
} as const;
export const motionQualitySchema = z.object({
    generation: z.enum(["assembled", "rendered", "approximated", "incomplete"]),
    review: z.enum(["pending", "passed", "issues", "unavailable"]),
    findings: z.array(z.string().max(280)).max(16),
    approximations: z.array(z.object({ sceneId: motionSceneId, description: z.string().max(240) }).strict()).max(8),
}).strict();
export type MotionQuality = z.infer<typeof motionQualitySchema>;

export const motionGenerationSchema = z.object({
    runId: z.uuid(),
    rendererVersion: z.number().int().positive(),
    skills: z.array(z.object({ id: z.string().regex(/^[a-z-]+$/), version: z.number().int().positive() }).strict()).max(20),
    reference: z.object({ bindingId: z.uuid(), assetId: z.uuid().nullable(), sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable() }).strict().nullable(),
    quality: motionQualitySchema.optional(),
}).strict();
export type MotionGeneration = z.infer<typeof motionGenerationSchema>;
const frame = z.number().int().min(0).max(7200);
export const motionCueSchema = z.object({
    frame, confidence: z.number().min(0).max(1), source: z.enum(["detected", "manual"]),
}).strict();
const audioTime = z.number().min(0).max(30);
export const motionAudioAnalysisSchema = z.object({
    duration: audioTime.positive(),
    energy: z.array(z.number().min(0).max(1)).min(1).max(300),
    silence: z.array(z.object({ start: audioTime, end: audioTime }).strict()).max(24),
    rhythm: z.object({ bpm: z.number().min(55).max(220), confidence: z.number().min(0).max(1),
        times: z.array(audioTime).min(5).max(40),
    }).strict().nullable(),
}).strict().superRefine(({ duration, energy, silence, rhythm }, context) => {
    if (energy.length !== Math.ceil(duration * 10) || silence.some(({ start, end }, index) => end > duration || start >= end ||
        (index > 0 && start < silence[index - 1].end)) || rhythm?.times.some((time, index) => time >= duration ||
        (index > 0 && time <= rhythm.times[index - 1]))) {
        context.addIssue({ code: "custom", message: "Audio timing data is outside the soundtrack timeline." });
    }
});
export type MotionAudioAnalysis = z.infer<typeof motionAudioAnalysisSchema>;
export const motionCuesSchema = z.array(motionCueSchema).max(40).refine((cues) =>
    cues.every((cue, i) => i === 0 || cue.frame > cues[i - 1].frame), "Motion cues must be unique and in frame order.");
export type MotionCue = z.infer<typeof motionCueSchema>;
const copy = z.string().trim().min(1).max(180);
const ratio = z.number().min(0).max(1);
const layout = z.object({
    align: z.enum(["left", "center", "right"]).default("center"),
    inset: z.number().min(0.025).max(0.2).default(0.075),
}).strict();
export const motionLayout = layout;
const asset = z.object({
    id: z.uuid(),
    kind: z.enum(["image", "font", "vectors"]),
}).strict();
const base = {
    id: motionSceneId,
    start_frame: frame,
    end_frame: frame,
    layer: z.number().int().min(0).max(31).default(0),
    componentVersion: z.literal(1),
    seed: z.number().int().min(0).max(0xffffffff).default(0),
    layout: layout.default({ align: "center", inset: 0.075 }),
    palette: motionPalette.default(defaultMotionPalette),
    font: z.enum(["archivo_black", "space_mono", "system"]).default("archivo_black"),
    fontAssetId: z.uuid().optional(),
    finish: z.object({
        grain: z.number().min(0).max(0.2).default(0.045),
        vignette: z.number().min(0).max(0.5).default(0.18),
        framing: z.boolean().default(false),
    }).strict().default({ grain: 0.045, vignette: 0.18, framing: false }),
    assets: z.array(asset).max(4).default([]),
    motionRate: z.number().min(0.5).max(2).default(1),
    transitionIn: z.object({
        kind: z.enum(["fade", "wipe", "scale"]),
        frames: z.number().int().min(1).max(120),
    }).strict().optional(),
};

const effectParams = {
    impact: z.object({
        headline: copy,
        ringCount: z.number().int().min(1).max(8).default(3),
        particles: z.number().int().min(0).max(240).default(80),
        impactAt: z.number().min(0.15).max(0.7).default(0.46),
        highlightLastWord: z.boolean().default(false),
    }).strict(),
    kinetic_words: z.object({
        words: z.array(copy.max(50)).min(1).max(12),
        entrance: z.enum(["masked_rise", "slam", "wipe"]).default("masked_rise"),
        alternatePalette: z.boolean().default(true),
    }).strict(),
    grid: z.object({
        columns: z.number().int().min(2).max(24).default(23),
        rows: z.number().int().min(2).max(24).default(15),
        spin: z.number().min(-2).max(2).default(0.25),
        stagger: ratio.default(0.5),
    }).strict(),
    easing: z.object({
        heading: copy.default("EASING"),
        labels: z.tuple([copy.max(32), copy.max(32), copy.max(32)]).default(["LINEAR", "EASE OUT", "CUSTOM"]),
        curve: z.tuple([ratio, z.number().min(-1).max(2), ratio, z.number().min(-1).max(2)]).default([0.8, 0, 0.2, 1]),
    }).strict(),
    tunnel: z.object({
        sides: z.number().int().min(3).max(12).default(6),
        rings: z.number().int().min(4).max(32).default(17),
        sphereParticles: z.number().int().min(0).max(800).default(680),
        revolutions: z.number().min(-4).max(4).default(0.75),
    }).strict(),
    liquid: z.discriminatedUnion("mode", [
        z.object({ mode: z.literal("procedural"), blobs: z.number().int().min(2).max(10).default(6) }).strict(),
        z.object({ mode: z.literal("vectors"), assetId: z.uuid(), style: z.enum(["solid", "liquid_gradient"]).default("solid") }).strict(),
    ]),
    identity: z.object({
        title: copy,
        detail: z.string().trim().max(100).default(""),
        tag: z.string().trim().max(80).default(""),
        showMark: z.boolean().default(true),
    }).strict(),
    graph: graphComposition,
};

export const motionComponentParams = effectParams;
export const motionSceneSchema = z.discriminatedUnion("type", [
    z.object({ ...base, type: z.literal("impact"), params: effectParams.impact }).strict(),
    z.object({ ...base, type: z.literal("kinetic_words"), params: effectParams.kinetic_words }).strict(),
    z.object({ ...base, type: z.literal("grid"), params: effectParams.grid }).strict(),
    z.object({ ...base, type: z.literal("easing"), params: effectParams.easing }).strict(),
    z.object({ ...base, type: z.literal("tunnel"), params: effectParams.tunnel }).strict(),
    z.object({ ...base, type: z.literal("liquid"), params: effectParams.liquid }).strict(),
    z.object({ ...base, type: z.literal("identity"), params: effectParams.identity }).strict(),
    z.object({ ...base, type: z.literal("graph"), params: effectParams.graph }).strict(),
]).superRefine((scene, ctx) => {
    const duration = scene.end_frame - scene.start_frame;
    if (duration <= 0) ctx.addIssue({ code: "custom", path: ["end_frame"], message: "Motion scenes need a positive frame span." });
    if (scene.transitionIn && scene.transitionIn.frames >= duration) {
        ctx.addIssue({ code: "custom", path: ["transitionIn"], message: "Transitions must be shorter than the scene." });
    }
    if (new Set(scene.assets.map(({ id }) => id)).size !== scene.assets.length) {
        ctx.addIssue({ code: "custom", path: ["assets"], message: "Motion asset IDs must be unique in a scene." });
    }
    if (scene.fontAssetId && !scene.assets.some(({ id, kind }) => id === scene.fontAssetId && kind === "font")) {
        ctx.addIssue({ code: "custom", path: ["fontAssetId"], message: "The font must reference a project font asset." });
    }
    if (scene.type === "liquid" && scene.params.mode === "vectors") {
        const assetId = scene.params.assetId;
        if (!scene.assets.some(({ id, kind }) => id === assetId && kind === "vectors")) {
            ctx.addIssue({ code: "custom", path: ["params", "assetId"], message: "Vector liquid needs a matching vector asset reference." });
        }
    }
});

export type MotionScene = z.infer<typeof motionSceneSchema>;
export type MotionSceneType = MotionScene["type"];

export const motionTrackSchema = z.array(motionSceneSchema).max(8).superRefine((scenes, ctx) => {
    const boundaries = scenes.flatMap((scene) => [
        { frame: scene.start_frame, count: 1 }, { frame: scene.end_frame, count: -1 },
    ]).sort((a, b) => a.frame - b.frame || a.count - b.count);
    let active = 0;
    for (const event of boundaries) {
        active += event.count;
        if (active > 2) {
            ctx.addIssue({ code: "custom", message: "At most two motion scenes can overlap." });
            break;
        }
    }
});
