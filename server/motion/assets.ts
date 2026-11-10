import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db, insert, now } from "../database";
import { mediaRoot, origin } from "../env";
import { mediaDuration } from "../media";
import { fail } from "../security";
import type { Document } from "../../shared/contracts";
import { motionAssetByteLimit, motionAssetKind, motionAssetProvenance, parseMotionVectors, type MotionAssetKind } from "../../shared/motion/assets";

function mimeType(kind: MotionAssetKind, bytes: Buffer, name: string) {
    switch (kind) {
        case "font":
            if (bytes.subarray(0, 4).toString("ascii") === "wOF2") return "font/woff2";
            if (bytes.length >= 12 && bytes.readUInt32BE(0) === 0x10000) return "font/ttf";
            break;
        case "image":
            if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
            if (bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
            break;
        case "vectors":
            try { parseMotionVectors(bytes.toString("utf8")); }
            catch { fail(422, "The motion vector asset is invalid."); }
            return "application/json";
        case "audio":
            switch (path.extname(name).toLowerCase()) {
                case ".mp3": return "audio/mpeg";
                case ".wav": return "audio/wav";
                case ".m4a": return "audio/mp4";
                case ".aac": return "audio/aac";
            }
    }
    fail(422, "The asset format is unsupported for this motion tool.");
}

export async function saveMotionAsset(projectId: number, upload: { buffer: Buffer; originalname: string }, rawKind: unknown, rawProvenance: unknown) {
    const kind = motionAssetKind.parse(rawKind);
    const provenance = motionAssetProvenance.parse(rawProvenance);
    if (!upload.buffer.length || upload.buffer.length > motionAssetByteLimit[kind]) fail(422, "Motion asset size is invalid.");
    if (provenance.kind === "reference_derived") {
        const source = db.prepare("SELECT mime FROM project_assets WHERE id=? AND project_id=?")
            .get(provenance.sourceId, projectId) as { mime: string } | undefined;
        if (!source?.mime.startsWith("video/")) fail(422, "The source reference must be an owned video asset.");
    }
    const mime = mimeType(kind, upload.buffer, upload.originalname);
    const id = randomUUID();
    const storedPath = `project-assets/${projectId}/${id}`;
    const filename = path.join(mediaRoot, "private", storedPath);
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, upload.buffer, { flag: "wx" });
    const sha256 = createHash("sha256").update(upload.buffer).digest("hex");
    const provenanceJson = JSON.stringify(provenance);
    let savedId: string;
    try {
        const duration = kind === "audio" ? await mediaDuration(filename, mime) : null;
        savedId = db.transaction(() => {
            if (kind === "audio" && provenance.kind === "reference_derived") {
                const existing = db.prepare(`SELECT a.id FROM project_assets a JOIN motion_asset_metadata m ON m.asset_id=a.id
                    WHERE a.project_id=? AND m.kind=? AND m.sha256=? AND m.provenance=? LIMIT 1`)
                    .get(projectId, kind, sha256, provenanceJson) as { id: string } | undefined;
                if (existing) return existing.id;
            }
            insert("project_assets", {
                id, project_id: projectId, path: storedPath, name: upload.originalname.slice(0, 255),
                mime, size: upload.buffer.length, duration_seconds: duration, created_at: now(), updated_at: now(),
            });
            insert("motion_asset_metadata", { asset_id: id, kind, sha256, provenance: provenanceJson });
            return id;
        }).immediate();
    } catch (error) {
        await fs.unlink(filename);
        throw error;
    }
    if (savedId !== id) await fs.unlink(filename);
    return { id: savedId, kind, sha256, provenance, url: `${origin}/projects/${projectId}/assets/${savedId}` };
}

export function validateMotionAssetOwnership(projectId: number, document: Document) {
    const lookup = db.prepare(
        "SELECT a.mime,m.kind FROM project_assets a LEFT JOIN motion_asset_metadata m ON m.asset_id=a.id WHERE a.id=? AND a.project_id=?",
    );
    for (const scene of document.tracks.motion_graphics) {
        for (const ref of scene.assets) {
            const row = lookup.get(ref.id, projectId) as { mime: string; kind: MotionAssetKind | null } | undefined;
            if (!row || (row.kind !== ref.kind && !(ref.kind === "image" && row.mime.startsWith("image/")))) {
                fail(422, "A motion scene references an unavailable or incompatible project asset.");
            }
        }
    }
    if (document.metadata.workflow === "motion_graphics") {
        for (const track of document.tracks.audio) {
            const id = /^asset:([a-f0-9-]{36})$/i.exec(track.url)?.[1];
            if (id) {
                const row = lookup.get(id, projectId) as { mime: string } | undefined;
                if (!row?.mime.startsWith("audio/")) fail(422, "The selected motion audio asset is unavailable.");
            }
        }
    }
}
