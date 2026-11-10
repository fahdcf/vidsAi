import { z } from "zod";
import { clamp, easeOut, lerp, smooth } from "./draw";

const properties = ["x", "y", "scale", "rotation", "opacity", "reveal", "draw", "textReveal", "deform"] as const;
const limits: Record<typeof properties[number], readonly [number, number]> = {
    x: [-2, 3], y: [-2, 3], scale: [0, 8], rotation: [-1440, 1440], opacity: [0, 1],
    reveal: [0, 1], draw: [0, 1], textReveal: [0, 1], deform: [0, 0.25],
};
const time = z.number().min(0).max(1);
export const graphAnimation = z.array(z.object({
    property: z.enum(properties), start: time, end: time, from: z.number(), to: z.number(),
    ease: z.enum(["linear", "ease_in", "ease_out", "smooth", "spring", "hold"]).default("linear"),
}).strict()).max(20).superRefine((tracks, context) => {
    const ends = new Map<string, number>();
    for (const [index, { property, start, end, from, to }] of tracks.entries()) {
        const [min, max] = limits[property];
        if (start >= end || start < (ends.get(property) ?? 0) || from < min || from > max || to < min || to > max) {
            context.addIssue({ code: "custom", path: [index], message: "Use bounded values and ordered, non-overlapping intervals for each property." });
        }
        ends.set(property, end);
    }
});

type Tracks = z.infer<typeof graphAnimation>;
function easing(value: number, ease: Tracks[number]["ease"]) {
    switch (ease) {
        case "ease_in": return value ** 3;
        case "ease_out": return easeOut(value);
        case "smooth": return smooth(value);
        case "spring": return value === 1 ? 1 : 1 - Math.exp(-8 * value) * Math.cos(12 * value);
        case "hold": return value === 1 ? 1 : 0;
        default: return value;
    }
}

export function sampleGraphAnimation(tracks: Tracks | undefined, progress: number) {
    const result: Partial<Record<typeof properties[number], number>> = {};
    for (const { property, start, end, from, to, ease } of tracks ?? []) {
        if (progress < start) { result[property] ??= from; continue; }
        const [min, max] = limits[property];
        result[property] = clamp(lerp(from, to, easing(clamp((progress - start) / (end - start)), ease)), min, max);
    }
    return result;
}
