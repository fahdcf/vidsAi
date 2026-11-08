import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { db } from "./database";
import { runtime } from "./env";
import { hash } from "./security";
test("database import preserves existing users, projects and scene relationships", () => {
    const users = db.prepare("SELECT count(*) AS n FROM users").get() as any;
    const projects = db
        .prepare("SELECT count(*) AS n FROM projects")
        .get() as any;
    const sourceFile = path.join(runtime, "database.sqlite");
    if (
        process.env.NODE_SKIP_LEGACY_IMPORT !== "1" &&
        fs.existsSync(sourceFile)
    ) {
        const source = new Database(sourceFile, { readonly: true });
        try {
            assert.equal(
                users.n,
                source.prepare("SELECT count(*) FROM users").pluck().get(),
            );
            assert.equal(
                projects.n,
                source.prepare("SELECT count(*) FROM projects").pluck().get(),
            );
            for (const table of [
                "scenes",
                "edit_commands",
                "edit_revisions",
                "agent_runs",
                "project_assets",
                "video_exports",
            ])
                assert.equal(
                    db.prepare(`SELECT count(*) FROM ${table}`).pluck().get(),
                    source
                        .prepare(`SELECT count(*) FROM ${table}`)
                        .pluck()
                        .get(),
                );
        } finally {
            source.close();
        }
    } else {
        assert.equal(users.n, 0);
        assert.equal(projects.n, 0);
    }
    assert.equal(
        (
            db
                .prepare(
                    "SELECT count(*) AS n FROM scenes s LEFT JOIN projects p ON p.id=s.project_id WHERE p.id IS NULL",
                )
                .get() as any
        ).n,
        0,
    );
    assert.ok(
        db
            .prepare("SELECT name FROM sqlite_master WHERE name='node_jobs'")
            .get(),
    );
});
test("session tokens are stored as deterministic hashes", () => {
    assert.equal(hash("one"), hash("one"));
    assert.notEqual(hash("one"), hash("two"));
});
