import { alpha, line, seededNoise } from "./draw";
import type { MotionDrawingContext, MotionFrame } from "./registry";

const tileSize = 128;
const tiles = new WeakMap<MotionDrawingContext, { seed: number; tile: OffscreenCanvas }>();

function grainTile(ctx: MotionDrawingContext, seed: number) {
    const existing = tiles.get(ctx);
    if (existing?.seed === seed) return existing.tile;
    const tile = new OffscreenCanvas(tileSize, tileSize);
    const painter = tile.getContext("2d")!;
    const pixels = painter.createImageData(tileSize, tileSize);
    for (let i = 0; i < tileSize * tileSize; i++) {
        const shade = Math.floor(seededNoise(seed, i) * 256);
        pixels.data.set([shade, shade, shade, 255], i * 4);
    }
    painter.putImageData(pixels, 0, 0);
    tiles.set(ctx, { seed, tile });
    return tile;
}

export function finishMotionFrame({ ctx, scene, width, height, frame, fps }: MotionFrame) {
    const { grain, vignette, framing } = scene.finish;
    if (vignette) {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.16,
            width / 2, height / 2, Math.hypot(width, height) * 0.57);
        gradient.addColorStop(0, "#00000000");
        gradient.addColorStop(1, alpha("#000000", vignette));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    if (grain && typeof OffscreenCanvas !== "undefined") {
        const tile = ctx.createPattern(grainTile(ctx, scene.seed), "repeat");
        if (tile) {
            ctx.save();
            ctx.globalCompositeOperation = "soft-light";
            ctx.globalAlpha *= grain;
            ctx.translate(frame * 37 % tileSize - tileSize, frame * 59 % tileSize - tileSize);
            ctx.fillStyle = tile;
            ctx.fillRect(0, 0, width + tileSize, height + tileSize);
            ctx.restore();
        }
    }
    if (!framing) return;
    const unit = Math.min(width, height);
    const margin = unit * 0.04;
    const arm = unit * 0.032;
    const color = alpha(scene.palette.foreground, 0.61);
    for (const [x, y, sx, sy] of [
        [margin, margin, 1, 1], [width - margin, margin, -1, 1],
        [margin, height - margin, 1, -1], [width - margin, height - margin, -1, -1],
    ]) {
        line(ctx, x, y, x + sx * arm, y, color);
        line(ctx, x, y, x, y + sy * arm, color);
    }
    ctx.save();
    ctx.font = `${Math.max(9, unit * 0.014)}px "VidsAI Space Mono", Consolas, monospace`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.fillText(scene.type.replaceAll("_", " ").toUpperCase(), margin + arm * 1.5, margin);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor((scene.start_frame + frame) / fps).toString().padStart(2, "0")}:${((scene.start_frame + frame) % fps).toString().padStart(2, "0")}`, width - margin - arm * 1.5, margin);
    ctx.restore();
}
