import { clamp, seededNoise } from "./draw";
import type { MotionGraphNode } from "./graph";
import type { MotionDrawingContext } from "./registry";
import { drawMotionText } from "./text";

export function drawGraphWidget(ctx: MotionDrawingContext, node: Extract<MotionGraphNode, { kind: "widget" }>,
    unit: number, progress: number, fontFamily: string, labelColor: string, audioLevel?: number) {
    const width = node.width * unit, height = node.height * unit;
    if (node.variant === "waveform") {
        const step = width / node.bars;
        for (let index = 0; index < node.bars; index++) {
            const phase = seededNoise(31, index) * Math.PI * 2 + progress * 15;
            const amplitude = (0.25 + Math.abs(Math.sin(phase)) * 0.75) * (audioLevel === undefined ? 1 : 0.15 + 0.85 * clamp(audioLevel));
            const barHeight = height * amplitude;
            ctx.roundRect(-width / 2 + index * step + step * 0.2, -barHeight / 2, step * 0.6, barHeight, step * 0.2);
        }
        return;
    }
    if (node.variant === "play-icon") {
        ctx.moveTo(-width * 0.35, -height / 2);
        ctx.lineTo(width * 0.5, 0);
        ctx.lineTo(-width * 0.35, height / 2);
        ctx.closePath();
        return;
    }
    const row = node.variant === "text-row";
    ctx.roundRect(-width / 2, -height / 2, width, height, Math.min(width, height) * (node.variant === "button" ? 0.32 : 0.14));
    ctx.fill();
    if (node.label) drawMotionText(ctx, node.label, fontFamily, labelColor, {
        x: -width * 0.42, y: -height * 0.4, width: width * 0.84, height: height * 0.8,
        maxSize: height * (row ? 0.46 : 0.42), maxLines: node.variant === "card" ? 2 : 1, align: row ? "left" : "center",
    });
}
