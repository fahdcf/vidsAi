import { z } from "zod";
import { motionComponentParams } from "../../shared/motion/schema";

const color = z.enum(["background", "foreground", "primary", "accent", "muted"]);
const placement = {
    x: z.number().min(0).max(1), y: z.number().min(0).max(1), color,
    reveal: z.number().min(0).max(0.8).optional(),
    audioCueFrame: z.number().int().min(0).max(7200).optional(),
};
const box = { width: z.number().min(0.001).max(1.8), height: z.number().min(0.001).max(1) };
const text = z.object({ ...placement, kind: z.literal("text"), text: z.string().trim().min(1).max(180),
    size: z.number().min(0.015).max(0.28), maxWidth: z.number().min(0.08).max(0.92) }).strict();
const rect = z.object({ ...placement, ...box, kind: z.literal("rect"), radius: z.number().min(0).max(0.15).optional(),
    audioReactive: z.boolean().optional() }).strict();
const ellipse = z.object({ ...placement, ...box, kind: z.literal("ellipse") }).strict();
const layer = z.discriminatedUnion("kind", [text, rect, ellipse]);
type Layer = z.infer<typeof layer>;

export const graphEngineerSchema = z.object({
    layers: z.array(layer).min(1).max(20),
    decision: z.string().trim().min(1).max(280),
    approximation: z.string().trim().min(1).max(240).nullable(),
}).strict();

export function compileEngineerGraph(layers: readonly Layer[], timing?: { start: number; end: number; cueFrames: ReadonlySet<number> }) {
    return motionComponentParams.graph.parse({ layers: layers.map(({ x, y, reveal, audioCueFrame, ...shape }, index) => {
        if (audioCueFrame !== undefined) {
            if (!timing || reveal !== undefined || !timing.cueFrames.has(audioCueFrame) ||
                audioCueFrame < timing.start || audioCueFrame >= timing.end - 1) {
                throw new Error("The layer must use an available audio cue inside the scene.");
            }
            reveal = (audioCueFrame - timing.start) / (timing.end - timing.start - 1);
        }
        const animated = reveal !== undefined;
        return { ...shape, id: `layer-${index + 1}`, transform: { x, y: animated ? y + 0.035 : y, opacity: animated ? 0 : 1 },
            keyframes: reveal === undefined ? [] : [...(reveal > 0 ? [{ at: reveal, opacity: 0 }] : []),
                { at: Math.min(1, reveal + 0.12), y, opacity: 1, ease: "ease_out" }] };
    }) });
}

const words = (value: string) => (value.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).join(" ");

export function graphSceneNotes(brief: string, copy: string) {
    const phrase = words(copy);
    return phrase ? brief.split(/\r?\n/).find((line) => ` ${words(line)} `.includes(` ${phrase} `)) ?? "" : "";
}

export function fallbackEngineerGraph(title: string, purpose: string, sceneNotes: string) {
    const description = `${purpose} ${sceneNotes}`;
    const labels = [...sceneNotes.matchAll(/“([^”]+)”|"([^"\n]+)"/g)].map((match) => (match[1] ?? match[2]).trim())
        .filter((label) => label.length <= 50 && words(label) !== words(title)).slice(0, 3);
    const headline: Layer = { kind: "text", x: 0.5, y: 0.25, text: title, size: 0.085, maxWidth: 0.82, color: "foreground", reveal: 0 };
    const rule: Layer = { kind: "rect", x: 0.5, y: 0.37, width: 0.32, height: 0.008, color: "primary", reveal: 0.1 };
    const panel: Layer = { kind: "rect", x: 0.5, y: 0.6, width: 0.86, height: 0.35, color: "muted", radius: 0.04, reveal: 0.13 };
    const interior: Layer = { ...panel, width: 0.838, height: 0.328, color: "background" };
    if (/\bwaveform\b/i.test(description)) {
        const bars: Layer[] = Array.from({ length: 13 }, (_, index) => ({ kind: "rect", x: 0.32 + index * 0.03, y: 0.6,
            width: 0.022, height: 0.035 + 0.135 * Math.abs(Math.sin(index * 1.48)), radius: 0.009, color: "primary", reveal: 0.18 + index * 0.023 }));
        return compileEngineerGraph([headline, rule, panel, interior, ...bars]);
    }
    if (/\bcards?\b/i.test(description) && labels.length > 1) {
        const cards: Layer[] = labels.flatMap((label, index) => {
            const x = 0.5 + (index - (labels.length - 1) / 2) * 0.23;
            const reveal = 0.2 + index * 0.1;
            return [{ ...panel, x, width: 0.25, height: 0.23, reveal, color: "primary" },
                { kind: "text", x, y: 0.6, text: label, size: 0.04, maxWidth: 0.2, color: "background", reveal: reveal + 0.04 }];
        });
        return compileEngineerGraph([headline, rule, ...cards]);
    }
    const rows: Layer[] = Array.from({ length: 4 }, (_, index) => ({ kind: "rect", x: 0.48 - index * 0.025, y: 0.52 + index * 0.052,
        width: 0.58 - index * 0.08, height: 0.017, radius: 0.008, color: index === 0 ? "primary" : "muted", reveal: 0.23 + index * 0.1 }));
    if (/\burl\b/i.test(description)) {
        const field: Layer = { ...panel, x: 0.4, y: 0.26, width: 0.55, height: 0.085, reveal: 0 };
        const button: Layer = { ...field, x: 0.67, width: 0.33, color: "primary", reveal: 0.08 };
        const label: Layer = { ...headline, x: button.x, y: button.y, size: 0.036, maxWidth: 0.22, color: "background", reveal: 0.12 };
        return compileEngineerGraph([field, button, label, panel, interior, ...rows]);
    }
    return compileEngineerGraph([headline, rule, panel, interior, ...rows]);
}
