import { createRequire } from "node:module";
import type { Document } from "../../remotion-api/packages/contracts/index";
const require = createRequire(import.meta.url);
const {
    normalizeDocument,
    commandSchema,
} = require("../../remotion-api/packages/contracts/dist/index.js");
const {
    applyOperations,
} = require("../../remotion-api/packages/editing-core/dist/index.js");
const {
    legacyPayloadToEditState,
} = require("../../remotion-api/remotion/utils/legacyAdapter.ts");
import { json, db, scenes, project, insert, update, now } from "./database";
import { origin } from "./env";
import { fail, hash, signed } from "./security";
export function normalizeExisting(value: any): Document {
    return normalizeDocument(json(value, {}));
}
export function applyEdit(current: Document, operations: any[]) {
    return applyOperations(current, operations);
}
export function document(p: any): Document {
    let d: any;
    if (p.edit_state) d = json(p.edit_state, {});
    else {
        const clips = scenes(p.id);
        const words = json<any[]>(p.voiceover_transcript, []);
        let offset = 0;
        const subtitles = clips.map((s) => {
            const start = offset;
            offset += Number(
                s.trimmed_duration ??
                    s.gemini_duration ??
                    s.duration_seconds ??
                    3,
            );
            return {
                text: s.script_text,
                start,
                end: offset,
                style: "tiktok_trending",
                words: words.filter(
                    (w) => w.start >= start - 0.01 && w.start < offset,
                ),
            };
        });
        d = legacyPayloadToEditState({
            projectId: String(p.id),
            clips: clips.map((s) => s.video_url),
            clipDurations: clips.map((s) =>
                Number(
                    s.trimmed_duration ??
                        s.gemini_duration ??
                        s.duration_seconds ??
                        3,
                ),
            ),
            clipStartTimes: clips.map((s) => Number(s.start_time || 0)),
            clipEndTimes: clips.map((s) =>
                Number(s.end_time ?? s.gemini_duration ?? 3),
            ),
            mediaTypes: clips.map((s) =>
                s.type === "image" ? "image" : "video",
            ),
            subtitles,
            aspectRatio: json<string[]>(p.video_format, ["9:16"])[0],
            voiceOver: p.voiceover_file
                ? `${origin}/projects/${p.id}/voiceover`
                : undefined,
        });
        d.tracks.video.forEach(
            (c: any, i: number) => (c.id = "scene_" + clips[i].id),
        );
        d.total_frames = Math.max(
            1,
            d.total_frames || 0,
            Math.ceil(
                (json<any[]>(p.voiceover_transcript, []).at(-1)?.end || 0) *
                    (d.fps || 30),
            ),
        );
        if (d.tracks.video.length)
            d.tracks.video.at(-1).end_frame = d.total_frames;
        for (const a of d.tracks.audio)
            if (a.type === "voiceover") a.end_frame = d.total_frames;
    }
    d.project_id = String(p.id);
    for (const track of [d.tracks.video, d.tracks.audio, d.tracks.overlays])
        for (const item of track) {
            const key =
                "clip_url" in item ? "clip_url" : "url" in item ? "url" : "src";
            const value = item[key];
            if (!value) continue;
            const url = new URL(value, origin);
            if (item.type === "voiceover" && p.voiceover_file)
                item[key] = `${origin}/projects/${p.id}/voiceover`;
            else if (
                /^\/(projects\/\d+\/assets\/|migration-fixtures\/)/.test(
                    url.pathname,
                )
            )
                item[key] = origin + url.pathname;
        }
    return normalizeDocument(d);
}
export function renderSnapshot(d: Document, p: any) {
    const result = structuredClone(d);
    for (const track of [
        result.tracks.video,
        result.tracks.audio,
        result.tracks.overlays,
    ])
        for (const item of track as any[]) {
            const field =
                "clip_url" in item ? "clip_url" : "url" in item ? "url" : "src";
            if (!item[field]) continue;
            const pathname = new URL(item[field], origin).pathname;
            const asset = pathname.match(
                /^\/projects\/(\d+)\/assets\/([a-f0-9-]{36})$/,
            );
            if (asset) {
                if (
                    Number(asset[1]) !== p.id ||
                    !db
                        .prepare(
                            "SELECT id FROM project_assets WHERE id=? AND project_id=?",
                        )
                        .get(asset[2], p.id)
                )
                    fail(422, "Asset belongs to another project");
                item[field] = signed(pathname);
            }
            const voice = pathname.match(/^\/projects\/(\d+)\/voiceover$/);
            if (voice) {
                if (Number(voice[1]) !== p.id)
                    fail(422, "Voiceover belongs to another project");
                item[field] = signed(pathname);
            }
        }
    return result;
}
export function commit(p: any, input: any) {
    return db.transaction(() => {
        const digest = hash(JSON.stringify(input));
        const existing = db
            .prepare("SELECT * FROM edit_commands WHERE id=?")
            .get(input.commandId) as any;
        if (existing) {
            if (existing.project_id !== p.id || existing.input_hash !== digest)
                fail(409, "Command ID already used");
            return json(existing.result, {});
        }
        const current = document(project(p.id));
        if (current.revision !== input.expectedRevision)
            fail(409, "The project changed. Reload before applying edits.");
        const run = db
            .prepare("SELECT * FROM agent_runs WHERE id=?")
            .get(input.commandId) as any;
        if (run?.status === "cancelled") fail(409, "This run was cancelled");
        let next: Document;
        if (input.restoreRevision !== undefined) {
            const r = db
                .prepare(
                    "SELECT document FROM edit_revisions WHERE project_id=? AND revision=?",
                )
                .get(p.id, input.restoreRevision) as any;
            if (!r) fail(422, "Revision unavailable");
            next = normalizeDocument({
                ...json(r.document, {}),
                revision: current.revision + 1,
                version: current.revision + 1,
            });
        } else {
            commandSchema.parse({ ...input, projectId: String(p.id) });
            next = applyOperations(current, input.operations);
        }
        for (const d of [current, next])
            db.prepare(
                "INSERT OR IGNORE INTO edit_revisions(project_id,revision,document,created_at,updated_at) VALUES(?,?,?,?,?)",
            ).run(p.id, d.revision, JSON.stringify(d), now(), now());
        update("projects", p.id, {
            edit_state: JSON.stringify(next),
            updated_at: now(),
        });
        const result = {
            success: true,
            edit_state: next,
            revision: next.revision,
        };
        insert("edit_commands", {
            id: input.commandId,
            project_id: p.id,
            input_hash: digest,
            result: JSON.stringify(result),
            created_at: now(),
            updated_at: now(),
        });
        if (run)
            update("agent_runs", run.id, {
                status: "applied",
                result: JSON.stringify(result),
                updated_at: now(),
            });
        return result;
    })();
}
