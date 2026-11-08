import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db, insert, now, project, update } from "./database";
import { enqueue, retireLegacyRenderJobs, tick } from "./jobs";
import { reserveProviderRequest } from "./provider-budget";
import { document } from "./document";

test("provider budget counts distinct requests and permits an idempotent replay", () => {
    const account = 987654;
    for (let i = 0; i < 5; i++) reserveProviderRequest(account, "generate", String(i));
    reserveProviderRequest(account, "generate", "0");
    assert.throws(() => reserveProviderRequest(account, "generate", "new"), { status: 429 });
    assert.equal(db.prepare("SELECT COUNT(*) FROM node_provider_requests WHERE account_id=?").pluck().get(account), 5);
    db.prepare("DELETE FROM node_provider_requests WHERE account_id=?").run(account);
});

test("a generated clip cannot overwrite edits made during the provider request", async () => {
    const account = Number(insert("users", {
        name: "WAN fixture", email: crypto.randomUUID() + "@example.test", password: "unused",
    }));
    const projectId = Number(insert("projects", {
        user_id: account, name: "WAN fixture", type: "product", category: "test",
        description: "test", script_option: "paste", voiceover_option: "upload", status: "subtitle_selection",
    }));
    const originalUrl = "https://example.test/original.mp4";
    const scene = Number(insert("scenes", {
        project_id: projectId, scene_number: 1, script_text: "Test clip", status: "regenerating",
        video_url: originalUrl, gemini_duration: 2, duration_seconds: 2,
    }));
    const current = document(project(projectId));
    const job = enqueue(projectId, "wan", { sceneId: scene, startingRevision: current.revision, taskId: "fixture" });
    update("scenes", scene, { job_id: job });
    const fetchOriginal = globalThis.fetch;
    try {
        globalThis.fetch = async () => {
            const next = { ...current, revision: current.revision + 1, width: 720, height: 1280 };
            update("projects", projectId, { edit_state: JSON.stringify(next) });
            return Response.json({ output: { task_status: "SUCCEEDED", video_url: "https://example.test/generated.mp4" } });
        };
        await tick();
        assert.equal(db.prepare("SELECT status FROM node_jobs WHERE id=?").pluck().get(job), "failed");
        assert.equal(db.prepare("SELECT video_url FROM scenes WHERE id=?").pluck().get(scene), originalUrl);
        assert.equal(document(project(projectId)).revision, current.revision + 1);
    } finally {
        globalThis.fetch = fetchOriginal;
        db.prepare("DELETE FROM node_jobs WHERE project_id=?").run(projectId);
        db.prepare("DELETE FROM users WHERE id=?").run(account);
    }
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
