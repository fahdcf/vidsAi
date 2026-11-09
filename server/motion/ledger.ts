import { db, json } from "../database";
import { MotionBudgetError, type MotionLimits, type MotionModelBudget } from "./budget";
import { motionRun, type MotionRun, type MotionStep } from "./store";

const day = 86_400_000;

export function motionElapsed(run: MotionRun, now = Date.now()) {
    const events = db.prepare(
        "SELECT created_at,data FROM motion_events WHERE run_id=? AND type='run_status' ORDER BY id",
    ).all(run.id) as { created_at: number; data: string }[];
    let started = run.created_at;
    let active = 0;
    let waiting = 0;
    let status: string | undefined = "queued";
    const add = (end: number) => {
        const duration = Math.max(0, end - started);
        if (status === "working") active += duration;
        if (status === "waiting_for_browser") waiting += duration;
        started = end;
    };
    for (const event of events) {
        add(event.created_at);
        status = json<{ status?: string }>(event.data, {}).status;
    }
    add(now);
    return { active, waiting };
}

export function stepMotionBudget(run: MotionRun, step: MotionStep, limits: MotionLimits): MotionModelBudget {
    let slot = 0;
    return {
        reserveModel(prompt, completion, provider) {
            if (!provider || !step.lease_token || ![prompt, completion].every((value) => Number.isSafeInteger(value) && value > 0)) {
                throw new MotionBudgetError("Invalid motion model reservation.");
            }
            const tokens = prompt + completion;
            const reserved = db.transaction(() => {
                const now = Date.now();
                const current = motionRun(run.id);
                if (current?.status !== "working" || !db.prepare(
                    "SELECT 1 FROM motion_steps WHERE id=? AND run_id=? AND status='running' AND lease_token=? AND lease_expires>?",
                ).get(step.id, run.id, step.lease_token, now)) throw new MotionBudgetError("The motion step lease expired.");
                const { active, waiting } = motionElapsed(current, now);
                if (active >= limits.activeMs || waiting >= limits.browserWaitMs) {
                    throw new MotionBudgetError("Motion run time budget exhausted.");
                }
                const runUsage = db.prepare(
                    "SELECT COUNT(*) AS attempts,COALESCE(SUM(tokens),0) AS tokens FROM motion_budget_reservations WHERE run_id=?",
                ).get(run.id) as { attempts: number; tokens: number };
                if (runUsage.attempts >= limits.modelAttempts || runUsage.tokens + tokens > limits.totalTokens) {
                    throw new MotionBudgetError("Motion run model budget exhausted.");
                }
                if (db.prepare("SELECT 1 FROM motion_provider_cooldowns WHERE provider=? AND available_at>?").get(provider, now)) {
                    throw new MotionBudgetError("This motion provider is waiting for its rate limit to reset.", "provider");
                }
                const recent = db.prepare(`
                    SELECT
                        COALESCE(SUM(CASE WHEN account_id=? THEN 1 ELSE 0 END),0) AS account_attempts,
                        COALESCE(SUM(CASE WHEN account_id=? THEN tokens ELSE 0 END),0) AS account_tokens,
                        COALESCE(SUM(CASE WHEN provider=? THEN 1 ELSE 0 END),0) AS provider_attempts,
                        COALESCE(SUM(CASE WHEN provider=? THEN tokens ELSE 0 END),0) AS provider_tokens
                    FROM motion_budget_reservations WHERE created_at>?
                `).get(run.account_id, run.account_id, provider, provider, now - day) as {
                    account_attempts: number; account_tokens: number; provider_attempts: number; provider_tokens: number;
                };
                if (recent.account_attempts >= limits.accountDailyAttempts || recent.account_tokens + tokens > limits.accountDailyTokens) {
                    throw new MotionBudgetError("The account has reached its daily motion usage limit.");
                }
                if (recent.provider_attempts >= limits.providerDailyAttempts || recent.provider_tokens + tokens > limits.providerDailyTokens) {
                    throw new MotionBudgetError("This motion provider has reached its daily usage limit.", "provider");
                }
                const row = db.prepare(
                    "INSERT INTO motion_budget_reservations(step_id,run_id,account_id,lease_token,slot,provider,tokens,created_at) VALUES(?,?,?,?,?,?,?,?)",
                ).run(step.id, run.id, run.account_id, step.lease_token, ++slot, provider, tokens, now);
                return { id: row.lastInsertRowid, timeoutMs: Math.min(limits.requestMs, Math.max(1, limits.activeMs - active)) };
            }).immediate();
            let released = false;
            return {
                timeoutMs: reserved.timeoutMs,
                firstTokenTimeoutMs: Math.min(limits.firstTokenMs, reserved.timeoutMs),
                release(actual) {
                    if (released) return;
                    released = true;
                    if (actual !== undefined && Number.isSafeInteger(actual) && actual > 0) {
                        db.prepare("UPDATE motion_budget_reservations SET tokens=? WHERE id=?").run(actual, reserved.id);
                    }
                },
                backoff(ms) {
                    db.prepare(`INSERT INTO motion_provider_cooldowns VALUES(?,?)
                        ON CONFLICT(provider) DO UPDATE SET available_at=MAX(available_at,excluded.available_at)`)
                        .run(provider, Date.now() + Math.max(1000, Math.min(day, ms)));
                },
            };
        },
    };
}
