import { z } from "zod";

export const probeLimits = { frames: 16, commands: 128, outputBytes: 24_576, deadlineMs: 5_000 } as const;
const assetHandle = z.string().regex(/^[a-z][a-z0-9_-]{0,47}$/);
export const probeRequest = z.object({
    version: z.literal(1),
    source: z.string().min(1).max(16_384),
    frames: z.array(z.number().int().min(0).max(7199)).min(1).max(probeLimits.frames),
    fps: z.number().int().min(1).max(60),
    assetHandles: z.array(assetHandle).max(16),
}).strict().refine(({ assetHandles }) => new Set(assetHandles).size === assetHandles.length);
export type ProbeRequest = z.input<typeof probeRequest>;

const box = { x: z.number().min(-1).max(2), y: z.number().min(-1).max(2),
    width: z.number().positive().max(2), height: z.number().positive().max(2) };
export const probeCommands = z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("rect"), ...box, color: z.string().regex(/^#[0-9a-f]{6}$/i) }).strict(),
    z.object({ kind: z.literal("asset"), ...box, handle: assetHandle }).strict(),
])).max(probeLimits.commands);

export type ProbeResult = {
    ok: true;
    frames: z.infer<typeof probeCommands>[];
    frameMs: number[];
    heapBytes: number;
} | { ok: false; reason: "input" | "startup" | "interrupted" | "execution" | "output" | "deadline" };
