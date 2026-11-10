import { createHash } from "node:crypto";
import { z } from "zod";
import { captureSchema, isFollowupSourceTime, previewSchema, referenceDetailResult, referenceFollowupResult, traceResultSchema, type BrowserMotionTask } from "../../shared/motion/browser-tools";
import { motionAssetProvenance } from "../../shared/motion/assets";
import { db, json, project } from "../database";
import { document } from "../document";
import { fail } from "../security";
import {
    changeMotionRunStatus, extendMotionStep, failMotionStep, finishMotionStep, isActiveMotionRun, motionBrowserInput,
    motionLeaseMs, readyMotionSteps, recoverExpiredMotionSteps, startMotionStep,
} from "./orchestrator";
import { appendMotionEvent, motionArtifact, motionSteps, ownedMotionRun, type MotionRun } from "./store";
import { motionElapsed } from "./ledger";
import { motionLimits } from "./budget";

const resultSchema = z.object({
    token: z.uuid(), expectedRevision: z.number().int().nonnegative(), result: z.unknown(),
}).strict();

function requireRevision(run: MotionRun, revision = run.starting_revision) {
    const p = project(run.project_id);
    if (!p || revision !== run.starting_revision || document(p).revision !== revision) {
        fail(409, "The project changed during this browser task.");
    }
}

function requireTime(run: MotionRun) {
    const limits = motionLimits();
    const { active, waiting } = motionElapsed(run);
    if (active >= limits.activeMs || waiting >= limits.browserWaitMs) fail(409, "The motion run time budget expired.");
}

export function claimMotionBrowserTask(runId: string, accountId: number): BrowserMotionTask | null {
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        if (!isActiveMotionRun(run)) return null;
        if (!recoverExpiredMotionSteps(run)) return null;
        const steps = motionSteps(runId);
        if (steps.some(({ lane, status }) => lane === "browser" && status === "running")) return null;
        const next = readyMotionSteps(runId).find(({ lane }) => lane === "browser");
        if (!next) return null;
        requireTime(run);
        requireRevision(run);
        let input: BrowserMotionTask["input"];
        try { input = motionBrowserInput(run, next); } catch {
            fail(409, "The browser input is unavailable. Check the selected reference and try again.");
        }
        const lease = startMotionStep(run, next, motionLeaseMs);
        if (!lease?.lease_token || !lease.lease_expires) return null;
        changeMotionRunStatus(run, "working");
        return { id: next.id, token: lease.lease_token, expectedRevision: run.starting_revision,
            leaseExpires: lease.lease_expires, input };
    }).immediate();
}

export function heartbeatMotionBrowserTask(runId: string, accountId: number, taskId: string, raw: unknown) {
    const { token } = z.object({ token: z.uuid() }).strict().parse(raw);
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        const step = motionSteps(runId).find(({ id, lane }) => id === taskId && lane === "browser");
        if (!isActiveMotionRun(run) || !step || step.lease_token !== token) fail(409, "The browser task lease expired.");
        requireTime(run);
        requireRevision(run);
        const leaseExpires = extendMotionStep(runId, taskId, token);
        if (!leaseExpires) fail(409, "The browser task lease expired.");
        return { leaseExpires };
    }).immediate();
}

export function releaseMotionBrowserTask(runId: string, accountId: number, taskId: string, raw: unknown) {
    const { token } = z.object({ token: z.uuid() }).strict().parse(raw);
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        const step = motionSteps(runId).find(({ id, lane }) => id === taskId && lane === "browser");
        if (!isActiveMotionRun(run) || step?.status !== "running" || step.lease_token !== token) return { released: false };
        if (step.attempts >= 3) {
            failMotionStep(run, step, "The browser could not finish this stage after three attempts. Earlier artifacts were saved.");
            return { released: true };
        }
        db.prepare("UPDATE motion_steps SET status='pending',lease_token=NULL,lease_expires=NULL WHERE id=?").run(step.id);
        appendMotionEvent(run.id, "step_interrupted", { step: step.name, lane: step.lane });
        changeMotionRunStatus(run, "waiting_for_browser");
        return { released: true };
    }).immediate();
}

export function submitMotionBrowserTask(runId: string, accountId: number, taskId: string, raw: unknown) {
    const { token, expectedRevision, result } = resultSchema.parse(raw);
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        const step = motionSteps(runId).find(({ id, lane }) => id === taskId && lane === "browser");
        if (!step || step.lease_token !== token || expectedRevision !== run.starting_revision) {
            fail(409, "The browser task lease is no longer current.");
        }
        const value = step.name === "reference_capture" ? captureSchema.parse(result)
            : step.name === "reference_detail" ? referenceDetailResult.parse(result)
            : step.name === "reference_followup" ? referenceFollowupResult.parse(result)
            : step.name.startsWith("trace:") ? traceResultSchema.parse(result) : previewSchema.parse(result);
        if (step.status === "done" && step.result_id) {
            const prior = motionArtifact(runId, step.result_id);
            if (prior?.body.toString("utf8") === JSON.stringify(value)) return { duplicate: true };
            fail(409, "Different evidence was already recorded for this task.");
        }
        if (!isActiveMotionRun(run) || step.status !== "running" || !step.lease_expires || step.lease_expires <= Date.now()) {
            fail(409, "The browser task lease expired.");
        }
        requireTime(run);
        requireRevision(run, expectedRevision);
        let input: BrowserMotionTask["input"];
        try { input = motionBrowserInput(run, step); } catch { fail(409, "The browser input changed."); }
        if (input.tool === "trace" && "status" in value) {
            if (value.bindingId !== input.reference.bindingId) fail(409, "The reference was replaced.");
            if (value.status === "traced") {
                const saved = db.prepare(`SELECT m.provenance FROM motion_asset_metadata m JOIN project_assets a ON a.id=m.asset_id
                    WHERE m.asset_id=? AND a.project_id=? AND m.kind='vectors'`).get(value.assetId, run.project_id) as { provenance: string } | undefined;
                const source = saved && motionAssetProvenance.safeParse(json(saved.provenance, null));
                if (!source?.success || source.data.kind !== "reference_derived" || source.data.sourceId !== input.reference.assetId ||
                    source.data.startSeconds !== input.interval.start || source.data.endSeconds !== input.interval.end) {
                    fail(422, "The traced asset does not match the assigned reference interval.");
                }
            }
            const summary = value.status === "traced" ? "The browser traced the reference into editable liquid shapes."
                : "The browser could not isolate the liquid shapes. The scene will use a procedural approximation.";
            if (!finishMotionStep(run, step, { value, summary })) fail(409, "The browser task lease expired.");
            return { duplicate: false };
        }
        if (!("images" in value)) fail(422, "The browser tool result did not match its request.");
        if (input.tool === "reference_capture" && "measured" in value) {
            const { bindingId, metadata: { kind, interval } } = input.reference;
            if (value.bindingId !== bindingId) fail(409, "The reference was replaced.");
            const times = value.measured.timestamps;
            if (kind === "image" ? times.length !== 1 || times[0] !== 0 :
                !interval || times.some((time) => time < interval.start - 0.2 || time > interval.end)) {
                fail(422, "The samples are outside the selected reference.");
            }
        }
        if (input.tool === "preview" && "frames" in value &&
            (value.frames.some((frame) => frame >= input.document.total_frames) ||
                new Set(value.frames).size !== value.frames.length)) fail(422, "The preview sample frames are invalid.");
        if (input.tool === "reference_detail" && "samples" in value &&
            (value.bindingId !== input.reference.bindingId || (value.samples.length > 0 &&
                JSON.stringify(value.samples) !== JSON.stringify(input.samples)))) {
            fail(422, "The detailed frames do not match the assigned reference scenes.");
        }
        if (input.tool === "reference_followup" && "followups" in value) {
            if (value.bindingId !== input.reference.bindingId) fail(409, "The reference was replaced.");
            if (new Set(value.followups.map(({ sceneId }) => sceneId)).size !== value.followups.length ||
                value.followups.some(({ sceneId, time, bounds, sourceTime }) => {
                    const request = input.requests.find((request) => request.sceneId === sceneId);
                    return !request || time !== request.time || JSON.stringify(bounds) !== JSON.stringify(request.bounds) ||
                        !isFollowupSourceTime(sourceTime, time, request.interval);
                })) fail(422, "The follow-up frames do not match the assigned reference samples.");
        }
        const crops = "crops" in value ? value.crops ?? [] : [];
        if ("samples" in value && (new Set(crops.map(({ sceneId }) => sceneId)).size !== crops.length ||
            crops.some((crop) => !value.samples.some(({ sceneId, time }) => sceneId === crop.sceneId && time === crop.time)))) {
            fail(422, "The reference crops must match sampled scenes and timestamps.");
        }
        for (const image of [...value.images, ...crops.map(({ image }) => image)]) {
            const bytes = Buffer.from(image.base64, "base64");
            if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff ||
                bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9 ||
                createHash("sha256").update(bytes).digest("hex") !== image.sha256) {
                fail(422, "The browser evidence image or checksum is invalid.");
            }
        }
        const summary = "measured" in value
            ? `The browser sampled ${value.measured.timestamps.length} reference frames.`
            : "samples" in value ? value.samples.length ? `The browser captured ${value.samples.length} detailed scene frames.`
                : "Detailed reference frames were unavailable. Continuing with the saved visual observations."
                : "followups" in value ? value.followups.length ? `The browser captured ${value.followups.length} follow-up reference samples.`
                    : "Follow-up samples were unavailable. Continuing with the saved evidence."
                : `The browser rendered ${value.frames.length} preview frames for review.`;
        if (!finishMotionStep(run, step, { value, summary })) fail(409, "The browser task lease expired.");
        return { duplicate: false };
    }).immediate();
}
