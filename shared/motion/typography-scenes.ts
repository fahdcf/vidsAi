import type { MotionFrame } from "./registry";
import type { MotionScene } from "./schema";
import { alpha, circle, clamp, easeOut, lerp, line, overshoot, seededNoise, smooth, tau } from "./draw";
import { drawMotionText } from "./text";

export function drawImpact(frame: MotionFrame<Extract<MotionScene, { type: "impact" }>>, progress: number, font: string) {
    const { ctx, scene, width, height } = frame;
    const unit = Math.min(width, height);
    const { primary, accent, foreground, muted, background } = scene.palette;
    const { headline, ringCount, particles, impactAt } = scene.params;
    const x = width / 2;
    const ground = height * 0.53;
    const impact = clamp(progress / impactAt);
    if (progress < impactAt) {
        const drop = clamp(impact * 1.62);
        const bounce = clamp((impact - 0.62) / 0.38);
        const y = lerp(-unit * 0.08, ground, drop ** 2) - unit * 0.087 * Math.sin(bounce * Math.PI);
        const squash = 1 + Math.exp(-(((impact - 0.62) / 0.055) ** 2)) * 0.85;
        line(ctx, width * 0.14, ground + unit * 0.025, width * 0.86, ground + unit * 0.025, alpha(foreground, 0.28), 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(squash, 1 / squash);
        circle(ctx, 0, 0, unit * 0.025, primary);
        ctx.restore();
        return;
    }
    const burst = clamp((progress - impactAt) / (1 - impactAt));
    const reach = Math.hypot(width, height);
    const colors = [foreground, muted, accent, primary];
    const fill = easeOut((burst - 0.32) / 0.23, 5);
    circle(ctx, x, ground, fill * reach, primary);
    for (let i = 0; i < ringCount; i++) {
        const t = clamp((burst - i * 0.045) / 0.55);
        const radius = unit * 0.018 + reach * easeOut(t) * (0.28 + i * 0.07);
        circle(ctx, x, ground, radius, undefined, alpha(colors[i % colors.length], 1 - t),
            unit * (0.022 * (1 - t) + 0.004));
    }
    for (let i = 0; i < particles; i++) {
        const angle = seededNoise(scene.seed, i * 3) * tau;
        const length = unit * lerp(0.02, 0.65, seededNoise(scene.seed, i * 3 + 1) * easeOut(burst));
        const radius = unit * lerp(0.001, 0.004, seededNoise(scene.seed, i * 3 + 2));
        circle(ctx, x + Math.cos(angle) * length, ground + Math.sin(angle) * length,
            radius, alpha(i % 3 ? background : foreground, (1 - burst) * 0.78));
    }
    const reveal = easeOut((burst - 0.44) / 0.25, 5);
    const inset = width * scene.layout.inset;
    if (reveal > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(inset, height * 0.26, width - inset * 2, height * 0.48);
        ctx.clip();
        drawMotionText(ctx, headline, font, background, {
            x: inset, y: height * (0.26 + 0.25 * (1 - reveal)), width: width - inset * 2,
            height: height * 0.48, maxSize: unit * 0.17, maxLines: 3, align: scene.layout.align,
        });
        ctx.restore();
    }
}

export function drawKineticWords(frame: MotionFrame<Extract<MotionScene, { type: "kinetic_words" }>>, progress: number, font: string) {
    const { ctx, scene, width, height } = frame;
    const { palette, params } = scene;
    const unit = Math.min(width, height);
    const slot = Math.min(params.words.length - 1, Math.floor(progress * params.words.length));
    const phase = clamp(progress * params.words.length - slot);
    const word = params.words[slot];
    const colors = [palette.accent, palette.foreground, palette.muted, palette.primary];
    const bg = params.alternatePalette ? colors[slot % colors.length] : palette.background;
    const ink = params.alternatePalette && slot % 4 !== 0 ? palette.background : palette.foreground;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let row = 0; row < 8; row++) {
        drawMotionText(ctx, `${word}    ${word}    ${word}`, font, ink, {
            x: -width * (row % 2) * 0.16, y: height * row / 8, width: width * 1.18,
            height: height / 8, maxSize: unit * 0.065, maxLines: 1,
        });
    }
    ctx.restore();
    const reveal = smooth(phase / 0.27);
    const inset = width * scene.layout.inset;
    ctx.save();
    ctx.beginPath();
    ctx.rect(inset, height * 0.22, (width - inset * 2) * (params.entrance === "wipe" ? reveal : 1), height * 0.56);
    ctx.clip();
    const travel = params.entrance === "masked_rise" ? height * 0.43 * (1 - reveal) : 0;
    const size = params.entrance === "slam" ? Math.max(0.06, overshoot(phase / 0.3)) : 1;
    drawMotionText(ctx, word, font, ink, {
        x: inset, y: height * 0.22 + travel, width: width - inset * 2,
        height: height * 0.56, maxSize: unit * 0.24 * size, maxLines: 2, align: scene.layout.align,
    });
    ctx.restore();
}
