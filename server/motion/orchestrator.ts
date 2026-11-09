import { randomUUID } from "node:crypto";
import { db, json, project, update } from "../database";
import { commit, document } from "../document";
import { fail } from "../security";
import { motionPlanSchema } from "../../shared/motion/compile";
import { referenceAnalysisSchema, type ReferenceAnalysis } from "../../shared/motion/reference";
import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { captureSchema, previewSchema, evidenceImages, referenceMetadata, type BrowserMotionInput } from "../../shared/motion/browser-tools";
import { MotionBudgetError, motionLimits, type MotionModelBudget } from "./budget";
import { motionElapsed, stepMotionBudget } from "./ledger";
import type { MotionAgentProgress } from "./agent-call";
import { motionReference, saveMotionReferenceAnalysis } from "./references";
import { observeReferenceSheet } from "./reference-observer";
import {
    integrateMotionScenes, motionBuildSchema, motionCopySchema, motionDesignSchema, motionStoryboardSchema,
    motionCritiqueSchema, runMotionCopywriter, runMotionCritic, runMotionDesigner, runMotionDirector, runMotionEngineer,
    runMotionRepair, runReferenceAnalyst, type MotionBuild, type MotionCritique,
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
    if (run.reference_binding_id) {
        add({ name: "reference_capture", lane: "browser" });
        add({ name: "reference_analysis", lane: "provider", dependencies: ["reference_capture"] });
    }
    add({ name: "director", lane: "provider", dependencies: run.reference_binding_id ? ["reference_analysis"] : [] });
    add({ name: "copy", lane: "provider", dependencies: ["director"] });
    add({ name: "design", lane: "provider", dependencies: ["director"] });
    if (!done("director")) return;
    const storyboard = agentResult(id, "director", motionStoryboardSchema);
    const engineers = storyboard.scenes.map((target) => {
        const name = `engineer:${target.id}`;
        add({ name, lane: "provider", dependencies: ["copy", "design"], input: { sceneId: target.id } });
        return name;
    });
    add({ name: "assemble", lane: "local", dependencies: engineers, input: { round: 1 } });
    for (let round = 1; round <= maxRounds; round++) {
        const { assemble, preview, critique, repair } = stepNames(round);
        if (!done(assemble)) return;
        const { blockers = [] } = result<BuildArtifact>(id, assemble);
        let issues = blockers;
        let unresolved: string[] = [];
        let dependency = assemble;
        if (!blockers.length) {
            add({ name: preview, lane: "browser", dependencies: [assemble], input: { round } });
            add({ name: critique, lane: "provider", dependencies: [preview], input: { round } });
            if (!done(critique)) return;
            ({ issues, unresolved } = agentResult(id, critique, motionCritiqueSchema));
            dependency = critique;
        }
        if (issues.length && round < maxRounds) {
            const sceneIds = [...new Set(issues.map(({ sceneId }) => sceneId))];
            for (const sceneId of sceneIds) {
                add({ name: repair(sceneId), lane: "provider", dependencies: [dependency], input: { round, sceneId } });
            }
            add({ name: stepNames(round + 1).assemble, lane: "local",
                dependencies: sceneIds.map(repair), input: { round: round + 1 } });
            continue;
        }
        add({ name: "publish", lane: "local", dependencies: [dependency],
            input: { round, issues: [...unresolved, ...issues.map(({ issue }) => issue)] } });
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
    if (step.name === "reference_capture") {
        const reference = motionReference(run.project_id);
        if (reference?.bindingId !== run.reference_binding_id) throw new Error("The reference was replaced.");
        if (!reference?.available) throw new Error("Relink the reference file.");
        return { tool: "reference_capture", reference: {
            bindingId: reference.bindingId, url: reference.url, metadata: referenceMetadata.parse(reference.metadata),
        } };
    }
    const { round } = json<{ round: number }>(step.input, { round: 1 });
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
    const input = json<{ round?: number; sceneId?: string; issues?: string[] }>(step.input, {});
    const round = input.round ?? 1;
    const reference = (): ReferenceAnalysis | null => run.reference_binding_id
        ? agentResult(id, "reference_analysis", referenceAnalysisSchema) : null;
    const storyboard = () => agentResult(id, "director", motionStoryboardSchema);
    const build = (n: number) => result<BuildArtifact>(id, stepNames(n).assemble);
    if (step.name === "reference_analysis") {
        const selected = motionReference(run.project_id);
        const capture = captureSchema.parse(result(id, "reference_capture"));
        if (selected?.bindingId !== capture.bindingId || !selected.available) throw new Error("Relink the reference file.");
        const metadata = z.object({ kind: referenceAnalysisSchema.shape.kind, interval: referenceAnalysisSchema.shape.interval })
            .parse(selected.metadata);
        const images = imageBytes(capture.images);
        const { observations } = await observeReferenceSheet(images, capture.measured.timestamps, budget, signal, onProgress);
        const value = await runReferenceAnalyst(context, { ...metadata, measured: capture.measured, observations }, images);
        return { value, summary: `Analyzed ${capture.measured.timestamps.length} reference samples.` };
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
        const value = await runMotionEngineer(context, target, agentResult(id, "copy", motionCopySchema),
            agentResult(id, "design", motionDesignSchema));
        return { value, summary: value.value.decision };
    }
    if (step.name === stepNames(round).assemble) {
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
        const value = await runMotionCritic(context, draft,
            { frames: preview.frames, images: imageBytes(preview.images) }, reference());
        return { value, summary: value.value.decision };
    }
    if (step.name.startsWith("repair:")) {
        const previous = build(round);
        const scene = previous.plan.scenes.find(({ id }) => id === input.sceneId)!;
        const issues = previous.blockers?.length ? previous.blockers : agentResult(id, stepNames(round).critique, motionCritiqueSchema).issues;
        const value = await runMotionRepair(context, scene, issues);
        return { value, summary: value.value.decision };
    }
    if (step.name === "publish") return { value: { plan: build(round).plan, issues: input.issues ?? [] } };
    throw new Error("Unknown motion workflow stage.");
};

function applyStepOutput(run: MotionRun, step: MotionStep, output: StepOutput) {
    if (step.name === "reference_analysis") {
        const { value: analysis } = z.object({ value: referenceAnalysisSchema }).parse(output.value);
        saveMotionReferenceAnalysis(run.project_id, { bindingId: run.reference_binding_id, analysis });
    }
    if (step.name !== "publish") return;
    const { plan, issues } = z.object({ plan: motionPlanSchema, issues: z.array(z.string()) }).parse(output.value);
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
    commit(p, { commandId: run.id, expectedRevision: run.starting_revision,
        operations: [{ tool: "replace_motion_plan", params: plan }] });
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
    });
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
        if (run.status === "ready" || motionSteps(runId).some(({ name, status }) => name === "publish" && status === "done") ||
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
