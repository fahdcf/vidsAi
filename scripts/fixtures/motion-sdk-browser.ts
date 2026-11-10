import { prepareBrowserProgram } from "../../shared/motion/runtime/browser-program";
import { drawMotionFrame } from "../../shared/motion/render";
import { motionSceneSchema } from "../../shared/motion/schema";
import type { SceneProgram } from "../../shared/motion/scene-program";

export async function inspectMotionSdkExample(raw: SceneProgram) {
    const program = await prepareBrowserProgram(raw, undefined, 30, AbortSignal.timeout(5_000));
    try {
        const commands = await program.prepare(12, 30);
        const scene = motionSceneSchema.parse({ id: "sdk-example", type: "graph", componentVersion: 1, start_frame: 0, end_frame: 30,
            finish: { grain: 0, vignette: 0 }, params: { layers: [{ id: "empty", kind: "rect", width: 0.01, height: 0.01, color: "background" }] } });
        const ctx = new OffscreenCanvas(180, 180).getContext("2d")!;
        drawMotionFrame({ ctx, scene, frame: 12, fps: 30, width: 180, height: 180 }, { fontFamily: "Arial", program });
        const pixels = ctx.getImageData(0, 0, 180, 180).data;
        let painted = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 70 || pixels[i + 1] > 70 || pixels[i + 2] > 70) painted++;
        return { commands, painted, center: [...ctx.getImageData(90, 90, 1, 1).data], nearEdge: [...ctx.getImageData(124, 90, 1, 1).data] };
    } finally { program.close(); }
}
