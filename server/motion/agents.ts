import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { compileMotionPlan, motionSceneExceedsBudget } from "../../shared/motion/compile";
import { motionComponentTypes, describeMotionComponent } from "../../shared/motion/registry";
import { motionColor, motionLayout, motionPalette, motionSceneId, motionSceneSchema, type MotionScene } from "../../shared/motion/schema";
import { referenceAnalysisSchema, type ReferenceAnalysis } from "../../shared/motion/reference";
import type { ReferenceSceneSpec } from "../../shared/motion/reference-spec";
import { motionEvidenceFramesPerSheet, type ReferenceCropBounds } from "../../shared/motion/browser-tools";
import { motionTimeMap, soundtrackLevelAt } from "../../shared/motion/time-map";
import { MotionAgentUnavailable, runMotionAgent, type MotionAgentContext, type MotionVisionImage } from "./agent-call";
import { MotionBudgetError } from "./budget";
import { explicitCopyParts, storyboardCopyParts, validCopyParts } from "./copy";
import { compileEngineerGraph, fallbackEngineerGraph, graphEngineerSchema, graphSceneNotes } from "./graph-engineer";
import { observeReferenceSheet } from "./reference-observer";
import { mapStoryboardToReference, observedSceneBoundaries, sceneReferenceEvidence } from "./reference-segments";

const frame = z.number().int().nonnegative().max(7200);
const storyboardScene = z.object({
    id: motionSceneId,
    type: z.enum(motionComponentTypes),
    start_frame: frame,
    end_frame: frame,
    purpose: z.string().trim().min(1).max(200),
    copy: z.string().trim().max(180),
    referenceSceneIndex: z.number().int().min(0).max(7).nullable().optional(),
}).strict().refine((scene) => scene.end_frame > scene.start_frame);

export const motionStoryboardSchema = z.object({
    title: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(320),
    look: z.enum(["reference", "studio"]),
    referenceIntent: z.enum(["match", "inspired"]).optional(),
    timingMode: z.enum(["source", "custom"]).optional(),
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
    parts: z.array(z.string().trim().max(180)).max(12).optional(),
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

function motionBuildForScene(type: MotionScene["type"]) {
    const component = motionSceneSchema.options.find(({ shape }) => shape.type.value === type)!;
    return motionBuildSchema.extend({ scene: component });
}

function motionEngineerSchema(type: MotionScene["type"], duration: number) {
    const build = motionBuildForScene(type);
    const { params, finish, seed, motionRate, transitionIn } = build.shape.scene.shape;
    const transition = duration > 1 ? transitionIn.unwrap().extend({ frames: frame.min(1).max(Math.min(120, duration - 1)) }) : z.never();
    return build.extend({ scene: z.object({ params, finish, seed, motionRate, transitionIn: transition.optional() }).strict() });
}

function requireSceneIds(storyboard: MotionStoryboard, scenes: readonly { id: string }[]) {
    const ids = new Set(scenes.map(({ id }) => id));
    if (ids.size !== storyboard.scenes.length || ids.size !== scenes.length ||
        !storyboard.scenes.every(({ id }) => ids.has(id))) {
        throw new Error("The specialist artifact must match every planned scene ID.");
    }
}

const referenceOutlineSchema = z.object({
    scenes: z.array(z.object({
        title: z.string().trim().min(1).max(80),
        type: z.enum(motionComponentTypes).nullable(),
        end: z.number().min(0).max(30.001).nullable(),
        sample: z.number().int().nonnegative().max(31),
        palette: z.array(motionColor).min(1).max(6),
        motion: z.string().trim().min(1).max(120).nullable(),
        approximation: z.string().trim().min(1).max(120).nullable(),
    }).strict()).min(1).max(8),
    unresolved: z.array(z.string().trim().min(1).max(120)).max(4),
}).strict();

type ReferenceEvidence = Pick<ReferenceAnalysis, "kind" | "interval" | "measured" | "observations">;

function expandReferenceOutline(evidence: ReferenceEvidence,
    outline: z.infer<typeof referenceOutlineSchema>) {
    const interval = evidence.interval;
    let start = interval?.start ?? 0;
    const scenes = outline.scenes.map((item, index): ReferenceAnalysis["scenes"][number] => {
        const observation = evidence.observations[item.sample];
        if (!observation) throw new Error("The outline selected an unavailable reference observation.");
        const last = index === outline.scenes.length - 1;
        const end = last ? interval?.end : item.end;
        const timing = interval ? { start, end: end ?? start } : null;
        if (timing && interval && timing.end > interval.end) throw new Error("A reference scene extends beyond the selected interval.");
        if (timing) start = timing.end;
        const { time, confidence, copy } = observation;
        const motionLandmarks = item.motion && timing && time >= timing.start && time <= timing.end
            ? [{ time, description: item.motion, confidence }] : [];
        const samples = timing ? evidence.observations.filter(({ time }) => time >= timing.start && time < timing.end) : [];
        const observed = [{ time, confidence }, ...samples.filter((sample) => sample.time !== time)]
            .slice(0, 12).sort((a, b) => a.time - b.time).map(({ time, confidence }) => ({ time, confidence }));
        return { title: item.title, supportedType: item.type, timing, timingSource: timing ? "estimated" : "still_image",
            evidence: observed, copy, confidence, palette: item.palette, shapes: [],
            motionLandmarks, easing: null, transition: null, approximation: item.approximation };
    });
    return referenceAnalysisSchema.parse({ ...evidence, scenes, unresolved: outline.unresolved });
}

export function measuredReferenceAnalysis(evidence: ReferenceEvidence): ReferenceAnalysis {
    const { interval, measured, observations } = evidence;
    const cuts = interval ? [interval.start, interval.end] : [];
    for (const { time } of [...measured.candidateCuts].sort((a, b) => b.score - a.score)) {
        if (!interval || cuts.length === 9) break;
        if (time > interval.start && time < interval.end && cuts.every((cut) => Math.abs(time - cut) >= 0.25)) cuts.push(time);
    }
    for (const time of observedSceneBoundaries(observations)) {
        if (interval && cuts.length < 9 && time > interval.start && time < interval.end &&
            cuts.every((cut) => Math.abs(cut - time) >= 0.5)) cuts.push(time);
    }
    cuts.sort((a, b) => a - b);
    const segments = interval ? cuts.slice(0, -1).map((start, index) => ({ start, end: cuts[index + 1] })) : [null];
    return expandReferenceOutline(evidence, {
        scenes: segments.map((timing, index) => {
            const midpoint = timing ? (timing.start + timing.end) / 2 : 0;
            const sample = observations.reduce((nearest, observation, i) =>
                Math.abs(observation.time - midpoint) < Math.abs(observations[nearest].time - midpoint) ? i : nearest, 0);
            return { title: timing ? `Reference segment ${index + 1}` : "Reference image", type: null,
                end: timing?.end ?? null, sample, palette: measured.palette.map(({ color }) => color), motion: null,
                approximation: "Scene type was not confirmed. Use the sampled observations and the creative brief." };
        }),
        unresolved: ["The scene outline model did not complete. Segment boundaries are estimated from measured cuts and sustained changes in observed text."],
    });
}

export async function runReferenceAnalyst(
    context: MotionAgentContext,
    evidence: ReferenceEvidence,
) {
    if (!evidence.observations.length) throw new Error("Reference analysis requires observations from the visual samples.");
    try {
        const result = await runMotionAgent({ ...context, brief: "Analyze the selected reference and group the visible evidence into scenes." },
            "referenceAnalyst", "AGENT_COMPLEX", {
            kind: evidence.kind, interval: evidence.interval,
            candidateCuts: evidence.measured.candidateCuts.map(({ time }) => Number(time.toFixed(3))),
            candidateChanges: evidence.measured.candidateChanges?.map(({ time }) => Number(time.toFixed(3))),
            observedBoundaries: observedSceneBoundaries(evidence.observations).map((time) => Number(time.toFixed(3))),
            observations: evidence.observations.map(({ time, copy, layout }, sample) => ({ sample, time: Number(time.toFixed(3)), copy, layout })),
            supportedTypes: motionComponentTypes,
        }, referenceOutlineSchema, {
            requestTimeoutMs: 20_000,
            validate: (outline) => { expandReferenceOutline(evidence, outline); },
        });
        return { ...result, source: "model" as const, value: expandReferenceOutline(evidence, result.value) };
    } catch (error) {
        context.signal.throwIfAborted();
        if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError && error.scope === "provider")) throw error;
        return { source: "measured_fallback" as const, value: measuredReferenceAnalysis(evidence) };
    }
}

export async function runMotionDirector(context: MotionAgentContext, reference: ReferenceAnalysis | null) {
    const result = await runMotionAgent(context, "director", "AGENT_COMPLEX", {
        reference,
        components: motionComponentTypes.map((type) => {
            const { name, description } = describeMotionComponent(type);
            return { type, name, description };
        }),
        audioCues: context.document.metadata.motion_cues ?? [],
        timeMap: motionTimeMap(context.document, reference?.interval ?? null),
        soundtrackRhythm: context.document.metadata.motion_audio_analysis?.rhythm,
        soundtrackSilence: context.document.metadata.motion_audio_analysis?.silence,
        speechTiming: context.speechTiming,
    }, motionStoryboardSchema, {
        validate: ({ scenes }) => {
            if (scenes.at(-1)?.end_frame !== context.document.total_frames) throw new Error("Storyboard duration is incorrect.");
            if (scenes.some(({ referenceSceneIndex }) => typeof referenceSceneIndex === "number" &&
                (!reference || referenceSceneIndex >= reference.scenes.length))) throw new Error("Storyboard points to a missing reference scene.");
        },
    });
    return reference ? { ...result, value: mapStoryboardToReference(result.value, reference, context.document) } : result;
}

export async function runMotionCopywriter(context: MotionAgentContext, storyboard: MotionStoryboard, exactCopy: readonly string[] = []) {
    const schema = motionCopySchema.extend({ scenes: z.array(copyScene.omit({ id: true }).required({ parts: true })).length(storyboard.scenes.length) });
    const literalParts = storyboard.scenes.map(({ type, copy }) => explicitCopyParts(type, copy, context.brief));
    const normalize = (scenes: z.infer<typeof schema>["scenes"]) => scenes.map(({ copy, parts }, index) => {
        const { id, type, copy: plannedCopy } = storyboard.scenes[index];
        const proposed = type === "identity" && parts.length <= 3
            ? [parts[0] || copy || plannedCopy, parts[1] ?? "", parts[2] ?? ""] : parts;
        const text = literalParts[index] ?? (validCopyParts(type, proposed) ? proposed : storyboardCopyParts(type, plannedCopy, storyboard.title));
        return { id, copy: plannedCopy || copy, parts: text };
    });
    const checkCopy = (scenes: MotionCopy["scenes"]) => {
        const copy = scenes.flatMap(({ parts }) => parts ?? []).join(" ");
        if (exactCopy.some((text) => !copy.includes(text))) throw new Error("Required copy was changed.");
        return scenes;
    };
    try {
        const result = await runMotionAgent(context, "copywriter", "WRITING", {
            storyboard, language: context.document.metadata.language, exactCopy,
        }, schema, {
            requestTimeoutMs: 15_000,
            validate: ({ scenes }) => { checkCopy(normalize(scenes)); },
        });
        return { ...result, value: { ...result.value, scenes: normalize(result.value.scenes) } };
    } catch (error) {
        context.signal.throwIfAborted();
        if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError && error.scope === "provider")) throw error;
        const scenes = checkCopy(storyboard.scenes.map(({ id, type, copy }, index) => ({ id, copy,
            parts: literalParts[index] ?? storyboardCopyParts(type, copy, storyboard.title) })));
        return { source: "storyboard_fallback" as const, value: { scenes, decision: "The copywriter did not finish. Continuing with copy from the saved storyboard and brief." } };
    }
}

function applyCopyParts(scene: MotionScene, parts: string[]) {
    switch (scene.type) {
        case "impact": return { ...scene, params: { ...scene.params, headline: parts.join("\n") } };
        case "kinetic_words": return { ...scene, params: { ...scene.params, words: parts } };
        case "easing": return { ...scene, params: { ...scene.params, heading: parts[0], labels: parts.slice(1) } };
        case "identity": return { ...scene, params: { ...scene.params, title: parts[0], detail: parts[1], tag: parts[2] } };
        default: return scene;
    }
}

type ReferenceFrame = { sceneId: string; time: number; image: MotionVisionImage; crop?: ReferenceCropBounds };

async function withReferenceFrames<T>(frames: readonly ReferenceFrame[], request: (frames: readonly ReferenceFrame[]) => Promise<T>) {
    try {
        return await request(frames);
    } catch (error) {
        if (!frames.length || (!(error instanceof MotionAgentUnavailable) &&
            !(error instanceof MotionBudgetError && error.scope === "provider"))) throw error;
        return request([]);
    }
}

const describeReferenceFrames = (frames: readonly ReferenceFrame[]) => frames.map(({ sceneId, time, crop }, index) =>
    ({ sceneId, time, crop, imageNumber: index + 1 }));

export async function runMotionDesigner(context: MotionAgentContext, storyboard: MotionStoryboard, reference: ReferenceAnalysis | null = null,
    frames: readonly ReferenceFrame[] = [], referenceSpecs: readonly ReferenceSceneSpec[] = []) {
    const schema = motionDesignSchema.extend({ scenes: z.array(designScene.omit({ id: true })).length(storyboard.scenes.length) });
    const referenceScenes = reference && storyboard.look === "reference" ? storyboard.scenes.map((scene) => ({
        id: scene.id, evidence: sceneReferenceEvidence(reference, scene, context.document),
    })) : undefined;
    const result = await withReferenceFrames(frames, (details) => runMotionAgent(context, "visualDesigner", "AGENT_COMPLEX",
        { storyboard, referenceScenes, referenceFrames: describeReferenceFrames(details), referenceSpecs }, schema,
        { images: details.map(({ image }) => image), requestTimeoutMs: details.length ? 45_000 : undefined }));
    const scenes = result.value.scenes.map((scene, index) => ({ ...scene, id: storyboard.scenes[index].id }));
    return { ...result, value: { ...result.value, scenes } };
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

function sameSceneCopy(a: MotionScene, b: MotionScene) {
    if (sceneCopy(a) !== sceneCopy(b)) return false;
    if (a.type === "kinetic_words" && b.type === "kinetic_words") return JSON.stringify(a.params.words) === JSON.stringify(b.params.words);
    if (a.type === "easing" && b.type === "easing") return JSON.stringify(a.params.labels) === JSON.stringify(b.params.labels);
    if (a.type === "identity" && b.type === "identity") return a.params.detail === b.params.detail && a.params.tag === b.params.tag;
    return true;
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
    reference: ReturnType<typeof sceneReferenceEvidence> = null,
    frames: readonly ReferenceFrame[] = [],
    referenceSpec?: ReferenceSceneSpec,
) {
    const approved = copy.scenes.find(({ id }) => id === target.id);
    const styling = design.scenes.find(({ id }) => id === target.id);
    if (!approved || !styling) throw new Error("The scene is missing its copy or design artifact.");
    const { copy: wording, parts } = approved;
    const audioCues = context.document.metadata.motion_cues?.filter(({ frame }) => frame >= target.start_frame && frame < target.end_frame - 1) ?? [];
    if (target.type === "graph") {
        const timing = { start: target.start_frame, end: target.end_frame, cueFrames: new Set(audioCues.map(({ frame }) => frame)) };
        const notes = graphSceneNotes(context.brief, wording);
        const makeScene = (params: ReturnType<typeof compileEngineerGraph>) => motionSceneSchema.parse({
            ...styling, id: target.id, type: target.type, start_frame: target.start_frame, end_frame: target.end_frame,
            componentVersion: 1, assets, params,
        });
        try {
            const result = await withReferenceFrames(frames, (details) => runMotionAgent(context, "motionEngineer", "AGENT_COMPLEX", {
                target, approvedCopy: wording, notes, palette: styling.palette, reference,
                referenceSpec,
                audioCues, soundtrackEnergyAvailable: Boolean(context.document.metadata.motion_audio_analysis),
                speechTiming: context.speechTiming?.filter(({ startFrame, endFrame }) => endFrame > target.start_frame && startFrame < target.end_frame),
                referenceFrames: describeReferenceFrames(details),
                layout: "Compose with up to 20 flat editable shapes and text layers in paint order. x and y are center coordinates from 0 to 1. Shape width, height and type size use the short canvas edge. Text maxWidth uses the canvas width. Use reveal for a staggered slide and fade, expressed as progress through the scene. Use only the palette role names for colors.",
            }, graphEngineerSchema, {
                requestTimeoutMs: 35_000,
                images: details.map(({ image }) => image),
                validate: ({ layers }) => { makeScene(compileEngineerGraph(layers, timing)); },
            }));
            const { layers, ...value } = result.value;
            return { ...result, value: { ...value, scene: makeScene(compileEngineerGraph(layers, timing)) } };
        } catch (error) {
            context.signal.throwIfAborted();
            if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError && error.scope === "provider")) throw error;
            const title = wording || target.purpose.slice(0, 180).trim();
            return { source: "graph_fallback" as const, value: {
                scene: makeScene(fallbackEngineerGraph(title, target.purpose, notes)),
                decision: "The custom scene model did not finish. Continuing with a simplified editable layout for this scene.",
                approximation: "Simplified the requested custom interface or motion using editable layers.",
            } };
        }
    }
    const buildScene = (proposal: z.infer<ReturnType<typeof motionEngineerSchema>>["scene"]) => {
        const { id, type, start_frame, end_frame } = target;
        const scene = motionSceneSchema.parse({ ...proposal, ...styling, id, type, start_frame, end_frame,
            componentVersion: 1, assets });
        const actual = sceneCopy(scene);
        if (!parts && wording && actual !== null && actual.replace(/\s+/g, " ") !== wording.replace(/\s+/g, " ")) {
            throw new Error("The scene changed the approved copy.");
        }
        return parts?.length ? motionSceneSchema.parse(applyCopyParts(scene, parts)) : scene;
    };
    const result = await withReferenceFrames(frames, (details) => runMotionAgent(context, "motionEngineer", "AGENT_COMPLEX", {
        target, approvedCopy: wording, copyParts: parts, styling, assets, component: describeMotionComponent(target.type), reference,
        referenceSpec,
        referenceFrames: describeReferenceFrames(details),
        audioCues,
        speechTiming: context.speechTiming?.filter(({ startFrame, endFrame }) => endFrame > target.start_frame && startFrame < target.end_frame),
    }, motionEngineerSchema(target.type, target.end_frame - target.start_frame), {
        validate: ({ scene }) => { buildScene(scene); },
        images: details.map(({ image }) => image),
        requestTimeoutMs: details.length ? 45_000 : undefined,
    }));
    return { ...result, value: { ...result.value, scene: buildScene(result.value.scene) } };
}

export function integrateMotionScenes(document: Document, storyboard: MotionStoryboard, builds: readonly MotionBuild[]) {
    const scenes = builds.map(({ scene }) => scene);
    requireSceneIds(storyboard, scenes);
    for (const scene of scenes) requireSceneSpan(scene, storyboard.scenes.find(({ id }) => id === scene.id)!);
    const plan = { title: storyboard.title, scenes };
    const blockers = motionDraftBlockers(scenes);
    return { plan, document: blockers.length ? null : compileMotionPlan(plan, document), blockers };
}

export function motionDraftBlockers(scenes: readonly MotionScene[]) {
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
    return blockers;
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
const visualReviewSchema = motionCritiqueSchema.extend({ issues: z.array(critiqueIssue).max(3),
    unresolved: z.array(z.string().trim().min(1).max(240)).max(3) });
export type MotionCritique = z.infer<typeof motionCritiqueSchema>;

export async function runMotionCritic(
    context: MotionAgentContext,
    draft: Document,
    preview: { frames: readonly number[]; images: readonly MotionVisionImage[]; framesPerSheet?: number },
    reference: ReferenceAnalysis | null,
    targetSceneId?: string,
    observe = (_index: number, read: () => Promise<ReferenceAnalysis["observations"]>) => read(),
) {
    const size = preview.framesPerSheet ?? motionEvidenceFramesPerSheet;
    if (!preview.frames.length || preview.frames.length > 32 ||
        preview.images.length !== Math.ceil(preview.frames.length / size) ||
        preview.frames.some((value) => !Number.isInteger(value) || value < 0 || value >= draft.total_frames)) {
        throw new Error("Visual critique requires actual rendered preview samples.");
    }
    const observations: ReferenceAnalysis["observations"] = [];
    for (const [index, image] of preview.images.entries()) {
        const offset = index * size;
        const frames = preview.frames.slice(offset, offset + size);
        if (targetSceneId && !draft.tracks.motion_graphics.some(({ id, start_frame, end_frame }) => id === targetSceneId &&
            frames.some((frame) => frame >= start_frame && frame < end_frame))) continue;
        observations.push(...await observe(index, async () => (await observeReferenceSheet([image],
            frames.map((frame) => frame / draft.fps), context.budget, context.signal, context.onProgress, true)).observations));
    }
    if (!observations.length) throw new Error("The browser preview has no samples of the scene under review.");
    const frames = observations.map(({ time, ...observation }) => ({ ...observation,
        frame: preview.frames.reduce((nearest, frame) => Math.abs(frame / draft.fps - time) < Math.abs(nearest / draft.fps - time) ? frame : nearest),
    }));
    const track = draft.tracks.audio.find(({ id }) => id === "motion-soundtrack");
    const scenes = draft.tracks.motion_graphics.filter(({ id }) => !targetSceneId || id === targetSceneId).map((scene) => {
        const { id, type, start_frame, end_frame, palette, font } = scene;
        const samples = frames.filter(({ frame }) => frame >= start_frame && frame < end_frame).map((sample) => ({
            ...sample, soundtrackLevel: soundtrackLevelAt(sample.frame, draft.fps, draft.metadata.motion_audio_analysis, track),
        }));
        const copy = scene.type === "easing" ? [scene.params.heading, ...scene.params.labels]
            : scene.type === "identity" ? [scene.params.title, scene.params.detail, scene.params.tag]
                : scene.type === "kinetic_words" ? scene.params.words : sceneCopy(scene);
        const vectorTrace = scene.type === "liquid" && scene.params.mode === "vectors" && scene.assets.some(({ kind }) => kind === "vectors");
        return { id, type, samples, palette, font, copy, vectorTrace };
    });
    const review = await runMotionAgent(context, "visualCritic", "AGENT_COMPLEX", {
        fps: draft.fps, scenes, focused: Boolean(targetSceneId),
        soundtrack: { timeMap: motionTimeMap(draft, reference?.interval ?? null).soundtrack,
            sampledCues: draft.metadata.motion_cues?.filter(({ frame }) => preview.frames.includes(frame)) ?? [],
            speechTiming: context.speechTiming },
        reference: targetSceneId ? null : reference?.scenes.map(({ supportedType, palette, motionLandmarks }) =>
            ({ supportedType, palette, motionLandmarks })) ?? null,
    }, visualReviewSchema, {
        requestTimeoutMs: 25_000,
        validate: ({ issues }) => {
            for (const { sceneId, frame } of issues) {
                if (!scenes.some(({ id, samples }) => id === sceneId && samples.some((sample) => sample.frame === frame))) {
                    throw new Error("A visual critique issue must identify observed scene evidence.");
                }
            }
        },
    });
    return { ...review, observations };
}

export async function runMotionRevision(context: MotionAgentContext, scene: MotionScene) {
    const base = motionBuildForScene(scene.type);
    const fields = base.shape.scene.shape;
    const sparse = (shape: Record<string, z.ZodType>) => z.object(Object.fromEntries(Object.entries(shape)
        .map(([key, field]) => [key, z.optional(field instanceof z.ZodDefault ? field.removeDefault() : field)]))).strict().meta({ minProperties: 1 });
    const params = fields.params instanceof z.ZodObject ? sparse(fields.params.shape) : z.record(z.string(), z.unknown());
    const patch = z.object({ params: params.optional(), palette: motionPalette.partial().optional(),
        layout: sparse(motionLayout.shape).optional(), font: fields.font.removeDefault().optional(),
        finish: sparse(fields.finish.removeDefault().shape).optional(), motionRate: fields.motionRate.removeDefault().optional(),
        transitionIn: fields.transitionIn.unwrap().nullable().optional() }).strict().meta({ minProperties: 1 });
    const schema = base.omit({ scene: true }).extend({ patch });
    const apply = (next: z.infer<typeof patch>) => {
        const { params, palette, layout, finish, transitionIn, ...fields } = next;
        const changesMode = scene.type === "liquid" && params && "mode" in params && params.mode !== scene.params.mode;
        return motionSceneSchema.parse({ ...scene, ...fields, params: changesMode ? params : { ...scene.params, ...params },
            palette: { ...scene.palette, ...palette }, layout: { ...scene.layout, ...layout }, finish: { ...scene.finish, ...finish },
            transitionIn: transitionIn === null ? undefined : transitionIn ?? scene.transitionIn });
    };
    const result = await runMotionAgent(context, "repair", "AGENT_COMPLEX", {
        task: "Return a sparse patch for this focused revision. Include only the fields explicitly requested. Leave all other fields out of the patch. Use motionRate for faster or slower movement.",
        scene, component: describeMotionComponent(scene.type),
    }, schema, {
        constrainedOutput: false,
        validate: ({ patch }) => {
            if (JSON.stringify(apply(patch)) === JSON.stringify(scene)) throw new Error("The focused edit returned no changes.");
        },
    });
    const { patch: changes, ...value } = result.value;
    return { ...result, value: { ...value, scene: apply(changes) } };
}

export function runMotionRepair(context: MotionAgentContext, scene: MotionScene, issues: readonly MotionCritique["issues"][number][]) {
    const relevant = issues.filter(({ sceneId }) => sceneId === scene.id);
    if (!relevant.length || relevant.length > 8) throw new Error("A repair needs a bounded issue for this scene.");
    return runMotionAgent(context, "repair", "AGENT_COMPLEX", {
        scene, issues: relevant, component: describeMotionComponent(scene.type),
    }, motionBuildForScene(scene.type), {
        constrainedOutput: scene.type !== "graph",
        validate: ({ scene: next }) => {
            motionSceneSchema.parse(next);
            if (next.type !== scene.type || next.id !== scene.id ||
                next.start_frame !== scene.start_frame || next.end_frame !== scene.end_frame ||
                JSON.stringify(next.assets) !== JSON.stringify(scene.assets) ||
                !sameSceneCopy(next, scene)) {
                throw new Error("The repair changed protected scene content.");
            }
        },
    });
}
