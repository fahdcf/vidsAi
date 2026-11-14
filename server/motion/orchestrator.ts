import { randomUUID } from "node:crypto";
import { db, json, project, update } from "../database";
import { commit, document } from "../document";
import { fail } from "../security";
import { compileMotionPlan, motionPlanSchema, motionSceneExceedsBudget } from "../../shared/motion/compile";
import { motionRendererVersion } from "../../shared/motion/registry";
import { motionQualitySchema, motionSceneSchema, type MotionQuality } from "../../shared/motion/schema";
import { applyMotionEdit } from "../../shared/motion/edit";
import { sceneProgramInput } from "../../shared/motion/scene-program";
import { referenceAnalysisSchema, type ReferenceAnalysis } from "../../shared/motion/reference";
import { referenceSceneSpecSchema } from "../../shared/motion/reference-spec";
import { referenceClock, referenceTimeAt } from "../../shared/motion/time-map";
import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { captureSchema, previewSchema, traceRequestSchema, traceResultSchema, evidenceImages, referenceDetailRequest, referenceDetailResult, referenceFollowupRequest, referenceFollowupResult, referenceMetadata, type BrowserMotionInput } from "../../shared/motion/browser-tools";
import { MotionBudgetError, motionLimits, type MotionModelBudget } from "./budget";
import { motionElapsed, stepMotionBudget } from "./ledger";
import { MotionAgentUnavailable, type MotionAgentProgress } from "./agent-call";
import { agentToolLimit, agentToolStageLimit, MotionToolYield, parseAgentToolRequest, type AgentToolSession } from "./agent-tools";
import { motionGraphAssets, validateMotionAssetOwnership } from "./assets";
import { compileMotionProgram } from "./programs";
import { sceneReferenceEvidence } from "./reference-segments";
import { runReferenceSpec } from "./reference-spec";
import { createMotionLayoutDraft, layoutForScene } from "./layout-draft";
import { motionSpeechTiming, type SpeechSpan } from "./speech";
import { motionSkillManifest, type MotionPromptRole } from "./prompts";
import { pendingMotionSetup } from "./setup";
import { motionReference, saveMotionReferenceAnalysis } from "./references";
import { observeReferenceSheet, referenceObservationsSchema } from "./reference-observer";
import {
    integrateMotionScenes, motionBuildSchema, motionCopySchema, motionDesignSchema, motionDraftBlockers, motionStoryboardSchema,
    motionCritiqueSchema, resolveMotionStoryboard, runMotionCopywriter, runMotionCritic, runMotionDesigner, runMotionDirector, runMotionEngineer,
    reviewMotionLayout, motionRepairSchema,
    runMotionRepair, runMotionRevision, runReferenceAnalyst, type MotionBuild, type MotionCritique,
} from "./agents";
import {
    addMotionStep, appendMotionEvent, appendMotionMessage, createMotionRun, motionArtifact, motionRun, motionSnapshot,
    motionSteps, ownedMotionRun, writeMotionArtifact, type MotionRun, type MotionStep, type MotionStepInput, type RunStatus,
} from "./store";

type BuildArtifact = { plan: z.infer<typeof motionPlanSchema>; document: Document | null; blockers?: MotionCritique["issues"];
    approximations?: MotionQuality["approximations"] };
type StepOutput = { value: unknown; summary?: string };
type StepHandler = (run: MotionRun, step: MotionStep, budget: MotionModelBudget, signal: AbortSignal) => Promise<StepOutput>;
const activeStatuses = new Set<RunStatus>(["queued", "working", "waiting_for_browser"]);
export const motionLeaseMs = 45_000;

export function isActiveMotionRun(run: MotionRun) {
    return activeStatuses.has(run.status);
}

export function changeMotionRunStatus(run: MotionRun, status: RunStatus, error: string | null = null) {
    if (run.status === status) return;
    db.prepare("UPDATE motion_runs SET status=?,error=?,updated_at=? WHERE id=?").run(status, error, Date.now(), run.id);
    appendMotionEvent(run.id, "run_status", { status, error });
}

function result<T>(runId: string, name: string): T {
    const row = db.prepare("SELECT result_id FROM motion_steps WHERE run_id=? AND name=? AND status='done'")
        .get(runId, name) as { result_id: string } | undefined;
    const artifact = row && motionArtifact(runId, row.result_id);
    if (!artifact) throw new Error(`Missing motion artifact for ${name}.`);
    return JSON.parse(artifact.body.toString("utf8")) as T;
}

function agentResult<T>(runId: string, name: string, schema: z.ZodType<T>): T {
    return schema.parse(result<{ value: unknown }>(runId, name).value);
}

async function cachedObservations(runId: string, step: MotionStep, kind: string, signal: AbortSignal,
    read: () => Promise<ReferenceAnalysis["observations"]>) {
    const cached = db.prepare("SELECT id FROM motion_artifacts WHERE run_id=? AND kind=? ORDER BY rowid DESC LIMIT 1")
        .get(runId, kind) as { id: string } | undefined;
    const previous = cached && motionArtifact(runId, cached.id);
    if (previous) return referenceObservationsSchema.parse(JSON.parse(previous.body.toString("utf8"))).observations;
    const observations = await read();
    signal.throwIfAborted();
    db.transaction(() => {
        const current = motionRun(runId);
        if (current && isActiveMotionRun(current) && db.prepare(
            "SELECT 1 FROM motion_steps WHERE id=? AND status='running' AND lease_token=? AND lease_expires>?",
        ).get(step.id, step.lease_token, Date.now())) {
            writeMotionArtifact(runId, kind, Buffer.from(JSON.stringify({ observations })));
        }
    }).immediate();
    return observations;
}

const stepNames = (round: number) => ({
    assemble: round === 1 ? "assemble" : `assemble:${round}`,
    preview: `preview:${round}`,
    critique: `critique:${round}`,
    compare: `compare:${round}`,
    repair: (id: string) => `repair:${round}:${id}`,
});

function defineGraph(run: MotionRun, steps: readonly MotionStep[], maxRounds: number) {
    const { id } = run;
    const done = (name: string) => steps.some((step) => step.name === name && step.status === "done");
    const add = (step: MotionStepInput) => addMotionStep(id, step);
    if (run.target_scene_id) {
        add({ name: "revise", lane: "provider" });
        add({ name: "assemble", lane: "local", dependencies: ["revise"], input: { round: 1 } });
    } else {
        const speech = motionSnapshot(run).metadata.motion_speech_requested;
        if (speech) add({ name: "audio_speech", lane: "provider" });
        if (run.reference_binding_id) {
            add({ name: "reference_capture", lane: "browser" });
            add({ name: "reference_analysis", lane: "provider", dependencies: ["reference_capture"] });
        }
        add({ name: "director", lane: "provider", dependencies: [
            ...(run.reference_binding_id ? ["reference_analysis"] : []), ...(speech ? ["audio_speech"] : []),
        ] });
        if (!done("director")) return;
        const proposed = agentResult(id, "director", motionStoryboardSchema);
        const reference = run.reference_binding_id ? agentResult(id, "reference_analysis", referenceAnalysisSchema) : null;
        let useDetails = false;
        if (reference && proposed.look === "reference") {
            const snapshot = motionSnapshot(run);
            const samples = proposed.scenes.flatMap((scene) => {
                const evidence = sceneReferenceEvidence(reference, scene, snapshot);
                if (!evidence) return [];
                const interval = evidence.timing;
                const times = reference.measured.timestamps.filter((time) => !interval || (time >= interval.start && time <= interval.end));
                if (!times.length) return [];
                const source = reference.interval;
                const projected = source ? referenceTimeAt((scene.start_frame + scene.end_frame) / 2, referenceClock(source, snapshot)) : 0;
                const middle = interval && (projected < interval.start || projected >= interval.end)
                    ? (interval.start + interval.end) / 2 : projected;
                const observations = evidence.observations.filter(({ time }) => !interval || (time >= interval.start && time < interval.end));
                const closest = (times: readonly number[], time: number) => times.reduce((nearest, sample) =>
                    Math.abs(sample - time) < Math.abs(nearest - time) ? sample : nearest);
                const observed = observations.length ? closest(observations.map(({ time }) => time), middle) : middle;
                const time = closest(times, Math.abs(observed - middle) <= 0.65 ? observed : middle);
                return [{ sceneId: scene.id, time }];
            });
            if (samples.length) {
                useDetails = true;
                add({ name: "reference_detail", lane: "browser", dependencies: ["director"], input: samples });
                add({ name: "reference_spec", lane: "provider", dependencies: ["reference_detail"] });
            }
        }
        if (useDetails && !done("reference_spec")) return;
        const alreadyScheduled = steps.some(({ name }) => name === "design");
        const requests = useDetails && (!alreadyScheduled || steps.some(({ name }) => name === "reference_followup"))
            ? referenceFollowupRequest.parse(result<{ requests?: unknown }>(id, "reference_spec").requests ?? []) : [];
        if (requests.length) add({ name: "reference_followup", lane: "browser", dependencies: ["reference_spec"], input: requests });
        add({ name: "design", lane: "provider", dependencies: ["director", ...(useDetails ? ["reference_spec"] : []),
            ...(requests.length ? ["reference_followup"] : [])] });
        add({ name: "copy", lane: "provider", dependencies: ["design"] });
        if (!done("design")) return;
        const storyboard = resolveMotionStoryboard(proposed, agentResult(id, "design", motionDesignSchema));
        const sceneChecks = steps.some(({ name }) => name.startsWith("layout_proposal:")) ||
            !steps.some(({ name }) => name === "layout" || name === "assemble" || name.startsWith("engineer:"));
        if (sceneChecks) {
            const checks = storyboard.scenes.map(({ id: sceneId }) => {
                const proposal = `layout_proposal:${sceneId}`;
                const check = `layout_check:${sceneId}`;
                add({ name: proposal, lane: "local", dependencies: ["copy", "design", ...(useDetails ? ["reference_spec"] : [])], input: { sceneId } });
                add({ name: check, lane: "browser", dependencies: [proposal], input: { sceneId } });
                return check;
            });
            if (useDetails) add({ name: "layout_review", lane: "provider", dependencies: checks });
        }
        const liquid = storyboard.scenes.find(({ type }) => type === "liquid");
        const evidence = reference?.scenes.find(({ supportedType, timing }) => supportedType === "liquid" && timing && timing.end - timing.start <= 6);
        let trace = evidence?.timing ? { interval: evidence.timing, colors: evidence.palette } : null;
        if (liquid && reference?.interval && storyboard.look === "reference") {
            const { fps, total_frames } = motionSnapshot(run);
            const source = reference.interval;
            if (Math.abs(source.end - source.start - total_frames / fps) <= 1 / fps &&
                (liquid.end_frame - liquid.start_frame) / fps <= 6) {
                const interval = { start: source.start + liquid.start_frame / fps,
                    end: Math.min(source.end, source.start + liquid.end_frame / fps) };
                const overlap = trace ? Math.min(interval.end, trace.interval.end) - Math.max(interval.start, trace.interval.start) : 0;
                if (interval.end > interval.start && (!trace || overlap >= (interval.end - interval.start) / 2)) {
                    trace = { interval, colors: [] };
                }
            }
        }
        const traceName = liquid && trace ? `trace:${liquid.id}` : null;
        if (traceName) add({ name: traceName, lane: "browser", dependencies: ["director"], input: trace });
        const engineers = storyboard.scenes.map((target) => {
            const name = `engineer:${target.id}`;
            const traceDependency = traceName && target.id === liquid?.id ? [traceName] : [];
            const hasReview = sceneChecks ? useDetails : steps.some((item) => item.name === "layout_review");
            add({ name, lane: "provider", dependencies: ["copy", "design", ...traceDependency, ...(useDetails ? ["reference_detail"] : []),
                ...(sceneChecks ? [`layout_check:${target.id}`] : []), ...(hasReview ? ["layout_review"] : [])], input: { sceneId: target.id } });
            if (!sceneChecks) return name;
            const check = `motion_check:${target.id}`;
            add({ name: check, lane: "browser", dependencies: [name], input: { sceneId: target.id } });
            return check;
        });
        add({ name: "assemble", lane: "local", dependencies: engineers, input: { round: 1 } });
    }
    let previousFindings: string[] = [];
    for (let round = 1; round <= maxRounds; round++) {
        const { assemble, preview, critique, compare, repair } = stepNames(round);
        if (!done(assemble)) return;
        const { blockers = [] } = result<BuildArtifact>(id, assemble);
        let issues = blockers;
        let unresolved: string[] = [];
        let reviewUnavailable = false;
        let dependency = assemble;
        if (!blockers.length) {
            add({ name: preview, lane: "browser", dependencies: [assemble], input: { round } });
            add({ name: critique, lane: "provider", dependencies: [preview], input: { round } });
            if (!done(critique)) return;
            const review = result<{ source?: string; value?: unknown }>(id, critique);
            reviewUnavailable = review.source === "review_unavailable";
            if (!reviewUnavailable) ({ issues, unresolved } = motionCritiqueSchema.parse(review.value));
            dependency = critique;
        }
        if (round > 1 && done(stepNames(round - 1).critique)) {
            add({ name: compare, lane: "local", dependencies: [dependency], input: { round } });
            if (!done(compare)) return;
            const comparison = result<{ retainedRound: number; findings: string[] }>(id, compare);
            if (comparison.retainedRound !== round) {
                add({ name: "publish", lane: "local", dependencies: [compare], input: {
                    round: comparison.retainedRound, issues: comparison.findings, reviewUnavailable,
                } });
                return;
            }
            dependency = compare;
        }
        if (issues.length && round < maxRounds && !run.target_scene_id) {
            const failed = round > 1 && steps.some(({ name, status }) => name.startsWith(`repair:${round - 1}:`) &&
                status === "done" && result<{ source?: string }>(id, name).source === "repair_unavailable");
            if (failed) {
                add({ name: "publish", lane: "local", dependencies: [dependency], input: {
                    round, issues: [...unresolved, ...issues.map(({ issue }) => issue)], reviewUnavailable: false,
                } });
                return;
            }
            previousFindings = [...unresolved, ...issues.map(({ issue }) => issue)];
            const sceneIds = [...new Set(issues.map(({ sceneId }) => sceneId))];
            for (const sceneId of sceneIds) {
                add({ name: repair(sceneId), lane: "provider", dependencies: [dependency], input: { round, sceneId } });
            }
            add({ name: stepNames(round + 1).assemble, lane: "local",
                dependencies: sceneIds.map(repair), input: { round: round + 1 } });
            continue;
        }
        add({ name: "publish", lane: "local", dependencies: [dependency],
            input: { round, issues: reviewUnavailable ? previousFindings : [...unresolved, ...issues.map(({ issue }) => issue)], reviewUnavailable } });
        return;
    }
}

export function readyMotionSteps(runId: string) {
    const steps = motionSteps(runId);
    const done = new Set(steps.filter(({ status }) => status === "done").map(({ name }) => name));
    return steps.filter(({ status, dependencies }) =>
        status === "pending" && json<string[]>(dependencies, []).every((name) => done.has(name)));
}

export function motionBrowserInput(run: MotionRun, step: MotionStep): BrowserMotionInput {
    if (step.name.startsWith("agent_tool:")) {
        const stored = json<{ role: MotionPromptRole; request: unknown; payload: unknown }>(step.input, {} as never);
        const request = parseAgentToolRequest(stored.role, stored.request);
        if (request.name === "sample_reference") {
            const reference = motionReference(run.project_id);
            if (!reference?.available || reference.bindingId !== run.reference_binding_id) throw new Error("Relink the assigned reference.");
            return { tool: "reference_followup", requests: referenceFollowupRequest.parse(stored.payload), reference: {
                bindingId: reference.bindingId, assetId: reference.assetId, url: reference.url, metadata: referenceMetadata.parse(reference.metadata),
            } };
        }
        if (request.name !== "render_scene") throw new Error("The specialist tool does not run in the browser.");
        const scene = motionSceneSchema.parse(stored.payload);
        const snapshot = motionSnapshot(run);
        return { tool: "preview", sampleFrames: [...new Set(request.args.frames)].sort((a, b) => a - b),
            document: { ...snapshot, tracks: { ...snapshot.tracks, motion_graphics: [scene] } } };
    }
    if (step.name.startsWith("layout_check:") || step.name.startsWith("motion_check:")) {
        const sceneId = step.name.split(":")[1];
        const staticLayout = step.name.startsWith("layout_check:");
        const scene = staticLayout ? motionSceneSchema.parse(result(run.id, `layout_proposal:${sceneId}`))
            : agentResult(run.id, `engineer:${sceneId}`, motionBuildSchema).scene;
        const snapshot = motionSnapshot(run);
        return { tool: "preview", staticLayout, document: { ...snapshot, tracks: { ...snapshot.tracks, motion_graphics: [scene] } } };
    }
    if (step.name === "layout") {
        const design = agentResult(run.id, "design", motionDesignSchema);
        const spec = z.array(referenceSceneSpecSchema).parse(result<{ specs: unknown }>(run.id, "reference_spec").specs);
        const storyboard = resolveMotionStoryboard(agentResult(run.id, "director", motionStoryboardSchema), design);
        return { tool: "preview", staticLayout: true, document: createMotionLayoutDraft(motionSnapshot(run), storyboard, design, spec) };
    }
    if (step.name === "reference_capture" || step.name === "reference_detail" || step.name === "reference_followup" || step.name.startsWith("trace:")) {
        const reference = motionReference(run.project_id);
        if (reference?.bindingId !== run.reference_binding_id) throw new Error("The reference was replaced.");
        if (!reference?.available) throw new Error("Relink the reference file.");
        const selected = { bindingId: reference.bindingId, assetId: reference.assetId, url: reference.url,
            metadata: referenceMetadata.parse(reference.metadata) };
        if (step.name === "reference_capture") return { tool: "reference_capture", reference: selected };
        if (step.name === "reference_detail") return { tool: "reference_detail", reference: selected,
            samples: referenceDetailRequest.parse(json(step.input, null)) };
        if (step.name === "reference_followup") return { tool: "reference_followup", reference: selected,
            requests: referenceFollowupRequest.parse(json(step.input, null)) };
        return { tool: "trace", reference: selected, ...traceRequestSchema.parse(json(step.input, null)) };
    }
    const { round = 1 } = json<{ round?: number }>(step.input, {});
    const { document } = result<BuildArtifact>(run.id, stepNames(round).assemble);
    if (!document) throw new Error("The draft needs repairs before the browser can preview it.");
    return { tool: "preview", document };
}

export function startMotionStep(run: MotionRun, step: MotionStep, leaseMs: number) {
    const token = randomUUID();
    const started = Date.now();
    const updated = db.prepare(
        "UPDATE motion_steps SET status='running',attempts=attempts+1,lease_token=?,lease_expires=?,started_at=? WHERE id=? AND run_id=? AND status='pending'",
    ).run(token, started + leaseMs, started, step.id, run.id);
    if (!updated.changes) return null;
    appendMotionEvent(run.id, "step_started", { step: step.name, lane: step.lane });
    return { ...step, status: "running" as const, lease_token: token, started_at: started, lease_expires: started + leaseMs };
}

export function extendMotionStep(runId: string, stepId: string, token: string) {
    const now = Date.now();
    const expires = now + motionLeaseMs;
    const change = db.prepare(
        "UPDATE motion_steps SET lease_expires=? WHERE id=? AND run_id=? AND lease_token=? AND status='running' AND lease_expires>?",
    ).run(expires, stepId, runId, token, now);
    return change.changes ? expires : null;
}

export function recoverExpiredMotionSteps(run: MotionRun) {
    const now = Date.now();
    const expired = motionSteps(run.id).filter(({ status, lease_expires }) =>
        status === "running" && lease_expires !== null && lease_expires <= now);
    for (const step of expired) {
        if (step.attempts >= 3) {
            failMotionStep(run, step, "This motion stage lost its connection three times. The completed artifacts were saved.");
            return false;
        }
        db.prepare("UPDATE motion_steps SET status='pending',lease_token=NULL,lease_expires=NULL WHERE id=?").run(step.id);
        appendMotionEvent(run.id, "step_interrupted", { step: step.name, lane: step.lane });
    }
    return true;
}

export function finishMotionStep(run: MotionRun, step: MotionStep, output: StepOutput) {
    const current = motionRun(run.id);
    if (!current || !isActiveMotionRun(current)) return false;
    const live = motionSteps(run.id).find(({ id }) => id === step.id);
    if (live?.status !== "running" || live.lease_token !== step.lease_token ||
        live.lease_expires === null || live.lease_expires <= Date.now()) return false;
    const artifact = writeMotionArtifact(run.id, step.name, Buffer.from(JSON.stringify(output.value)));
    db.prepare("UPDATE motion_steps SET status='done',result_id=?,lease_expires=NULL WHERE id=?")
        .run(artifact.id, step.id);
    if (output.summary) appendMotionMessage(run.id, "assistant", output.summary);
    appendMotionEvent(run.id, "step_completed", {
        step: step.name, lane: step.lane, elapsedMs: Math.max(0, Date.now() - (live.started_at ?? Date.now())),
        artifact: { kind: artifact.kind, digest: artifact.digest, bytes: artifact.bytes },
    });
    return true;
}

export function failMotionStep(run: MotionRun, step: MotionStep, error: string) {
    const current = motionRun(run.id);
    if (!current || !isActiveMotionRun(current)) return;
    const affected = db.prepare(
        "UPDATE motion_steps SET status='failed',error=?,lease_expires=NULL WHERE id=? AND run_id=? AND status='running' AND lease_token=?",
    ).run(error, step.id, run.id, step.lease_token);
    if (affected.changes) {
        appendMotionEvent(run.id, "step_failed", { step: step.name, error });
        changeMotionRunStatus(current, "failed", error);
    }
}

const imageBytes = (images: z.infer<typeof evidenceImages>) =>
    images.map(({ mime, base64 }) => ({ mime, bytes: Buffer.from(base64, "base64") }));

type SavedAgentTool = { role: MotionPromptRole; request: ReturnType<typeof parseAgentToolRequest>; payload?: unknown };

function agentTools(run: MotionRun, step: MotionStep): AgentToolSession {
    const steps = motionSteps(run.id);
    const calls = steps.filter(({ name }) => name.startsWith("agent_tool:"));
    const previous = calls.filter(({ name }) => name.split(":")[2] === step.id);
    const snapshot = motionSnapshot(run);
    const { round = 1, sceneId: stageSceneId } = json<{ round?: number; sceneId?: string }>(step.input, {});
    const done = (name: string) => steps.some((item) => item.name === name && item.status === "done");
    const history: AgentToolSession["history"] = (role) => previous.flatMap((call) => {
        if (call.status !== "done") return [];
        const stored = json<SavedAgentTool>(call.input, {} as never);
        if (stored.role !== role) return [];
        const request = parseAgentToolRequest(role, stored.request);
        const value = result<unknown>(run.id, call.name);
        if (call.lane !== "browser") return [{ request, result: value }];
        if (request.name === "sample_reference") {
            const { followups, images } = referenceFollowupResult.parse(value);
            return [{ request, result: { followups }, images: images.map((image) => imageBytes([image])[0]) }];
        }
        const { frames, layout, images } = previewSchema.parse(value);
        const scene = motionSceneSchema.safeParse(stored.payload).data;
        return [{ request, result: { frames, layout, buildHash: scene?.type === "graph" ? scene.params.program?.buildHash : undefined }, images: imageBytes(images) }];
    });
    return {
        available: calls.length < agentToolLimit,
        history,
        request(role, request, expectedSceneId) {
            if (calls.length >= agentToolLimit || previous.length >= agentToolStageLimit) {
                throw new Error("The specialist used its motion tool allowance. Return the final artifact.");
            }
            const { sceneId } = request.args;
            if (history(role).some((call) => JSON.stringify(call.request) === JSON.stringify(request))) {
                throw new Error("The same motion tool result is already available.");
            }
            if ((expectedSceneId ?? stageSceneId ?? run.target_scene_id) &&
                sceneId !== (expectedSceneId ?? stageSceneId ?? run.target_scene_id)) throw new Error("The tool must target the assigned scene.");
            const ownHistory = history(role).filter((item) => item.request.args.sceneId === sceneId).reverse();
            const patched = ownHistory.find(({ result }) => typeof result === "object" && result !== null && "candidate" in result &&
                Boolean(result.candidate));
            const scene = patched ? motionSceneSchema.parse((patched.result as { candidate: unknown }).candidate)
                : done(stepNames(round).assemble)
                ? result<BuildArtifact>(run.id, stepNames(round).assemble).plan.scenes.find(({ id }) => id === sceneId)
                : done(`engineer:${sceneId}`) ? agentResult(run.id, `engineer:${sceneId}`, motionBuildSchema).scene
                    : done(`layout_proposal:${sceneId}`) ? motionSceneSchema.parse(result(run.id, `layout_proposal:${sceneId}`))
                        : snapshot.tracks.motion_graphics.find(({ id }) => id === sceneId);
            if (!scene) throw new Error("The tool needs a saved scene candidate.");
            let payload: unknown = scene;
            if (request.name === "sample_reference") {
                const reference = motionReference(run.project_id);
                const analysis = done("reference_analysis") ? agentResult(run.id, "reference_analysis", referenceAnalysisSchema)
                    : referenceAnalysisSchema.safeParse(reference?.analysis).data;
                if (!reference?.available || reference.bindingId !== run.reference_binding_id || !analysis) {
                    throw new Error("The tool needs a connected reference.");
                }
                const interval = analysis.interval;
                const time = request.args.time;
                const proposed = done("director") ? agentResult(run.id, "director", motionStoryboardSchema).scenes
                    .find(({ id }) => id === sceneId) : undefined;
                const source = proposed ? sceneReferenceEvidence(analysis, proposed, snapshot)?.timing ?? interval : interval;
                if (source ? time < source.start || time >= source.end : time !== 0) throw new Error("The time is outside the assigned reference interval.");
                payload = referenceFollowupRequest.parse([{ sceneId, time, interval: source, reason: "Specialist reference check" }]);
            } else if (request.name === "measure_layout") {
                const source = [stepNames(round).preview, `motion_check:${sceneId}`, `layout_check:${sceneId}`].find(done);
                const measurements = source && previewSchema.parse(result(run.id, source)).layout?.filter((item) => item.sceneId === sceneId);
                if (!measurements?.length) throw new Error("This scene has no saved browser measurements.");
                payload = { source, measurements };
            } else if (request.name === "render_scene" && request.args.frames.some((frame) => frame < scene.start_frame || frame >= scene.end_frame)) {
                throw new Error("The requested frames are outside the assigned scene.");
            } else if (request.name === "patch_scene") {
                if (request.args.patch.params && ("program" in request.args.patch.params || "programValues" in request.args.patch.params)) {
                    throw new Error("Use the scene module tools to update procedural code.");
                }
                const draft = { ...snapshot, tracks: { ...snapshot.tracks, motion_graphics: [scene] } };
                applyMotionEdit(draft, { tool: "update_motion_scene", params: { id: sceneId, patch: request.args.patch } });
                validateMotionAssetOwnership(run.project_id, draft);
                if (motionSceneExceedsBudget(draft.tracks.motion_graphics[0])) throw new Error("The patched candidate exceeds the scene budget.");
                payload = { candidate: draft.tracks.motion_graphics[0] };
            } else if (request.name === "read_workspace") {
                payload = { revision: run.starting_revision, scene, reference: done("reference_spec")
                    ? result<{ specs: z.infer<typeof referenceSceneSpecSchema>[] }>(run.id, "reference_spec").specs.find((item) => item.sceneId === sceneId)
                    : undefined };
            } else if (request.name === "compare_evidence") {
                const name = round > 1 ? stepNames(round).compare : null;
                const layout = done(`layout_check:${sceneId}`) ? layoutForScene(previewSchema.parse(result(run.id, `layout_check:${sceneId}`)), sceneId) : null;
                const preview = [stepNames(round).preview, `motion_check:${sceneId}`].find(done);
                const measured = preview && previewSchema.parse(result(run.id, preview)).layout?.filter((item) => item.sceneId === sceneId);
                payload = { sourceLayout: layout, measured, comparison: name && done(name) ? result(run.id, name) : undefined };
            } else if (request.name === "write_module" || request.name === "patch_module") {
                const p = project(run.project_id);
                if (request.args.expectedRevision !== run.starting_revision || !p || document(p).revision !== run.starting_revision ||
                    scene.type !== "graph") throw new Error("The module needs the current revision of an assigned custom scene.");
                const previousModule = ownHistory.find(({ result }) => typeof result === "object" && result !== null && "input" in result);
                let input = sceneProgramInput.parse(request.name === "write_module" ? request.args.program
                    : (previousModule?.result as { input?: unknown } | undefined)?.input ?? (scene.params.program && {
                        version: scene.params.program.version, source: scene.params.program.source,
                        properties: scene.params.program.properties, assets: scene.params.program.assets,
                    }));
                if (request.name === "patch_module") {
                    const index = input.source.indexOf(request.args.find);
                    if (index < 0 || input.source.indexOf(request.args.find, index + 1) >= 0) throw new Error("The patch needs exactly one matching source occurrence.");
                    input = sceneProgramInput.parse({ ...input, source: input.source.slice(0, index) + request.args.replace +
                        input.source.slice(index + request.args.find.length) });
                }
                const owned = motionGraphAssets(String(run.project_id));
                if (input.assets.some(({ id, kind }) => !owned.some((item) => item.id === id && item.kind === kind))) {
                    throw new Error("The scene module requested an unavailable project asset.");
                }
                payload = { scene, input };
            }
            if (JSON.stringify({ role, request, payload }).length > 80_000) throw new Error("The tool input exceeds the motion artifact allowance.");
            throw new MotionToolYield(role, request, payload);
        },
    };
}

const executeStep: StepHandler = async (run, step, budget, signal) => {
    const { id } = run;
    const onProgress: MotionAgentProgress = (data) => {
        if (signal.aborted || !db.prepare(
            "SELECT 1 FROM motion_steps s JOIN motion_runs r ON r.id=s.run_id WHERE s.id=? AND s.lease_token=? AND s.lease_expires>? AND s.status='running' AND r.status='working'",
        ).get(step.id, step.lease_token, Date.now())) return;
        appendMotionEvent(id, "provider_progress", { step: step.name, ...data });
    };
    const snapshot = motionSnapshot(run);
    const speechTiming = snapshot.metadata.motion_speech_requested && motionSteps(id).some(({ name, status }) => name === "audio_speech" && status === "done")
        ? result<{ spans: SpeechSpan[] }>(id, "audio_speech").spans : undefined;
    if (step.name.startsWith("agent_tool:")) {
        const { request, payload } = json<SavedAgentTool>(step.input, {} as never);
        if (request.name === "write_module" || request.name === "patch_module") {
            const parsed = z.object({ scene: motionSceneSchema, input: sceneProgramInput }).parse(payload);
            const { input, scene } = parsed;
            if (scene.type !== "graph") throw new Error("A custom scene is required.");
            const { program, diagnostics } = await compileMotionProgram(input);
            signal.throwIfAborted();
            if (!program) return { value: { input, diagnostics }, summary: `The scene compiler returned ${diagnostics.length} diagnostic(s).` };
            const current = project(run.project_id);
            if (!current || document(current).revision !== request.args.expectedRevision) {
                return { value: { input, diagnostics: [{ phase: "compiler", code: "stale_revision", file: "scene.ts", line: 1,
                    column: 1, message: "The project changed before the module could be saved." }] } };
            }
            const assets = [...new Map([...scene.assets, ...program.assets.map(({ id, kind }) => ({ id, kind }))].map((ref) => [ref.id, ref])).values()];
            const candidate = motionSceneSchema.parse({ ...scene, assets, params: { ...scene.params, program, programValues: {} } });
            if (motionSceneExceedsBudget(candidate)) throw new Error("The compiled scene exceeds its resource budget.");
            return { value: { input, candidate, diagnostics, buildHash: program.buildHash }, summary: "Compiled the editable scene module." };
        }
        return { value: payload };
    }
    const context = { brief: run.brief, document: snapshot, budget, signal, onProgress, speechTiming, tools: agentTools(run, step) };
    if (step.name === "audio_speech") {
        const { spans, summary } = await motionSpeechTiming(snapshot, budget, signal);
        return { value: { spans }, summary };
    }
    const input = json<{ round?: number; sceneId?: string; issues?: string[]; reviewUnavailable?: boolean }>(step.input, {});
    const round = input.round ?? 1;
    const reference = (): ReferenceAnalysis | null => {
        if (!run.reference_binding_id) return null;
        if (!run.target_scene_id) return agentResult(id, "reference_analysis", referenceAnalysisSchema);
        const stored = motionReference(run.project_id);
        const analysis = stored?.bindingId === run.reference_binding_id ? referenceAnalysisSchema.safeParse(stored.analysis) : null;
        return analysis?.success ? analysis.data : null;
    };
    const proposedStoryboard = () => agentResult(id, "director", motionStoryboardSchema);
    const design = () => agentResult(id, "design", motionDesignSchema);
    const storyboard = () => motionSteps(id).some(({ name, status }) => name === "design" && status === "done")
        ? resolveMotionStoryboard(proposedStoryboard(), design()) : proposedStoryboard();
    const details = () => {
        const steps = motionSteps(id);
        if (!steps.some(({ name, status }) => name === "reference_detail" && status === "done")) return [];
        const detail = referenceDetailResult.parse(result(id, "reference_detail"));
        const followupStep = steps.find(({ name, status }) => name === "reference_followup" && status === "done");
        const extra = followupStep ? referenceFollowupResult.parse(result(id, "reference_followup")) : null;
        const requests = followupStep ? referenceFollowupRequest.parse(json(followupStep.input, null)) : [];
        return [...detail.samples.map((sample, index) => ({ ...sample, image: imageBytes([detail.images[index]])[0], crop: undefined })),
            ...(detail.crops ?? []).map(({ sceneId, time, bounds, image }) => ({ sceneId, time, crop: bounds, image: imageBytes([image])[0] })),
            ...(extra?.followups ?? []).map(({ sceneId, sourceTime, bounds }, index) => ({ sceneId, time: sourceTime, crop: bounds,
                followup: requests.find((request) => request.sceneId === sceneId)?.reason, image: imageBytes([extra!.images[index]])[0] }))];
    };
    const referenceSpecs = () => motionSteps(id).some(({ name, status }) => name === "reference_spec" && status === "done")
        ? z.array(referenceSceneSpecSchema).max(8).parse(result<{ specs: unknown }>(id, "reference_spec").specs) : [];
    const build = (n: number) => result<BuildArtifact>(id, stepNames(n).assemble);
    if (step.name === "revise") {
        const scene = context.document.tracks.motion_graphics.find(({ id }) => id === run.target_scene_id)!;
        const value = await runMotionRevision(context, scene);
        return { value, summary: value.value.decision };
    }
    if (step.name === "reference_analysis") {
        const selected = motionReference(run.project_id);
        const capture = captureSchema.parse(result(id, "reference_capture"));
        if (selected?.bindingId !== capture.bindingId || !selected.available) throw new Error("Relink the reference file.");
        const metadata = z.object({ kind: referenceAnalysisSchema.shape.kind, interval: referenceAnalysisSchema.shape.interval })
            .parse(selected.metadata);
        const observations = await cachedObservations(id, step, "reference_observations", signal, async () =>
            (await observeReferenceSheet(imageBytes(capture.images), capture.measured.timestamps, budget, signal, onProgress)).observations);
        const value = await runReferenceAnalyst(context, { ...metadata, measured: capture.measured, observations });
        return { value, summary: value.source === "measured_fallback"
            ? "The scene outline model did not finish. Continuing with browser cut estimates and sustained changes in the saved visual observations."
            : `Analyzed ${capture.measured.timestamps.length} reference samples.` };
    }
    if (step.name === "director") {
        const value = await runMotionDirector(context, reference());
        return { value, summary: value.value.summary };
    }
    if (step.name === "reference_spec") {
        const analysis = reference();
        if (!analysis) throw new Error("The scene specification needs a reference analysis.");
        const capture = captureSchema.parse(result(id, "reference_capture"));
        const value = await runReferenceSpec(context, proposedStoryboard(), analysis, imageBytes(capture.images), details().filter(({ crop }) => !crop));
        return { value, summary: value.source === "vision"
            ? `Recorded visual evidence for ${value.specs.length} scenes.`
            : "Structured visual analysis was unavailable. Continuing with saved frames and observations." };
    }
    if (step.name === "copy") {
        const value = await runMotionCopywriter(context, storyboard());
        return { value, summary: value.value.decision };
    }
    if (step.name === "design") {
        const frames = details();
        const followups = frames.filter((frame) => "followup" in frame);
        const full = frames.filter((frame) => !("followup" in frame) && !frame.crop);
        const uncovered = full.filter(({ sceneId }) => !followups.some((frame) => frame.sceneId === sceneId));
        const covered = full.filter((frame) => !uncovered.includes(frame));
        const plan = proposedStoryboard();
        const value = await runMotionDesigner(context, plan, reference(), [...uncovered, ...followups, ...covered].slice(0, 8), referenceSpecs());
        const customCount = resolveMotionStoryboard(plan, value.value).scenes.filter(({ type }, index) => type !== plan.scenes[index].type).length;
        return { value, summary: customCount ? `Selected custom composition for ${customCount} incompatible scene${customCount === 1 ? "" : "s"}.` : value.value.decision };
    }
    if (step.name.startsWith("layout_proposal:")) {
        const plan = storyboard();
        const target = plan.scenes.find(({ id }) => id === input.sceneId)!;
        const copy = agentResult(id, "copy", motionCopySchema).scenes.find(({ id }) => id === target.id);
        const source = { ...target, copy: copy?.parts?.filter(Boolean).join(" · ") || copy?.copy || target.copy };
        const draft = createMotionLayoutDraft(snapshot, { ...plan, scenes: [source] }, design(), referenceSpecs());
        return { value: draft.tracks.motion_graphics[0], summary: `Proposed layout for ${target.id}.` };
    }
    if (step.name === "layout_review") {
        const plan = storyboard();
        const references = details().filter(({ crop }) => !crop);
        if (motionSteps(id).some(({ name }) => name === "layout")) {
            const preview = previewSchema.parse(result(id, "layout"));
            return reviewMotionLayout(context, plan, referenceSpecs(), preview, imageBytes(preview.images), references.slice(0, 6));
        }
        const previews = plan.scenes.map(({ id: sceneId }) => previewSchema.parse(result(id, `layout_check:${sceneId}`)));
        const pictured = previews.slice(0, references.length ? 4 : 8);
        const preview = { frames: pictured.flatMap(({ frames }) => frames), framesPerSheet: 1,
            layout: previews.flatMap(({ layout }) => layout ?? []) };
        const paired = plan.scenes.slice(0, pictured.length).flatMap(({ id: sceneId }) =>
            references.find((frame) => frame.sceneId === sceneId) ?? []);
        return reviewMotionLayout(context, plan, referenceSpecs(), preview,
            imageBytes(pictured.flatMap(({ images }) => images)), paired);
    }
    if (step.name.startsWith("engineer:")) {
        const plan = storyboard();
        const target = plan.scenes.find(({ id }) => id === input.sceneId)!;
        const analysis = plan.look === "reference" ? reference() : null;
        const evidence = analysis ? sceneReferenceEvidence(analysis, target, context.document) : null;
        const traceName = `trace:${target.id}`;
        const traced = target.type === "liquid" && motionSteps(id).some(({ name, status }) => name === traceName && status === "done")
            ? traceResultSchema.parse(result(id, traceName)) : null;
        const asset = traced?.status === "traced" ? { id: traced.assetId, kind: "vectors" as const } : null;
        const steps = motionSteps(id);
        const hasReview = steps.some(({ name, status }) => name === "layout_review" && status === "done");
        const layoutStep = steps.find(({ name, status }) => status === "done" && name === `layout_check:${target.id}`)
            ?? steps.find(({ name, status }) => status === "done" && name === "layout");
        const layout = layoutStep ? layoutForScene(previewSchema.parse(result(id, layoutStep.name)), target.id) : undefined;
        const suggestions = hasReview ? result<{ suggestions: { sceneId: string; revision: string }[] }>(id, "layout_review").suggestions.find(({ sceneId }) => sceneId === target.id) : undefined;
        const value = await runMotionEngineer(context, target, agentResult(id, "copy", motionCopySchema),
            design(), asset ? [asset] : [], evidence,
            details().filter(({ sceneId }) => sceneId === target.id), referenceSpecs().find(({ sceneId }) => sceneId === target.id),
            layout ? { measurements: layout, revision: suggestions?.revision } : undefined);
        if (asset && value.value.scene.type === "liquid") {
            const { scene } = value.value;
            value.value.scene = motionSceneSchema.parse({ ...scene, assets: [asset],
                params: { mode: "vectors", assetId: asset.id, style: "liquid_gradient" } });
        }
        if (traced?.status === "approximation") {
            value.value.approximation ??= "Procedural liquid shapes approximate the reference because its contours could not be traced.";
        }
        return { value, summary: value.value.decision };
    }
    if (step.name === stepNames(round).assemble) {
        if (run.target_scene_id) {
            const target = run.target_scene_id;
            const source = round === 1 ? "revise" : stepNames(round - 1).repair(target);
            const { scene, approximation } = agentResult(id, source, motionBuildSchema);
            const plan = { title: "Focused scene revision", scenes: context.document.tracks.motion_graphics.map((item) => item.id === target ? scene : item) };
            const blockers = motionDraftBlockers([scene]);
            const previous = context.document.metadata.motion_generation?.quality?.approximations ?? [];
            const approximations = previous.filter(({ sceneId }) => sceneId !== target);
            if (approximation) approximations.push({ sceneId: target, description: approximation });
            return { value: { plan, blockers, approximations, document: blockers.length ? null : compileMotionPlan(plan, context.document) } };
        }
        const previous = round === 1 ? null : build(round - 1);
        const plan = previous ? { ...storyboard(), scenes: storyboard().scenes.map((scene) => {
            const current = previous.plan.scenes.find(({ id }) => id === scene.id)!;
            return { ...scene, start_frame: current.start_frame, end_frame: current.end_frame };
        }) } : storyboard();
        const builds: z.infer<typeof motionRepairSchema>[] = previous
            ? previous.plan.scenes.map((scene) => {
                const repair = stepNames(round - 1).repair(scene.id);
                const repaired = motionSteps(id).some(({ name, status }) => name === repair && status === "done")
                    ? result<{ value?: unknown }>(id, repair).value : undefined;
                const earlier = previous.approximations?.find(({ sceneId }) => sceneId === scene.id)?.description ?? null;
                return repaired ? motionRepairSchema.parse(repaired)
                    : { scene, decision: "Kept the earlier editable scene.", approximation: earlier };
            }) : plan.scenes.map(({ id: sceneId }) => agentResult(id, `engineer:${sceneId}`, motionBuildSchema));
        const value = integrateMotionScenes(context.document, plan, builds);
        const approximations = builds.flatMap(({ scene, approximation }) => approximation ? [{ sceneId: scene.id, description: approximation }] : []);
        return { value: { ...value, approximations }, summary: value.blockers.length ? "The draft needs a repair before browser review." : undefined };
    }
    if (step.name === stepNames(round).critique) {
        const preview = previewSchema.parse(result(id, stepNames(round).preview));
        const draft = build(round).document;
        if (!draft) throw new Error("The draft needs repairs before review.");
        const sceneChecks = round === 1 ? motionSteps(id).filter(({ name, status }) =>
            name.startsWith("motion_check:") && status === "done").flatMap(({ name }) =>
            (previewSchema.parse(result(id, name)).layout ?? []).filter(({ findings }) => findings?.length)
                .map(({ sceneId, frame, findings }) => ({ sceneId, frame, findings }))) : [];
        try {
            const prior = round > 1 && motionSteps(id).some(({ name, status }) => name === stepNames(round - 1).critique && status === "done")
                ? agentResult(id, stepNames(round - 1).critique, motionCritiqueSchema) : null;
            const previous = prior?.issues.length ? previewSchema.parse(result(id, stepNames(round - 1).preview)) : null;
            const value = await runMotionCritic(context, draft,
                { ...preview, images: imageBytes(preview.images), sceneChecks }, reference(), run.target_scene_id ?? undefined,
                (index, read) => cachedObservations(id, step, `${step.name}:observations:${preview.images[index].sha256}`, signal, read),
                details(), referenceSpecs(), previous && prior ? { issues: prior.issues, preview: previous, images: imageBytes(previous.images) } : undefined);
            return { value, summary: value.value.decision };
        } catch (error) {
            signal.throwIfAborted();
            if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
            return { value: { source: "review_unavailable" },
                summary: "Automated visual review could not finish. Review the saved preview before applying the draft." };
        }
    }
    if (step.name === stepNames(round).compare) {
        const earlier = stepNames(round - 1);
        const current = stepNames(round);
        const before = build(round - 1);
        const candidate = build(round);
        const prior = agentResult(id, earlier.critique, motionCritiqueSchema);
        const later = candidate.document ? result<{ value?: unknown }>(id, current.critique).value : undefined;
        const review = motionCritiqueSchema.safeParse(later).data;
        const previousPreview = previewSchema.parse(result(id, earlier.preview));
        const nextPreview = candidate.document ? previewSchema.parse(result(id, current.preview)) : null;
        const targets = [...new Set(prior.issues.map(({ sceneId }) => sceneId))].map((sceneId) => {
            const previous = before.plan.scenes.find(({ id }) => id === sceneId);
            const next = candidate.plan.scenes.find(({ id }) => id === sceneId);
            const samples = (preview: typeof previousPreview, scene: typeof previous) => {
                if (!scene) return [];
                const size = preview.framesPerSheet ?? 12;
                return preview.frames.flatMap((frame, index) => frame >= scene.start_frame && frame < scene.end_frame
                    ? [preview.frameHashes?.[index] ?? preview.images[Math.floor(index / size)]?.sha256] : []);
            };
            const changed = nextPreview && JSON.stringify(samples(previousPreview, previous)) !== JSON.stringify(samples(nextPreview, next)) &&
                JSON.stringify(previous) !== JSON.stringify(next);
            const remaining = review?.issues.filter((item) => item.sceneId === sceneId) ?? [];
            return { sceneId, changed: Boolean(changed), remaining: remaining.map(({ issue }) => issue) };
        });
        const worsened = review && (Object.entries(prior.scores).some(([key, value]) => review.scores[key as keyof typeof review.scores] < value) ||
            review.issues.some((issue) => issue.priority === "blocking" &&
                !prior.issues.some((item) => item.sceneId === issue.sceneId && item.priority === issue.priority)));
        const improvement = review && !worsened &&
            review.repairs?.some(({ outcome, issueIndex }) => outcome === "improved" &&
                targets.some(({ sceneId, changed }) => changed && sceneId === prior.issues[issueIndex]?.sceneId)) &&
            review.repairs.every(({ outcome }) => outcome !== "regressed") &&
            review.issues.length < prior.issues.length && review.unresolved.length <= prior.unresolved.length;
        const retainedRound = improvement ? round : round - 1;
        const findings = [...prior.unresolved, ...prior.issues.map(({ issue }) => issue)];
        const reason = !review ? "The latest repair could not be reviewed." : worsened ? "The latest repair regressed a reviewed requirement."
            : !improvement ? "The latest repair did not improve the cited issue." : "The repair improved the reviewed draft.";
        return { value: { retainedRound, targets, findings, reason }, summary: reason };
    }
    if (step.name.startsWith("repair:")) {
        const previous = build(round);
        const scene = previous.plan.scenes.find(({ id }) => id === input.sceneId)!;
        const issues = previous.blockers?.length ? previous.blockers : agentResult(id, stepNames(round).critique, motionCritiqueSchema).issues;
        try {
            const value = await runMotionRepair(context, scene, issues, {
                scenes: previous.plan.scenes, allowCuts: !previous.blockers?.length && issues.every(({ sceneId }) => sceneId === scene.id),
            });
            return { value, summary: value.value.decision };
        } catch (error) {
            signal.throwIfAborted();
            if (!previous.document || (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError))) throw error;
            const index = previous.plan.scenes.findIndex(({ id }) => id === scene.id);
            return { value: { source: "repair_unavailable", sceneId: scene.id },
                summary: `Scene ${index + 1} could not be repaired automatically. The saved draft retains its earlier scene and review notes.` };
        }
    }
    if (step.name === "publish") {
        const { plan, document, approximations = [] } = build(round);
        const issues = input.issues ?? [];
        const reviewUnavailable = input.reviewUnavailable === true;
        const quality = motionQualitySchema.parse({
            generation: !document ? "incomplete" : approximations.length ? "approximated" : "rendered",
            review: reviewUnavailable ? "unavailable" : issues.length ? "issues" : "passed",
            findings: issues, approximations,
        });
        return { value: { plan, issues, reviewUnavailable, quality } };
    }
    throw new Error("Unknown motion workflow stage.");
};

function applyStepOutput(run: MotionRun, step: MotionStep, output: StepOutput) {
    if (step.name === "reference_analysis") {
        const { value: analysis } = z.object({ value: referenceAnalysisSchema }).parse(output.value);
        saveMotionReferenceAnalysis(run.project_id, { bindingId: run.reference_binding_id, analysis });
    }
    if (step.name !== "publish") return;
    const { plan, issues, reviewUnavailable } = z.object({ plan: motionPlanSchema, issues: z.array(z.string()),
        reviewUnavailable: z.boolean().optional() }).parse(output.value);
    if (issues.length && !reviewUnavailable) {
        appendMotionMessage(run.id, "assistant", "The draft is saved with unresolved visual review notes.");
        changeMotionRunStatus(run, "failed", "Visual review left unresolved issues. The draft is available.");
        return;
    }
    const p = project(run.project_id);
    if (!p || p.user_id !== run.account_id || document(p).revision !== run.starting_revision) {
        changeMotionRunStatus(run, "failed", "The project changed during generation. The draft is available.");
        return;
    }
    if (reviewUnavailable) {
        changeMotionRunStatus(run, "ready");
        return;
    }
    if (motionNeedsApproval(run)) {
        appendMotionMessage(run.id, "assistant", "The revision is ready to review. The saved project still has the previous version.");
        changeMotionRunStatus(run, "ready");
        return;
    }
    commit(p, { commandId: run.id, expectedRevision: run.starting_revision,
        operations: [{ tool: "replace_motion_plan", params: motionPlanProvenance(run, plan) }] });
    update("projects", run.project_id, { status: "completed" });
    changeMotionRunStatus(run, "ready");
}

function selectedMotionAssembly(run: MotionRun, all = motionSteps(run.id)) {
    const comparison = all.filter(({ name, status }) => name.startsWith("compare:") && status === "done").at(-1);
    const best = comparison ? result<{ retainedRound: number }>(run.id, comparison.name).retainedRound : undefined;
    const steps = all.filter(({ name, status }) =>
        (name === "assemble" || name.startsWith("assemble:")) && status === "done").reverse();
    return (best !== undefined ? steps.find(({ name }) => name === stepNames(best).assemble) : undefined)
        ?? steps.find(({ name }) => result<BuildArtifact>(run.id, name).document);
}

export function motionDraftVersion(run: MotionRun, steps: MotionStep[]) {
    return selectedMotionAssembly(run, steps)?.result_id ?? null;
}

export function motionRunDraft(run: MotionRun) {
    const step = selectedMotionAssembly(run);
    if (!step) return null;
    const draft = result<BuildArtifact>(run.id, step.name);
    return draft.document ? { document: draft.document, plan: draft.plan, startingRevision: run.starting_revision } : null;
}

export function motionSceneRecovery(run: MotionRun, steps: MotionStep[]) {
    const assembly = selectedMotionAssembly(run, steps);
    if (!assembly) return [];
    const suffix = assembly.name === "assemble" ? "1" : assembly.name.split(":")[1];
    const critique = steps.find(({ name, status }) => name === `critique:${suffix}` && status === "done");
    const review = critique && motionCritiqueSchema.safeParse(result<{ value?: unknown }>(run.id, critique.name).value);
    const { approximations = [] } = result<BuildArtifact>(run.id, assembly.name);
    const issues = review?.success ? review.data.issues : [];
    return [...new Set([...issues.map(({ sceneId }) => sceneId), ...approximations.map(({ sceneId }) => sceneId)])].map((sceneId) => ({
        sceneId,
        approximation: approximations.find((item) => item.sceneId === sceneId)?.description,
        issues: issues.filter((item) => item.sceneId === sceneId).map(({ issue, repair }) => ({ issue, repair })),
    }));
}

export function motionRunStoryboard(run: MotionRun) {
    if (!motionSteps(run.id).some(({ name, status }) => name === "director" && status === "done")) return null;
    const artifact = result<{ value?: unknown }>(run.id, "director");
    const parsed = motionStoryboardSchema.safeParse(artifact.value);
    return parsed.success ? parsed.data : null;
}

export function motionReviewUnavailable(run: MotionRun, steps = motionSteps(run.id)) {
    const publish = steps.find(({ name, status }) => name === "publish" && status === "done");
    return !!publish && result<{ reviewUnavailable?: boolean }>(run.id, "publish").reviewUnavailable === true;
}

export function motionNeedsApproval(run: MotionRun, reviewUnavailable = motionReviewUnavailable(run)) {
    return reviewUnavailable || motionSnapshot(run).tracks.motion_graphics.length > 0;
}

export function motionRunQuality(run: MotionRun, steps = motionSteps(run.id)): MotionQuality | null {
    const priorFindings = () => {
        for (const { name, status } of [...steps].reverse()) {
            if (!name.startsWith("critique:") || status !== "done") continue;
            const artifact = result<{ value?: unknown }>(run.id, name);
            const review = motionCritiqueSchema.safeParse(artifact.value);
            if (review.success) return [...review.data.unresolved, ...review.data.issues.map(({ issue }) => issue)];
        }
        return [];
    };
    const publish = steps.find(({ name, status }) => name === "publish" && status === "done");
    if (publish) {
        const output = result<{ quality?: MotionQuality; issues?: string[]; reviewUnavailable?: boolean }>(run.id, "publish");
        if (output.quality) return output.quality;
        return { generation: "rendered", review: output.reviewUnavailable ? "unavailable" : output.issues?.length ? "issues" : "passed",
            findings: output.issues?.length ? output.issues : output.reviewUnavailable ? priorFindings() : [], approximations: [] };
    }
    const assembly = selectedMotionAssembly(run, steps) ??
        steps.filter(({ name, status }) => (name === "assemble" || name.startsWith("assemble:")) && status === "done").at(-1);
    if (!assembly) return null;
    const build = result<BuildArtifact>(run.id, assembly.name);
    const preview = assembly.name.replace("assemble", "preview") + (assembly.name === "assemble" ? ":1" : "");
    const rendered = steps.some(({ name, status }) => name === preview && status === "done");
    const approximations = build.approximations ?? [];
    return { generation: !build.document ? "incomplete" : approximations.length ? "approximated" : rendered ? "rendered" : "assembled",
        review: "pending", findings: priorFindings(), approximations };
}

function motionPlanProvenance(run: MotionRun, plan: z.infer<typeof motionPlanSchema>) {
    const bindingId = run.reference_binding_id;
    const selected = bindingId ? motionReference(run.project_id) : null;
    const matching = selected?.bindingId === bindingId ? selected : null;
    const metadata = matching && referenceMetadata.safeParse(matching.metadata);
    return { ...plan, provenance: {
        runId: run.id,
        rendererVersion: motionRendererVersion,
        skills: motionSkillManifest.map(({ id, version }) => ({ id, version })),
        quality: motionRunQuality(run) ?? undefined,
        reference: bindingId ? { bindingId, assetId: matching?.assetId ?? null,
            sha256: metadata && metadata.success ? metadata.data.sha256 : null } : null,
    } };
}

export function applySavedMotionDraft(runId: string, accountId: number, raw: unknown) {
    const { expectedRevision, partial } = z.object({
        expectedRevision: z.number().int().nonnegative(),
        partial: z.boolean(),
    }).strict().parse(raw);
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        if (expectedRevision !== run.starting_revision) fail(409, "This draft was made from another project revision.");
        const p = project(run.project_id);
        const prior = db.prepare("SELECT result FROM edit_commands WHERE id=? AND project_id=?")
            .get(run.id, p.id) as { result: string } | undefined;
        if (prior) return json(prior.result, {});
        if (partial ? !["failed", "cancelled"].includes(run.status) : run.status !== "ready" || !motionNeedsApproval(run)) {
            fail(409, "This motion draft is still being reviewed.");
        }
        if (db.prepare("SELECT 1 FROM motion_runs WHERE project_id=? AND status IN ('queued','working','waiting_for_browser')").get(p.id)) {
            fail(409, "Stop the active motion run before opening this draft in the editor.");
        }
        const draft = motionRunDraft(run);
        if (!draft) fail(404, "There is no playable draft to apply.");
        const result = commit(p, { commandId: run.id, expectedRevision,
            operations: [{ tool: "replace_motion_plan", params: motionPlanProvenance(run, draft.plan) }] });
        update("projects", p.id, { status: "completed" });
        appendMotionEvent(run.id, "draft_applied", { revision: document(project(p.id)).revision, partial });
        return result;
    }).immediate();
}

type Feedback = { request_id: string; text: string; replacement_run_id: string | null };
const pendingFeedback = (runId: string) =>
    db.prepare("SELECT * FROM motion_feedback WHERE run_id=? AND replacement_run_id IS NULL ORDER BY rowid").all(runId) as Feedback[];
const steeredBrief = (brief: string, feedback: readonly Feedback[]) =>
    [brief, ...feedback.map(({ text }) => `Revision feedback: ${text}`)].join("\n\n");

export function queueMotionFeedback(runId: string, accountId: number, raw: unknown) {
    const { requestId, text } = z.object({
        requestId: z.uuid(), text: z.string().trim().min(1).max(1000),
    }).strict().parse(raw);
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        const prior = db.prepare("SELECT * FROM motion_feedback WHERE run_id=? AND request_id=?").get(runId, requestId) as Feedback | undefined;
        if (prior) {
            if (prior.text !== text) fail(409, "This feedback request already has different text.");
            return { replacementRunId: prior.replacement_run_id };
        }
        if (!isActiveMotionRun(run)) fail(409, "Start a new revision to steer a finished run.");
        const waiting = pendingFeedback(runId);
        if (waiting.length >= 5 || steeredBrief(run.brief, [...waiting, { request_id: requestId, text, replacement_run_id: null }]).length > 4000) {
            fail(422, "The combined brief and feedback are too long. Start a new revision with a shorter brief.");
        }
        db.prepare("INSERT INTO motion_feedback(run_id,request_id,text) VALUES(?,?,?)").run(runId, requestId, text);
        appendMotionMessage(runId, "user", text);
        appendMotionEvent(runId, "feedback_queued", {});
        return { replacementRunId: null };
    }).immediate();
}

function stopUnfinishedSteps(runId: string) {
    db.prepare("UPDATE motion_steps SET status='cancelled',lease_token=NULL,lease_expires=NULL WHERE run_id=? AND status IN ('pending','running')")
        .run(runId);
}

function applyPendingFeedback(run: MotionRun) {
    const feedback = pendingFeedback(run.id);
    if (!feedback.length || motionSteps(run.id).some(({ status }) => status === "running")) return false;
    const p = project(run.project_id);
    if (!p || p.user_id !== run.account_id || document(p).revision !== run.starting_revision) {
        stopUnfinishedSteps(run.id);
        changeMotionRunStatus(run, "failed", "The project changed. Start a new revision to apply the feedback.");
        return true;
    }
    if (run.reference_binding_id && motionReference(run.project_id)?.bindingId !== run.reference_binding_id) {
        stopUnfinishedSteps(run.id);
        changeMotionRunStatus(run, "failed", "The reference changed. Start a new revision with the current reference.");
        return true;
    }
    stopUnfinishedSteps(run.id);
    changeMotionRunStatus(run, "cancelled");
    const replacement = createMotionRun(run.project_id, run.account_id, {
        requestId: randomUUID(), brief: steeredBrief(run.brief, feedback), referenceBindingId: run.reference_binding_id,
        targetSceneId: run.target_scene_id,
    }, false);
    db.prepare("UPDATE motion_feedback SET replacement_run_id=? WHERE run_id=? AND replacement_run_id IS NULL")
        .run(replacement.id, run.id);
    appendMotionMessage(run.id, "assistant", "I started a new run with your feedback. The earlier draft and artifacts remain available here.");
    appendMotionEvent(run.id, "run_replaced", { runId: replacement.id });
    return true;
}

export function retryMotionRun(runId: string, accountId: number) {
    return db.transaction(() => {
        const run = ownedMotionRun(runId, accountId);
        if (isActiveMotionRun(run)) return run;
        const steps = motionSteps(runId);
        if (run.status === "ready" || steps.some(({ name, status }) => name === "publish" && status === "done") ||
            db.prepare("SELECT 1 FROM motion_feedback WHERE run_id=? AND replacement_run_id IS NOT NULL").get(runId)) {
            fail(409, "Start a new revision for this run.");
        }
        if (db.prepare("SELECT 1 FROM motion_runs WHERE project_id=? AND status IN ('queued','working','waiting_for_browser')").get(run.project_id)) {
            fail(409, "This project already has an active motion run.");
        }
        const p = project(run.project_id);
        if (!p || document(p).revision !== run.starting_revision ||
            (run.reference_binding_id && motionReference(run.project_id)?.bindingId !== run.reference_binding_id)) {
            fail(409, "Start a new revision with the current project and reference.");
        }
        const failedCritique = steps.find(({ name, status }) => name.startsWith("critique:") && status === "failed");
        if (failedCritique) {
            const preview = steps.find(({ name, status }) => name === failedCritique.name.replace("critique:", "preview:") && status === "done");
            const artifact = preview?.result_id && motionArtifact(runId, preview.result_id);
            if (preview && artifact && !previewSchema.parse(JSON.parse(artifact.body.toString("utf8"))).framesPerSheet) {
                db.prepare("UPDATE motion_steps SET status='pending',result_id=NULL,started_at=NULL WHERE id=?").run(preview.id);
            }
        }
        db.prepare("UPDATE motion_steps SET status='pending',error=NULL,lease_token=NULL,lease_expires=NULL WHERE run_id=? AND status<>'done'")
            .run(runId);
        changeMotionRunStatus(run, "queued");
        appendMotionEvent(runId, "run_retried", {});
        return motionRun(runId)!;
    }).immediate();
}

export class MotionOrchestrator {
    private readonly controllers = new Map<string, { runId: string; controller: AbortController }>();

    constructor(private readonly handler: StepHandler = executeStep, readonly limits = motionLimits()) {}

    cancel(id: string, accountId: number) {
        const cancelled = db.transaction(() => {
            const run = ownedMotionRun(id, accountId);
            if (!isActiveMotionRun(run)) return false;
            stopUnfinishedSteps(id);
            changeMotionRunStatus(run, "cancelled");
            return true;
        }).immediate();
        if (cancelled) {
            for (const { runId, controller } of this.controllers.values()) if (runId === id) controller.abort();
        }
        return motionRun(id)!;
    }

    async tick(id: string) {
        const claimed = db.transaction(() => {
            const run = motionRun(id);
            if (!run || !isActiveMotionRun(run)) return null;
            if (pendingMotionSetup(id)) return null;
            if (!recoverExpiredMotionSteps(run)) return null;
            if (applyPendingFeedback(run)) return null;
            const { active, waiting } = motionElapsed(run);
            if (active >= this.limits.activeMs || waiting >= this.limits.browserWaitMs) {
                stopUnfinishedSteps(id);
                changeMotionRunStatus(run, "failed", active >= this.limits.activeMs
                    ? "The motion run reached its active time limit."
                    : "The browser did not reconnect before the motion run expired.");
                return null;
            }
            defineGraph(run, motionSteps(id), Math.min(3, this.limits.critiqueRounds));
            const ready = readyMotionSteps(id);
            const running = motionSteps(id).filter(({ status }) => status === "running");
            const slots = Math.max(0, this.limits.providerConcurrency - running.filter(({ lane }) => lane !== "browser").length);
            const next = ready.filter(({ lane }) => lane !== "browser").slice(0, slots);
            const status = next.length || running.length ? "working" : ready.some(({ lane }) => lane === "browser")
                ? "waiting_for_browser" : "working";
            changeMotionRunStatus(run, status);
            const steps = next.flatMap((step) => {
                const started = startMotionStep(run, step, motionLeaseMs);
                return started ? [started] : [];
            });
            return { run, steps, status };
        }).immediate();
        if (!claimed?.steps.length) return;
        await Promise.all(claimed.steps.map(async (step) => {
            const controller = new AbortController();
            this.controllers.set(step.id, { runId: id, controller });
            const heartbeat = setInterval(() => {
                const current = motionRun(id);
                if (!current || !isActiveMotionRun(current) ||
                    !extendMotionStep(id, step.id, step.lease_token!)) controller.abort();
            }, 10_000);
            try {
                const output = await this.handler(claimed.run, step, stepMotionBudget(claimed.run, step, this.limits), controller.signal);
                db.transaction(() => {
                    if (!finishMotionStep(claimed.run, step, output)) return;
                    applyStepOutput(motionRun(id)!, step, output);
                }).immediate();
            } catch (error) {
                if (error instanceof MotionToolYield) {
                    const scheduled = db.transaction(() => {
                        const current = motionRun(id);
                        const steps = motionSteps(id);
                        const live = steps.find(({ id }) => id === step.id);
                        if (!current || !isActiveMotionRun(current) || live?.status !== "running" ||
                            live.lease_token !== step.lease_token || (live.lease_expires ?? 0) <= Date.now()) return true;
                        const calls = steps.filter(({ name }) => name.startsWith("agent_tool:"));
                        const ordinal = calls.filter(({ name }) => name.split(":")[2] === step.id).length + 1;
                        if (calls.length >= agentToolLimit || ordinal > agentToolStageLimit) {
                            db.prepare("UPDATE motion_steps SET status='pending',lease_token=NULL,lease_expires=NULL WHERE id=?").run(step.id);
                            return true;
                        }
                        const { role, request, payload } = error;
                        const input = { role, request, payload } satisfies SavedAgentTool;
                        if (JSON.stringify(input).length > 80_000) return false;
                        const name = `agent_tool:${request.name}:${step.id}:${ordinal}`;
                        const browser = request.name === "sample_reference" || request.name === "render_scene";
                        addMotionStep(id, { name, lane: browser ? "browser" : "local", input });
                        db.prepare("UPDATE motion_steps SET status='pending',attempts=MAX(0,attempts-1),dependencies=?,lease_token=NULL,lease_expires=NULL WHERE id=?")
                            .run(JSON.stringify([...json<string[]>(live.dependencies, []), name]), step.id);
                        appendMotionEvent(id, "agent_tool_requested", { step: step.name, tool: request.name, sceneId: request.args.sceneId });
                        return true;
                    }).immediate();
                    if (scheduled) return;
                }
                const details = error instanceof Error ? error.message : "";
                const message = error instanceof MotionBudgetError ||
                    /^The [a-zA-Z]+ stage could not produce a valid artifact within the configured routes\.$/.test(details) ||
                    /^No qualified model is available for [a-zA-Z]+\.$/.test(details)
                    ? details : "This motion stage could not be completed. Earlier artifacts were saved.";
                db.transaction(() => failMotionStep(claimed.run, step, message)).immediate();
            } finally {
                clearInterval(heartbeat);
                this.controllers.delete(step.id);
            }
        }));
    }
}
