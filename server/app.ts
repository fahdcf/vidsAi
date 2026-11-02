import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { z } from "zod";
import { root, origin, mediaRoot } from "./env";
import { db, insert, update, project, scenes, json, now } from "./database";
import {
    session,
    user,
    own,
    fail,
    validSignature,
    rotateSession,
} from "./security";
import { document, commit, renderSnapshot } from "./document";
import { enqueue, worker, mediaFile } from "./jobs";
import { music, stock } from "./providers";
import { requestReset, resetPassword } from "./recovery";
import { wanModels, wanPayload } from "./wan";
import { mediaDuration } from "./media";
const uuid = z.string().uuid();
const projectInput = z.object({
    name: z.string().trim().min(1).max(255),
    type: z.enum(["product", "service"]),
    category: z.string().min(1).max(255),
    description: z.string().min(1).max(2000),
    language: z.enum(["english", "arabic", "moroccan", "french", "spanish"]),
    script_option: z.enum(["paste", "generate"]),
    custom_script: z.string().max(5000).optional(),
    voiceover_option: z.literal("upload"),
});
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 30 },
});
function saveFile(file: Express.Multer.File, folder: string) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed: Record<string, string> = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    };
    if (!allowed[ext]) fail(422, "Unsupported media format");
    const filename = `${folder}/${crypto.randomUUID()}${ext}`;
    const target = path.join(mediaRoot, "public", filename);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.buffer);
    return { filename, mime: allowed[ext] };
}
function currentUser(id: any) {
    return db
        .prepare("SELECT id,name,email,created_at FROM users WHERE id=?")
        .get(id);
}
export const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
});
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session);
app.get("/health", (_req, res) =>
    res.json({ status: "ok", runtime: "node-typescript" }),
);
app.get("/api/session", (req, res) =>
    res.json({
        csrf: (req as any).session.csrf,
        user: currentUser((req as any).session.user_id),
    }),
);
app.get("/api/providers", (req, res) => {
    user(req);
    res.json({ wanConfigured: Boolean(process.env.WAN_AI_API_KEY), wanModels });
});
app.post("/scenes/:scene/ai-video", (req, res) => {
    const scene = db
        .prepare("SELECT * FROM scenes WHERE id=?")
        .get(req.params.scene) as any;
    if (!scene) fail(404, "Scene not found");
    const p = own(req, scene.project_id);
    if (!process.env.WAN_AI_API_KEY)
        fail(
            503,
            "WAN AI is not configured. The placeholder is retained for later.",
        );
    const input = z
        .object({
            model: z.string(),
            resolution: z.string(),
            prompt: z.string().min(1).max(5000),
            image_url: z.string().url().optional(),
        })
        .parse(req.body);
    wanPayload(input);
    const id = enqueue(p.id, "wan", { sceneId: scene.id, input });
    update("scenes", scene.id, { status: "regenerating", job_id: id });
    res.status(202).json({ job_id: id, status: "queued" });
});
app.get("/scenes/:scene/ai-status", (req, res) => {
    const scene = db
        .prepare("SELECT * FROM scenes WHERE id=?")
        .get(req.params.scene) as any;
    if (!scene) fail(404, "Scene not found");
    own(req, scene.project_id);
    const job = scene.job_id
        ? db
              .prepare("SELECT status,error FROM node_jobs WHERE id=?")
              .get(scene.job_id)
        : null;
    res.json({ status: scene.status, job, video_url: scene.video_url });
});
const authAttempts = new Map<string, { count: number; until: number }>();
app.use(
    ["/login", "/register", "/forgot-password", "/reset-password"],
    (req, _res, next) => {
        if (req.method !== "POST") return next();
        const key = req.ip + ":" + String(req.body.email || "").toLowerCase();
        let state = authAttempts.get(key);
        if (!state || state.until < Date.now()) {
            state = { count: 0, until: Date.now() + 60000 };
            authAttempts.set(key, state);
        }
        if (++state.count > 10)
            return next(
                Object.assign(
                    new Error("Too many attempts. Please wait a minute."),
                    { status: 429 },
                ),
            );
        next();
    },
);
app.post("/forgot-password", async (req, res) => {
    const email = z
        .string()
        .email()
        .max(255)
        .parse(req.body.email)
        .toLowerCase();
    await requestReset(email);
    res.json({
        success: true,
        message: "If the account exists, a password reset link has been sent.",
    });
});
app.post("/reset-password", async (req, res) => {
    const data = z
        .object({
            email: z.string().email(),
            token: z.string().min(32),
            password: z.string().min(8).max(256),
        })
        .parse(req.body);
    await resetPassword(data.email.toLowerCase(), data.token, data.password);
    res.json({ success: true, redirect: "/login" });
});
app.post(["/login", "/register"], async (req, res) => {
    const input = z
        .object({
            email: z.string().email().max(255),
            password: z.string().min(8).max(256),
            name: z.string().min(1).max(255).optional(),
        })
        .parse(req.body);
    const email = input.email.toLowerCase();
    let u = db.prepare("SELECT * FROM users WHERE email=?").get(email) as any;
    if (req.path === "/register") {
        if (u) fail(422, "That email is already registered");
        if (!input.name) fail(422, "Name is required");
        const id = insert("users", {
            name: input.name,
            email,
            password: await bcrypt.hash(input.password, 12),
            created_at: now(),
            updated_at: now(),
        });
        u = { id };
    } else if (
        !u ||
        !(await bcrypt.compare(
            input.password,
            String(u.password).replace(/^\$2y\$/, "$2b$"),
        ))
    )
        fail(422, "Email or password is incorrect");
    rotateSession(req, res, u.id);
    res.json({ success: true, redirect: "/dashboard" });
});
app.post("/logout", (req, res) => {
    db.prepare("DELETE FROM node_sessions WHERE id=?").run(
        (req as any).session.id,
    );
    res.clearCookie("vidsai_session");
    res.json({ success: true });
});
app.patch("/profile", async (req, res) => {
    const id = user(req);
    const data = z
        .object({
            name: z.string().min(1).max(255),
            email: z.string().email().max(255),
        })
        .parse(req.body);
    const duplicate = db
        .prepare("SELECT id FROM users WHERE email=? AND id!=?")
        .get(data.email.toLowerCase(), id);
    if (duplicate) fail(422, "Email already registered");
    update("users", id, {
        ...data,
        email: data.email.toLowerCase(),
        updated_at: now(),
    });
    res.json({ success: true });
});
app.put("/password", async (req, res) => {
    const id = user(req);
    const input = z
        .object({
            current_password: z.string(),
            password: z.string().min(8).max(256),
        })
        .parse(req.body);
    const u = db
        .prepare("SELECT password FROM users WHERE id=?")
        .get(id) as any;
    if (
        !(await bcrypt.compare(
            input.current_password,
            u.password.replace(/^\$2y\$/, "$2b$"),
        ))
    )
        fail(422, "Current password is incorrect");
    update("users", id, {
        password: await bcrypt.hash(input.password, 12),
        updated_at: now(),
    });
    db.prepare("DELETE FROM node_sessions WHERE user_id=? AND id!=?").run(
        id,
        (req as any).session.id,
    );
    res.json({ success: true });
});
app.delete("/profile", async (req, res) => {
    const id = user(req);
    const u = db
        .prepare("SELECT password FROM users WHERE id=?")
        .get(id) as any;
    if (
        !(await bcrypt.compare(
            String(req.body.password || ""),
            u.password.replace(/^\$2y\$/, "$2b$"),
        ))
    )
        fail(422, "Password is incorrect");
    db.transaction(() => {
        db.prepare(
            "DELETE FROM node_jobs WHERE project_id IN (SELECT id FROM projects WHERE user_id=?)",
        ).run(id);
        db.prepare("DELETE FROM node_sessions WHERE user_id=?").run(id);
        db.prepare("DELETE FROM users WHERE id=?").run(id);
    })();
    res.json({ success: true });
});
app.get("/api/page", (req, res) => {
    const id = user(req);
    const pathname = String(req.query.path || "/dashboard");
    if (pathname === "/dashboard")
        return res.json({
            page: "Dashboard",
            props: {
                projects: db
                    .prepare(
                        "SELECT p.id,p.name,p.status,p.created_at,p.category,p.language,  (SELECT COALESCE(thumbnail_path,video_url) FROM scenes WHERE project_id=p.id ORDER BY scene_number LIMIT 1) AS thumbnail_url,  (SELECT CASE WHEN thumbnail_path IS NOT NULL THEN 'image' ELSE type END FROM scenes WHERE project_id=p.id ORDER BY scene_number LIMIT 1) AS media_type,  COALESCE(CASE WHEN json_valid(p.edit_state) THEN json_extract(p.edit_state,'$.total_frames')*1.0/NULLIF(json_extract(p.edit_state,'$.fps'),0) END,  (SELECT SUM(COALESCE(trimmed_duration,gemini_duration,duration_seconds,0)) FROM scenes WHERE project_id=p.id)) AS duration  FROM projects p WHERE p.user_id=? ORDER BY p.id DESC",
                    )
                    .all(id),
            },
        });
    if (pathname === "/create") return res.json({ page: "Create", props: {} });
    if (pathname === "/profile")
        return res.json({ page: "Profile", props: { user: currentUser(id) } });
    const match =
        pathname.match(
            /^\/(processing|review|subtitle-styles|final)\/(\d+)$/,
        ) ||
        pathname
            .match(/^\/projects\/(\d+)\/(editor|preview)$/)
            ?.map((v, i, a) => (i === 1 ? a[2] : i === 2 ? a[1] : v));
    if (!match) fail(404, "Page not found");
    const p = own(req, match[2]);
    if (match[1] === "processing")
        return res.json({
            page: "Processing",
            props: {
                project: {
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    error_message: p.error_message,
                },
            },
        });
    const d = document(p);
    const latest = db
        .prepare(
            "SELECT * FROM video_exports WHERE project_id=? ORDER BY created_at DESC LIMIT 1",
        )
        .get(p.id) as any;
    if (latest && latest.status === "done")
        latest.output_url = `/projects/${p.id}/exports/${latest.id}/download`;
    const props: any = {
        project: {
            id: p.id,
            name: p.name,
            status: p.status,
            error_message: p.error_message,
            timing_warning: json<any>(p.scenes_data, {}).timing_warning,
        },
        document: d,
        latestExport: latest,
        scenes: scenes(p.id),
        history: db
            .prepare(
                "SELECT document FROM edit_revisions WHERE project_id=? AND revision<? ORDER BY revision DESC LIMIT 30",
            )
            .all(p.id, d.revision)
            .reverse()
            .map((r: any) => json(r.document, {})),
        agentHistory: db
            .prepare(
                "SELECT id,message,plan,status FROM agent_runs WHERE project_id=? ORDER BY created_at DESC LIMIT 20",
            )
            .all(p.id)
            .reverse(),
        pendingRun: db
            .prepare(
                "SELECT * FROM agent_runs WHERE project_id=? AND status IN ('planning','planned','failed') ORDER BY created_at DESC LIMIT 1",
            )
            .get(p.id),
    };
    res.json({
        page:
            match[1] === "processing"
                ? "Processing"
                : match[1] === "review"
                  ? "Review"
                  : match[1] === "final"
                    ? "Final"
                    : match[1] === "subtitle-styles"
                      ? "Subtitles"
                      : "Editor",
        props,
    });
});
app.post(
    "/create",
    (req, _res, next) => {
        user(req);
        next();
    },
    upload.single("voiceover_file"),
    (req, res) => {
        const input = projectInput.parse(req.body);
        if (input.script_option === "paste" && !input.custom_script?.trim())
            fail(422, "Script is required");
        if (
            !req.file ||
            req.file.size > 10 * 1024 * 1024 ||
            ![".mp3", ".wav"].includes(
                path.extname(req.file.originalname).toLowerCase(),
            )
        )
            fail(422, "Upload an MP3 or WAV up to 10 MB");
        const format =
            req.body.video_format?.[0] || req.body["video_format[0]"] || "9:16";
        if (!["16:9", "9:16", "1:1", "all"].includes(format))
            fail(422, "Invalid format");
        const file = saveFile(req.file, "voiceovers");
        const id = Number(
            insert("projects", {
                ...input,
                user_id: user(req),
                voiceover_file: file.filename,
                video_format: JSON.stringify(
                    format === "all" ? ["16:9", "9:16", "1:1"] : [format],
                ),
                status: "processing",
                processing_started_at: now(),
                created_at: now(),
                updated_at: now(),
            }),
        );
        enqueue(id, "generate");
        res.status(201).json({
            success: true,
            project_id: id,
            redirect: `/processing/${id}`,
        });
    },
);
app.get("/processing/:id/status", (req, res) => {
    const p = own(req, req.params.id);
    const job = db
        .prepare(
            "SELECT payload FROM node_jobs WHERE project_id=? AND task='generate' ORDER BY rowid DESC LIMIT 1",
        )
        .get(p.id) as any;
    const payload = json<any>(job?.payload, {});
    const stages = {
        transcription: Boolean(payload.transcript),
        planning: Boolean(payload.plan),
        footage: Boolean(
            payload.plan?.phrases?.length &&
                payload.clips?.length >= payload.plan.phrases.length,
        ),
        review: ["reviewing", "subtitle_selection", "completed"].includes(
            p.status,
        ),
    };
    const progress = stages.review
        ? 100
        : Math.min(
              95,
              5 +
                  (stages.transcription ? 30 : 0) +
                  (stages.planning ? 25 : 0) +
                  (payload.plan?.phrases?.length
                      ? Math.round(
                            ((payload.clips?.length || 0) /
                                payload.plan.phrases.length) *
                                30,
                        )
                      : 0),
          );
    const destinations: Record<string, string> = {
        reviewing: `/review/${p.id}`,
        subtitle_selection: `/subtitle-styles/${p.id}`,
        completed: `/final/${p.id}`,
    };
    res.json({
        status: p.status,
        error_message: p.error_message,
        progress,
        stages,
        redirect_url: destinations[p.status],
        can_retry: p.status === "failed",
    });
});
app.post("/projects/:id/retry", (req, res) => {
    const p = own(req, req.params.id);
    if (p.status !== "failed") fail(409, "Only failed projects can retry");
    update("projects", p.id, { status: "processing", error_message: null });
    enqueue(p.id, "generate");
    res.json({ success: true, redirect: `/processing/${p.id}` });
});
app.get("/projects/:id/edit-state", (req, res) => {
    const p = own(req, req.params.id);
    res.json({ edit_state: document(p), status: p.status });
});
app.post("/review/:id/confirm", (req, res) => {
    const p = own(req, req.params.id);
    const rows = z
        .array(
            z.object({
                scene_id: z.number().int(),
                video_url: z.string().url(),
                start_time: z.number().nonnegative(),
                end_time: z.number().positive(),
            }),
        )
        .min(1)
        .parse(req.body.scenes);
    if (rows.length !== scenes(p.id).length)
        fail(422, "Confirm every scene in the project");
    const ids = new Set();
    db.transaction(() => {
        for (const s of rows) {
            const stored = db
                .prepare("SELECT * FROM scenes WHERE id=? AND project_id=?")
                .get(s.scene_id, p.id) as any;
            if (!stored || ids.has(s.scene_id) || s.end_time <= s.start_time)
                fail(422, "Invalid source window");
            ids.add(s.scene_id);
            let mediaType = stored.type;
            let duration = stored.duration_seconds;
            let thumbnail = stored.thumbnail_path;
            if (s.video_url !== stored.video_url) {
                const assetId = new URL(s.video_url).pathname.match(
                    /^\/projects\/(\d+)\/assets\/([a-f0-9-]{36})$/,
                );
                const asset =
                    assetId && Number(assetId[1]) === p.id
                        ? (db
                              .prepare(
                                  "SELECT mime,duration_seconds FROM project_assets WHERE id=? AND project_id=?",
                              )
                              .get(assetId[2], p.id) as any)
                        : null;
                if (
                    !asset ||
                    !["image", "video"].some((type) =>
                        asset.mime.startsWith(type + "/"),
                    )
                )
                    fail(422, "Replacement media must belong to this project");
                mediaType = asset.mime.startsWith("image/") ? "image" : "video";
                duration = asset.duration_seconds;
                thumbnail = mediaType === "image" ? s.video_url : null;
            }
            if (
                mediaType !== "image" &&
                duration &&
                s.end_time > duration + 0.01
            )
                fail(422, "The source window exceeds the video duration");
            update("scenes", s.scene_id, {
                video_url: s.video_url,
                type: mediaType,
                duration_seconds: duration,
                start_time: s.start_time,
                end_time: s.end_time,
                trimmed_duration: s.end_time - s.start_time,
                thumbnail_path: thumbnail,
                approved: 1,
            });
        }
        const old = p.edit_state ? document(p) : null;
        update("projects", p.id, { edit_state: null });
        const next = document(project(p.id));
        if (old) {
            next.revision = old.revision + 1;
            next.version = next.revision;
            next.tracks.audio = old.tracks.audio;
            next.tracks.subtitles = old.tracks.subtitles;
            next.tracks.overlays = old.tracks.overlays;
            next.tracks.motion_graphics = old.tracks.motion_graphics;
            next.width = old.width;
            next.height = old.height;
            for (const clip of next.tracks.video) {
                const previous = old.tracks.video.find((c) => c.id === clip.id);
                if (previous)
                    for (const key of [
                        "animation",
                        "transition_out",
                        "speed",
                        "volume",
                        "color_grade",
                    ] as const)
                        (clip as any)[key] = previous[key];
            }
        }
        for (const d of [old, next].filter(Boolean) as any[])
            db.prepare(
                "INSERT OR IGNORE INTO edit_revisions(project_id,revision,document,created_at,updated_at) VALUES(?,?,?,?,?)",
            ).run(p.id, d.revision, JSON.stringify(d), now(), now());
        update("projects", p.id, {
            status: "subtitle_selection",
            edit_state: JSON.stringify(next),
        });
    })();
    res.json({ success: true, redirect: `/subtitle-styles/${p.id}` });
});
app.post("/projects/:id/commands", (req, res) =>
    res.json(
        commit(own(req, req.params.id), {
            ...req.body,
            commandId: uuid.parse(req.body.commandId),
        }),
    ),
);
app.post("/projects/:id/restore-revision", (req, res) =>
    res.json(
        commit(own(req, req.params.id), {
            ...req.body,
            commandId: uuid.parse(req.body.commandId),
        }),
    ),
);
app.post(
    "/projects/:id/assets",
    (req, _res, next) => {
        own(req, req.params.id);
        next();
    },
    upload.single("file"),
    async (req, res) => {
        const p = own(req, req.params.id);
        if (!req.file) fail(422, "File required");
        const saved = saveFile(req.file, `project-assets/${p.id}`);
        let duration: number | null;
        try {
            duration = await mediaDuration(
                mediaFile(saved.filename),
                saved.mime,
            );
        } catch (error) {
            fs.unlinkSync(mediaFile(saved.filename));
            throw error;
        }
        const id = crypto.randomUUID();
        insert("project_assets", {
            id,
            project_id: p.id,
            path: saved.filename,
            name: req.file.originalname,
            mime: saved.mime,
            size: req.file.size,
            duration_seconds: duration,
            created_at: now(),
            updated_at: now(),
        });
        res.json({
            asset_id: id,
            url: `${origin}/projects/${p.id}/assets/${id}`,
            media_type: saved.mime.startsWith("image/")
                ? "image"
                : saved.mime.startsWith("audio/")
                  ? "audio"
                  : "video",
            duration_seconds: duration,
        });
    },
);
app.get("/projects/:id/assets/:asset", (req, res) => {
    if (!validSignature(req)) own(req, req.params.id);
    const asset = db
        .prepare("SELECT * FROM project_assets WHERE id=? AND project_id=?")
        .get(req.params.asset, req.params.id) as any;
    if (!asset) fail(404, "Asset not found");
    let file;
    try {
        file = mediaFile(asset.path);
    } catch {
        file = mediaFile(asset.path, "private");
    }
    res.set("Cache-Control", "private, max-age=3600")
        .type(asset.mime)
        .sendFile(file);
});
app.get("/projects/:id/voiceover", (req, res) => {
    const p = validSignature(req)
        ? project(req.params.id)
        : own(req, req.params.id);
    if (!p) fail(404, "Project not found");
    res.set("Cache-Control", "private, max-age=3600").sendFile(
        mediaFile(p.voiceover_file),
    );
});
app.post("/subtitle-styles/:id/prepare-voiceover", (req, res) => {
    const p = own(req, req.params.id);
    mediaFile(p.voiceover_file);
    res.json({
        success: true,
        voiceover_url: `${origin}/projects/${p.id}/voiceover`,
    });
});
const musicCategories = [
    "music",
    "corporate",
    "chill",
    "energetic",
    "cinematic",
    "ambient",
    "electronic",
];
app.get("/api/music/categories", (req, res) => {
    user(req);
    res.json({ categories: musicCategories });
});
app.get(
    ["/api/music/search", "/api/music/popular", "/api/music/trending"],
    async (req, res) => {
        user(req);
        res.json(
            await music(
                String(
                    req.query.query ||
                        (req.query.category && req.query.category !== "music"
                            ? req.query.category + " background music"
                            : "background music instrumental"),
                ),
                Number(req.query.page) || 1,
                Number(req.query.per_page || req.query.limit) || 12,
            ),
        );
    },
);
app.post("/projects/:id/save-music", (req, res) => {
    const p = own(req, req.params.id);
    const input = z
        .object({
            music_url: z.string().url().nullable(),
            music_volume: z.number().min(0).max(1).default(0.3),
        })
        .parse(req.body);
    res.json(
        commit(p, {
            commandId: crypto.randomUUID(),
            expectedRevision: document(p).revision,
            operations: [
                {
                    tool: "set_music",
                    params: {
                        url: input.music_url,
                        volume: input.music_volume,
                    },
                },
            ],
        }),
    );
});
app.post("/scenes/:scene/regenerate-proxy", async (req, res) => {
    const scene = db
        .prepare("SELECT * FROM scenes WHERE id=?")
        .get(req.params.scene) as any;
    if (!scene) fail(404, "Scene not found");
    const p = own(req, scene.project_id);
    const previous = String(scene.video_url || "").match(
        /\/video-files\/(\d+)\//,
    )?.[1];
    const clip = await stock(
        String(req.body.keywords?.[0] || scene.keywords || scene.script_text),
        previous ? [Number(previous)] : [],
    );
    update("scenes", scene.id, {
        video_url: clip.url,
        thumbnail_path: clip.image || null,
        type: "video",
        approved: 0,
        trimmed_duration: Math.min(clip.duration, scene.gemini_duration || 3),
        duration_seconds: clip.duration,
        start_time: 0,
        end_time: Math.min(clip.duration, scene.gemini_duration || 3),
    });
    const result = commit(p, {
        commandId: crypto.randomUUID(),
        expectedRevision: document(p).revision,
        operations: [
            {
                tool: "replace_asset",
                params: {
                    id: "scene_" + scene.id,
                    url: clip.url,
                    media_type: "video",
                },
            },
        ],
    });
    res.json(result);
});
app.post("/projects/:id/agent-runs", async (req, res) => {
    const p = own(req, req.params.id);
    const input = z
        .object({ runId: uuid, message: z.string().min(1).max(2000) })
        .parse(req.body);
    let run = db
        .prepare("SELECT * FROM agent_runs WHERE id=?")
        .get(input.runId) as any;
    if (run) {
        if (run.project_id !== p.id || run.message !== input.message)
            fail(409, "Run ID already used");
        if (run.status === "cancelled") fail(409, "Run cancelled");
        if (run.plan)
            return res.json({
                runId: run.id,
                status: run.status,
                plan: json(run.plan, {}),
            });
    } else {
        const d = document(p);
        insert("agent_runs", {
            id: input.runId,
            project_id: p.id,
            message: input.message,
            starting_revision: d.revision,
            snapshot: JSON.stringify(d),
            status: "planning",
            created_at: now(),
            updated_at: now(),
        });
        run = db
            .prepare("SELECT * FROM agent_runs WHERE id=?")
            .get(input.runId) as any;
    }
    try {
        const result = await worker(
            "/agent/plan",
            {
                runId: run.id,
                message: run.message,
                document: json(run.snapshot, {}),
            },
            true,
        );
        const current = db
            .prepare("SELECT status FROM agent_runs WHERE id=?")
            .pluck()
            .get(run.id);
        if (current === "cancelled") fail(409, "Run cancelled");
        const status = result.operations.length ? "planned" : "completed";
        update("agent_runs", run.id, {
            status,
            plan: JSON.stringify(result),
            error: null,
            updated_at: now(),
        });
        res.json({ runId: run.id, status, plan: result });
    } catch (e) {
        db.prepare(
            "UPDATE agent_runs SET status='failed',error=?,updated_at=? WHERE id=? AND status!='cancelled'",
        ).run("Planning failed. Retry this request.", now(), run.id);
        throw e;
    }
});
app.get("/projects/:id/agent-runs/:run", (req, res) => {
    const p = own(req, req.params.id);
    const run = db
        .prepare("SELECT * FROM agent_runs WHERE id=? AND project_id=?")
        .get(req.params.run, p.id);
    if (!run) fail(404, "Run not found");
    res.json(run);
});
app.delete("/projects/:id/agent-runs/:run", (req, res) => {
    const p = own(req, req.params.id);
    const run = db
        .prepare("SELECT * FROM agent_runs WHERE id=? AND project_id=?")
        .get(req.params.run, p.id) as any;
    if (!run) fail(404, "Run not found");
    if (run.status === "applied")
        fail(409, "Use Undo to reverse applied changes");
    update("agent_runs", run.id, { status: "cancelled" });
    res.json({ success: true });
});
app.post("/projects/:id/agent-runs/:run/execute", (req, res) => {
    const p = own(req, req.params.id);
    const run = db
        .prepare("SELECT * FROM agent_runs WHERE id=? AND project_id=?")
        .get(req.params.run, p.id) as any;
    if (!run) fail(404, "Run not found");
    if (run.status === "applied") return res.json(json(run.result, {}));
    if (run.status !== "planned") fail(409, "Run is not ready");
    res.json(
        commit(p, {
            commandId: run.id,
            expectedRevision: run.starting_revision,
            operations: json<any>(run.plan, {}).operations,
        }),
    );
});
app.post("/projects/:id/export", (req, res) => {
    const p = own(req, req.params.id);
    const id = uuid.parse(req.body.requestId || crypto.randomUUID());
    const d = document(p);
    if (!d.tracks.video.length) fail(422, "No clips to render");
    const active = db
        .prepare(
            "SELECT * FROM video_exports WHERE project_id=? AND status IN ('queued','rendering')",
        )
        .get(p.id) as any;
    if (active) return res.status(202).json({ export_id: active.id });
    const existing = db
        .prepare("SELECT * FROM video_exports WHERE id=?")
        .get(id) as any;
    if (existing) {
        if (existing.project_id !== p.id) fail(409, "Export ID already used");
        return res.status(202).json({ export_id: id });
    }
    db.transaction(() => {
        insert("video_exports", {
            id,
            project_id: p.id,
            revision: d.revision,
            snapshot: JSON.stringify(renderSnapshot(d, p)),
            status: "queued",
            created_at: now(),
            updated_at: now(),
        });
        enqueue(p.id, "render", { exportId: id });
        update("projects", p.id, {
            status: "subtitle_generating",
            error_message: null,
        });
    })();
    res.status(202).json({ export_id: id, status: "queued" });
});
app.get("/projects/:id/exports/:export", (req, res) => {
    const p = own(req, req.params.id);
    const row = db
        .prepare("SELECT * FROM video_exports WHERE id=? AND project_id=?")
        .get(req.params.export, p.id) as any;
    if (!row) fail(404, "Export not found");
    if (row.status === "done")
        row.output_url = `/projects/${p.id}/exports/${row.id}/download`;
    res.json(row);
});
app.delete("/projects/:id/exports/:export", async (req, res) => {
    const p = own(req, req.params.id);
    const row = db
        .prepare("SELECT * FROM video_exports WHERE id=? AND project_id=?")
        .get(req.params.export, p.id) as any;
    if (!row) fail(404, "Export not found");
    if (["done", "failed", "cancelled"].includes(row.status))
        return res.json({ success: true });
    if (row.worker_job_id)
        await worker(
            "/renders/" + row.worker_job_id,
            undefined,
            false,
            "DELETE",
        );
    update("video_exports", row.id, { status: "cancelled" });
    update("projects", p.id, { status: "subtitle_selection" });
    res.json({ success: true });
});
app.get("/projects/:id/exports/:export/download", async (req, res) => {
    const p = own(req, req.params.id);
    const row = db
        .prepare("SELECT * FROM video_exports WHERE id=? AND project_id=?")
        .get(req.params.export, p.id) as any;
    if (!row || row.status !== "done") fail(404, "Export is not ready");
    const response = await fetch(
        (process.env.NODE_RENDER_URL || "http://127.0.0.1:5211") +
            "/downloads/" +
            row.worker_job_id +
            ".mp4",
        { headers: { Authorization: `Bearer ${process.env.WORKER_TOKEN}` } },
    );
    if (!response.ok || !response.body) fail(502, "Download unavailable");
    res.type("video/mp4").attachment(`vidsai-${p.id}.mp4`);
    Readable.fromWeb(response.body as any).pipe(res);
});
app.use(
    "/migration-fixtures",
    express.static(
        path.resolve(root, "../remotion-api/public/migration-fixtures"),
    ),
);
app.use(express.static(path.join(root, "dist")));
app.get(/.*/, (_req, res) => res.sendFile(path.join(root, "dist/index.html")));
app.use(
    (
        error: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
    ) => {
        const status = ["ZodError", "EditingValidationError"].includes(
            error.name,
        )
            ? 422
            : error.code === "LIMIT_FILE_SIZE"
              ? 422
              : error.status || 500;
        res.status(status).json({
            message:
                status === 500
                    ? "The request failed. Please retry."
                    : error.name === "ZodError"
                      ? error.issues.map((i: any) => i.message).join(". ")
                      : error.message,
        });
    },
);
