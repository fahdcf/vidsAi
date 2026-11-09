import { z } from "zod";
import type { Document } from "../contracts";
import { referenceAnalysisSchema, referenceIntervalSchema } from "./reference";

export const evidenceImages = z.array(z.object({
    mime: z.literal("image/jpeg"),
    base64: z.base64().min(4).max(800_000),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()).min(1).max(3);
export const captureSchema = z.object({
    bindingId: z.uuid(),
    measured: referenceAnalysisSchema.shape.measured,
    images: evidenceImages,
}).strict();
export const previewSchema = z.object({
    frames: z.array(z.number().int().nonnegative().max(7199)).min(1).max(32),
    images: evidenceImages,
}).strict();
export const referenceMetadata = z.object({
    kind: referenceAnalysisSchema.shape.kind,
    interval: referenceIntervalSchema.nullable(),
    width: z.number().int().positive().max(4096),
    height: z.number().int().positive().max(4096),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type BrowserMotionInput = {
    tool: "reference_capture";
    reference: { bindingId: string; url: string; metadata: z.infer<typeof referenceMetadata> };
} | {
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
