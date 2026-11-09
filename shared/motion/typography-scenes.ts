import type { MotionFrame } from "./registry";
import type { MotionScene } from "./schema";
import { alpha, circle, clamp, easeOut, lerp, line, overshoot, seededNoise, smooth, tau } from "./draw";
import { drawMotionText } from "./text";

export function drawImpact(frame: MotionFrame<Extract<MotionScene, { type: "impact" }>>, progress: number, font: string) {
    const { ctx, scene, width, height } = frame;
    const unit = Math.min(width, height);
    const { primary, accent, foreground, muted, background } = scene.palette;
    const { headline, ringCount, particles, impactAt, highlightLastWord } = scene.params;
    const x = width / 2;
    const ground = height * 0.53;
    const impact = clamp(progress / impactAt);
    if (progress < impactAt) {
        const drop = clamp(impact * 1.62);
        const bounce = clamp((impact - 0.62) / 0.38);
        const y = lerp(-unit * 0.08, ground, drop ** 2) - unit * 0.087 * Math.sin(bounce * Math.PI);
        const squash = 1 + Math.exp(-(((impact - 0.62) / 0.055) ** 2)) * 0.85;
        line(ctx, width * 0.14, ground + unit * 0.025, width * 0.86, ground + unit * 0.025, alpha(foreground, 0.28), 1);
        ctx.beginPath();
        ctx.ellipse(x, ground + unit * 0.025, unit * 0.24 * smooth(impact), unit * 0.02 * smooth(impact), 0, 0, tau);
        ctx.strokeStyle = alpha(primary, 0.72);
        ctx.lineWidth = Math.max(1, unit * 0.002);
        ctx.stroke();
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
    const fill = easeOut((burst - 0.37) / 0.2, 5);
    const center = height * 0.5;
    const ringFade = 1 - smooth((burst - 0.35) / 0.2);
    for (let i = 0; i < ringCount; i++) {
        const t = clamp(burst / 0.42);
        const radius = unit * (0.018 + 0.02 * i + easeOut(t, 3) * (0.31 + i * 0.22));
        circle(ctx, x, center, radius, undefined, alpha(colors[i % colors.length], ringFade),
            unit * ((0.032 - Math.min(i, 3) * 0.006) * (1 - t) + 0.004));
    }
    if (fill > 0) circle(ctx, x, center, fill * reach, primary);
    for (let i = 0; i < particles; i++) {
        const angle = seededNoise(scene.seed, i * 3) * tau;
        const length = unit * lerp(0.025, 0.16 + burst * 0.6, seededNoise(scene.seed, i * 3 + 1));
        const radius = unit * lerp(0.0015, 0.0035, seededNoise(scene.seed, i * 3 + 2));
        circle(ctx, x + Math.cos(angle) * length, center + Math.sin(angle) * length,
            radius, alpha([foreground, accent, muted, background][i % 4], (1 - burst) * 0.86));
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
            highlightLastWord: highlightLastWord ? foreground : undefined,
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
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.12);
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = ink;
    ctx.font = `${unit * 0.11}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(0.5, unit * 0.002);
    const repeat = Math.max(unit * 0.3, Math.min(width * 0.68, ctx.measureText(word).width + unit * 0.12));
    for (let row = -5; row <= 5; row++) {
        for (let x = -width - repeat; x <= width + repeat; x += repeat) {
            ctx.strokeText(word, x + ((row % 2) * repeat * 0.48 + progress * unit * 0.11), row * unit * 0.137, repeat * 0.92);
        }
    }
    ctx.restore();
    if (scene.finish.framing && width > height) {
        const mono = '"VidsAI Space Mono", Consolas, monospace';
        drawMotionText(ctx, `${String(slot + 1).padStart(2, "0")}/${String(params.words.length).padStart(2, "0")}`, mono, ink,
            { x: width * 0.085, y: height * 0.18, width: width * 0.2, height: height * 0.056, maxSize: unit * 0.023, maxLines: 1, align: "left" });
        line(ctx, width * 0.085, height * 0.244, width * 0.2, height * 0.244, alpha(ink, 0.5));
    }
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
        height: height * 0.56, maxSize: unit * (word.length <= 5 ? 0.43 : 0.32) * size, maxLines: 2, align: scene.layout.align,
    });
    ctx.restore();
}
