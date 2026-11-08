import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { db, project, update, insert, json, now } from "./database";
import { mediaRoot } from "./env";
import { modelJson, transcribe, stock } from "./providers";
import { submitWan, pollWan } from "./wan";
import { commit, document } from "./document";
import { alignScript } from "./alignment";
export async function requestAgent(data: unknown) {
    const url = process.env.NODE_AGENT_URL || "http://127.0.0.1:5212";
    let response: Response;
    try {
        response = await fetch(url + "/agent/plan", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.WORKER_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(65000),
        });
    } catch (error: any) {
        throw new Error("Worker connection failed: " + (error.cause?.code || error.name));
    }
    if (!response.ok) throw new Error(`Editing worker HTTP ${response.status}`);
    return response.json() as Promise<any>;
}
export function mediaFile(relative: string, kind = "public") {
    if (!relative || relative.includes("..") || path.isAbsolute(relative))
        throw new Error("Invalid media path");
    for (const base of [
        path.join(mediaRoot, kind),
        path.join(mediaRoot, "legacy-" + kind),
    ]) {
        const file = path.resolve(base, relative);
        if (file.startsWith(base + path.sep) && fs.existsSync(file))
            return file;
    }
    throw new Error("Project media file is missing");
}
export function enqueue(
    projectId: number,
    task: string,
    payload: any = {},
    id = crypto.randomUUID(),
) {
    insert("node_jobs", {
        id,
        project_id: projectId,
        task,
        status: "queued",
        attempts: 0,
        available: Date.now(),
        payload: JSON.stringify({ ...payload, _enqueuedAt: Date.now() }),
    });
    return id;
}
function safeError(error: any) {
    let text = String(error?.message || "Background operation failed");
    for (const [key, value] of Object.entries(process.env))
        if (value && value.length > 15 && /(KEY|TOKEN)/.test(key))
            text = text.replaceAll(value, "[redacted]");
    return text.slice(0, 500);
}
const textKey = (s: string) => s.toLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, "");
async function generate(job: any) {
    const p = project(job.project_id);
    if (!p) return;
    let payload = json<any>(job.payload, {});
    const checkpoint = () =>
        update("node_jobs", job.id, { payload: JSON.stringify(payload) });
    if (!payload.transcript) {
        try {
            payload.transcript = await transcribe(mediaFile(p.voiceover_file));
        } catch (error) {
            if (
                !["arabic", "moroccan"].includes(p.language) ||
                !p.custom_script
            )
                throw error;
            payload.transcript = await alignScript(
                mediaFile(p.voiceover_file),
                p.custom_script,
                p.language,
            );
        }
        checkpoint();
    }
    const transcript = payload.transcript;
    const script = p.custom_script || transcript.text;
    const end = transcript.words.at(-1).end;
    if (!payload.plan) {
        payload.plan = await modelJson(
            "WRITING",
            `Create cinematic scenes and captions from this narration. Return JSON only: {"phrases":[{"phrase":"exact script words","keywords":["one English stock-footage search term"],"start_time":0,"end_time":2,"duration_seconds":2,"prompt":"English visual description"}],"subtitles_script":["caption chunks"]}. Preserve every script word exactly once and their order. First scene starts at zero including leading silence. Later cuts align to transcript word starts. Last scene ends at ${end}. Durations equal end-start with no gaps. Prefer 1.5-5 seconds per scene. Never invent or translate script words. Language: ${p.language}. Script: ${script}. Transcript: ${JSON.stringify(transcript.words)}.`,
            (value) => {
                if (
                    !Array.isArray(value.phrases) ||
                    !value.phrases.length ||
                    value.phrases.length > 20 ||
                    !Array.isArray(value.subtitles_script)
                )
                    throw new Error("Missing scenes or captions");
                let cursor = 0;
                for (const [i, s] of value.phrases.entries()) {
                    if (
                        !s.phrase ||
                        !Array.isArray(s.keywords) ||
                        !s.keywords.length ||
                        ![s.start_time, s.end_time, s.duration_seconds].every(
                            Number.isFinite,
                        )
                    )
                        throw new Error("Invalid scene");
                    if (
                        i === 0 &&
                        Math.abs(s.start_time - transcript.words[0].start) <
                            0.15
                    ) {
                        s.start_time = 0;
                        s.duration_seconds = s.end_time;
                    }
                    if (
                        Math.abs(s.start_time - cursor) > 0.15 ||
                        s.duration_seconds <= 0 ||
                        Math.abs(
                            s.end_time - s.start_time - s.duration_seconds,
                        ) > 0.15
                    )
                        throw new Error("Invalid scene timing");
                    cursor = s.end_time;
                }
                if (
                    Math.abs(cursor - end) > 0.15 ||
                    textKey(
                        value.phrases.map((s: any) => s.phrase).join(" "),
                    ) !== textKey(script)
                )
                    throw new Error("Narration does not match the scene plan");
            },
        );
        checkpoint();
    }
    payload.clips ??= [];
    for (let i = payload.clips.length; i < payload.plan.phrases.length; i++) {
        payload.clips.push(
            await stock(
                payload.plan.phrases[i].keywords[0],
                payload.clips.map((c: any) => c.id),
            ),
        );
        checkpoint();
    }
    db.transaction(() => {
        db.prepare("DELETE FROM scenes WHERE project_id=?").run(p.id);
        payload.plan.phrases.forEach((s: any, i: number) =>
            insert("scenes", {
                project_id: p.id,
                scene_number: i + 1,
                script_text: s.phrase,
                video_url: payload.clips[i].url,
                duration_seconds: payload.clips[i].duration,
                thumbnail_path: payload.clips[i].image || null,
                gemini_duration: s.duration_seconds,
                start_time: 0,
                end_time: Math.min(
                    s.duration_seconds,
                    payload.clips[i].duration,
                ),
                keywords: s.keywords.join(", "),
                prompt: s.prompt || "",
                type: "video",
                status: "completed",
                created_at: now(),
                updated_at: now(),
            }),
        );
        update("projects", p.id, {
            status: "reviewing",
            voiceover_transcript: JSON.stringify(transcript.words),
            subtitles_script: JSON.stringify(payload.plan.subtitles_script),
            scenes_data: JSON.stringify({
                timing_warning: transcript.approximate
                    ? "Word timing was estimated locally. Review the captions and cut points before export."
                    : null,
            }),
            processing_completed_at: now(),
            error_message: null,
            updated_at: now(),
        });
    })();
}
let active = false;
async function wan(job: any) {
    const payload = json<any>(job.payload, {});
    if (db.prepare("SELECT 1 FROM edit_commands WHERE id=? AND project_id=?").get(job.id, job.project_id)) return true;
    const target = () => {
        const scene = db.prepare("SELECT * FROM scenes WHERE id=? AND project_id=? AND job_id=?")
            .get(payload.sceneId, job.project_id, job.id) as any;
        if (!scene) return;
        const p = project(job.project_id);
        const revision = document(p).revision;
        if (payload.startingRevision !== revision) {
            throw Object.assign(new Error("The project changed after video generation started. The generated clip was not applied."), { deadline: true });
        }
        return { p, scene, revision };
    };
    if (!target()) return true;
    if (!payload.taskId) {
        payload.taskId = await submitWan(payload.input);
        update("node_jobs", job.id, { payload: JSON.stringify(payload) });
    }
    const status = await pollWan(payload.taskId);
    if (status?.task_status !== "SUCCEEDED") return false;
    if (!status.video_url) throw new Error("WAN output video is missing");
    db.transaction(() => {
        const current = target();
        if (!current) return;
        const {p, scene, revision} = current;
        commit(p, {
            commandId: job.id,
            expectedRevision: revision,
            operations: [
                {
                    tool: "replace_asset",
                    params: {
                        id: "scene_" + scene.id,
                        url: status.video_url,
                        media_type: "video",
                    },
                },
            ],
        });
        update("scenes", scene.id, {
            video_url: status.video_url,
            type: "video",
            status: "completed",
            start_time: 0,
            end_time: Math.min(Number(scene.gemini_duration) || 3, 5),
            duration_seconds: 5,
        });
    })();
    return true;
}
export async function tick() {
    if (active) return;
    active = true;
    try {
        const job = db.transaction(() => {
            db.prepare(
                "UPDATE node_jobs SET status='queued' WHERE status='running' AND task IN ('generate','wan') AND lease<?",
            ).run(Date.now());
            const next = db
                .prepare(
                    "SELECT * FROM node_jobs WHERE status='queued' AND task IN ('generate','wan') AND available<=? ORDER BY available LIMIT 1",
                )
                .get(Date.now()) as any;
            if (next)
                update("node_jobs", next.id, {
                    status: "running",
                    lease: Date.now() + 180000,
                    attempts: next.attempts + 1,
                });
            return next;
        })();
        if (!job) return;
        try {
            const payload = json<any>(job.payload, {});
            const deadline =
                job.task === "generate"
                    ? 15 * 60000
                    : Math.max(
                          60,
                          Number(process.env.WAN_DEADLINE_SECONDS) || 7200,
                      ) * 1000;
            if (
                payload._enqueuedAt &&
                Date.now() - payload._enqueuedAt > deadline
            )
                throw Object.assign(
                    new Error(
                        "Background operation exceeded its time limit. Please retry.",
                    ),
                    { deadline: true },
                );
            const complete = job.task === "generate" ? (await generate(job), true) : await wan(job);
            const saved = json<any>(
                (
                    db
                        .prepare("SELECT payload FROM node_jobs WHERE id=?")
                        .get(job.id) as any
                ).payload,
                {},
            );
            delete saved._failures;
            update("node_jobs", job.id, {
                status: complete ? "done" : "queued",
                available: Date.now() + 2000,
                lease: null,
                error: null,
                payload: JSON.stringify(saved),
            });
        } catch (error: any) {
            const message = safeError(error);
            const payload = json<any>(
                (
                    db
                        .prepare("SELECT payload FROM node_jobs WHERE id=?")
                        .get(job.id) as any
                ).payload,
                {},
            );
            payload._failures = (payload._failures || 0) + 1;
            const exhausted =
                error.deadline ||
                payload._failures >= (job.task === "generate" ? 3 : 12);
            update("node_jobs", job.id, {
                status: exhausted ? "failed" : "queued",
                error: message,
                lease: null,
                available: Date.now() + 3000,
                payload: JSON.stringify(payload),
            });
            if (exhausted) {
                if (job.task === "wan")
                    db.prepare("UPDATE scenes SET status='failed' WHERE id=? AND job_id=?").run(payload.sceneId, job.id);
                else if (job.task === "generate")
                    update("projects", job.project_id, {
                        status: "failed",
                        error_message: message,
                    });
            }
        }
    } finally {
        active = false;
    }
}
export function retireLegacyRenderJobs() {
    const message = "Server export was interrupted. Retry in the editor to export in your browser.";
    db.transaction(() => {
        db.prepare(`
            UPDATE projects SET status='subtitle_selection', error_message=NULL, updated_at=?
            WHERE status='subtitle_generating' OR (
                status='failed'
                AND (SELECT status FROM video_exports WHERE project_id=projects.id ORDER BY rowid DESC LIMIT 1)='failed'
                AND COALESCE((SELECT task || ':' || status FROM node_jobs
                    WHERE project_id=projects.id AND task IN ('generate','render') ORDER BY rowid DESC LIMIT 1), '') != 'generate:failed'
            )
        `).run(now());
        db.prepare("UPDATE video_exports SET status='failed', error=?, updated_at=? WHERE status IN ('queued','rendering')")
            .run(message, now());
        db.prepare("UPDATE node_jobs SET status='cancelled', error=?, lease=NULL WHERE task IN ('render','cancel_render') AND status IN ('queued','running')")
            .run(message);
    })();
}
export function startJobs() {
    return setInterval(() => void tick(), 500);
}
