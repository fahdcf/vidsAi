import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db, insert, now } from "./database";
import { requestReset, resetPassword } from "./recovery";
import { runtime } from "./env";
test("password recovery uses a private outbox, expiring single-use token and session invalidation", async () => {
    const email = crypto.randomUUID() + "@example.test";
    const id = insert("users", {
        name: "Recovery test",
        email,
        password: await bcrypt.hash("old-password", 4),
        created_at: now(),
        updated_at: now(),
    });
    const old = process.env.MAIL_MAILER;
    process.env.MAIL_MAILER = "log";
    try {
        await requestReset(email);
        const folder =
            process.env.NODE_MAIL_OUTBOX ||
            path.join(runtime, "node-mail-outbox");
        const mail = fs
            .readdirSync(folder)
            .map((f) =>
                JSON.parse(fs.readFileSync(path.join(folder, f), "utf8")),
            )
            .find((m) => m.to === email);
        assert.ok(mail);
        const link = mail.text.match(/https?:\/\/\S+/)[0];
        const token = new URL(link).searchParams.get("token")!;
        assert.notEqual(
            db
                .prepare(
                    "SELECT token_hash FROM node_password_resets WHERE email=?",
                )
                .pluck()
                .get(email),
            token,
        );
        insert("node_sessions", {
            id: crypto.randomUUID(),
            user_id: id,
            csrf: "test",
            expires: Date.now() + 10000,
        });
        await resetPassword(email, token, "new-password");
        assert.ok(
            await bcrypt.compare(
                "new-password",
                db
                    .prepare("SELECT password FROM users WHERE id=?")
                    .pluck()
                    .get(id) as string,
            ),
        );
        assert.equal(
            db
                .prepare("SELECT count(*) FROM node_sessions WHERE user_id=?")
                .pluck()
                .get(id),
            0,
        );
        await assert.rejects(resetPassword(email, token, "another-password"));
    } finally {
        db.prepare("DELETE FROM users WHERE id=?").run(id);
        db.prepare("DELETE FROM node_password_resets WHERE email=?").run(email);
        if (old === undefined) delete process.env.MAIL_MAILER;
        else process.env.MAIL_MAILER = old;
    }
});
