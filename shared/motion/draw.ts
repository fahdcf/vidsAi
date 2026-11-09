import type { MotionDrawingContext } from "./registry";
import type { MotionPath } from "./graph";

export const tau = Math.PI * 2;
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
export const smooth = (value: number) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
};
export const easeOut = (value: number, power = 3) => 1 - (1 - clamp(value)) ** power;
export const overshoot = (value: number) => {
    const t = clamp(value) - 1;
    return 1 + 2.70158 * t ** 3 + 1.70158 * t ** 2;
};
export const alpha = (hex: string, opacity: number) => hex + Math.round(clamp(opacity) * 255).toString(16).padStart(2, "0");

export function drawMotionPath(ctx: MotionDrawingContext, commands: MotionPath, width: number, height: number) {
    ctx.beginPath();
    for (const command of commands) {
        switch (command.op) {
            case "M": ctx.moveTo(command.x * width, command.y * height); break;
            case "L": ctx.lineTo(command.x * width, command.y * height); break;
            case "Q": ctx.quadraticCurveTo(command.cx * width, command.cy * height, command.x * width, command.y * height); break;
            case "C": ctx.bezierCurveTo(command.c1x * width, command.c1y * height, command.c2x * width, command.c2y * height, command.x * width, command.y * height); break;
            case "Z": ctx.closePath(); break;
        }
    }
}

export function seededNoise(seed: number, index: number) {
    let value = seed ^ Math.imul(index + 1, 0x9e3779b1);
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return (value >>> 0) / 0x100000000;
}

export function circle(ctx: MotionDrawingContext, x: number, y: number, radius: number, fill?: string, stroke?: string, width = 1) {
    if (radius <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, tau);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
    }
}

export function line(ctx: MotionDrawingContext, x: number, y: number, toX: number, toY: number, color: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

export function bezierEase(progress: number, [x1, y1, x2, y2]: readonly [number, number, number, number]) {
    const cubic = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
    const x = clamp(progress);
    if (x === 0 || x === 1) return x;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (cubic(mid, x1, x2) < x) lo = mid;
        else hi = mid;
    }
    return cubic((lo + hi) / 2, y1, y2);
}
