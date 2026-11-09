import { normalizeDocument } from "../../shared/contracts";
import { motionStyleRecipes } from "../../shared/motion/schema";

const reference = [
    { id: "gravity", type: "impact", end: 2, params: { headline: "I MAKE\nTHINGS MOVE.", highlightLastWord: true }, samples: [0.6, 1.1, 1.8] },
    { id: "typography", type: "kinetic_words", end: 4, params: { words: ["TIMING", "SPACING", "EASING", "FEEL."] }, samples: [2.3, 2.8, 3.3, 3.8] },
    { id: "systems", type: "grid", end: 6, params: {}, samples: [4.1, 4.6, 5.1, 5.6] },
    { id: "curve", type: "easing", end: 8, params: {}, samples: [6.2, 6.9, 7.6] },
    { id: "depth", type: "tunnel", end: 10.35, params: {}, samples: [8.5, 9.1, 9.8] },
    { id: "liquid", type: "liquid", end: 12.5, params: { mode: "procedural" }, samples: [10.6, 11.1, 11.6, 12.1] },
    { id: "identity", type: "identity", end: 15, params: { title: "VIDSAI", detail: "MOTION DESIGN / SHOWREEL", tag: "MAKE THINGS MOVE" }, samples: [12.6, 13.2, 14.5] },
] as const;

export const motionReferenceTimes = reference.flatMap(({ samples }) => [...samples]);

export function motionBenchmark(full: boolean) {
    const fps = 30;
    const scenes = full ? reference : [reference[0], reference[1], reference[6]];
    let endFrame = 0;
    const motion_graphics = scenes.map(({ id, type, end, params }, index) => {
        const start_frame = endFrame;
        endFrame = full ? Math.round(end * fps) : (index + 1) * fps;
        return {
            id, type, params, start_frame, end_frame: endFrame, componentVersion: 1,
            seed: 3200 + index, palette: motionStyleRecipes.reference,
            finish: { grain: 0.045, vignette: 0.18, framing: true },
        };
    });
    const timestamp = "2026-11-09T00:00:00.000Z";
    return normalizeDocument({
        project_id: "motion-benchmark", version: 1, fps, total_frames: endFrame,
        width: full ? 1280 : 640, height: full ? 720 : 360,
        tracks: { video: [], audio: [], subtitles: [], overlays: [], motion_graphics },
        metadata: { workflow: "motion_graphics", language: "english", platform: null, created_at: timestamp, last_modified: timestamp },
    });
}
