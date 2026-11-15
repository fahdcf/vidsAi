import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { compileMotionPlan, motionPlanSchema, motionSceneExceedsBudget } from "../../shared/motion/compile";
import { motionComponentTypes, describeMotionComponent } from "../../shared/motion/registry";
import { graphAssetRefs, graphAuthoring, graphCopy } from "../../shared/motion/graph";
import { motionColor, motionLayout, motionPalette, motionSceneId, motionSceneSchema, type MotionScene } from "../../shared/motion/schema";
import { referenceAnalysisSchema, type ReferenceAnalysis } from "../../shared/motion/reference";
import type { ReferenceSceneSpec } from "../../shared/motion/reference-spec";
import { motionEvidenceFramesPerSheet, type MotionPreview, type ReferenceCropBounds } from "../../shared/motion/browser-tools";
import { motionTimeMap, soundtrackLevelAt } from "../../shared/motion/time-map";
import { applyMotionEdit, motionEditParameters } from "../../shared/motion/edit";
import { resolveSceneProgramValues } from "../../shared/motion/scene-program";
import { MotionAgentUnavailable, runMotionAgent, type MotionAgentContext, type MotionVisionImage } from "./agent-call";
import { MotionBudgetError } from "./budget";
import { explicitCopyParts, storyboardCopyParts, validCopyParts } from "./copy";
import { authoredModuleProposal, compileEngineerGraph, fallbackEngineerGraph, graphEngineerSchema, graphSceneNotes, type GraphEngineerProposal } from "./graph-engineer";
import { motionGraphAssets, validateMotionAssetOwnership } from "./assets";
import { motionThreeCost } from "../../shared/motion/three-scene";
import { observeReferenceSheet } from "./reference-observer";
import { hasCompleteSceneSpecification, mapStoryboardToReference, observedSceneBoundaries, sceneReferenceEvidence } from "./reference-segments";
import { motionProgramAuthoringGuide } from "./program-examples";

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
    artDirection: z.object({
        identity: z.string().trim().min(1).max(200),
        continuity: z.string().trim().min(1).max(200),
        rhythm: z.string().trim().min(1).max(200),
        uncertainSceneId: motionSceneId.optional(),
    }).strict().optional(),
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
const unsupportedRequirements = z.array(z.string().trim().min(1).max(140)).max(4);
const componentCheck = z.object({ sceneId: motionSceneId, unsupported: unsupportedRequirements }).strict();
export const motionDesignSchema = z.object({
    scenes: z.array(designScene).min(1).max(8),
    decision: z.string().trim().min(1).max(280),
    componentChecks: z.array(componentCheck).max(8).optional(),
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
        validate: ({ scenes, artDirection }) => {
            if (scenes.at(-1)?.end_frame !== context.document.total_frames) throw new Error("Storyboard duration is incorrect.");
            if (artDirection?.uncertainSceneId && !scenes.some(({ id }) => id === artDirection.uncertainSceneId)) {
                throw new Error("The styleframe study must target a scene in this storyboard.");
            }
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

type ReferenceFrame = { sceneId: string; time: number; image: MotionVisionImage; crop?: ReferenceCropBounds; followup?: string };

async function withReferenceFrames<T>(frames: readonly ReferenceFrame[], request: (frames: readonly ReferenceFrame[]) => Promise<T>,
    structuredFirst = false) {
    try {
        return await request(structuredFirst ? [] : frames);
    } catch (error) {
        if (!frames.length || (!(error instanceof MotionAgentUnavailable) &&
            !(error instanceof MotionBudgetError && error.scope === "provider"))) throw error;
        return request(structuredFirst ? frames : []);
    }
}

const describeReferenceFrames = (frames: readonly ReferenceFrame[]) => frames.map(({ sceneId, time, crop, followup }, index) =>
    ({ sceneId, time, crop, followup, imageNumber: index + 1 }));

export async function runMotionDesigner(context: MotionAgentContext, storyboard: MotionStoryboard, reference: ReferenceAnalysis | null = null,
    frames: readonly ReferenceFrame[] = [], referenceSpecs: readonly ReferenceSceneSpec[] = []) {
    const schema = motionDesignSchema.omit({ componentChecks: true }).extend({
        scenes: z.array(designScene.omit({ id: true }).extend({ unsupported: unsupportedRequirements })).length(storyboard.scenes.length),
    });
    const referenceScenes = reference && storyboard.look === "reference" ? storyboard.scenes.map((scene) => ({
        id: scene.id, evidence: sceneReferenceEvidence(reference, scene, context.document),
    })) : undefined;
    const components = [...new Set(storyboard.scenes.map(({ type }) => type))].map((type) => {
        const { description, editable } = describeMotionComponent(type);
        return { type, description, editable };
    });
    const result = await withReferenceFrames(frames, (details) => runMotionAgent(context, "visualDesigner", "AGENT_COMPLEX",
        { storyboard, components, referenceScenes, referenceFrames: describeReferenceFrames(details), referenceSpecs }, schema,
        { images: details.map(({ image }) => image), requestTimeoutMs: details.length ? 45_000 : undefined }));
    const scenes = result.value.scenes.map(({ unsupported: _unsupported, ...scene }, index) => ({ ...scene, id: storyboard.scenes[index].id }));
    const componentChecks = result.value.scenes.map(({ unsupported }, index) => ({ sceneId: scenes[index].id, unsupported }));
    return { ...result, value: { decision: result.value.decision, scenes, componentChecks } };
}

export function resolveMotionStoryboard(storyboard: MotionStoryboard, design: MotionDesign): MotionStoryboard {
    const incompatible = new Set(design.componentChecks?.filter(({ unsupported }) => unsupported.length).map(({ sceneId }) => sceneId));
    return { ...storyboard, scenes: storyboard.scenes.map((scene) => incompatible.has(scene.id) ? { ...scene, type: "graph" } : scene) };
}

export async function reviewMotionLayout(context: MotionAgentContext, storyboard: MotionStoryboard, specs: ReferenceSceneSpec[],
    preview: Pick<MotionPreview, "frames" | "layout"> & { framesPerSheet?: number },
    rendered: MotionVisionImage[], references: readonly ReferenceFrame[]) {
    const schema = z.object({ suggestions: z.array(z.object({ sceneId: motionSceneId, revision: z.string().trim().min(1).max(220) })
        .strict()).max(8) }).strict();
    try {
        const value = await withReferenceFrames(references, (frames) => runMotionAgent(context, "visualDesigner", "AGENT_COMPLEX", {
            task: "Compare each static layout to the matching reference. Report only material changes to hierarchy, spacing, color or required content. The rectangles representing unknown objects are layout placeholders.",
            storyboard, specs, contactSheetFrames: preview.frames, samplesPerSheet: preview.framesPerSheet,
            layout: preview.layout, referenceFrames: describeReferenceFrames(frames).map((frame) => ({ ...frame, imageNumber: frame.imageNumber + rendered.length })),
        }, schema, {
            images: [...rendered, ...frames.map(({ image }) => image)].slice(0, 8),
            requestTimeoutMs: 20_000,
            validate: ({ suggestions }) => {
                if (new Set(suggestions.map(({ sceneId }) => sceneId)).size !== suggestions.length ||
                    suggestions.some(({ sceneId }) => !storyboard.scenes.some(({ id }) => id === sceneId))) throw new Error("The layout review referenced an unknown scene.");
            },
        }));
        return { value: value.value, summary: value.value.suggestions.length ? "Measured layout revisions are ready for motion authoring." : "Reviewed the representative layouts." };
    } catch (error) {
        context.signal.throwIfAborted();
        if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
        return { value: { suggestions: [] }, summary: error instanceof MotionBudgetError
            ? "Motion authoring will use the saved layout measurements so the run can preserve its remaining model budget."
            : "Layout review could not finish. Motion authoring uses the measured layout evidence." };
    }
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

function editableSceneCopy(scene: MotionScene) {
    switch (scene.type) {
        case "easing": return [scene.params.heading, ...scene.params.labels];
        case "identity": return [scene.params.title, scene.params.detail, scene.params.tag];
        case "kinetic_words": return scene.params.words;
        case "graph": {
            const program = scene.params.program;
            const values = program ? resolveSceneProgramValues(program, scene.params.programValues) : {};
            const textFields = program?.properties.filter(({ kind }) => kind === "text") ?? [];
            return [...graphCopy(scene.params.layers), ...textFields.map(({ id }) => values[id])];
        }
        default: return [sceneCopy(scene)];
    }
}

function protectedCopy(scene: MotionScene) {
    return editableSceneCopy(scene).filter((part): part is string => typeof part === "string" && part.length > 0)
        .map((part) => part.normalize("NFC")).sort();
}

function compiledWorkspaceScene(context: MotionAgentContext, role: "motionEngineer" | "repair", sceneId: string, hash: string) {
    const events = context.tools?.history(role, sceneId) ?? [];
    const compiled = events.find(({ request, result }) =>
        (request.name === "write_module" || request.name === "patch_module") &&
        (result as { buildHash?: string }).buildHash === hash);
    const rendered = events.find(({ request, result }) => request.name === "render_scene" &&
        (result as { buildHash?: string }).buildHash === hash);
    if (!compiled || !rendered) throw new Error("The referenced scene module must be compiled and rendered through this scene's tools.");
    return motionSceneSchema.parse((compiled.result as { candidate: unknown }).candidate);
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
    layoutReview?: { measurements: NonNullable<MotionPreview["layout"]>[number]; revision?: string },
    artDirection?: MotionStoryboard["artDirection"],
) {
    const approved = copy.scenes.find(({ id }) => id === target.id);
    const styling = design.scenes.find(({ id }) => id === target.id);
    if (!approved || !styling) throw new Error("The scene is missing its copy or design artifact.");
    const { copy: wording, parts } = approved;
    const requiredCapabilities = design.componentChecks?.find(({ sceneId }) => sceneId === target.id)?.unsupported;
    const needsVisualAssets = assets.length > 0 || /\b(?:3d|mesh|textur(?:e|ed|es)|procedural|contours?)\b/i.test(
        [target.purpose, ...(requiredCapabilities ?? [])].join(" "));
    const structuredFirst = Boolean(!needsVisualAssets && layoutReview?.measurements.elements.length &&
        !layoutReview.measurements.findings?.length &&
        hasCompleteSceneSpecification(referenceSpec, parts?.length ? parts : [wording]));
    const audioCues = context.document.metadata.motion_cues?.filter(({ frame }) => frame >= target.start_frame && frame < target.end_frame - 1) ?? [];
    if (target.type === "graph") {
        const timing = { start: target.start_frame, end: target.end_frame, cueFrames: new Set(audioCues.map(({ frame }) => frame)) };
        const notes = graphSceneNotes(context.brief, wording);
        const availableAssets = motionGraphAssets(context.document.project_id).map(({ id, name, kind }) => ({ id, name, kind }));
        const makeScene = (params: ReturnType<typeof compileEngineerGraph>) => {
            const used = new Map(assets.map((ref) => [ref.id, ref]));
            const textures = params.three ? motionThreeCost(params.three).textures.map((id) => ({ id, kind: "image" as const })) : [];
            for (const ref of [...graphAssetRefs(params.layers), ...textures]) {
                if (!availableAssets.some(({ id, kind }) => id === ref.id && kind === ref.kind)) throw new Error("The selected graph asset is unavailable.");
                used.set(ref.id, ref);
            }
            return motionSceneSchema.parse({ ...styling, id: target.id, type: target.type, start_frame: target.start_frame,
                end_frame: target.end_frame, componentVersion: 1, assets: [...used.values()], params });
        };
        const compile = (proposal: GraphEngineerProposal) => {
            if ("moduleBuild" in proposal) {
                const scene = compiledWorkspaceScene(context, "motionEngineer", target.id, proposal.moduleBuild);
                const required = wording.replace(/\s+/g, " ").trim();
                if (required && !editableSceneCopy(scene).join(" ").replace(/\s+/g, " ").includes(required)) {
                    throw new Error("The module changed the approved copy.");
                }
                return scene;
            }
            if (!("composition" in proposal)) return makeScene(compileEngineerGraph(proposal.layers, timing));
            const params = graphAuthoring.parse(proposal.composition);
            const required = wording.replace(/\s+/g, " ").trim();
            if (required && !graphCopy(params.layers).join(" ").replace(/\s+/g, " ").includes(required)) {
                throw new Error("The composition changed the approved copy.");
            }
            return makeScene(params);
        };
        try {
            const result = await withReferenceFrames(frames, (details) => runMotionAgent(context, "motionEngineer", "AGENT_COMPLEX", {
                target, approvedCopy: wording, notes, palette: styling.palette, reference, artDirection,
                requiredCapabilities,
                availableAssets,
                layoutReview,
                moduleAuthoring: context.tools?.available ? motionProgramAuthoringGuide(`${target.purpose} ${context.brief}`) : undefined,
                referenceSpec,
                audioCues, soundtrackEnergyAvailable: Boolean(context.document.metadata.motion_audio_analysis),
                speechTiming: context.speechTiming?.filter(({ startFrame, endFrame }) => endFrame > target.start_frame && startFrame < target.end_frame),
                referenceFrames: describeReferenceFrames(details),
                layout: "Prefer a version 1 composition with explicit property intervals. Preserve the static layout during the readable hold. Animate the specific objects and landmarks in the scene brief and reference evidence. Use a flat layers response only for simple or static layouts. Positions are normalized. Shape width, height and type size use the short canvas edge. Text maxWidth uses the canvas width. Prefer palette roles for brand colors, semantic status colors for status and #RRGGBB for exact source colors. Styled spans must concatenate to the complete layer text.",
            }, graphEngineerSchema, {
                requestTimeoutMs: 35_000,
                sceneId: target.id,
                images: details.map(({ image }) => image),
                validate: (proposal) => { compile(proposal); },
            }), structuredFirst);
            const { decision, approximation } = result.value;
            return { ...result, value: { decision, approximation, scene: compile(result.value) } };
        } catch (error) {
            context.signal.throwIfAborted();
            if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
            const title = wording || target.purpose.slice(0, 180).trim();
            return { source: "graph_fallback" as const, value: {
                scene: makeScene(fallbackEngineerGraph(title, target.purpose, notes)),
                decision: "The custom scene model did not finish. Continuing with a simplified editable layout for this scene.",
                approximation: "The saved scene uses simplified editable layers. The requested composition or motion still needs review.",
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
    try {
        const result = await withReferenceFrames(frames, (details) => runMotionAgent(context, "motionEngineer", "AGENT_COMPLEX", {
            target, approvedCopy: wording, copyParts: parts, styling, assets, component: describeMotionComponent(target.type), reference, artDirection,
            referenceSpec,
            layoutReview,
            referenceFrames: describeReferenceFrames(details),
            audioCues,
            speechTiming: context.speechTiming?.filter(({ startFrame, endFrame }) => endFrame > target.start_frame && startFrame < target.end_frame),
        }, motionEngineerSchema(target.type, target.end_frame - target.start_frame), {
            validate: ({ scene }) => { buildScene(scene); },
            sceneId: target.id,
            images: details.map(({ image }) => image),
            requestTimeoutMs: details.length ? 45_000 : undefined,
        }), structuredFirst);
        return { ...result, value: { ...result.value, scene: buildScene(result.value.scene) } };
    } catch (error) {
        context.signal.throwIfAborted();
        if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
        const { id, type, start_frame, end_frame } = target;
        const fallback = motionSceneSchema.parse({ ...styling, id, type, start_frame, end_frame, assets, componentVersion: 1,
            params: describeMotionComponent(type).defaults });
        const selected = parts && validCopyParts(type, parts) ? parts
            : storyboardCopyParts(type, wording, context.brief.trim().slice(0, 140));
        return { source: "component_fallback" as const, value: {
            scene: motionSceneSchema.parse(applyCopyParts(fallback, selected)),
            decision: "Saved an editable component approximation because the scene model did not complete.",
            approximation: "This scene uses component defaults with the approved copy. Its custom motion still needs review.",
        } };
    }
}

export function integrateMotionScenes(document: Document, storyboard: MotionStoryboard, builds: readonly z.infer<typeof motionRepairSchema>[]) {
    let scenes = builds.map(({ scene }) => scene);
    requireSceneIds(storyboard, scenes);
    for (const scene of scenes) requireSceneSpan(scene, storyboard.scenes.find(({ id }) => id === scene.id)!);
    const cuts = builds.flatMap(({ scene, cut }) => cut ? [{ scene, cut }] : []);
    if (cuts.length > 1) throw new Error("Only one timing repair may be applied per review round.");
    for (const { scene, cut } of cuts) scenes = applyMotionRepairCut(document, scenes, scene.id, cut);
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
    evidence: z.string().regex(/^(?:generated|reference):\d+(?::\d+)?$/).optional(),
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
    repairs: z.array(z.object({ issueIndex: z.number().int().min(0).max(7), evidence: critiqueIssue.shape.evidence.unwrap(),
        outcome: z.enum(["improved", "unchanged", "regressed", "uncertain"]) }).strict()).max(8).optional(),
}).strict();
const visualReviewSchema = motionCritiqueSchema.extend({ issues: z.array(critiqueIssue).max(3),
    unresolved: z.array(z.string().trim().min(1).max(240)).max(3) });
export type MotionCritique = z.infer<typeof motionCritiqueSchema>;

export async function runMotionCritic(
    context: MotionAgentContext,
    draft: Document,
    preview: { frames: readonly number[]; images: readonly MotionVisionImage[]; framesPerSheet?: number; layout?: MotionPreview["layout"];
        sceneChecks?: Pick<NonNullable<MotionPreview["layout"]>[number], "sceneId" | "frame" | "findings">[] },
    reference: ReferenceAnalysis | null,
    targetSceneId?: string,
    observe = (_index: number, read: () => Promise<ReferenceAnalysis["observations"]>) => read(),
    referenceFrames: readonly ReferenceFrame[] = [],
    specs: readonly ReferenceSceneSpec[] = [],
    previous?: { issues: MotionCritique["issues"]; preview: Pick<MotionPreview, "frames" | "framesPerSheet">;
        images: MotionVisionImage[] },
) {
    const size = preview.framesPerSheet ?? motionEvidenceFramesPerSheet;
    if (!preview.frames.length || preview.frames.length > 32 ||
        preview.images.length !== Math.ceil(preview.frames.length / size) ||
        preview.frames.some((value) => !Number.isInteger(value) || value < 0 || value >= draft.total_frames)) {
        throw new Error("Visual critique requires actual rendered preview samples.");
    }
    const observations: ReferenceAnalysis["observations"] = [];
    const sheets: { image: MotionVisionImage; tiles: { evidence: string; frame: number; seconds: number; sceneIds: string[] }[] }[] = [];
    for (const [index, image] of preview.images.entries()) {
        const offset = index * size;
        const frames = preview.frames.slice(offset, offset + size);
        if (targetSceneId && !draft.tracks.motion_graphics.some(({ id, start_frame, end_frame }) => id === targetSceneId &&
            frames.some((frame) => frame >= start_frame && frame < end_frame))) continue;
        sheets.push({ image, tiles: frames.map((frame, tile) => ({
            evidence: `generated:${sheets.length + 1}:${tile + 1}`, frame, seconds: frame / draft.fps,
            sceneIds: draft.tracks.motion_graphics.filter(({ id, start_frame, end_frame }) =>
                (!targetSceneId || id === targetSceneId) && frame >= start_frame && frame < end_frame).map(({ id }) => id),
        })) });
        try {
            observations.push(...await observe(index, async () => (await observeReferenceSheet([image],
                frames.map((frame) => frame / draft.fps), context.budget, context.signal, context.onProgress, true)).observations));
        } catch (error) {
            context.signal.throwIfAborted();
            if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
        }
    }
    if (!sheets.length) throw new Error("The browser preview has no samples of the scene under review.");
    const tiles = sheets.flatMap((sheet) => sheet.tiles);
    const sources = referenceFrames.filter(({ crop, sceneId }) => !crop &&
        tiles.some(({ sceneIds }) => sceneIds.includes(sceneId)))
        .filter((sample, index, all) => all.findIndex(({ sceneId }) => sceneId === sample.sceneId) === index)
        .slice(0, Math.max(0, 8 - sheets.length - (previous?.images.length ?? 0)));
    const referenceImages = sources.map(({ sceneId, time }, index) => ({
        sceneId, sourceSeconds: time, imageNumber: sheets.length + index + 1, evidence: `reference:${sheets.length + index + 1}`,
        pairedGenerated: tiles.filter(({ sceneIds }) => sceneIds.includes(sceneId)).map(({ evidence }) => evidence),
    }));
    const track = draft.tracks.audio.find(({ id }) => id === "motion-soundtrack");
    const scenes = draft.tracks.motion_graphics.filter(({ id }) => !targetSceneId || id === targetSceneId).map((scene) => {
        const { id, type, start_frame, end_frame, palette, font } = scene;
        const samples = tiles.filter(({ sceneIds }) => sceneIds.includes(id)).map(({ evidence, frame, seconds }) => ({
            evidence, frame, seconds, observation: observations.find(({ time }) => Math.abs(time - seconds) < 0.5 / draft.fps),
            soundtrackLevel: soundtrackLevelAt(frame, draft.fps, draft.metadata.motion_audio_analysis, track),
        }));
        const copy = editableSceneCopy(scene);
        const vectorTrace = scene.type === "liquid" && scene.params.mode === "vectors" && scene.assets.some(({ kind }) => kind === "vectors");
        const layout = preview.layout?.filter(({ sceneId }) => sceneId === id);
        const nodes = scene.type === "graph" ? [...scene.params.layers] : [];
        for (const node of nodes) if (node.kind === "group") nodes.push(...node.children);
        const intervals = nodes.flatMap((node) => (node.animation ?? []).map((track) => ({ id: node.id, ...track }))).slice(0, 16);
        const objects = nodes.slice(0, 32).map((node) => ({ id: node.id, kind: node.kind,
            text: node.kind === "text" ? node.text : node.kind === "widget" ? node.label : undefined }));
        const sceneChecks = preview.sceneChecks?.filter(({ sceneId }) => sceneId === id);
        return { id, type, start_frame, end_frame, samples, palette, font, copy, vectorTrace, layout, intervals, objects,
            sourceObjects: specs.find(({ sceneId }) => sceneId === id)?.objects, sceneChecks };
    });
    const priorIssues = previous?.issues.map(({ sceneId, issue, repair }, issueIndex) => ({ issueIndex, sceneId, issue, repair }));
    const previousSheets = previous?.images.slice(0, 8 - sheets.length - sources.length).map((image, index) => {
        const size = previous.preview.framesPerSheet ?? motionEvidenceFramesPerSheet;
        return { image, imageNumber: sheets.length + sources.length + index + 1,
            frames: previous.preview.frames.slice(index * size, (index + 1) * size) };
    }) ?? [];
    const reviewSchema = visualReviewSchema.extend({ issues: z.array(critiqueIssue.required({ evidence: true })).max(3) });
    const review = await runMotionAgent(context, "visualCritic", "MEDIA_UNDERSTANDING", {
        fps: draft.fps, scenes, focused: Boolean(targetSceneId),
        generatedSheets: sheets.map(({ tiles }, index) => ({ imageNumber: index + 1, tiles })),
        referenceImages,
        priorIssues,
        previousSheets: previousSheets.map(({ imageNumber, frames }) => ({ imageNumber, frames })),
        soundtrack: { timeMap: motionTimeMap(draft, reference?.interval ?? null).soundtrack,
            sampledCues: draft.metadata.motion_cues?.filter(({ frame }) => preview.frames.includes(frame)) ?? [],
            speechTiming: context.speechTiming },
        reference: targetSceneId ? null : reference?.scenes.map(({ supportedType, palette, motionLandmarks }) =>
            ({ supportedType, palette, motionLandmarks })) ?? null,
    }, priorIssues?.length ? reviewSchema.required({ repairs: true }) : reviewSchema, {
        images: [...sheets.map(({ image }) => image), ...sources.map(({ image }) => image), ...previousSheets.map(({ image }) => image)],
        requestTimeoutMs: 25_000,
        validate: ({ issues, repairs }) => {
            for (const { sceneId, frame, evidence } of issues) {
                if (!tiles.some((tile) => tile.frame === frame && tile.evidence === evidence && tile.sceneIds.includes(sceneId))) {
                    throw new Error("A visual critique issue must identify observed scene evidence.");
                }
            }
            if (priorIssues?.length && (repairs?.length !== priorIssues.length || !priorIssues.every(({ issueIndex, sceneId }) =>
                repairs.some((repair) => repair.issueIndex === issueIndex &&
                    tiles.some((tile) => tile.evidence === repair.evidence && tile.sceneIds.includes(sceneId)))))) {
                throw new Error("Every prior issue needs a distinct repair verdict and a cited tile for the assigned scene.");
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

export const motionRepairSchema = motionBuildSchema.extend({
    cut: motionEditParameters.set_motion_cut.optional(),
});

export function applyMotionRepairCut(document: Document, scenes: MotionScene[], owner: string, cut: z.infer<typeof motionEditParameters.set_motion_cut>) {
    const index = scenes.findIndex(({ id }) => id === owner);
    const scene = scenes[index];
    const next = scenes[index + 1];
    if (cut.id !== owner || !scene || !next || next.start_frame !== scene.end_frame ||
        scenes.filter(({ start_frame }) => start_frame === scene.end_frame).length !== 1 || cut.frame === scene.end_frame) {
        throw new Error("A timing repair must move the boundary shared by the assigned scene and its next scene.");
    }
    const candidate = { ...document, tracks: { ...document.tracks, motion_graphics: structuredClone(scenes) } };
    applyMotionEdit(candidate, { tool: "set_motion_cut", params: cut });
    const plan = { title: "Timing repair", scenes: candidate.tracks.motion_graphics };
    return compileMotionPlan(plan, candidate).tracks.motion_graphics;
}

export async function runMotionRepair(context: MotionAgentContext, scene: MotionScene, issues: readonly MotionCritique["issues"][number][],
    timeline?: { scenes: MotionScene[]; allowCuts: boolean }) {
    const relevant = issues.filter(({ sceneId }) => sceneId === scene.id);
    if (!relevant.length || relevant.length > 8) throw new Error("A repair needs a bounded issue for this scene.");
    const text = protectedCopy(scene);
    const nextScene = timeline?.allowCuts ? timeline.scenes.find(({ start_frame }) => start_frame === scene.end_frame) : undefined;
    const schema = z.union([nextScene ? motionRepairSchema : motionBuildSchema, authoredModuleProposal]);
    const resolve = (value: z.infer<typeof schema>): z.infer<typeof motionRepairSchema> => {
        if (!("moduleBuild" in value)) return value;
        const { moduleBuild, ...rest } = value;
        return { ...rest, scene: compiledWorkspaceScene(context, "repair", scene.id, moduleBuild) };
    };
    const result = await runMotionAgent(context, "repair", "AGENT_COMPLEX", {
        scene, issues: relevant, protectedCopy: text, component: describeMotionComponent(scene.type),
        replacementComponents: describeMotionComponent("graph"),
        availableCut: nextScene && { id: scene.id, current: scene.end_frame, first: scene.start_frame + 1, last: nextScene.end_frame - 1 },
    }, schema, {
        constrainedOutput: false,
        sceneId: scene.id,
        validate: (proposal) => {
            const { scene: next, cut } = resolve(proposal);
            if ((next.type !== scene.type && next.type !== "graph") || next.id !== scene.id ||
                next.layer !== scene.layer ||
                next.start_frame !== scene.start_frame || next.end_frame !== scene.end_frame ||
                JSON.stringify(next.assets) !== JSON.stringify(scene.assets) ||
                JSON.stringify(protectedCopy(next)) !== JSON.stringify(text)) {
                throw new Error("The repair changed protected scene content.");
            }
            const priorProgram = scene.type === "graph" ? scene.params.program : undefined;
            const nextProgram = next.type === "graph" ? next.params.program : undefined;
            if (!("moduleBuild" in proposal) && JSON.stringify(priorProgram) !== JSON.stringify(nextProgram)) {
                throw new Error("Use a compiled and browser-tested workspace module to change procedural code.");
            }
            if (timeline) {
                const scenes = timeline.scenes.map((item) => item.id === next.id ? next : item);
                if (cut && nextScene) applyMotionRepairCut(context.document, scenes, scene.id, cut);
                else motionPlanSchema.shape.scenes.parse(scenes);
            }
            validateMotionAssetOwnership(Number(context.document.project_id),
                { ...context.document, tracks: { ...context.document.tracks, motion_graphics: [next] } });
        },
    });
    return { ...result, value: resolve(result.value) };
}
