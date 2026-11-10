import { z } from "zod";
import type { SceneProgramDiagnostic } from "../../../../../shared/motion/scene-program";

export const probeLimits = { frames: 16, commands: 128, outputBytes: 24_576, deadlineMs: 5_000 } as const;
const assetHandle = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/);
export const probeRequest = z.object({
    version: z.literal(1),
    source: z.string().min(1).max(32_768),
    frames: z.array(z.number().int().min(0).max(7199)).min(1).max(probeLimits.frames),
    fps: z.number().int().min(1).max(60),
    assetHandles: z.array(assetHandle).max(16),
    program: z.object({ sourceMap: z.string().min(1).max(32_768),
        properties: z.record(assetHandle, z.union([z.string().max(180), z.number().min(-10_000).max(10_000), z.boolean()])) }).strict().optional(),
}).strict().refine(({ assetHandles, source, program }) => new Set(assetHandles).size === assetHandles.length &&
    (program ? Object.keys(program.properties).length <= 12 : source.length <= 16_384));
export type ProbeRequest = z.input<typeof probeRequest>;

const box = { x: z.number().min(-1).max(2), y: z.number().min(-1).max(2),
    width: z.number().positive().max(2), height: z.number().positive().max(2), id: assetHandle.optional() };
export const probeCommands = z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("rect"), ...box, color: z.string().regex(/^#[0-9a-f]{6}$/i) }).strict(),
    z.object({ kind: z.literal("asset"), ...box, handle: assetHandle }).strict(),
])).max(probeLimits.commands);

export type ProbeResult = {
    ok: true;
    frames: z.infer<typeof probeCommands>[];
    frameMs: number[];
    heapBytes: number;
} | { ok: false; reason: "input" | "startup" | "interrupted" | "execution" | "output" | "deadline"; diagnostic?: SceneProgramDiagnostic };
