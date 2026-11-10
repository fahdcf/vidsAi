import { z } from "zod";

export const motionProgramVersion = 1;
export const motionCompilerVersion = "5.8.2";
export const motionSdkModule = "@vidsai/motion-sdk";
const identifier = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/);
const field = { id: identifier, label: z.string().trim().min(1).max(60) };
const numeric = z.number().min(-10_000).max(10_000);
const property = z.discriminatedUnion("kind", [
    z.object({ ...field, kind: z.literal("number"), min: numeric, max: numeric, default: numeric }).strict()
        .refine((item) => item.min <= item.default && item.default <= item.max),
    z.object({ ...field, kind: z.literal("text"), default: z.string().max(180) }).strict(),
    z.object({ ...field, kind: z.literal("color"), default: z.string().regex(/^#[a-f0-9]{6}$/i) }).strict(),
    z.object({ ...field, kind: z.literal("toggle"), default: z.boolean() }).strict(),
]);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
export const sceneProgramInput = z.object({
    version: z.literal(motionProgramVersion),
    source: z.string().min(1).max(16_384),
    properties: z.array(property).max(12),
    assets: z.array(z.object({ handle: identifier, id: z.uuid(), kind: z.enum(["image", "vectors"]) }).strict()).max(4),
}).strict().superRefine(({ properties, assets }, ctx) => {
    if (new Set(properties.map(({ id }) => id)).size !== properties.length ||
        new Set(assets.map(({ handle }) => handle)).size !== assets.length) {
        ctx.addIssue({ code: "custom", message: "Property IDs and asset handles must be unique." });
    }
});
export const sceneProgram = sceneProgramInput.safeExtend({
    compiler: z.literal(motionCompilerVersion),
    rendererVersion: z.literal(1),
    dependencies: z.tuple([z.literal(`${motionSdkModule}@1`)]),
    code: z.string().min(1).max(32_768),
    sourceMap: z.string().min(1).max(32_768),
    buildHash: sha256,
}).strict();
export type SceneProgramInput = z.infer<typeof sceneProgramInput>;
export type SceneProgram = z.infer<typeof sceneProgram>;
export type SceneProgramDiagnostic = {
    phase: "compiler" | "runtime";
    code: string;
    message: string;
    file: "scene.ts";
    line: number;
    column: number;
};
