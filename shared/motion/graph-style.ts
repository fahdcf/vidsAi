import { z } from "zod";

const role = z.enum(["background", "foreground", "primary", "accent", "muted"]);
export const statusColors = { success: "#22c55e", warning: "#f59e0b", danger: "#ef4444" } as const;
export const graphColor = z.union([role, z.enum(["success", "warning", "danger"]), z.string().regex(/^#[0-9a-f]{6}$/i)]);
export type GraphColor = z.infer<typeof graphColor>;

const stop = z.object({ at: z.number().min(0).max(1), color: graphColor }).strict();
const direction = z.number().min(-2).max(2);
const gradient = z.object({
    x0: direction, y0: direction, x1: direction, y1: direction,
    stops: z.array(stop).min(2).max(6),
}).strict().refine(({ x0, y0, x1, y1, stops }) => (x0 !== x1 || y0 !== y1) &&
    stops.every(({ at }, index) => index === 0 || at > stops[index - 1].at));
export const graphPaintFields = {
    gradient: gradient.optional(),
    outline: z.object({ color: graphColor, width: z.number().min(0.001).max(0.08) }).strict().optional(),
    shadow: z.object({ color: graphColor, opacity: z.number().min(0).max(1), blur: z.number().min(0).max(0.06),
        x: z.number().min(-0.12).max(0.12), y: z.number().min(-0.12).max(0.12) }).strict().optional(),
};
const font = {
    family: z.enum(["archivo_black", "space_mono", "system"]).optional(),
    weight: z.union([z.literal(400), z.literal(700)]).optional(),
    style: z.enum(["normal", "italic"]).optional(),
};
export const graphTypography = z.object({
    ...font,
    align: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().min(0.85).max(2.5).optional(),
    boxHeight: z.number().min(0.025).max(1).optional(),
    maxLines: z.number().int().min(1).max(8).optional(),
}).strict();
export const graphSpan = z.object({ ...font, color: graphColor.optional(), text: z.string().min(1).max(180) }).strict();
export const graphTextFields = {
    typography: graphTypography.optional(),
    spans: z.array(graphSpan).min(1).max(12).optional(),
};
export function resolveGraphColor(palette: Record<z.infer<typeof role>, string>, color: GraphColor) {
    return palette[color as keyof typeof palette] ?? statusColors[color as keyof typeof statusColors] ?? color;
}
