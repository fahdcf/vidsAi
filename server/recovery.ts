import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db, now } from "./database";
import { hash, fail } from "./security";
import { runtime, origin } from "./env";
export async function requestReset(email: string) {
    const user = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (!user) return;
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare(
        "INSERT OR REPLACE INTO node_password_resets(email,token_hash,expires) VALUES(?,?,?)",
    ).run(email, hash(token), Date.now() + 1800000);
    const url =
        origin + "/reset-password?" + new URLSearchParams({ email, token });
    const message = {
        to: email,
        from: process.env.MAIL_FROM_ADDRESS || "noreply@localhost",
        subject: "Reset your VidsAI password",
        text: `Reset your password using this link within 30 minutes: ${url}\nIf you did not request this, ignore this message.`,
    };
    if (process.env.MAIL_MAILER === "smtp") {
        const username = process.env.MAIL_USERNAME;
        const transport = nodemailer.createTransport({
            host: process.env.MAIL_HOST || "127.0.0.1",
            port: Number(process.env.MAIL_PORT) || 1025,
            secure: process.env.MAIL_ENCRYPTION === "ssl",
            auth:
                username && username !== "null"
                    ? { user: username, pass: process.env.MAIL_PASSWORD || "" }
                    : undefined,
        });
        await transport.sendMail(message);
    } else {
        const folder =
            process.env.NODE_MAIL_OUTBOX ||
            path.join(runtime, "node-mail-outbox");
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(
            path.join(folder, crypto.randomUUID() + ".json"),
            JSON.stringify(message),
        );
    }
}
export async function resetPassword(
    email: string,
    token: string,
    password: string,
) {
    const digest = hash(token);
    const current = db
        .prepare(
            "SELECT token_hash,expires FROM node_password_resets WHERE email=?",
        )
        .get(email) as any;
    if (
        !current ||
        current.token_hash !== digest ||
        current.expires < Date.now()
    )
        fail(422, "The reset link is invalid or expired");
    const encoded = await bcrypt.hash(password, 12);
    db.transaction(() => {
        const row = db
            .prepare(
                "SELECT token_hash,expires FROM node_password_resets WHERE email=?",
            )
            .get(email) as any;
        if (!row || row.token_hash !== digest || row.expires < Date.now())
            fail(422, "The reset link is invalid or expired");
        const user = db
            .prepare("SELECT id FROM users WHERE email=?")
            .get(email) as any;
        if (!user) fail(422, "The reset link is invalid or expired");
        db.prepare("UPDATE users SET password=?,updated_at=? WHERE id=?").run(
            encoded,
            now(),
            user.id,
        );
        db.prepare("DELETE FROM node_sessions WHERE user_id=?").run(user.id);
        db.prepare("DELETE FROM node_password_resets WHERE email=?").run(email);
    })();
}
