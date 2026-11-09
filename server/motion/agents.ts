import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { compileMotionPlan, motionSceneExceedsBudget } from "../../shared/motion/compile";
import { motionComponentTypes, describeMotionComponent } from "../../shared/motion/registry";
import { motionLayout, motionPalette, motionSceneId, motionSceneSchema, type MotionScene } from "../../shared/motion/schema";
import { referenceAnalysisSchema, referenceSceneEstimateSchema, type ReferenceAnalysis } from "../../shared/motion/reference";
import { runMotionAgent, type MotionAgentContext, type MotionVisionImage } from "./agent-call";

const frame = z.number().int().nonnegative().max(7200);
const storyboardScene = z.object({
    id: motionSceneId,
    type: z.enum(motionComponentTypes),
    start_frame: frame,
    end_frame: frame,
    purpose: z.string().trim().min(1).max(200),
    copy: z.string().trim().max(180),
}).strict().refine((scene) => scene.end_frame > scene.start_frame);

export const motionStoryboardSchema = z.object({
    title: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(320),
    look: z.enum(["reference", "studio"]),
    scenes: z.array(storyboardScene).min(1).max(8),
}).strict().superRefine(({ scenes }, ctx) => {
    const ids = new Set<string>();
    let boundary = 0;
    for (const scene of scenes) {
        if (ids.has(scene.id) || scene.start_frame !== boundary) {
            ctx.addIssue({ code: "custom", message: "Storyboard scenes must have unique IDs and continuous frame spans." });
            return;
        }
        ids.add(scene.id);
        boundary = scene.end_frame;
    }
});

export type MotionStoryboard = z.infer<typeof motionStoryboardSchema>;
const copyScene = z.object({
    id: motionSceneId,
    copy: z.string().trim().max(180),
}).strict();
export const motionCopySchema = z.object({
    scenes: z.array(copyScene).min(1).max(8),
    decision: z.string().trim().min(1).max(280),
}).strict();
const designScene = z.object({
    id: motionSceneId,
    palette: motionPalette,
    font: z.enum(["archivo_black", "space_mono", "system"]),
    layout: motionLayout,
}).strict();
export const motionDesignSchema = z.object({
    scenes: z.array(designScene).min(1).max(8),
    decision: z.string().trim().min(1).max(280),
}).strict();
export type MotionCopy = z.infer<typeof motionCopySchema>;
export type MotionDesign = z.infer<typeof motionDesignSchema>;
export const motionBuildSchema = z.object({
    scene: motionSceneSchema,
    decision: z.string().trim().min(1).max(280),
    approximation: z.string().trim().min(1).max(240).nullable(),
}).strict();
export type MotionBuild = z.infer<typeof motionBuildSchema>;

function requireSceneIds(storyboard: MotionStoryboard, scenes: readonly { id: string }[]) {
    const ids = new Set(scenes.map(({ id }) => id));
    if (ids.size !== storyboard.scenes.length || ids.size !== scenes.length ||
        !storyboard.scenes.every(({ id }) => ids.has(id))) {
        throw new Error("The specialist artifact must match every planned scene ID.");
    }
}

export async function runReferenceAnalyst(
    context: MotionAgentContext,
    evidence: Pick<ReferenceAnalysis, "kind" | "interval" | "measured" | "observations">,
    images: readonly MotionVisionImage[],
) {
    if (!images.length || images.length > 3) throw new Error("Reference analysis requires bounded visual evidence.");
    const result = await runMotionAgent(context, "referenceAnalyst", "MEDIA_UNDERSTANDING", {
        ...evidence,
        supportedTypes: motionComponentTypes,
    }, referenceSceneEstimateSchema, {
        images,
        validate: (estimate) => { referenceAnalysisSchema.parse({ ...evidence, ...estimate }); },
    });
    return { ...result, value: referenceAnalysisSchema.parse({ ...evidence, ...result.value }) };
}

export function runMotionDirector(context: MotionAgentContext, reference: ReferenceAnalysis | null) {
    return runMotionAgent(context, "director", "AGENT_COMPLEX", {
        reference,
        components: motionComponentTypes.map((type) => {
            const { name, description } = describeMotionComponent(type);
            return { type, name, description };
        }),
        audioCues: context.document.metadata.motion_cues ?? [],
    }, motionStoryboardSchema, {
        validate: ({ scenes }) => {
            if (scenes.at(-1)?.end_frame !== context.document.total_frames) throw new Error("Storyboard duration is incorrect.");
        },
    });
}

export function runMotionCopywriter(context: MotionAgentContext, storyboard: MotionStoryboard, exactCopy: readonly string[] = []) {
    return runMotionAgent(context, "copywriter", "WRITING", {
        storyboard, language: context.document.metadata.language, exactCopy,
    }, motionCopySchema, {
        validate: ({ scenes }) => {
            requireSceneIds(storyboard, scenes);
            const copy = storyboard.scenes.map(({ id }) => scenes.find((scene) => scene.id === id)!.copy).join(" ");
            if (exactCopy.some((text) => !copy.includes(text))) throw new Error("Required copy was changed.");
        },
    });
}

export function runMotionDesigner(context: MotionAgentContext, storyboard: MotionStoryboard) {
    return runMotionAgent(context, "visualDesigner", "AGENT_COMPLEX", { storyboard }, motionDesignSchema, {
        validate: ({ scenes }) => requireSceneIds(storyboard, scenes),
    });
}

function sceneCopy(scene: MotionScene): string | null {
    switch (scene.type) {
        case "impact": return scene.params.headline;
        case "identity": return scene.params.title;
        case "kinetic_words": return scene.params.words.join(" ");
        case "easing": return scene.params.heading;
        default: return null;
    }
}

function requireSceneSpan(scene: MotionScene, expected: MotionStoryboard["scenes"][number]) {
    if (scene.id !== expected.id || scene.start_frame !== expected.start_frame || scene.end_frame !== expected.end_frame) {
        throw new Error("The scene ID or frame span changed.");
    }
}

export async function runMotionEngineer(
    context: MotionAgentContext,
    target: MotionStoryboard["scenes"][number],
    copy: MotionCopy,
    design: MotionDesign,
    assets: readonly MotionScene["assets"][number][] = [],
) {
    const wording = copy.scenes.find(({ id }) => id === target.id)?.copy;
    const styling = design.scenes.find(({ id }) => id === target.id);
    if (wording === undefined || !styling) throw new Error("The scene is missing its copy or design artifact.");
    const result = await runMotionAgent(context, "motionEngineer", "AGENT_COMPLEX", {
        target, approvedCopy: wording, styling, assets, component: describeMotionComponent(target.type),
        audioCues: context.document.metadata.motion_cues ?? [],
    }, motionBuildSchema, {
        validate: ({ scene, approximation }) => {
            requireSceneSpan(scene, target);
            if (scene.type !== target.type && !approximation) throw new Error("An alternate component needs an approximation note.");
            if (scene.assets.some((ref) => !assets.some((asset) => asset.id === ref.id && asset.kind === ref.kind))) {
                throw new Error("The scene referenced an unavailable asset.");
            }
            const actual = sceneCopy(scene);
            if (wording && actual !== null && actual.replace(/\s+/g, " ") !== wording.replace(/\s+/g, " ")) {
                throw new Error("The scene changed the approved copy.");
            }
        },
    });
    const { font, layout, palette } = styling;
    return { ...result, value: { ...result.value, scene: motionSceneSchema.parse({ ...result.value.scene, font, layout, palette }) } };
}

export function integrateMotionScenes(document: Document, storyboard: MotionStoryboard, builds: readonly MotionBuild[]) {
    const scenes = builds.map(({ scene }) => scene);
    requireSceneIds(storyboard, scenes);
    for (const scene of scenes) requireSceneSpan(scene, storyboard.scenes.find(({ id }) => id === scene.id)!);
    const plan = { title: storyboard.title, scenes };
    const blockers: MotionCritique["issues"] = [];
    for (const scene of scenes) {
        const where = { sceneId: scene.id, frame: scene.start_frame, priority: "blocking" as const };
        if (motionSceneExceedsBudget(scene)) blockers.push({
            ...where, issue: "The scene exceeds the browser's geometry, particle, or vector budget.",
            repair: "Reduce expensive layers, instances, particles or vector assets while preserving the approved layout and copy.",
        });
        const { background, primary, foreground, accent, muted } = scene.palette;
        const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
        const hiddenHeadline = scene.type === "impact" ? same(background, primary)
            : scene.type === "identity" ? same(background, foreground)
            : scene.type === "kinetic_words" ? scene.params.words.some((_, index) =>
                scene.params.alternatePalette
                    ? same([accent, foreground, muted, primary][index % 4], index % 4 === 0 ? foreground : background)
                    : same(background, foreground))
            : false;
        if (hiddenHeadline) blockers.push({
            ...where, issue: "The headline uses the same color as its background.",
            repair: "Separate the text and background colors while preserving the approved copy and the rest of the palette.",
        });
    }
    return { plan, document: blockers.length ? null : compileMotionPlan(plan, document), blockers };
}

const critiqueIssue = z.object({
    sceneId: motionSceneId,
    frame,
    priority: z.enum(["blocking", "polish"]),
    issue: z.string().trim().min(1).max(280),
    repair: z.string().trim().min(1).max(280),
}).strict();
const score = z.number().int().min(0).max(5);
export const motionCritiqueSchema = z.object({
    decision: z.string().trim().min(1).max(320),
    scores: z.object({ readability: score, hierarchy: score, palette: score, motion: score, pacing: score, brief: score }).strict(),
    issues: z.array(critiqueIssue).max(8),
    unresolved: z.array(z.string().trim().min(1).max(240)).max(8),
}).strict();
export type MotionCritique = z.infer<typeof motionCritiqueSchema>;

export function runMotionCritic(
    context: MotionAgentContext,
    draft: Document,
    preview: { frames: readonly number[]; images: readonly MotionVisionImage[] },
    reference: ReferenceAnalysis | null,
) {
    if (!preview.images.length || preview.images.length > 4 || !preview.frames.length || preview.frames.length > 32 ||
        preview.frames.some((value) => !Number.isInteger(value) || value < 0 || value >= draft.total_frames)) {
        throw new Error("Visual critique requires actual rendered preview samples.");
    }
    return runMotionAgent(context, "visualCritic", "MEDIA_UNDERSTANDING", {
        frames: preview.frames,
        fps: draft.fps,
        samples: "Contact sheet labels show seconds. Neighboring frames sample movement. Score visible evidence only.",
        scenes: draft.tracks.motion_graphics.map(({ id, type, start_frame, end_frame, palette }) =>
            ({ id, type, start_frame, end_frame, palette })),
        reference,
    }, motionCritiqueSchema, {
        images: preview.images,
        validate: ({ issues }) => {
            for (const issue of issues) {
                const scene = draft.tracks.motion_graphics.find(({ id }) => id === issue.sceneId);
                if (!scene || !preview.frames.includes(issue.frame) || issue.frame < scene.start_frame || issue.frame >= scene.end_frame) {
                    throw new Error("A visual critique issue must identify observed scene evidence.");
                }
            }
        },
    });
}

export function runMotionRepair(context: MotionAgentContext, scene: MotionScene, issues: readonly MotionCritique["issues"][number][]) {
    const relevant = issues.filter(({ sceneId }) => sceneId === scene.id);
    if (!relevant.length || relevant.length > 8) throw new Error("A repair needs a bounded issue for this scene.");
    return runMotionAgent(context, "repair", "AGENT_COMPLEX", {
        scene, issues: relevant, component: describeMotionComponent(scene.type),
    }, motionBuildSchema, {
        validate: ({ scene: next }) => {
            if (next.type !== scene.type || next.id !== scene.id ||
                next.start_frame !== scene.start_frame || next.end_frame !== scene.end_frame ||
                JSON.stringify(next.assets) !== JSON.stringify(scene.assets) ||
                sceneCopy(next) !== sceneCopy(scene)) {
                throw new Error("The repair changed protected scene content.");
            }
        },
    });
}
