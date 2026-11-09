import { z } from "zod";
import { normalizeDocument, type Document } from "../contracts";
import { motionTrackSchema, type MotionScene } from "./schema";
import { motionSceneCost } from "./registry";

export const motionPlanSchema = z.object({
    title: z.string().trim().min(1).max(100),
    scenes: motionTrackSchema.min(1),
}).strict();

export function motionSceneExceedsBudget(scene: MotionScene) {
    const cost = motionSceneCost(scene);
    return cost.geometry > 600 || cost.particles > 800 || cost.vectors > 1;
}

export function compileMotionPlan(input: unknown, draft: unknown): Document {
    const document = normalizeDocument(draft);
    if (document.metadata.workflow !== "motion_graphics") throw new Error("A motion project is required.");
    const { scenes } = motionPlanSchema.parse(input);
    const ordered = [...scenes].sort((a, b) => a.start_frame - b.start_frame || a.layer - b.layer);
    let covered = 0;
    for (const scene of ordered) {
        if (scene.start_frame > covered) throw new Error("The motion plan has a gap in its timeline.");
        covered = Math.max(covered, scene.end_frame);
        if (motionSceneExceedsBudget(scene)) {
            throw new Error(`Motion scene ${scene.id} exceeded its rendering budget.`);
        }
    }
    if (covered !== document.total_frames) throw new Error("The motion plan must cover the requested duration.");
    return normalizeDocument({ ...document, tracks: { ...document.tracks, motion_graphics: ordered } });
}
