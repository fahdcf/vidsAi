import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db, insert, json, project } from "../database";
import { document } from "../document";
import { fail, hash } from "../security";
import type { Document } from "../../shared/contracts";
import { motionSceneId } from "../../shared/motion/schema";

export type RunStatus = "queued" | "working" | "waiting_for_browser" | "ready" | "failed" | "cancelled";
export type MotionRun = {
    id: string;
    project_id: number;
    account_id: number;
    starting_revision: number;
    brief: string;
    snapshot: string;
    reference_binding_id: string | null;
    target_scene_id: string | null;
    status: RunStatus;
    error: string | null;
    created_at: number;
    updated_at: number;
};
type Lane = "provider" | "browser" | "local";
export type MotionStep = {
    id: string;
    run_id: string;
    name: string;
    lane: Lane;
    dependencies: string;
    input: string;
    status: "pending" | "running" | "done" | "failed" | "cancelled";
    attempts: number;
    lease_token: string | null;
    lease_expires: number | null;
    started_at: number | null;
    result_id: string | null;
    error: string | null;
};
export type MotionStepInput = { name: string; lane: Lane; dependencies?: readonly string[]; input?: unknown };
const runInput = z.object({
    requestId: z.uuid(),
    brief: z.string().trim().min(1).max(4000),
    referenceBindingId: z.uuid().nullable().default(null),
    targetSceneId: motionSceneId.nullable().default(null),
}).strict();

export function motionRun(id: string) {
    return db.prepare("SELECT * FROM motion_runs WHERE id=?").get(id) as MotionRun | undefined;
}

export function ownedMotionRun(id: string, accountId: number) {
    const row = db.prepare("SELECT r.* FROM motion_runs r JOIN projects p ON p.id=r.project_id WHERE r.id=? AND r.account_id=? AND p.user_id=?")
        .get(id, accountId, accountId) as MotionRun | undefined;
    if (!row) fail(404, "Motion run not found.");
    return row;
}

export function createMotionRun(projectId: number, accountId: number, raw: unknown, recordBrief = true) {
    const input = runInput.parse(raw);
    const digest = hash(JSON.stringify(input));
    return db.transaction(() => {
        const p = project(projectId);
        if (!p || p.user_id !== accountId || p.workflow !== "motion_graphics") fail(404, "Motion project not found.");
        const prior = db.prepare("SELECT id,input_hash FROM motion_runs WHERE project_id=? AND request_id=?")
            .get(projectId, input.requestId) as { id: string; input_hash: string } | undefined;
        if (prior) {
            const { targetSceneId, ...legacyInput } = input;
            if (prior.input_hash !== digest && (targetSceneId || prior.input_hash !== hash(JSON.stringify(legacyInput)))) {
                fail(409, "This run request already has different inputs.");
            }
            return motionRun(prior.id)!;
        }
        if (db.prepare("SELECT id FROM motion_runs WHERE project_id=? AND status IN ('queued','working','waiting_for_browser')").get(projectId)) {
            fail(409, "This project already has an active motion run.");
        }
        if (input.referenceBindingId && !db.prepare("SELECT 1 FROM motion_references WHERE project_id=? AND binding_id=?")
            .get(projectId, input.referenceBindingId)) fail(409, "The selected reference was replaced.");
        const snapshot = document(p);
        if (input.targetSceneId && !snapshot.tracks.motion_graphics.some(({ id }) => id === input.targetSceneId)) {
            fail(422, "Choose an existing motion scene to revise.");
        }
        const timestamp = Date.now();
        const id = randomUUID();
        insert("motion_runs", {
            id, project_id: projectId, account_id: accountId, request_id: input.requestId,
            input_hash: digest, starting_revision: snapshot.revision, brief: input.brief,
            snapshot: JSON.stringify(snapshot), reference_binding_id: input.referenceBindingId, target_scene_id: input.targetSceneId,
            status: "queued", created_at: timestamp, updated_at: timestamp,
        });
        if (recordBrief) appendMotionMessage(id, "user", input.brief);
        appendMotionEvent(id, "run_queued", { status: "queued" });
        return motionRun(id)!;
    }).immediate();
}

export function motionSnapshot(run: MotionRun): Document {
    return json(run.snapshot, null) as unknown as Document;
}

export function motionSteps(runId: string) {
    return db.prepare("SELECT * FROM motion_steps WHERE run_id=? ORDER BY rowid").all(runId) as MotionStep[];
}

export function addMotionStep(runId: string, step: MotionStepInput) {
    const input = JSON.stringify(step.input ?? {});
    if (input.length > 80_000) throw new Error("Motion step input exceeds its limit.");
    db.prepare("INSERT OR IGNORE INTO motion_steps(id,run_id,name,lane,dependencies,input,status) VALUES(?,?,?,?,?,?,'pending')")
        .run(randomUUID(), runId, step.name, step.lane, JSON.stringify(step.dependencies ?? []), input);
}

export function appendMotionEvent(runId: string, type: string, data: unknown) {
    const body = JSON.stringify(data);
    if (body.length > 16_000) throw new Error("Motion event exceeds its limit.");
    insert("motion_events", { run_id: runId, type, data: body, created_at: Date.now() });
}

export function motionEvents(runId: string, after: number) {
    return (db.prepare("SELECT id,type,data,created_at FROM motion_events WHERE run_id=? AND id>? ORDER BY id LIMIT 100")
        .all(runId, after) as { id: number; type: string; data: string; created_at: number }[])
        .map((row) => ({ ...row, data: json(row.data, {}) }));
}

export function appendMotionMessage(runId: string, role: "user" | "assistant" | "system", text: string) {
    if (!text.trim() || text.length > 4000) throw new Error("Motion chat message length is invalid.");
    insert("motion_messages", { run_id: runId, role, text, created_at: Date.now() });
}

export function motionMessages(runId: string) {
    return db.prepare("SELECT id,role,text,created_at FROM motion_messages WHERE run_id=? ORDER BY id").all(runId);
}

export function motionConversation(run: MotionRun) {
    return db.prepare(`SELECT * FROM (
        SELECT m.id,m.role,m.text,m.created_at,m.run_id FROM motion_messages m
        JOIN motion_runs r ON r.id=m.run_id
        WHERE r.project_id=? AND r.account_id=?
        ORDER BY m.id DESC LIMIT 150
    ) ORDER BY id`).all(run.project_id, run.account_id);
}

export function writeMotionArtifact(runId: string, kind: string, body: Buffer) {
    if (!body.length || body.length > 4 * 1024 * 1024) throw new Error("Motion artifact size is invalid.");
    const id = randomUUID();
    const digest = createHash("sha256").update(body).digest("hex");
    insert("motion_artifacts", { id, run_id: runId, kind, digest, body, created_at: Date.now() });
    return { id, kind, digest, bytes: body.length };
}

export function motionArtifact(runId: string, id: string) {
    return db.prepare("SELECT id,kind,digest,body FROM motion_artifacts WHERE id=? AND run_id=?")
        .get(id, runId) as { id: string; kind: string; digest: string; body: Buffer } | undefined;
}
