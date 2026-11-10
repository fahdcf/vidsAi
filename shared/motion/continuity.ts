import type { MotionGraphNode } from "./graph";
import type { MotionScene } from "./schema";

function hasChangingContent(node: MotionGraphNode, root = true): boolean {
    if (!root && (node.keyframes.length || node.animation?.length)) return true;
    if (root && node.animation?.some(({ property }) => ["reveal", "draw", "textReveal", "deform"].includes(property))) return true;
    if (node.kind === "group") return node.children.some((child) => hasChangingContent(child, false));
    return node.kind === "vector" || (node.kind === "rect" && Boolean(node.audioReactive)) ||
        (node.kind === "widget" && node.variant === "waveform");
}

function content({ transform: _transform, keyframes: _keyframes, animation: _animation, ...shape }: MotionGraphNode) {
    return JSON.stringify(shape);
}

export function motionContinuityTarget(scene: MotionScene, scenes: readonly MotionScene[]) {
    if (scene.type !== "graph" || !scene.params.continuity) return undefined;
    const { nextSceneId, nodeIds, frames } = scene.params.continuity;
    const next = scenes.find(({ id }) => id === nextSceneId);
    if (next?.type !== "graph" || next.start_frame !== scene.end_frame || next.transitionIn ||
        next.layer !== scene.layer || frames > scene.end_frame - scene.start_frame || next.font !== scene.font ||
        next.fontAssetId !== scene.fontAssetId || JSON.stringify(next.palette) !== JSON.stringify(scene.palette)) return undefined;
    const checked = nodeIds.every((id) => {
        const from = scene.params.layers.find((node) => node.id === id), to = next.params.layers.find((node) => node.id === id);
        return from && to && !hasChangingContent(from) && !hasChangingContent(to) && content(from) === content(to);
    });
    return checked ? next : undefined;
}
