import type { Document } from "../../shared/contracts";
import type { MotionPreview } from "../../shared/motion/browser-tools";
import type { ReferenceSceneSpec } from "../../shared/motion/reference-spec";
import { motionSceneSchema } from "../../shared/motion/schema";
import type { MotionDesign, MotionStoryboard } from "./agents";

export function createMotionLayoutDraft(snapshot: Document, storyboard: MotionStoryboard, design: MotionDesign, specs: ReferenceSceneSpec[]): Document {
    const { width, height } = snapshot;
    const edge = Math.min(width, height);
    const scenes = storyboard.scenes.map((target) => {
        const style = design.scenes.find(({ id }) => id === target.id);
        const spec = specs.find(({ sceneId }) => sceneId === target.id);
        const layers = (spec?.objects ?? []).filter(({ bounds, colorRole, confidence }) => bounds && colorRole !== "background" && confidence >= 0.55)
            .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0)).map(({ id, text, bounds, color, alignment }) => {
                const { left, top, width: w, height: h } = bounds!;
                const transform = { x: left + w / 2, y: top + h / 2 };
                const heightInUnits = h * height / edge;
                return text ? { id, kind: "text", transform, text: text.value, color: color ?? "foreground",
                    size: Math.max(0.015, Math.min(0.4, heightInUnits)), maxWidth: Math.max(0.001, w),
                    typography: { align: alignment ?? "center", boxHeight: Math.max(0.025, Math.min(1, heightInUnits)) } }
                    : { id, kind: "rect", transform, color: color ?? "muted", width: Math.max(0.001, Math.min(2, w * width / edge)),
                        height: Math.max(0.001, Math.min(2, heightInUnits)) };
            });
        if (!layers.length) layers.push({ id: "layout-copy", kind: "text", text: target.copy || target.purpose.slice(0, 180),
            transform: { x: 0.5, y: 0.5 }, size: 0.1, color: "foreground", maxWidth: 0.8, typography: { align: "center", boxHeight: 0.4 } });
        return motionSceneSchema.parse({ ...style, id: target.id, start_frame: target.start_frame, end_frame: target.end_frame,
            type: "graph", componentVersion: 1, finish: { grain: 0, vignette: 0 }, params: { layers } });
    });
    return { ...snapshot, tracks: { ...snapshot.tracks, motion_graphics: scenes } };
}

export function layoutForScene(preview: MotionPreview, sceneId: string) {
    return preview.layout?.find((item) => item.sceneId === sceneId);
}
