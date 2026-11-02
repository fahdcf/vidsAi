import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db, insert, update, now } from "./database";
import { enqueue, tick } from "./jobs";
test("export polling recovers a connection failure and an expired lease without resubmission", async () => {
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
    let submissions = 0;
    let checks = 0;
    try {
        globalThis.fetch = async (url, options) => {
            if (String(url).endsWith("/render")) {
                submissions++;
                assert.equal(
                    JSON.parse(String(options?.body)).requestId,
                    exportId,
                );
                return new Response(
                    JSON.stringify({ jobId: "persisted-render" }),
                );
            }
            if (++checks === 1) throw new TypeError("fetch failed");
            return new Response(
                JSON.stringify({ status: "done", progress: 1 }),
            );
        };
        await tick();
        let row = db
            .prepare("SELECT * FROM node_jobs WHERE id=?")
            .get(job) as any;
        assert.equal(row.status, "queued");
        assert.equal(
            (
                db
                    .prepare(
                        "SELECT worker_job_id FROM video_exports WHERE id=?",
                    )
                    .get(exportId) as any
            ).worker_job_id,
            "persisted-render",
        );
        update("node_jobs", job, {
            status: "running",
            lease: Date.now() - 1,
            available: 0,
        });
        await tick();
        row = db.prepare("SELECT * FROM node_jobs WHERE id=?").get(job) as any;
        assert.equal(row.status, "done");
        assert.equal(submissions, 1);
        assert.equal(
            db
                .prepare("SELECT status FROM projects WHERE id=?")
                .pluck()
                .get(projectId),
            "completed",
        );
        assert.equal(
            db
                .prepare("SELECT snapshot FROM video_exports WHERE id=?")
                .pluck()
                .get(exportId),
            "{}",
        );
    } finally {
        globalThis.fetch = original;
        db.prepare("DELETE FROM node_jobs WHERE project_id=?").run(projectId);
        db.prepare("DELETE FROM users WHERE id=?").run(userId);
    }
});
