import { alpha, circle, easeOut, lerp, line, overshoot, smooth } from "./draw";
import type { MotionFrame } from "./registry";
import type { MotionScene } from "./schema";
import { drawMotionText } from "./text";

export function drawIdentity({ ctx, scene, width, height }: MotionFrame<Extract<MotionScene, { type: "identity" }>>, t: number, font: string) {
    const { palette, params, layout } = scene;
    const unit = Math.min(width, height);
    const wide = width / height > 1.25;
    const inset = width * layout.inset;
    const settle = easeOut((t - 0.04) / 0.32, 5);
    const markX = lerp(width / 2, wide ? width * 0.23 : width / 2, settle);
    const markY = lerp(height / 2, wide ? height * 0.48 : height * 0.36, settle);
    const radius = lerp(unit * 0.13, unit * 0.084, settle);
    if (params.showMark) {
        for (let i = 0; i < 3; i++) {
            const ring = easeOut((t - 0.1 - i * 0.13) / 0.55);
            if (ring > 0) circle(ctx, markX, markY, radius + unit * 0.42 * ring, undefined,
                alpha(i % 2 ? palette.muted : palette.foreground, 0.32 * (1 - ring)), 1.3);
        }
        const entrance = overshoot(t / 0.16);
        ctx.save();
        ctx.translate(markX, markY);
        const wobble = 1 + Math.sin(t * 40) * Math.exp(-t * 9) * 0.15;
        ctx.scale(entrance * wobble, entrance / wobble);
        circle(ctx, 0, 0, radius, palette.primary);
        if (t > 0.13) circle(ctx, radius * 0.3, -radius * 0.28, unit * 0.018 * smooth((t - 0.13) / 0.1), palette.background);
        ctx.restore();
        if (t > 0.27) {
            const a = t * 7 - 1.5;
            circle(ctx, markX + Math.cos(a) * radius * 1.52, markY + Math.sin(a) * radius * 1.52, unit * 0.006, palette.foreground);
        }
    }
    const x = wide && params.showMark ? width * 0.34 : inset;
    const maxWidth = width - x - inset;
    const y = wide || !params.showMark ? height * 0.31 : height * 0.44;
    const align = wide && params.showMark ? "left" : layout.align;
    const title = easeOut((t - 0.14) / 0.26, 5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, maxWidth * title, height * 0.25);
    ctx.clip();
    drawMotionText(ctx, params.title, font, palette.foreground, {
        x, y: y + height * 0.09 * (1 - title), width: maxWidth, height: height * 0.25,
        maxSize: unit * (wide ? 0.16 : 0.13), maxLines: 2, align,
    });
    ctx.restore();
    const lineY = y + height * 0.255;
    const rule = easeOut((t - 0.36) / 0.21);
    line(ctx, x, lineY, x + maxWidth * rule, lineY, alpha(palette.foreground, 0.42));
    ctx.save();
    ctx.globalAlpha *= smooth((t - 0.43) / 0.22);
    const mono = '"VidsAI Space Mono", Consolas, monospace';
    drawMotionText(ctx, params.detail, mono, palette.foreground, {
        x, y: lineY + height * 0.016, width: maxWidth, height: height * 0.075, maxSize: unit * 0.03, maxLines: 2, align,
    });
    drawMotionText(ctx, params.tag, mono, palette.muted, {
        x, y: lineY + height * 0.09, width: maxWidth, height: height * 0.052, maxSize: unit * 0.023, maxLines: 1, align,
    });
    ctx.restore();
}
