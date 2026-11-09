import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { motionBenchmark } from "../scripts/fixtures/motion-benchmark";
import { insert, project } from "./database";
import { commit, document } from "./document";
import {
    applySavedMotionDraft, changeMotionRunStatus, finishMotionStep, startMotionStep,
} from "./motion/orchestrator";
import { createMotionProject } from "./motion/projects";
import { pendingMotionSetup, setupMotionProject } from "./motion/setup";
import { addMotionStep, createMotionRun, motionSteps } from "./motion/store";

const owner = (name: string) => Number(insert("users", { name, email: name + "@fixture.test", password: "hash" }));

test("motion creation is atomic, account-scoped, and idempotent during uploads", () => {
    const account = owner("setup-owner"), second = owner("setup-other");
    const input = { requestId: randomUUID(), name: "Reel", prompt: "Animate the title",
        attachments: { reference: true, audio: false, logo: false } };
    const run = setupMotionProject(account, input);
    assert.deepEqual(setupMotionProject(account, input), run);
    assert.deepEqual(pendingMotionSetup(run.id), input.attachments);
    assert.throws(() => setupMotionProject(account, { ...input, attachments: { ...input.attachments, logo: true } }), { status: 409 });
    assert.notEqual(setupMotionProject(second, input).projectId, run.projectId);
});

test("focused chat revisions preserve other scenes and support undo with revision checks", () => {
    const account = owner("edit-owner"), second = owner("edit-other");
    const id = createMotionProject(account, { requestId: randomUUID(), name: "Reel", prompt: "Animate the title" });
    const original = document(project(id));
    const fixture = motionBenchmark(true);
    const scenes = fixture.tracks.motion_graphics;
    commit(project(id), { commandId: randomUUID(), expectedRevision: original.revision,
        operations: [{ tool: "replace_motion_plan", params: { title: "Original", scenes } }] });
    const saved = document(project(id));
    const targetSceneId = scenes[0].id;
    const run = createMotionRun(id, account, { requestId: randomUUID(), brief: "Slow down the first scene", targetSceneId });
    const plan = { title: "Revised", scenes: [{ ...scenes[0], motionRate: 0.75 }, ...scenes.slice(1)] };
    addMotionStep(run.id, { name: "assemble", lane: "local" });
    const step = startMotionStep(run, motionSteps(run.id)[0], 10_000)!;
    assert.equal(finishMotionStep(run, step, { value: { plan, document: saved } }), true);
    changeMotionRunStatus(run, "ready");
    const input = { expectedRevision: saved.revision, partial: false };
    assert.throws(() => applySavedMotionDraft(run.id, second, input), { status: 404 });
    assert.throws(() => applySavedMotionDraft(run.id, account, { ...input, expectedRevision: saved.revision - 1 }), { status: 409 });
    const accepted = applySavedMotionDraft(run.id, account, input);
    assert.deepEqual(applySavedMotionDraft(run.id, account, input), accepted);
    const after = document(project(id));
    assert.equal(after.revision, saved.revision + 1);
    assert.equal(after.tracks.motion_graphics[0].motionRate, 0.75);
    assert.deepEqual(after.tracks.motion_graphics.slice(1), saved.tracks.motion_graphics.slice(1));
    assert.equal(after.metadata.motion_generation?.runId, run.id);
    commit(project(id), { commandId: randomUUID(), expectedRevision: after.revision, restoreRevision: saved.revision });
    const restored = document(project(id));
    assert.deepEqual(restored.tracks.motion_graphics, saved.tracks.motion_graphics);
});
