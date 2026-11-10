import { z } from "zod";
import { motionComponentTypes } from "./registry";
import { motionColor } from "./schema";

const time = z.number().min(0).max(30.001);
const confidence = z.number().min(0).max(1);
const text = z.string().trim().min(1).max(260);
const position = z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
}).strict();
export const referenceIntervalSchema = z.object({ start: time, end: time }).strict()
    .refine(({ start, end }) => end > start, "Reference end must follow its start.");
export const referenceFrameObservation = z.object({
    time, copy: z.string().trim().max(180).nullable(),
    layout: z.string().trim().min(1).max(240), confidence,
}).strict();
const evidence = z.object({ time, confidence }).strict();
const measuredChange = z.object({ time, score: confidence, before: time, after: time }).strict();
const scene = z.object({
    title: z.string().trim().min(1).max(100),
    timing: referenceIntervalSchema.nullable(),
    timingSource: z.enum(["estimated", "still_image"]),
    copy: z.string().trim().max(180).nullable(),
    palette: z.array(motionColor).max(6),
    shapes: z.array(z.object({ description: text, center: position, confidence }).strict()).max(10),
    motionLandmarks: z.array(z.object({ time, description: text, confidence }).strict()).max(8),
    easing: text.nullable(),
    transition: text.nullable(),
    evidence: z.array(evidence).min(1).max(12),
    supportedType: z.enum(motionComponentTypes).nullable(),
    approximation: text.nullable(),
    confidence,
}).strict().superRefine((item, ctx) => {
    if (item.supportedType === null && item.approximation === null) {
        ctx.addIssue({ code: "custom", message: "An unsupported scene needs an explicit approximation." });
    }
    if (item.timingSource === "still_image" && (item.timing || item.motionLandmarks.length || item.easing || item.transition)) {
        ctx.addIssue({ code: "custom", message: "A still image cannot establish movement or timing." });
    }
    if (item.timingSource === "estimated" && (!item.timing || item.motionLandmarks.some((landmark) =>
        landmark.time < item.timing!.start || landmark.time > item.timing!.end))) {
        ctx.addIssue({ code: "custom", message: "Motion landmarks must remain within estimated scene timing." });
    }
});

export const referenceAnalysisSchema = z.object({
    kind: z.enum(["image", "video"]),
    interval: referenceIntervalSchema.nullable(),
    measured: z.object({
        timestamps: z.array(time).min(1).max(32),
        palette: z.array(z.object({ color: motionColor, weight: confidence }).strict()).max(6),
        candidateCuts: z.array(measuredChange).max(8),
        candidateChanges: z.array(measuredChange).max(8).optional(),
    }).strict(),
    observations: z.array(referenceFrameObservation).max(32),
    scenes: z.array(scene).min(1).max(8),
    unresolved: z.array(text).max(8),
}).strict().superRefine((analysis, ctx) => {
    const { kind, interval, scenes, measured } = analysis;
    const still = kind === "image";
    const intervalMatches = still ? !interval : Boolean(interval);
    const supportedTiming = scenes.every((item) => still
        ? item.timingSource === "still_image"
        : item.timingSource === "estimated" && item.timing !== null);
    if (!intervalMatches || !supportedTiming) {
        ctx.addIssue({ code: "custom", message: "Scene timing does not match the reference media type." });
    }
    if (interval) {
        let boundary = interval.start;
        for (const item of scenes) {
            if (!item.timing || Math.abs(item.timing.start - boundary) > 0.035) {
                ctx.addIssue({ code: "custom", message: "Estimated scenes must cover the selected reference interval in order." });
                return;
            }
            boundary = item.timing.end;
        }
        if (Math.abs(boundary - interval.end) > 0.035) {
            ctx.addIssue({ code: "custom", message: "Estimated scenes must end at the selected reference boundary." });
        }
    }
    for (const observation of [...analysis.observations, ...scenes.flatMap((item) => item.evidence)]) {
        if (!measured.timestamps.some((timestamp) => Math.abs(timestamp - observation.time) <= 0.035)) {
            ctx.addIssue({ code: "custom", message: "An observation references a frame that was not sampled." });
            break;
        }
    }
});

export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>;
