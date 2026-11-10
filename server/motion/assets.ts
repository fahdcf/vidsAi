import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db, insert, json, now } from "../database";
import { mediaRoot, origin } from "../env";
import { mediaDuration } from "../media";
import { fail } from "../security";
import type { Document } from "../../shared/contracts";
import { motionAssetByteLimit, motionAssetKind, motionAssetProvenance, parseMotionVectors, type MotionAssetKind } from "../../shared/motion/assets";
import { importMotionSvg } from "./svg";
import { referenceMetadata } from "../../shared/motion/browser-tools";

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
    const boundMeta = (sourceId: string) => {
        const binding = db.prepare("SELECT metadata FROM motion_references WHERE project_id=? AND asset_id=?")
            .get(projectId, sourceId) as { metadata: string } | undefined;
        return referenceMetadata.safeParse(binding ? json(binding.metadata, null) : null);
    };
    if (provenance.kind === "reference_derived") {
        const source = db.prepare("SELECT mime FROM project_assets WHERE id=? AND project_id=?")
            .get(provenance.sourceId, projectId) as { mime: string } | undefined;
        if (!source?.mime.startsWith("video/")) fail(422, "The source reference must be an owned video asset.");
        if (provenance.audioExtraction) {
            const bound = db.prepare("SELECT metadata FROM motion_references WHERE project_id=? AND asset_id=?")
                .get(projectId, provenance.sourceId) as { metadata: string } | undefined;
            const hash = bound ? json<{ sha256?: string }>(bound.metadata, {}).sha256 : null;
            if (kind !== "audio" || provenance.audioExtraction.sourceSha256 !== hash) {
                fail(422, "The audio extraction does not match the selected video reference.");
            }
        }
    }
    let bytes = upload.buffer;
    if (kind === "vectors" && path.extname(upload.originalname).toLowerCase() === ".svg") {
        try { bytes = Buffer.from(JSON.stringify(importMotionSvg(bytes))); }
        catch { fail(422, "Use a static SVG with a viewBox and filled absolute M, L, Q, C and Z paths."); }
    }
    const mime = mimeType(kind, bytes, upload.originalname);
    const id = randomUUID();
    const storedPath = `project-assets/${projectId}/${id}`;
    const filename = path.join(mediaRoot, "private", storedPath);
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, bytes, { flag: "wx" });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const provenanceJson = JSON.stringify(provenance);
    let savedId: string;
    try {
        const duration = kind === "audio" ? await mediaDuration(filename, mime) : null;
        savedId = db.transaction(() => {
            if (provenance.kind === "reference_crop") {
                const meta = boundMeta(provenance.sourceId);
                if (kind !== "image" || !meta.success || meta.data.sha256 !== provenance.sourceSha256 ||
                    (meta.data.kind === "image" ? provenance.time !== 0 : !meta.data.interval ||
                        provenance.time < meta.data.interval.start || provenance.time >= meta.data.interval.end)) {
                    fail(422, "The crop must use the current owned reference and selected interval.");
                }
            }
            if (provenance.kind === "reference_derived" && provenance.sourceSha256) {
                const meta = boundMeta(provenance.sourceId);
                if (kind !== "vectors" || !meta.success || meta.data.sha256 !== provenance.sourceSha256 || !meta.data.interval ||
                    provenance.startSeconds < meta.data.interval.start || provenance.endSeconds > meta.data.interval.end ||
                    provenance.endSeconds - provenance.startSeconds > 6) fail(422, "The trace must use the current owned reference and selected interval.");
            }
            if (kind === "audio" && provenance.kind === "reference_derived") {
                const existing = db.prepare(`SELECT a.id FROM project_assets a JOIN motion_asset_metadata m ON m.asset_id=a.id
                    WHERE a.project_id=? AND m.kind=? AND m.sha256=? AND m.provenance=? LIMIT 1`)
                    .get(projectId, kind, sha256, provenanceJson) as { id: string } | undefined;
                if (existing) return existing.id;
            }
            insert("project_assets", {
                id, project_id: projectId, path: storedPath, name: upload.originalname.slice(0, 255),
                mime, size: bytes.length, duration_seconds: duration, created_at: now(), updated_at: now(),
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

export function motionGraphAssets(projectId: string) {
    const rows = db.prepare(`SELECT a.id, a.name, m.kind, m.provenance, m.sha256 FROM project_assets a JOIN motion_asset_metadata m ON m.asset_id=a.id
        WHERE a.project_id=? AND m.kind IN ('image', 'vectors') ORDER BY a.created_at DESC, a.id LIMIT 12`).all(projectId) as
        { id: string; name: string; kind: "image" | "vectors"; provenance: string; sha256: string }[];
    return rows.map(({ provenance, ...asset }) => ({ ...asset, provenance: motionAssetProvenance.parse(json(provenance, null)) }));
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
