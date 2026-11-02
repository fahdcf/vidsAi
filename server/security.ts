import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, insert } from "./database";
import { origin, secret } from "./env";
export function fail(status: number, message: string): never {
    throw Object.assign(new Error(message), { status });
}
export function hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
export function rotateSession(req: Request, res: Response, id: number) {
    const token = crypto.randomBytes(32).toString("hex");
    const old = (req as any).session;
    db.transaction(() => {
        db.prepare("DELETE FROM node_sessions WHERE id=?").run(old.id);
        insert("node_sessions", {
            id: hash(token),
            user_id: id,
            csrf: crypto.randomBytes(24).toString("hex"),
            expires: Date.now() + 7 * 86400000,
        });
    })();
    res.cookie("vidsai_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: origin.startsWith("https:"),
        maxAge: 7 * 86400000,
    });
}
export function session(req: Request, res: Response, next: NextFunction) {
    const cookie = req.headers.cookie
        ?.split(";")
        .map((x) => x.trim())
        .find((x) => x.startsWith("vidsai_session="))
        ?.slice(15);
    let s = cookie
        ? (db
              .prepare("SELECT * FROM node_sessions WHERE id=? AND expires>?")
              .get(hash(cookie), Date.now()) as any)
        : null;
    if (!s) {
        const token = crypto.randomBytes(32).toString("hex");
        s = {
            id: hash(token),
            user_id: null,
            csrf: crypto.randomBytes(24).toString("hex"),
            expires: Date.now() + 7 * 86400000,
        };
        insert("node_sessions", s);
        res.cookie("vidsai_session", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: origin.startsWith("https:"),
            maxAge: 7 * 86400000,
        });
    }
    (req as any).session = s;
    if (
        !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        req.get("X-CSRF-TOKEN") !== s.csrf
    )
        return next(
            Object.assign(new Error("Session expired. Reload and retry."), {
                status: 419,
            }),
        );
    next();
}
export function user(req: Request) {
    const id = (req as any).session.user_id;
    if (!id) fail(401, "Please sign in");
    return id as number;
}
export function own(req: Request, id: any) {
    const p = db
        .prepare("SELECT * FROM projects WHERE id=? AND user_id=?")
        .get(id, user(req)) as any;
    if (!p) fail(404, "Project not found");
    return p;
}
export function signed(path: string) {
    const expires = Date.now() + 86400000;
    const sig = crypto
        .createHmac("sha256", secret!)
        .update(path + ":" + expires)
        .digest("hex");
    return `${origin}${path}?expires=${expires}&signature=${sig}`;
}
export function validSignature(req: Request) {
    const expires = String(req.query.expires || "");
    if (Number(expires) < Date.now()) return false;
    const expected = crypto
        .createHmac("sha256", secret!)
        .update(req.path + ":" + expires)
        .digest("hex");
    const got = String(req.query.signature || "");
    return (
        got.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))
    );
}
