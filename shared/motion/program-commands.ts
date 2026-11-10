import { z } from "zod";
import { vectorPath } from "./graph";

export const programCommandLimit = 128;
export const programHandle = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/);
const position = { x: z.number().min(-1).max(2), y: z.number().min(-1).max(2), id: programHandle.optional() };
const box = { ...position, width: z.number().positive().max(2), height: z.number().positive().max(2) };
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
export const programCommands = z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("rect"), ...box, color }).strict(),
    z.object({ kind: z.literal("asset"), ...box, handle: programHandle }).strict(),
    z.object({ kind: z.literal("text"), ...position, color, text: z.string().max(180),
        size: z.number().min(0.015).max(0.4), maxWidth: z.number().positive().max(2) }).strict(),
    z.object({ kind: z.literal("path"), ...position, color, points: vectorPath }).strict(),
])).max(programCommandLimit).refine((commands) => commands.reduce((sum, command) =>
    sum + (command.kind === "path" ? command.points.length : 0), 0) <= 384);
export type ProgramCommand = z.infer<typeof programCommands>[number];
