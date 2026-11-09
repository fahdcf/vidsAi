import assert from "node:assert/strict";
import { test } from "node:test";
import { compileMotionPlan } from "../shared/motion/compile";
import { motionComponentTypes, describeMotionComponent, motionSceneCost } from "../shared/motion/registry";
import { motionSceneSchema } from "../shared/motion/schema";
import { applyOperations } from "../shared/editing-core";
import { motionBenchmark, motionReferenceTimes } from "../scripts/fixtures/motion-benchmark";

test("motion benchmark uses the reference scene order and an exact 15-second timeline", () => {
    const document = motionBenchmark(true);
    assert.equal(document.total_frames, 450);
    assert.equal(document.tracks.motion_graphics.length, 7);
    assert.equal(motionReferenceTimes.length, 24);
    assert.deepEqual(compileMotionPlan({
        title: "Benchmark", scenes: document.tracks.motion_graphics,
    }, document), document);
});

test("registered component defaults form a valid bounded scene", () => {
    for (const type of motionComponentTypes) {
        const entry = describeMotionComponent(type);
        const scene = motionSceneSchema.parse({ id: type, type, componentVersion: entry.componentVersion,
            start_frame: 0, end_frame: 60, params: entry.defaults });
        const cost = motionSceneCost(scene);
        assert.ok(cost.geometry + cost.particles + cost.vectors > 0);
    }
});

test("motion edits preserve untouched scenes and reject invalid plans", () => {
    const document = motionBenchmark(false);
    const changed = applyOperations(document, [{ tool: "set_motion_text", params: { id: "gravity", text: "HELLO" } }]);
    assert.equal(changed.revision, document.revision + 1);
    assert.deepEqual(changed.tracks.motion_graphics.slice(1), document.tracks.motion_graphics.slice(1));
    assert.throws(() => applyOperations(document, [
        { tool: "set_motion_timing", params: { id: "gravity", start_frame: 99, end_frame: 102 } },
    ]));
});
