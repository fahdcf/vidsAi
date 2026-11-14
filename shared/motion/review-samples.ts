import type { MotionGraphNode } from "./graph";
import type { MotionScene } from "./schema";
import { motionLayoutFrames } from "./layout-measure";

export function motionEventSamples(scene: MotionScene, cue?: number) {
    const first = scene.start_frame, last = scene.end_frame - 1;
    const middle = cue ?? first + Math.floor((last - first) / 2);
    if (scene.type !== "graph") return [first + Math.floor((last - first) * 0.16), middle, first + Math.floor((last - first) * 0.86)];
    const toFrame = (progress: number) => first + Math.round(progress ** (scene.motionRate ?? 1) * (last - first));
    const layers = [...scene.params.layers];
    const events: { start: number; end: number; node: MotionGraphNode }[] = [];
    for (const node of layers) {
        if (node.kind === "group") layers.push(...node.children);
        for (const interval of node.animation ?? []) {
            if (interval.from !== interval.to) events.push({ start: toFrame(interval.start), end: toFrame(interval.end), node });
        }
    }
    const entrance = events.find(({ node }) => node.kind === "text" || node.kind === "widget") ?? events[0];
    const hold = Math.min(last, Math.max(middle, entrance?.end ?? middle));
    const candidates = motionLayoutFrames(scene);
    const landmark = entrance ? Math.round((entrance.start + entrance.end) / 2) : first + candidates[Math.floor(candidates.length * 0.25)];
    return [...new Set([first, landmark, hold, last])].sort((a, b) => a - b);
}
