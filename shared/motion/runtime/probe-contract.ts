import { z } from "zod";
import type { SceneProgramDiagnostic } from "../scene-program";
import { programHandle, type ProgramCommand } from "../program-commands";

export const probeLimits = { frames: 16, outputBytes: 24_576, deadlineMs: 5_000 } as const;
export const probeRequest = z.object({
    version: z.literal(1),
    source: z.string().min(1).max(32_768),
    frames: z.array(z.number().int().min(0).max(7199)).min(1).max(probeLimits.frames),
    fps: z.number().int().min(1).max(60),
    assetHandles: z.array(programHandle).max(16),
    program: z.object({ sourceMap: z.string().min(1).max(32_768),
        properties: z.record(programHandle, z.union([z.string().max(180), z.number().min(-10_000).max(10_000), z.boolean()])) }).strict().optional(),
}).strict().refine(({ assetHandles, source, program }) => new Set(assetHandles).size === assetHandles.length &&
    (program ? Object.keys(program.properties).length <= 12 : source.length <= 16_384));
export type ProbeRequest = z.input<typeof probeRequest>;

export type ProbeResult = {
    ok: true;
    frames: ProgramCommand[][];
    frameMs: number[];
    heapBytes: number;
} | { ok: false; reason: "input" | "startup" | "interrupted" | "execution" | "output" | "deadline"; diagnostic?: SceneProgramDiagnostic };
