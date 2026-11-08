import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db, insert, now } from "./database";
import { enqueue, retireLegacyRenderJobs, tick } from "./jobs";
import { reserveProviderRequest } from "./provider-budget";

test("provider budget counts distinct requests and permits an idempotent replay", () => {
    const account = 987654;
    for (let i = 0; i < 5; i++) reserveProviderRequest(account, "generate", String(i));
    reserveProviderRequest(account, "generate", "0");
    assert.throws(() => reserveProviderRequest(account, "generate", "new"), { status: 429 });
    assert.equal(db.prepare("SELECT COUNT(*) FROM node_provider_requests WHERE account_id=?").pluck().get(account), 5);
    db.prepare("DELETE FROM node_provider_requests WHERE account_id=?").run(account);
});
test("legacy server render jobs retire without resubmission", async () => {
    const original = globalThis.fetch;
    const userId = Number(
        insert("users", {
            name: "Queue test",
            email: crypto.randomUUID() + "@example.test",
            password: "not-used",
            created_at: now(),
            updated_at: now(),
        }),
    );
    const projectId = Number(
        insert("projects", {
            user_id: userId,
            name: "Queue recovery",
            type: "product",
            category: "test",
            description: "test",
            script_option: "paste",
            voiceover_option: "upload",
            status: "subtitle_generating",
            created_at: now(),
            updated_at: now(),
        }),
    );
    const exportId = crypto.randomUUID();
    insert("video_exports", {
        id: exportId,
        project_id: projectId,
        revision: 1,
        snapshot: "{}",
        status: "queued",
        created_at: now(),
        updated_at: now(),
    });
    const job = enqueue(projectId, "render", { exportId });
    try {
        globalThis.fetch = async () => { throw new Error("No renderer may be contacted"); };
        await tick();
        assert.equal(db.prepare("SELECT status FROM node_jobs WHERE id=?").pluck().get(job), "queued");
        retireLegacyRenderJobs();
        retireLegacyRenderJobs();
        assert.equal(db.prepare("SELECT status FROM node_jobs WHERE id=?").pluck().get(job), "cancelled");
        assert.equal(db.prepare("SELECT status FROM video_exports WHERE id=?").pluck().get(exportId), "failed");
        assert.equal(db.prepare("SELECT status FROM projects WHERE id=?").pluck().get(projectId), "subtitle_selection");
        assert.equal(db.prepare("SELECT snapshot FROM video_exports WHERE id=?").pluck().get(exportId), "{}");
    } finally {
        globalThis.fetch = original;
        db.prepare("DELETE FROM node_jobs WHERE project_id=?").run(projectId);
        db.prepare("DELETE FROM users WHERE id=?").run(userId);
    }
});
