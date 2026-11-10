import { z } from "zod";
import type { Document } from "../contracts";
import { referenceAnalysisSchema, referenceIntervalSchema } from "./reference";
import { motionColor, motionSceneId } from "./schema";

export const motionEvidenceFramesPerSheet = 12;
export const motionPreviewFramesPerSheet = 6;
const evidenceImage = z.object({
    mime: z.literal("image/jpeg"),
    base64: z.base64().min(4).max(800_000),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const evidenceImages = z.array(evidenceImage).min(1).max(3);
export const captureSchema = z.object({
    bindingId: z.uuid(),
    measured: referenceAnalysisSchema.shape.measured,
    images: evidenceImages,
}).strict();
const detailSample = z.object({ sceneId: motionSceneId, time: referenceIntervalSchema.shape.start }).strict();
export const referenceDetailRequest = z.array(detailSample).min(1).max(8);
export const referenceDetailResult = z.object({
    bindingId: z.uuid(),
    samples: z.array(detailSample).max(8),
    images: z.array(evidenceImage.extend({ base64: z.base64().min(4).max(400_000) })).max(8),
}).strict().refine(({ samples, images }) => samples.length === images.length);
export const previewSchema = z.object({
    frames: z.array(z.number().int().nonnegative().max(7199)).min(1).max(32),
    framesPerSheet: z.literal(motionPreviewFramesPerSheet).optional(),
    images: z.array(evidenceImage).min(1).max(4),
}).strict();
export const traceResultSchema = z.discriminatedUnion("status", [
    z.object({ status: z.literal("traced"), bindingId: z.uuid(), assetId: z.uuid() }).strict(),
    z.object({ status: z.literal("approximation"), bindingId: z.uuid() }).strict(),
]);
export const traceRequestSchema = z.object({
    interval: referenceIntervalSchema,
    colors: z.array(motionColor).max(6),
}).strict();
export const referenceMetadata = z.object({
    kind: referenceAnalysisSchema.shape.kind,
    interval: referenceIntervalSchema.nullable(),
    width: z.number().int().positive().max(4096),
    height: z.number().int().positive().max(4096),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type BrowserMotionReference = { bindingId: string; assetId: string; url: string; metadata: z.infer<typeof referenceMetadata> };
export type BrowserMotionInput = {
    tool: "reference_capture";
    reference: BrowserMotionReference;
} | {
    tool: "reference_detail";
    reference: BrowserMotionReference;
    samples: z.infer<typeof referenceDetailRequest>;
} | ({
    tool: "trace";
    reference: BrowserMotionReference;
} & z.infer<typeof traceRequestSchema>) | {
    tool: "preview";
    document: Document;
};
export type BrowserMotionTask = {
    id: string;
    token: string;
    expectedRevision: number;
    leaseExpires: number;
    input: BrowserMotionInput;
};
