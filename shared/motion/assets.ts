import { z } from "zod";
import { vectorPath } from "./graph";
import { graphColor } from "./graph-style";

export const motionAssetKind = z.enum(["font", "image", "vectors", "audio"]);
export type MotionAssetKind = z.infer<typeof motionAssetKind>;
export const motionAssetByteLimit: Record<MotionAssetKind, number> = {
    font: 2 * 1024 * 1024,
    image: 4 * 1024 * 1024,
    vectors: 2 * 1024 * 1024,
    audio: 10 * 1024 * 1024,
};
export const referenceAudioConversionVersion = 1;
export const motionAssetProvenance = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("imported") }).strict(),
    z.object({ kind: z.literal("generated") }).strict(),
    z.object({
        kind: z.literal("reference_derived"),
        sourceId: z.uuid(),
        startSeconds: z.number().min(0).max(30),
        endSeconds: z.number().min(0).max(30),
        audioExtraction: z.object({ sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), trackId: z.number().int().nonnegative(),
            conversionVersion: z.literal(referenceAudioConversionVersion),
        }).strict().optional(),
    }).strict().refine((value) => value.endSeconds > value.startSeconds),
]);
const vectorFrame = z.object({
    at: z.number().min(0).max(1),
    shapes: z.array(z.object({
        path: vectorPath,
        fill: graphColor,
        opacity: z.number().min(0).max(1).default(1),
    }).strict()).min(1).max(8),
}).strict();
export const motionVectorAsset = z.object({
    version: z.literal(1),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    interpolate: z.boolean().default(true),
    frames: z.array(vectorFrame).min(1).max(180),
}).strict().superRefine(({ frames }, ctx) => {
    let total = 0;
    for (const [index, frame] of frames.entries()) {
        const count = frame.shapes.reduce((sum, shape) => sum + shape.path.length, 0);
        total += count;
        if (count > 384 || total > 32_000 || (index > 0 && frames[index - 1].at >= frame.at)) {
            ctx.addIssue({ code: "custom", path: ["frames", index], message: "Vector path budget or frame order is invalid." });
            break;
        }
    }
});
export type MotionVectors = z.infer<typeof motionVectorAsset>;
export type MotionAssetFiles = Readonly<Record<string,
    { kind: "font" | "image"; file: Blob } | { kind: "vectors"; data: MotionVectors }
>>;

export function parseMotionVectors(text: string): MotionVectors {
    try {
        return motionVectorAsset.parse(JSON.parse(text));
    } catch {
        throw new Error("The motion vector asset is invalid.");
    }
}
