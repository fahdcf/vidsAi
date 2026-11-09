import { z } from "zod";
import { normalizeDocument } from "../../shared/contracts";
import { motionCuesSchema } from "../../shared/motion/schema";
import { db, insert, json, project, update } from "../database";
import { document } from "../document";
import { fail, hash } from "../security";
import { createMotionProject, motionProjectInput } from "./projects";
import { motionReference } from "./references";
import { appendMotionEvent, createMotionRun, motionRun, ownedMotionRun } from "./store";

const requirements = z.object({ reference: z.boolean(), audio: z.boolean(), logo: z.boolean() }).strict();
const createInput = motionProjectInput.extend({ attachments: requirements });
const finishInput = z.object({
    referenceBindingId: z.uuid().nullable(),
    logoId: z.uuid().nullable(),
    audio: z.object({ id: z.uuid(), cues: motionCuesSchema }).strict().nullable(),
}).strict();
type SetupRow = { requirements: string; setup_hash: string; finished_hash: string | null };

function setupRow(runId: string) {
    return db.prepare("SELECT * FROM motion_setup WHERE run_id=?").get(runId) as SetupRow | undefined;
}

export function pendingMotionSetup(runId: string) {
    const setup = setupRow(runId);
    return setup && !setup.finished_hash ? requirements.parse(json(setup.requirements, null)) : null;
}

export function setupMotionProject(accountId: number, raw: unknown) {
    const { attachments, ...input } = createInput.parse(raw);
    const digest = hash(JSON.stringify(attachments));
    return db.transaction(() => {
        const projectId = createMotionProject(accountId, input);
        const run = createMotionRun(projectId, accountId, { requestId: input.requestId, brief: input.prompt });
        const setup = setupRow(run.id);
        if (setup) {
            if (setup.setup_hash !== digest) fail(409, "This project request already has different attachments.");
        } else {
            const needsFiles = Object.values(attachments).some(Boolean);
            insert("motion_setup", { run_id: run.id, requirements: JSON.stringify(attachments), setup_hash: digest,
                finished_hash: needsFiles ? null : digest });
            if (needsFiles) appendMotionEvent(run.id, "setup_pending", attachments);
        }
        return { projectId, id: run.id, name: input.name, pendingSetup: pendingMotionSetup(run.id),
            redirect: `/projects/${projectId}/motion?run=${run.id}` };
    }).immediate();
}

export function finalizeMotionSetup(runId: string, accountId: number, raw: unknown) {
    const input = finishInput.parse(raw);
    const digest = hash(JSON.stringify(input));
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        const setup = setupRow(runId);
        if (!setup) fail(404, "Motion setup not found.");
        if (setup.finished_hash) {
            if (setup.finished_hash !== digest) fail(409, "This motion setup was already completed with different attachments.");
            return run;
        }
        if (run.status !== "queued") fail(409, "This motion run needs to be retried before setup can resume.");
        const p = project(run.project_id);
        const snapshot = document(p);
        if (snapshot.revision !== run.starting_revision) fail(409, "This motion project changed during setup.");
        const required = requirements.parse(json(setup.requirements, null));
        if (required.reference !== Boolean(input.referenceBindingId) || required.logo !== Boolean(input.logoId) ||
            required.audio !== Boolean(input.audio)) fail(422, "Complete the attachments selected for this project.");
        if (input.referenceBindingId) {
            const ref = motionReference(run.project_id);
            if (!ref?.available || ref.bindingId !== input.referenceBindingId) fail(409, "Relink the current reference.");
        }
        const asset = (id: string, kind: string) => {
            const row = db.prepare(`SELECT a.duration_seconds FROM project_assets a JOIN motion_asset_metadata m ON m.asset_id=a.id
                WHERE a.id=? AND a.project_id=? AND m.kind=?`).get(id, p.id, kind) as { duration_seconds: number | null } | undefined;
            if (!row) fail(422, "An attachment is unavailable for this project.");
            return row;
        };
        if (input.logoId) {
            asset(input.logoId, "image");
            snapshot.tracks.overlays.push({
                id: "motion-logo", src: `/projects/${p.id}/assets/${input.logoId}`, start_frame: 0, end_frame: snapshot.total_frames,
                position: "top-right", width: Math.round(snapshot.width * 0.12), opacity: 1, animation: "none",
            });
        }
        if (input.audio) {
            const soundtrack = asset(input.audio.id, "audio");
            const end = Math.min(snapshot.total_frames, Math.floor((soundtrack.duration_seconds ?? 0) * snapshot.fps));
            if (end < 1) fail(422, "The soundtrack has no playable audio.");
            snapshot.tracks.audio.push({ id: "motion-soundtrack", url: `asset:${input.audio.id}`, type: "music",
                start_frame: 0, end_frame: end, volume: 0.65, fade_in_frames: Math.min(4, end), fade_out_frames: Math.min(12, end) });
            snapshot.metadata.motion_cues = input.audio.cues.filter(({ frame }) => frame < end);
        }
        const ready = normalizeDocument(snapshot);
        update("projects", p.id, { edit_state: JSON.stringify(ready) });
        db.prepare("UPDATE motion_runs SET reference_binding_id=?,snapshot=?,updated_at=? WHERE id=?")
            .run(input.referenceBindingId, JSON.stringify(ready), Date.now(), run.id);
        db.prepare("UPDATE motion_setup SET finished_hash=? WHERE run_id=?").run(digest, run.id);
        appendMotionEvent(run.id, "setup_completed", {});
        return motionRun(run.id)!;
    }).immediate();
}
