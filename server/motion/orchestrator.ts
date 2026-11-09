import { randomUUID } from "node:crypto";
import { db, json, project, update } from "../database";
import { commit, document } from "../document";
import { fail } from "../security";
import { compileMotionPlan, motionPlanSchema } from "../../shared/motion/compile";
import { motionRendererVersion } from "../../shared/motion/registry";
import { motionSceneSchema } from "../../shared/motion/schema";
import { referenceAnalysisSchema, type ReferenceAnalysis } from "../../shared/motion/reference";
import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { captureSchema, previewSchema, traceRequestSchema, traceResultSchema, evidenceImages, referenceMetadata, type BrowserMotionInput } from "../../shared/motion/browser-tools";
import { MotionBudgetError, motionLimits, type MotionModelBudget } from "./budget";
import { motionElapsed, stepMotionBudget } from "./ledger";
import { MotionAgentUnavailable, type MotionAgentProgress } from "./agent-call";
import { motionSkillManifest } from "./prompts";
import { pendingMotionSetup } from "./setup";
import { motionReference, saveMotionReferenceAnalysis } from "./references";
import { observeReferenceSheet, referenceObservationsSchema } from "./reference-observer";
import {
    integrateMotionScenes, motionBuildSchema, motionCopySchema, motionDesignSchema, motionDraftBlockers, motionStoryboardSchema,
    motionCritiqueSchema, runMotionCopywriter, runMotionCritic, runMotionDesigner, runMotionDirector, runMotionEngineer,
    runMotionRepair, runMotionRevision, runReferenceAnalyst, type MotionBuild, type MotionCritique,
} from "./agents";
import {
    addMotionStep, appendMotionEvent, appendMotionMessage, createMotionRun, motionArtifact, motionRun, motionSnapshot,
    motionSteps, ownedMotionRun, writeMotionArtifact, type MotionRun, type MotionStep, type MotionStepInput, type RunStatus,
} from "./store";

type BuildArtifact = { plan: z.infer<typeof motionPlanSchema>; document: Document | null; blockers?: MotionCritique["issues"] };
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
        if (run.reference_binding_id) {
            add({ name: "reference_capture", lane: "browser" });
            add({ name: "reference_analysis", lane: "provider", dependencies: ["reference_capture"] });
        }
        add({ name: "director", lane: "provider", dependencies: run.reference_binding_id ? ["reference_analysis"] : [] });
        add({ name: "copy", lane: "provider", dependencies: ["director"] });
        add({ name: "design", lane: "provider", dependencies: ["director"] });
        if (!done("director")) return;
        const storyboard = agentResult(id, "director", motionStoryboardSchema);
        const reference = run.reference_binding_id ? agentResult(id, "reference_analysis", referenceAnalysisSchema) : null;
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
            add({ name, lane: "provider", dependencies: ["copy", "design", ...traceDependency], input: { sceneId: target.id } });
            return name;
        });
        add({ name: "assemble", lane: "local", dependencies: engineers, input: { round: 1 } });
    }
    for (let round = 1; round <= maxRounds; round++) {
        const { assemble, preview, critique, repair } = stepNames(round);
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
        if (issues.length && round < maxRounds && !run.target_scene_id) {
            const sceneIds = [...new Set(issues.map(({ sceneId }) => sceneId))];
            for (const sceneId of sceneIds) {
                add({ name: repair(sceneId), lane: "provider", dependencies: [dependency], input: { round, sceneId } });
            }
            add({ name: stepNames(round + 1).assemble, lane: "local",
                dependencies: sceneIds.map(repair), input: { round: round + 1 } });
            continue;
        }
        add({ name: "publish", lane: "local", dependencies: [dependency],
            input: { round, issues: [...unresolved, ...issues.map(({ issue }) => issue)], reviewUnavailable } });
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
    if (step.name === "reference_capture" || step.name.startsWith("trace:")) {
        const reference = motionReference(run.project_id);
        if (reference?.bindingId !== run.reference_binding_id) throw new Error("The reference was replaced.");
        if (!reference?.available) throw new Error("Relink the reference file.");
        const selected = { bindingId: reference.bindingId, assetId: reference.assetId, url: reference.url,
            metadata: referenceMetadata.parse(reference.metadata) };
        if (step.name === "reference_capture") return { tool: "reference_capture", reference: selected };
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

const executeStep: StepHandler = async (run, step, budget, signal) => {
    const { id } = run;
    const onProgress: MotionAgentProgress = (data) => {
        if (signal.aborted || !db.prepare(
            "SELECT 1 FROM motion_steps s JOIN motion_runs r ON r.id=s.run_id WHERE s.id=? AND s.lease_token=? AND s.lease_expires>? AND s.status='running' AND r.status='working'",
        ).get(step.id, step.lease_token, Date.now())) return;
        appendMotionEvent(id, "provider_progress", { step: step.name, ...data });
    };
    const context = { brief: run.brief, document: motionSnapshot(run), budget, signal, onProgress };
    const input = json<{ round?: number; sceneId?: string; issues?: string[]; reviewUnavailable?: boolean }>(step.input, {});
    const round = input.round ?? 1;
    const reference = (): ReferenceAnalysis | null => {
        if (!run.reference_binding_id) return null;
        if (!run.target_scene_id) return agentResult(id, "reference_analysis", referenceAnalysisSchema);
        const stored = motionReference(run.project_id);
        const analysis = stored?.bindingId === run.reference_binding_id ? referenceAnalysisSchema.safeParse(stored.analysis) : null;
        return analysis?.success ? analysis.data : null;
    };
    const storyboard = () => agentResult(id, "director", motionStoryboardSchema);
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
            ? "The scene outline model did not finish. Continuing with browser cut estimates and saved visual observations."
            : `Analyzed ${capture.measured.timestamps.length} reference samples.` };
    }
    if (step.name === "director") {
        const value = await runMotionDirector(context, reference());
        return { value, summary: value.value.summary };
    }
    if (step.name === "copy") {
        const value = await runMotionCopywriter(context, storyboard());
        return { value, summary: value.value.decision };
    }
    if (step.name === "design") {
        const value = await runMotionDesigner(context, storyboard());
        return { value, summary: value.value.decision };
    }
    if (step.name.startsWith("engineer:")) {
        const target = storyboard().scenes.find(({ id }) => id === input.sceneId)!;
        const traceName = `trace:${target.id}`;
        const traced = motionSteps(id).some(({ name, status }) => name === traceName && status === "done")
            ? traceResultSchema.parse(result(id, traceName)) : null;
        const asset = traced?.status === "traced" ? { id: traced.assetId, kind: "vectors" as const } : null;
        const value = await runMotionEngineer(context, target, agentResult(id, "copy", motionCopySchema),
            agentResult(id, "design", motionDesignSchema), asset ? [asset] : []);
        if (asset && value.value.scene.type === "liquid") {
            const { scene } = value.value;
            value.value.scene = motionSceneSchema.parse({ ...scene, assets: [asset],
                params: { mode: "vectors", assetId: asset.id, style: "liquid_gradient" } });
        }
        return { value, summary: value.value.decision };
    }
    if (step.name === stepNames(round).assemble) {
        if (run.target_scene_id) {
            const target = run.target_scene_id;
            const source = round === 1 ? "revise" : stepNames(round - 1).repair(target);
            const { scene } = agentResult(id, source, motionBuildSchema);
            const plan = { title: "Focused scene revision", scenes: context.document.tracks.motion_graphics.map((item) => item.id === target ? scene : item) };
            const blockers = motionDraftBlockers([scene]);
            return { value: { plan, blockers, document: blockers.length ? null : compileMotionPlan(plan, context.document) } };
        }
        const plan = storyboard();
        const builds: MotionBuild[] = round === 1
            ? plan.scenes.map(({ id: sceneId }) => agentResult(id, `engineer:${sceneId}`, motionBuildSchema))
            : build(round - 1).plan.scenes.map((scene) => {
                const repair = stepNames(round - 1).repair(scene.id);
                return motionSteps(id).some(({ name, status }) => name === repair && status === "done")
                    ? agentResult(id, repair, motionBuildSchema)
                    : { scene, decision: "Kept the approved scene.", approximation: null };
            });
        const value = integrateMotionScenes(context.document, plan, builds);
        return { value, summary: value.blockers.length ? "The draft needs a repair before browser review." : undefined };
    }
    if (step.name === stepNames(round).critique) {
        const preview = previewSchema.parse(result(id, stepNames(round).preview));
        const draft = build(round).document;
        if (!draft) throw new Error("The draft needs repairs before review.");
        try {
            const value = await runMotionCritic(context, draft,
                { ...preview, images: imageBytes(preview.images) }, reference(), run.target_scene_id ?? undefined,
                (index, read) => cachedObservations(id, step, `${step.name}:observations:${preview.images[index].sha256}`, signal, read));
            return { value, summary: value.value.decision };
        } catch (error) {
            signal.throwIfAborted();
            if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
            return { value: { source: "review_unavailable" },
                summary: "Automated visual review could not finish. Review the saved preview before applying the draft." };
        }
    }
    if (step.name.startsWith("repair:")) {
        const previous = build(round);
        const scene = previous.plan.scenes.find(({ id }) => id === input.sceneId)!;
        const issues = previous.blockers?.length ? previous.blockers : agentResult(id, stepNames(round).critique, motionCritiqueSchema).issues;
        const value = await runMotionRepair(context, scene, issues);
        return { value, summary: value.value.decision };
    }
    if (step.name === "publish") return { value: { plan: build(round).plan, issues: input.issues ?? [],
        reviewUnavailable: input.reviewUnavailable === true } };
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
    if (issues.length) {
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

export function motionRunDraft(run: MotionRun) {
    const steps = motionSteps(run.id).filter(({ name, status }) =>
        (name === "assemble" || name.startsWith("assemble:")) && status === "done").reverse();
    for (const { name } of steps) {
        const draft = result<BuildArtifact>(run.id, name);
        if (draft.document) return { document: draft.document, plan: draft.plan, startingRevision: run.starting_revision };
    }
    return null;
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

function motionPlanProvenance(run: MotionRun, plan: z.infer<typeof motionPlanSchema>) {
    const bindingId = run.reference_binding_id;
    const selected = bindingId ? motionReference(run.project_id) : null;
    const matching = selected?.bindingId === bindingId ? selected : null;
    const metadata = matching && referenceMetadata.safeParse(matching.metadata);
    return { ...plan, provenance: {
        runId: run.id,
        rendererVersion: motionRendererVersion,
        skills: motionSkillManifest.map(({ id, version }) => ({ id, version })),
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
