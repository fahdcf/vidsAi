import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../database";
import { MotionOrchestrator, isActiveMotionRun } from "./orchestrator";
import { motionEvents, motionMessages, motionSteps, ownedMotionRun, type MotionRun } from "./store";

export const motionOrchestrator = new MotionOrchestrator();
export const motionCursor = z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export function motionRunView(run: MotionRun, after = 0) {
    const steps = motionSteps(run.id);
    return {
        id: run.id,
        projectId: run.project_id,
        startingRevision: run.starting_revision,
        status: run.status,
        error: run.error,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        counts: { complete: steps.filter(({ status }) => status === "done").length, total: steps.length },
        stages: steps.map(({ name, lane, status, started_at, error }) => ({ name, lane, status, startedAt: started_at, error })),
        messages: motionMessages(run.id),
        events: motionEvents(run.id, after),
    };
}

export function streamMotionEvents(req: Request, res: Response, run: MotionRun) {
    let after = motionCursor.parse(req.get("Last-Event-ID") || req.query.after || 0);
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const opened = Date.now();
    let lastWrite = opened;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
        if (timer) clearInterval(timer);
    };
    const finish = () => {
        stop();
        res.end();
    };
    const send = () => {
        if (res.destroyed || res.writableEnded) { stop(); return; }
        if (res.writableNeedDrain) {
            if (Date.now() - lastWrite >= 10_000) finish();
            return;
        }
        try {
            const current = ownedMotionRun(run.id, run.account_id);
            const events = motionEvents(run.id, after);
            for (const event of events) {
                after = event.id;
                lastWrite = Date.now();
                if (!res.write(`id: ${event.id}\nevent: motion\ndata: ${JSON.stringify(event)}\n\n`)) return;
            }
            if (!isActiveMotionRun(current) && events.length < 100) {
                res.write("event: terminal\ndata: {}\n\n");
                finish();
                return;
            }
            if (Date.now() - opened >= 25_000) finish();
            else if (Date.now() - lastWrite >= 10_000) {
                lastWrite = Date.now();
                res.write(": heartbeat\n\n");
            }
        } catch {
            finish();
        }
    };
    res.once("close", stop);
    timer = setInterval(send, 400);
    res.write("retry: 1500\n\n");
    send();
}

export function startMotionJobs() {
    const busy = new Set<string>();
    const pump = () => {
        const slots = Math.max(0, 4 - busy.size);
        if (!slots) return;
        const runs = db.prepare(
            "SELECT id FROM motion_runs WHERE status IN ('queued','working') OR (status='waiting_for_browser' AND (updated_at<=? OR EXISTS (SELECT 1 FROM motion_feedback f WHERE f.run_id=motion_runs.id AND f.replacement_run_id IS NULL))) ORDER BY updated_at,rowid LIMIT 16",
        ).all(Date.now() - motionOrchestrator.limits.browserWaitMs) as { id: string }[];
        for (const { id } of runs.filter(({ id }) => !busy.has(id)).slice(0, slots)) {
            busy.add(id);
            void motionOrchestrator.tick(id).catch(() => {
                console.error("A motion scheduler tick could not be completed.");
            }).finally(() => busy.delete(id));
        }
    };
    const timer = setInterval(pump, 400);
    pump();
    return timer;
}
