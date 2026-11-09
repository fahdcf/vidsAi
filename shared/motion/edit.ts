import { z } from "zod";
import type { Document, Operation } from "../contracts";
import { compileMotionPlan, motionPlanSchema } from "./compile";
import type { MotionGraphNode } from "./graph";
import { motionLayout, motionPalette, motionSceneId, motionSceneSchema } from "./schema";

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
        }).strict(),
    }).strict(),
    remove_motion_scene: z.object({ id: motionSceneId }).strict(),
    reorder_motion_scenes: z.object({ order: z.array(motionSceneId).min(1).max(8) }).strict(),
    set_motion_palette: z.object({ id: motionSceneId.optional(), palette: motionPalette.partial() }).strict(),
    set_motion_text: z.object({ id: motionSceneId, layerId: motionSceneId.optional(), text: z.string().trim().min(1).max(180) }).strict(),
    set_motion_timing: z.object({
        id: motionSceneId,
        start_frame: z.number().int().nonnegative(),
        end_frame: z.number().int().positive(),
    }).strict(),
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
        case "replace_motion_plan":
            document.tracks.motion_graphics = compileMotionPlan(op.params, document).tracks.motion_graphics;
            break;
        case "add_motion_scene":
            scenes.push(motionEditParameters.add_motion_scene.parse(op.params));
            break;
        case "update_motion_scene": {
            const { id, patch } = motionEditParameters.update_motion_scene.parse(op.params);
            const scene = find(id);
            scenes[scenes.indexOf(scene)] = motionSceneSchema.parse({
                ...scene, ...patch,
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
        default: throw new Error("Unknown motion operation.");
    }
}
