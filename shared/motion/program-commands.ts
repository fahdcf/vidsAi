import { z } from "zod";
import { vectorPath } from "./graph";

export const programCommandLimit = 128;
export const programHandle = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const position = { x: z.number().min(-1).max(2), y: z.number().min(-1).max(2), id: programHandle.optional(), mask: vectorPath.optional() };
const box = { ...position, width: z.number().positive().max(2), height: z.number().positive().max(2) };
const axis = z.number().min(-2).max(2);
const gradient = z.object({ x0: axis, y0: axis, x1: axis, y1: axis, stops: z.array(z.object({ at: z.number().min(0).max(1), color }).strict()).min(2).max(6) })
    .strict().refine(({ x0, x1, y0, y1, stops }) => (x0 !== x1 || y0 !== y1) && stops.every(({ at }, i) => i === 0 || at > stops[i - 1].at));
const paint = { color, gradient: gradient.optional() };
export const programCommands = z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("rect"), ...box, ...paint }).strict(),
    z.object({ kind: z.literal("asset"), ...box, handle: programHandle }).strict(),
    z.object({ kind: z.literal("text"), ...position, ...paint, text: z.string().max(180),
        size: z.number().min(0.015).max(0.4), maxWidth: z.number().positive().max(2) }).strict(),
    z.object({ kind: z.literal("path"), ...position, ...paint, points: vectorPath }).strict(),
])).max(programCommandLimit).refine((commands) => commands.reduce((sum, command) =>
    sum + (command.mask?.length ?? 0) + (command.kind === "path" ? command.points.length : 0), 0) <= 384 &&
    commands.filter((command) => command.mask || "gradient" in command && command.gradient).length <= 12);
export type ProgramCommand = z.infer<typeof programCommands>[number];
