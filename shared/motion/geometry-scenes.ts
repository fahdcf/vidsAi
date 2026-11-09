import { alpha, bezierEase, circle, clamp, easeOut, lerp, line, overshoot, seededNoise, smooth, tau } from "./draw";
import type { MotionFrame } from "./registry";
import type { MotionScene, MotionSceneType } from "./schema";
import { drawMotionText } from "./text";

type Frame<T extends MotionSceneType> = MotionFrame<Extract<MotionScene, { type: T }>>;

export function drawGrid({ ctx, scene, width, height }: Frame<"grid">, t: number) {
    const { columns, rows, spin, stagger } = scene.params;
    const { accent, foreground, muted, primary } = scene.palette;
    const step = Math.max(width / Math.max(1, columns - 2), height / Math.max(1, rows - 2), Math.min(width, height) * 0.104);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(spin * Math.sin(t * tau * 1.4 - 1.1));
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = column - Math.floor(columns / 2);
            const y = row - Math.floor(rows / 2);
            const distance = Math.hypot(x, y);
            const normalizedDistance = distance / Math.hypot(columns / 2, rows / 2);
            const reveal = overshoot((t - normalizedDistance * 0.68 * stagger) / 0.16);
            if (reveal <= 0) continue;
            const wave = Math.sin(distance * 0.9 - t * 15.6);
            const size = step * (0.66 + wave * 0.07) * reveal;
            const morph = clamp((t - 0.32 - normalizedDistance * 0.11) / 0.48);
            const round = Math.sin(morph * Math.PI) ** 2;
            ctx.save();
            ctx.translate(x * step, y * step);
            ctx.rotate((1 - round) * (t < 0.2 ? 0.4 : wave * 0.08));
            ctx.fillStyle = (x * 3 + y * 5) % 13 === 0 ? primary
                : Math.abs(distance - (t * 10 % 9)) < 1.05 ? muted : foreground;
            ctx.beginPath();
            ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.5 * round);
            ctx.fill();
            ctx.restore();
        }
    }
    ctx.restore();
}

export function drawEasing({ ctx, scene, width, height }: Frame<"easing">, t: number, font: string) {
    const { foreground, primary, accent } = scene.palette;
    const { curve, labels, heading } = scene.params;
    const tall = width < height * 1.2;
    const unit = Math.min(width, height);
    const size = tall ? width * 0.49 : Math.min(width * 0.32, height * 0.51);
    const left = tall ? (width - size) / 2 : width * 0.12;
    const bottom = tall ? height * 0.49 : height * 0.75;
    const reveal = smooth(t / 0.34);
    const progress = clamp((t - 0.26) / 0.59);
    const mono = '"VidsAI Space Mono", Consolas, monospace';
    drawMotionText(ctx, heading, font, foreground, {
        x: width * 0.12, y: height * 0.06, width: width * 0.76, height: height * 0.12, maxSize: unit * 0.052,
        align: tall ? "center" : "left",
    });
    for (let i = 0; i <= 10; i++) {
        const x = size * i / 10;
        line(ctx, left + x, bottom, left + x, bottom - size, alpha(foreground, 0.12));
        line(ctx, left, bottom - x, left + size, bottom - x, alpha(foreground, 0.12));
    }
    line(ctx, left, bottom, left + size, bottom, alpha(foreground, 0.75));
    line(ctx, left, bottom, left, bottom - size, alpha(foreground, 0.75));
    ctx.setLineDash([unit * 0.008, unit * 0.012]);
    line(ctx, left, bottom, left + size, bottom - size, alpha(foreground, 0.38));
    ctx.setLineDash([]);
    const [x1, y1, x2, y2] = curve;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left - 4, bottom - size * 1.5, size * reveal + 8, size * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.bezierCurveTo(left + x1 * size, bottom - y1 * size, left + x2 * size, bottom - y2 * size, left + size, bottom - size);
    ctx.lineWidth = unit * 0.006;
    ctx.strokeStyle = primary;
    ctx.stroke();
    ctx.restore();
    const handles = smooth((t - 0.18) / 0.22);
    if (handles > 0) {
        line(ctx, left, bottom, left + x1 * size, bottom - y1 * size, alpha(foreground, 0.35 * handles));
        line(ctx, left + size, bottom - size, left + x2 * size, bottom - y2 * size, alpha(foreground, 0.35 * handles));
        for (const [x, y] of [[x1, y1], [x2, y2]]) circle(ctx, left + x * size, bottom - y * size,
            unit * 0.011, scene.palette.background, alpha(accent, handles), Math.max(1, unit * 0.002));
    }
    circle(ctx, left + progress * size, bottom - bezierEase(progress, curve) * size, unit * 0.012, foreground, primary, 1.5);
    drawMotionText(ctx, `cubic-bezier(${curve.join(", ")})`, mono, foreground, {
        x: tall ? width * 0.15 : left, y: bottom + unit * 0.016, width: tall ? width * 0.7 : size * 1.14,
        height: unit * 0.065, maxSize: unit * 0.025, maxLines: 1, align: tall ? "center" : "left",
    });
    const x0 = width * (tall ? 0.17 : 0.53);
    const xEnd = width * 0.87;
    const easing = [clamp, easeOut, (p: number) => bezierEase(p, curve)];
    const colors = [foreground, accent, primary];
    labels.forEach((label, row) => {
        const y = height * ((tall ? 0.66 : 0.36) + row * (tall ? 0.105 : 0.16));
        const ease = easing[row];
        const color = colors[row];
        line(ctx, x0, y, xEnd, y, alpha(foreground, 0.3));
        const value = ease(progress);
        drawMotionText(ctx, label, mono, color, {
            x: x0, y: y - unit * 0.08, width: (xEnd - x0) * 0.72, height: unit * 0.05,
            maxSize: unit * 0.038, maxLines: 1, align: "left",
        });
        drawMotionText(ctx, `${Math.round(value * 100)}%`, mono, color, {
            x: x0, y: y - unit * 0.08, width: xEnd - x0, height: unit * 0.05,
            maxSize: unit * 0.025, maxLines: 1, align: "right",
        });
        const velocity = Math.max(0, value - ease(clamp(progress - 0.04)));
        for (let trail = 12; trail >= 0; trail--) {
            const p = ease(clamp(progress - trail * 0.016));
            ctx.fillStyle = alpha(color, trail ? (1 - trail / 13) * 0.22 : 1);
            ctx.beginPath();
            ctx.ellipse(lerp(x0, xEnd, p), y, unit * (0.013 + velocity * 0.1), unit * 0.012 / (1 + velocity * 5), 0, 0, tau);
            ctx.fill();
        }
    });
}

export function drawTunnel({ ctx, scene, width, height }: Frame<"tunnel">, t: number) {
    const { rings, sides, sphereParticles, revolutions } = scene.params;
    const { accent, foreground, primary, muted } = scene.palette;
    const colors = [accent, foreground, primary, muted];
    const unit = Math.min(width, height);
    const tunnelFade = 1 - smooth((t - 0.52) / 0.53);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    for (let i = 0; i < rings; i++) {
        const phase = (i / rings + t * 0.6) % 1;
        const radius = unit * 0.069 * 19 ** phase;
        const rotation = t * revolutions * tau + i * 0.21;
        ctx.beginPath();
        for (let side = 0; side < sides; side++) {
            const angle = rotation + side * tau / sides;
            const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
            if (side === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = alpha(colors[i % 3], (0.33 + phase * 0.67) * tunnelFade);
        ctx.lineWidth = unit * (0.001 + phase * 0.004);
        ctx.setLineDash(i % 4 === 1 ? [unit * 0.023, unit * 0.019] : []);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 64; i++) {
        const angle = seededNoise(scene.seed, i) * tau;
        const phase = (seededNoise(scene.seed, 400 + i) + t * 0.4) % 1;
        const r = unit * (0.14 + phase ** 1.6);
        const end = r + unit * (0.007 + phase ** 2 * 0.13);
        line(ctx, Math.cos(angle) * r, Math.sin(angle) * r, Math.cos(angle) * end, Math.sin(angle) * end,
            alpha(colors[i % 3], phase * 0.44 * tunnelFade), 0.5 + phase);
    }
    const sphere = smooth((t - 0.34) / 0.37);
    if (sphere > 0 && sphereParticles > 0) {
        const a = t * 1.28;
        const b = t * 0.54;
        const r = unit * 0.29 * sphere;
        const points = [];
        for (let i = 0; i < sphereParticles; i++) {
            let y = 1 - (i + 0.5) / sphereParticles * 2;
            const radius = Math.sqrt(1 - y * y);
            const angle = i * 2.39996323;
            let x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
            [x, z] = [x * Math.cos(a) + z * Math.sin(a), z * Math.cos(a) - x * Math.sin(a)];
            [y, z] = [y * Math.cos(b) - z * Math.sin(b), z * Math.cos(b) + y * Math.sin(b)];
            const perspective = 1 / (1 - z * r / (unit * 0.9));
            points.push({ x: x * r * perspective, y: y * r * perspective, z, color: colors[i % colors.length] });
        }
        points.sort((a, b) => a.z - b.z);
        for (const p of points) circle(ctx, p.x, p.y, unit * (0.0014 + (p.z + 1) * 0.0007),
            alpha(p.color, (0.28 + (p.z + 1) * 0.36) * sphere));
    }
    ctx.restore();
}
