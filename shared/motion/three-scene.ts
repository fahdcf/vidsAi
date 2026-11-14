import { z } from "zod";

export const motionThreeCapability = { version: 1, engine: "three@0.182.0", api: "WebGL2", maxMeshes: 8,
    maxTriangles: 6000, maxTextures: 2, maxTextureEdge: 512, maxTargetEdge: 640 } as const;
const axis = z.number().min(-16).max(16);
const point = z.tuple([axis, axis, axis]);
const degrees = z.number().min(-1440).max(1440);
const turn = z.number().min(-3).max(3);
const color = z.string().regex(/^#[a-f0-9]{6}$/i);
const scale = z.number().min(0.01).max(8);
const uv = z.number().min(0).max(1);
const mesh = z.object({ kind: z.literal("mesh"), positions: z.array(axis).min(9).max(2304),
    indices: z.array(z.number().int().nonnegative()).min(3).max(3072), uv: z.array(uv).max(1536).optional(),
}).strict().refine(({ positions, indices, uv }) => positions.length % 3 === 0 && indices.length % 3 === 0 &&
    indices.every((index) => index < positions.length / 3) && (!uv || uv.length === positions.length / 3 * 2), "Invalid mesh buffers.");
const shape = z.discriminatedUnion("kind", [z.object({ kind: z.literal("box") }).strict(),
    z.object({ kind: z.literal("sphere"), segments: z.number().int().min(8).max(24).default(16) }).strict(), mesh]);
const object = z.object({ id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/), shape, position: point.default([0, 0, 0]),
    rotation: z.tuple([degrees, degrees, degrees]).default([0, 0, 0]), spin: z.tuple([turn, turn, turn]).default([0, 0, 0]),
    scale: z.tuple([scale, scale, scale]).default([1, 1, 1]),
    material: z.object({ color, roughness: z.number().min(0.15).max(1).default(0.7),
        metalness: z.number().min(0).max(0.75).default(0), textureId: z.uuid().optional() }).strict(),
}).strict().refine(({ shape, material }) => !material.textureId || shape.kind !== "mesh" || Boolean(shape.uv), "Textured meshes need UV coordinates.");
const camera = z.object({ position: point, target: point.default([0, 0, 0]), fov: z.number().min(20).max(80).default(45) })
    .strict().refine(({ position, target }) => position.some((axis, i) => axis !== target[i]));
const light = z.object({ color, intensity: z.number().min(0).max(5) }).strict();
const rawScene = z.object({ version: z.literal(motionThreeCapability.version), camera,
    ambient: light, keyLight: light.extend({ position: point }), objects: z.array(object).min(1).max(motionThreeCapability.maxMeshes),
}).strict();

export function motionThreeCost({ objects }: z.infer<typeof rawScene>) {
    const triangles = objects.reduce((count, { shape }) => count + (shape.kind === "mesh" ? shape.indices.length / 3
        : shape.kind === "sphere" ? 2 * shape.segments * shape.segments : 12), 0);
    const textures = [...new Set(objects.flatMap(({ material }) => material.textureId ? [material.textureId] : []))];
    return { triangles, textures, texturePixels: textures.length * motionThreeCapability.maxTextureEdge ** 2,
        targetPixels: motionThreeCapability.maxTargetEdge ** 2 };
}
export const motionThreeScene = rawScene.superRefine((scene, context) => {
    const cost = motionThreeCost(scene);
    if (cost.triangles > motionThreeCapability.maxTriangles || cost.textures.length > motionThreeCapability.maxTextures ||
        new Set(scene.objects.map(({ id }) => id)).size !== scene.objects.length) {
        context.addIssue({ code: "custom", message: "The 3D scene exceeds its mesh or texture budget or repeats an object ID." });
    }
});
export type MotionThreeScene = z.infer<typeof motionThreeScene>;
