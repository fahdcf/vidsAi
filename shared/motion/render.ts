import { alpha, appendMotionPath, clamp, drawMotionPath, easeOut, lerp, smooth } from "./draw";
import type { MotionGraphNode } from "./graph";
import type { MotionFrame } from "./registry";
import { drawImpact, drawKineticWords } from "./typography-scenes";
import { drawMotionText } from "./text";
import { resolveGraphColor, type GraphColor } from "./graph-style";
import { drawStyledMotionText } from "./styled-text";
import { drawEasing, drawGrid, drawTunnel } from "./geometry-scenes";
import { chooseMotionVectorShapes, drawLiquid } from "./liquid-scene";
import { drawIdentity } from "./identity-scene";
import { finishMotionFrame } from "./finish";
import type { MotionVectors } from "./assets";
import { drawGraphWidget } from "./widgets";
import { sampleGraphAnimation } from "./graph-animation";
import { partialMotionPath } from "./partial-path";
import type { BrowserMotionProgram } from "./runtime/browser-program";

export const motionFontFamilies = {
    archivo_black: '"VidsAI Archivo Black", Arial, sans-serif',
    space_mono: '"VidsAI Space Mono", Consolas, monospace',
    system: "Arial, sans-serif",
} as const;

export type ReadyMotionAssets = {
    fontFamily: string;
    vectors?: Readonly<Record<string, MotionVectors>>;
    images?: Readonly<Record<string, ImageBitmap>>;
    program?: BrowserMotionProgram;
};

function drawGraphAsset({ ctx, scene }: MotionFrame, assets: ReadyMotionAssets, id: string, kind: "image" | "vectors",
    w: number, h: number, progress: number) {
    if (kind === "image") {
        const image = assets.images?.[id];
        if (!image) throw new Error("The graph image is unavailable.");
        const scale = Math.min(w / image.width, h / image.height);
        const dw = image.width * scale, dh = image.height * scale;
        ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    } else {
        const vectors = assets.vectors?.[id];
        if (!vectors) throw new Error("The graph vector asset is unavailable.");
        ctx.translate(-w / 2, -h / 2);
        const opacity = ctx.globalAlpha;
        for (const shape of chooseMotionVectorShapes(vectors, progress)) {
            ctx.fillStyle = resolveGraphColor(scene.palette, shape.fill);
            ctx.globalAlpha = opacity * shape.opacity;
            drawMotionPath(ctx, shape.path, w, h);
            ctx.fill("evenodd");
        }
    }
}

function drawProgram(frame: MotionFrame, assets: ReadyMotionAssets, progress: number) {
    const { ctx, width, height } = frame;
    const { program } = assets;
    if (!program) return;
    const unit = Math.min(width, height);
    for (const command of program.cached(frame.frame, frame.fps) ?? []) {
        ctx.save();
        try {
            ctx.translate(command.x * width, command.y * height);
            if (command.kind === "asset") {
                const asset = program.handles.get(command.handle);
                if (asset) drawGraphAsset(frame, assets, asset.id, asset.kind, command.width * unit, command.height * unit, progress);
            } else if (command.kind === "text") {
                const w = command.maxWidth * width, h = command.size * unit * 2.5;
                drawMotionText(ctx, command.text, assets.fontFamily, command.color,
                    { x: -w / 2, y: -h / 2, width: w, height: h, maxSize: command.size * unit });
            } else if (command.kind === "path") {
                const key = JSON.stringify(command.points);
                let geometry = program.geometry.get(key);
                if (!geometry) {
                    geometry = new Path2D();
                    appendMotionPath(geometry, command.points, 1, 1);
                    if (program.geometry.size >= 32) program.geometry.delete(program.geometry.keys().next().value!);
                    program.geometry.set(key, geometry);
                }
                ctx.scale(width, height);
                ctx.fillStyle = command.color;
                ctx.fill(geometry);
            } else {
                const w = command.width * unit, h = command.height * unit;
                ctx.fillStyle = command.color;
                ctx.fillRect(-w / 2, -h / 2, w, h);
            }
        } finally { ctx.restore(); }
    }
}

function animatedTransform(node: MotionGraphNode, progress: number, root: boolean) {
    let previous = { x: root ? 0.5 : 0, y: root ? 0.5 : 0, scale: 1, rotation: 0, opacity: 1, ...node.transform };
    let at = 0;
    for (const key of node.keyframes) {
        const next = {
            x: key.x ?? previous.x, y: key.y ?? previous.y, scale: key.scale ?? previous.scale,
            rotation: key.rotation ?? previous.rotation, opacity: key.opacity ?? previous.opacity,
        };
        if (progress < key.at) {
            const t = clamp((progress - at) / (key.at - at));
            const eased = key.ease === "ease_in" ? t ** 3
                : key.ease === "ease_out" ? easeOut(t)
                    : key.ease === "smooth" ? smooth(t) : t;
            return {
                x: lerp(previous.x, next.x, eased), y: lerp(previous.y, next.y, eased),
                scale: lerp(previous.scale, next.scale, eased), rotation: lerp(previous.rotation, next.rotation, eased),
                opacity: lerp(previous.opacity, next.opacity, eased),
            };
        }
        at = key.at;
        previous = next;
    }
    return previous;
}

function drawGraph(frame: MotionFrame, nodes: MotionGraphNode[], progress: number, assets: ReadyMotionAssets, root = true) {
    const { ctx, scene, width, height } = frame;
    const unit = Math.min(width, height);
    const link = root && scene.type === "graph" && scene.params.continuity;
    const localEnd = scene.end_frame - scene.start_frame - 1;
    const next = link && frame.nextScene?.id === link.nextSceneId && frame.frame > localEnd - link.frames ? frame.nextScene : undefined;
    for (const node of nodes) {
        const { reveal = 1, draw = 1, textReveal, deform = 0, ...tracks } = sampleGraphAnimation(node.animation, progress);
        const transform = { ...animatedTransform(node, progress, root), ...tracks };
        if (link && next && link.nodeIds.includes(node.id)) {
            const target = next.params.layers.find(({ id }) => id === node.id);
            if (target) {
                const destination = { ...animatedTransform(target, 0, true), ...sampleGraphAnimation(target.animation, 0) };
                const amount = smooth(clamp((frame.frame - (localEnd - link.frames + 1)) / (link.frames - 1)));
                for (const key of ["x", "y", "scale", "rotation", "opacity"] as const) {
                    transform[key] = lerp(transform[key], destination[key], amount);
                }
            }
        }
        if (transform.opacity <= 0 || transform.scale <= 0) continue;
        if (reveal <= 0) continue;
        ctx.save();
        try {
            ctx.translate(transform.x * width, transform.y * height);
            ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.scale(transform.scale, transform.scale);
            ctx.globalAlpha *= transform.opacity;
            if (reveal < 1) {
                const span = node.kind === "text" ? node.maxWidth * width : "width" in node ? node.width * unit : width;
                ctx.beginPath();
                ctx.rect(-span / 2, -3 * height, span * reveal, 6 * height);
                ctx.clip();
            }
            if (deform) {
                const squash = deform * Math.sin(progress * Math.PI * 4);
                ctx.scale(1 + squash, 1 - squash);
            }
            if (node.kind === "group") {
                if (node.mask) {
                    drawMotionPath(ctx, node.mask, width, height);
                    ctx.clip();
                }
                drawGraph(frame, node.children, progress, assets, false);
                continue;
            }
            const resolve = (color: GraphColor) => resolveGraphColor(scene.palette, color);
            if (node.kind === "image" || node.kind === "vector") {
                drawGraphAsset(frame, assets, node.assetId, node.kind === "image" ? "image" : "vectors", node.width * unit, node.height * unit, progress);
                continue;
            }
            let fill: string | CanvasGradient = resolve(node.color);
            if (node.gradient) {
                const { x0, y0, x1, y1, stops } = node.gradient;
                fill = ctx.createLinearGradient(x0 * unit, y0 * unit, x1 * unit, y1 * unit);
                for (const { at, color } of stops) fill.addColorStop(at, resolve(color));
            }
            if (node.shadow) {
                ctx.shadowColor = alpha(resolve(node.shadow.color), node.shadow.opacity);
                ctx.shadowBlur = node.shadow.blur * unit;
                ctx.shadowOffsetX = node.shadow.x * unit;
                ctx.shadowOffsetY = node.shadow.y * unit;
            }
            const outline = node.outline && { color: resolve(node.outline.color), width: node.outline.width * unit };
            ctx.fillStyle = fill;
            ctx.beginPath();
            switch (node.kind) {
                case "widget":
                    drawGraphWidget(ctx, node, unit, progress, assets.fontFamily, resolve(node.labelColor), frame.audioLevel);
                    if (node.variant === "button" || node.variant === "card" || node.variant === "text-row") {
                        if (outline) { ctx.strokeStyle = outline.color; ctx.lineWidth = outline.width; ctx.stroke(); }
                        continue;
                    }
                    break;
                case "text": {
                    const w = node.maxWidth * width;
                    const style = node.typography;
                    const h = (style?.boxHeight ?? node.size * 2.5) * unit;
                    const box = { x: -w / 2, y: -h / 2, width: w, height: h, maxSize: node.size * unit,
                        align: style?.align, maxLines: style?.maxLines };
                    if (style || node.spans || node.gradient || outline || textReveal !== undefined) {
                        const runs = (node.spans ?? [{ text: node.text }]).map((span) => {
                            const { family, weight, style: face, color, text } = { ...style, ...span };
                            return { text, family: family ? motionFontFamilies[family] : assets.fontFamily,
                                weight, style: face, color: color ? resolve(color) : fill };
                        });
                        drawStyledMotionText(ctx, runs, box, style?.lineHeight ?? 1.17, outline, textReveal);
                    } else drawMotionText(ctx, node.text, assets.fontFamily, resolve(node.color), box);
                    continue;
                }
                case "rect": {
                    const w = node.width * unit;
                    const h = node.height * unit * (node.audioReactive && frame.audioLevel !== undefined ? 0.25 + 0.75 * frame.audioLevel : 1);
                    ctx.roundRect(-w / 2, -h / 2, w, h, node.radius * unit);
                    break;
                }
                case "ellipse":
                    ctx.ellipse(0, 0, node.width * unit / 2, node.height * unit / 2, 0, 0, Math.PI * 2);
                    break;
                case "path":
                    if (draw <= 0) continue;
                    drawMotionPath(ctx, partialMotionPath(node.commands, draw), width, height);
                    if (node.stroke || (outline && draw < 1)) {
                        ctx.lineWidth = outline?.width ?? (node.stroke ?? 0) * unit;
                        ctx.strokeStyle = outline?.color ?? fill;
                        ctx.stroke();
                        continue;
                    }
                    break;
            }
            ctx.fill();
            if (outline) {
                ctx.strokeStyle = outline.color;
                ctx.lineWidth = outline.width;
                ctx.stroke();
            }
        } finally {
            ctx.restore();
        }
    }
}

// This entry point owns its canvas. Each frame is rendered independently of previous draws.
export function drawMotionFrame(frame: MotionFrame, assets: ReadyMotionAssets) {
    const { ctx, scene, width, height } = frame;
    const duration = scene.end_frame - scene.start_frame;
    const progress = clamp(frame.frame / Math.max(1, duration - 1)) ** (1 / (scene.motionRate ?? 1));
    ctx.reset();
    const transition = scene.transitionIn;
    let opacity = 1;
    if (transition && frame.frame < transition.frames) {
        const amount = smooth(frame.frame / transition.frames);
        if (transition.kind === "wipe") {
            ctx.beginPath();
            ctx.rect(0, 0, width * amount, height);
            ctx.clip();
        } else {
            opacity = amount;
            if (transition.kind === "scale") {
                const scale = lerp(0.88, 1, amount);
                ctx.translate(width / 2, height / 2);
                ctx.scale(scale, scale);
                ctx.translate(-width / 2, -height / 2);
            }
        }
    }
    ctx.fillStyle = scene.palette.background;
    ctx.fillRect(0, 0, width, height);
    switch (scene.type) {
        case "graph": drawGraph(frame, scene.params.layers, progress, assets); drawProgram(frame, assets, progress); break;
        case "impact": drawImpact({ ...frame, scene }, progress, assets.fontFamily); break;
        case "kinetic_words": drawKineticWords({ ...frame, scene }, progress, assets.fontFamily); break;
        case "grid": drawGrid({ ...frame, scene }, progress); break;
        case "easing": drawEasing({ ...frame, scene }, progress, assets.fontFamily); break;
        case "tunnel": drawTunnel({ ...frame, scene }, progress); break;
        case "liquid": drawLiquid({ ...frame, scene }, progress, assets.vectors); break;
        case "identity": drawIdentity({ ...frame, scene }, progress, assets.fontFamily); break;
    }
    finishMotionFrame(frame);
    if (opacity < 1) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = `rgba(0,0,0,${opacity})`;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
    }
}
