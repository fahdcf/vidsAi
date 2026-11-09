import { clamp, drawMotionPath, easeOut, lerp, smooth } from "./draw";
import type { MotionGraphNode } from "./graph";
import type { MotionFrame } from "./registry";
import { drawImpact, drawKineticWords } from "./typography-scenes";
import { drawMotionText } from "./text";
import { drawEasing, drawGrid, drawTunnel } from "./geometry-scenes";
import { drawLiquid } from "./liquid-scene";
import { drawIdentity } from "./identity-scene";
import { finishMotionFrame } from "./finish";
import type { MotionVectors } from "./assets";

export const motionFontFamilies = {
    archivo_black: '"VidsAI Archivo Black", Arial, sans-serif',
    space_mono: '"VidsAI Space Mono", Consolas, monospace',
    system: "Arial, sans-serif",
} as const;

export type ReadyMotionAssets = {
    fontFamily: string;
    vectors?: Readonly<Record<string, MotionVectors>>;
};

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
    for (const node of nodes) {
        const transform = animatedTransform(node, progress, root);
        if (transform.opacity <= 0 || transform.scale <= 0) continue;
        ctx.save();
        try {
            ctx.translate(transform.x * width, transform.y * height);
            ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.scale(transform.scale, transform.scale);
            ctx.globalAlpha *= transform.opacity;
            if (node.kind === "group") {
                if (node.mask) {
                    drawMotionPath(ctx, node.mask, width, height);
                    ctx.clip();
                }
                drawGraph(frame, node.children, progress, assets, false);
                continue;
            }
            ctx.fillStyle = scene.palette[node.color];
            ctx.beginPath();
            switch (node.kind) {
                case "text": {
                    const w = node.maxWidth * width;
                    const h = node.size * unit * 2.5;
                    drawMotionText(ctx, node.text, assets.fontFamily, scene.palette[node.color], {
                        x: -w / 2, y: -h / 2, width: w, height: h, maxSize: node.size * unit,
                    });
                    break;
                }
                case "rect": {
                    const w = node.width * unit, h = node.height * unit;
                    ctx.roundRect(-w / 2, -h / 2, w, h, node.radius * unit);
                    ctx.fill();
                    break;
                }
                case "ellipse":
                    ctx.ellipse(0, 0, node.width * unit / 2, node.height * unit / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case "path":
                    drawMotionPath(ctx, node.commands, width, height);
                    if (node.stroke) {
                        ctx.lineWidth = node.stroke * unit;
                        ctx.strokeStyle = scene.palette[node.color];
                        ctx.stroke();
                    } else ctx.fill();
                    break;
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
    const progress = clamp(frame.frame / Math.max(1, duration - 1));
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
        case "graph": drawGraph(frame, scene.params.layers, progress, assets); break;
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
