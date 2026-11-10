import { z } from "zod";
import type { Document, Operation } from "../contracts";
import { compileMotionPlan, motionPlanSchema, motionSceneExceedsBudget } from "./compile";
import { graphLayers, type MotionGraphNode } from "./graph";
import { motionCuesSchema, motionLayout, motionPalette, motionSceneId, motionSceneSchema } from "./schema";

export const motionEditParameters = {
    replace_motion_plan: motionPlanSchema,
    add_motion_scene: motionSceneSchema,
    update_motion_scene: z.object({
        id: motionSceneId,
        patch: z.object({
            params: z.record(z.string(), z.unknown()).optional(),
            font: z.enum(["archivo_black", "space_mono", "system"]).optional(),
            layout: motionLayout.partial().optional(),
            layer: z.number().int().min(0).max(31).optional(),
            motionRate: z.number().min(0.5).max(2).optional(),
            transitionIn: z.object({ kind: z.enum(["fade", "wipe", "scale"]), frames: z.number().int().min(1).max(60) }).strict().nullable().optional(),
        }).strict(),
    }).strict(),
    link_motion_asset: z.object({ id: motionSceneId, layerId: motionSceneId, assetId: z.uuid(), kind: z.enum(["image", "vectors"]) }).strict(),
    remove_motion_scene: z.object({ id: motionSceneId }).strict(),
    reorder_motion_scenes: z.object({ order: z.array(motionSceneId).min(1).max(8) }).strict(),
    set_motion_palette: z.object({ id: motionSceneId.optional(), palette: motionPalette.partial() }).strict(),
    set_motion_text: z.object({ id: motionSceneId, layerId: motionSceneId.optional(), text: z.string().trim().min(1).max(180) }).strict(),
    set_motion_timing: z.object({
        id: motionSceneId,
        start_frame: z.number().int().nonnegative(),
        end_frame: z.number().int().positive(),
    }).strict(),
    set_motion_cut: z.object({ id: motionSceneId, frame: z.number().int().positive() }).strict(),
    set_music_cues: z.object({ cues: motionCuesSchema, syncImpact: z.boolean().default(false) }).strict(),
};

function findText(nodes: MotionGraphNode[], id: string): Extract<MotionGraphNode, { kind: "text" }> | undefined {
    for (const node of nodes) {
        if (node.kind === "text" && node.id === id) return node;
        if (node.kind === "group") {
            const found = findText(node.children, id);
            if (found) return found;
        }
    }
}

export function applyMotionEdit(document: Document, op: Operation) {
    const scenes = document.tracks.motion_graphics;
    function find(id: string) {
        const scene = scenes.find((item) => item.id === id);
        if (!scene) throw new Error("Unknown motion scene.");
        return scene;
    }
    switch (op.tool) {
        case "replace_motion_plan": {
            const next = compileMotionPlan(op.params, document);
            document.tracks.motion_graphics = next.tracks.motion_graphics;
            if (next.metadata.motion_generation) document.metadata.motion_generation = next.metadata.motion_generation;
            break;
        }
        case "add_motion_scene":
            scenes.push(motionEditParameters.add_motion_scene.parse(op.params));
            break;
        case "update_motion_scene": {
            const { id, patch } = motionEditParameters.update_motion_scene.parse(op.params);
            const scene = find(id);
            scenes[scenes.indexOf(scene)] = motionSceneSchema.parse({
                ...scene, ...patch,
                transitionIn: patch.transitionIn === null ? undefined : patch.transitionIn ?? scene.transitionIn,
                layout: { ...scene.layout, ...patch.layout },
                params: { ...scene.params, ...patch.params },
            });
            break;
        }
        case "remove_motion_scene": {
            const { id } = motionEditParameters.remove_motion_scene.parse(op.params);
            scenes.splice(scenes.indexOf(find(id)), 1);
            break;
        }
        case "link_motion_asset": {
            const { id, layerId, assetId, kind } = motionEditParameters.link_motion_asset.parse(op.params);
            const scene = find(id);
            if (scene.type !== "graph") throw new Error("Choose a custom composition to link a motion asset.");
            if (!scene.assets.some((asset) => asset.id === assetId)) scene.assets.push({ id: assetId, kind });
            scene.params.layers = graphLayers.parse([...scene.params.layers,
                { id: layerId, kind: kind === "image" ? "image" : "vector", assetId, width: 0.5, height: 0.5 }]);
            if (motionSceneExceedsBudget(scene)) throw new Error("This asset would exceed the scene's render budget.");
            break;
        }
        case "reorder_motion_scenes": {
            const { order } = motionEditParameters.reorder_motion_scenes.parse(op.params);
            if (order.length !== scenes.length || new Set(order).size !== scenes.length) {
                throw new Error("Motion order must include every scene exactly once.");
            }
            let start = 0;
            document.tracks.motion_graphics = order.map((id) => {
                const scene = find(id);
                const duration = scene.end_frame - scene.start_frame;
                const next = { ...scene, start_frame: start, end_frame: start + duration };
                start += duration;
                return next;
            });
            break;
        }
        case "set_motion_palette": {
            const { id, palette } = motionEditParameters.set_motion_palette.parse(op.params);
            for (const scene of id ? [find(id)] : scenes) scene.palette = { ...scene.palette, ...palette };
            break;
        }
        case "set_motion_text": {
            const { id, layerId, text } = motionEditParameters.set_motion_text.parse(op.params);
            const scene = find(id);
            switch (scene.type) {
                case "impact": scene.params.headline = text; break;
                case "identity": scene.params.title = text; break;
                case "easing": scene.params.heading = text; break;
                case "kinetic_words": scene.params.words = text.split(/\s+/); break;
                case "graph": {
                    const layer = layerId && findText(scene.params.layers, layerId);
                    if (!layer) throw new Error("Unknown motion text layer.");
                    if (text !== layer.text) delete layer.spans;
                    layer.text = text;
                    break;
                }
                default: throw new Error("This motion component has no editable text.");
            }
            break;
        }
        case "set_motion_timing": {
            const { id, ...span } = motionEditParameters.set_motion_timing.parse(op.params);
            Object.assign(find(id), span);
            break;
        }
        case "set_motion_cut": {
            const { id, frame } = motionEditParameters.set_motion_cut.parse(op.params);
            const scene = find(id);
            const next = scenes.find((item) => item.start_frame === scene.end_frame);
            if (!next || frame <= scene.start_frame || frame >= next.end_frame) {
                throw new Error("Keep the cut between the neighboring scene boundaries.");
            }
            scene.end_frame = frame;
            next.start_frame = frame;
            for (const item of [scene, next]) {
                if (item.transitionIn) {
                    const available = item.end_frame - item.start_frame - 1;
                    if (available < 1) delete item.transitionIn;
                    else item.transitionIn.frames = Math.min(available, item.transitionIn.frames);
                }
            }
            break;
        }
        case "set_music_cues": {
            const { cues, syncImpact } = motionEditParameters.set_music_cues.parse(op.params);
            document.metadata.motion_cues = cues;
            if (syncImpact) {
                for (const scene of scenes) {
                    if (scene.type !== "impact") continue;
                    const length = scene.end_frame - scene.start_frame;
                    const original = scene.start_frame + scene.params.impactAt * length;
                    let nearest: number | undefined;
                    for (const { frame } of cues) {
                        const phase = (frame - scene.start_frame) / length;
                        if (phase < 0.15 || phase > 0.7 || Math.abs(frame - original) > document.fps * 0.18) continue;
                        if (nearest === undefined || Math.abs(frame - original) < Math.abs(nearest - original)) nearest = frame;
                    }
                    if (nearest !== undefined) scene.params.impactAt = (nearest - scene.start_frame) / length;
                }
            }
            break;
        }
        default: throw new Error("Unknown motion operation.");
    }
}
