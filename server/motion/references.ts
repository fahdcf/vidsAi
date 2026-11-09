import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { db, json } from "../database";
import { mediaFile } from "../jobs";
import { fail } from "../security";
import { referenceAnalysisSchema, referenceIntervalSchema } from "../../shared/motion/reference";

const binding = z.object({
    assetId: z.uuid(),
    width: z.number().int().positive().max(4096),
    height: z.number().int().positive().max(4096),
    interval: referenceIntervalSchema.nullable(),
}).strict();

type ReferenceRow = {
    binding_id: string;
    asset_id: string;
    metadata: string;
    analysis: string | null;
    name: string;
    path: string;
};

function row(projectId: number) {
    return db.prepare(
        "SELECT r.*,a.name,a.path FROM motion_references r JOIN project_assets a ON a.id=r.asset_id AND a.project_id=r.project_id WHERE r.project_id=?",
    ).get(projectId) as ReferenceRow | undefined;
}

function referenceFile(filename: string) {
    try { return mediaFile(filename); } catch { return mediaFile(filename, "private"); }
}

export function motionReference(projectId: number) {
    const saved = row(projectId);
    if (!saved) return null;
    let available: boolean;
    try { referenceFile(saved.path); available = true; } catch { available = false; }
    return {
        bindingId: saved.binding_id, assetId: saved.asset_id, name: saved.name, available,
        url: `/projects/${projectId}/assets/${saved.asset_id}`,
        metadata: json(saved.metadata, {}),
        analysis: json(saved.analysis, null),
    };
}

export async function bindMotionReference(projectId: number, value: unknown) {
    const input = binding.parse(value);
    const asset = db.prepare("SELECT path,mime,size,duration_seconds FROM project_assets WHERE id=? AND project_id=?")
        .get(input.assetId, projectId) as { path: string; mime: string; size: number; duration_seconds: number | null } | undefined;
    if (!asset) fail(404, "The project reference asset was not found.");
    const kind = asset.mime === "video/mp4" ? "video" : ["image/jpeg", "image/png"].includes(asset.mime) ? "image" : null;
    if (!kind || asset.size <= 0 || asset.size > 100 * 1024 * 1024) fail(422, "The reference type or size is unsupported.");
    const { width, height, interval } = input;
    if (kind === "video") {
        if (!interval || !asset.duration_seconds || asset.duration_seconds > 30.001 ||
            interval.end > asset.duration_seconds + 0.035 || Math.max(width, height) > 1920 || Math.min(width, height) > 1080) {
            fail(422, "The video interval or dimensions exceed the reference limit.");
        }
    } else if (interval !== null || width * height > 4_000_000) {
        fail(422, "An image reference needs valid image dimensions and no time interval.");
    }
    let filename: string;
    try { filename = referenceFile(asset.path); } catch { fail(404, "Relink the reference file."); }
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    const metadata = JSON.stringify({ kind, width, height, interval, sha256: hash.digest("hex") });
    db.transaction(() => {
        const saved = row(projectId);
        if (saved?.asset_id === input.assetId && saved.metadata === metadata) return;
        db.prepare(
            "INSERT INTO motion_references(project_id,binding_id,asset_id,metadata) VALUES(?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET binding_id=excluded.binding_id,asset_id=excluded.asset_id,metadata=excluded.metadata,analysis=NULL",
        ).run(projectId, randomUUID(), input.assetId, metadata);
    }).immediate();
    return motionReference(projectId);
}

const analysisInput = z.object({ bindingId: z.uuid(), analysis: referenceAnalysisSchema }).strict();
export function saveMotionReferenceAnalysis(projectId: number, value: unknown) {
    const { bindingId, analysis } = analysisInput.parse(value);
    return db.transaction(() => {
        const saved = motionReference(projectId);
        if (!saved || saved.bindingId !== bindingId) fail(409, "The reference was replaced. Analyze the current reference.");
        if (!saved.available) fail(404, "Relink the reference file.");
        const meta = z.object({ kind: z.enum(["image", "video"]), interval: referenceIntervalSchema.nullable() }).parse(saved.metadata);
        if (meta.kind !== analysis.kind || meta.interval?.start !== analysis.interval?.start || meta.interval?.end !== analysis.interval?.end) {
            fail(422, "The analysis does not match the selected reference interval.");
        }
        db.prepare("UPDATE motion_references SET analysis=? WHERE project_id=? AND binding_id=?")
            .run(JSON.stringify(analysis), projectId, bindingId);
        return motionReference(projectId);
    }).immediate();
}
