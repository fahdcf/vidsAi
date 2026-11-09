import { z } from "zod";

const limit = (fallback: number, max: number) =>
    z.coerce.number().int().positive().max(max).default(fallback);
const limitsSchema = z.object({
    providerConcurrency: limit(2, 8),
    browserConcurrency: limit(1, 1),
    critiqueRounds: limit(3, 8),
    modelAttempts: limit(40, 100),
    totalTokens: limit(160_000, 1_000_000),
    activeMs: limit(20 * 60_000, 120 * 60_000),
    browserWaitMs: limit(24 * 60 * 60_000, 7 * 24 * 60 * 60_000),
    requestMs: limit(120_000, 300_000),
    firstTokenMs: limit(50_000, 300_000),
}).refine((limits) => limits.firstTokenMs <= limits.requestMs && limits.requestMs <= limits.activeMs,
    "Motion deadlines must satisfy first token ≤ request ≤ active run.");

export type MotionLimits = z.infer<typeof limitsSchema>;

export function motionLimits(env: NodeJS.ProcessEnv = process.env): MotionLimits {
    const values = Object.fromEntries(Object.keys(limitsSchema.shape).map((key) => {
        const name = "MOTION_" + key.replace(/[A-Z]/g, (letter) => "_" + letter).toUpperCase();
        return [key, env[name]?.trim() || undefined];
    }));
    const parsed = limitsSchema.safeParse(values);
    if (!parsed.success) {
        throw new Error(`Invalid motion budget configuration (${parsed.error.issues.map((issue) => issue.path.join(".") || "deadlines").join(", ")}).`);
    }
    return parsed.data;
}

export class MotionBudgetError extends Error {}

export class MotionRunBudget {
    private started: number;
    private waitingSince: number | undefined;
    private browserWait = 0;
    private providers = 0;
    private browserTasks = 0;
    private attempts = 0;
    private critiques = 0;
    private tokens = 0;

    constructor(readonly limits: MotionLimits, private readonly now = () => performance.now()) {
        this.started = now();
    }

    private remainingMs() {
        return Math.max(0, this.limits.activeMs - (this.now() - this.started - this.browserWait));
    }

    private requireActive() {
        if (this.waitingSince !== undefined) throw new MotionBudgetError("Motion run is waiting for a browser.");
        if (this.remainingMs() === 0) throw new MotionBudgetError("Motion active-work deadline reached.");
    }

    reserveModel(estimatedPromptTokens: number, maxCompletionTokens: number) {
        this.requireActive();
        for (const count of [estimatedPromptTokens, maxCompletionTokens]) {
            if (!Number.isSafeInteger(count) || count <= 0) throw new MotionBudgetError("Invalid motion token reservation.");
        }
        const reserved = estimatedPromptTokens + maxCompletionTokens;
        if (this.providers >= this.limits.providerConcurrency) throw new MotionBudgetError("All motion provider slots are occupied.");
        if (this.attempts >= this.limits.modelAttempts) throw new MotionBudgetError("Motion model attempt limit reached.");
        if (this.tokens + reserved > this.limits.totalTokens) throw new MotionBudgetError("Motion token budget exhausted.");
        this.providers++;
        this.attempts++;
        this.tokens += reserved;
        const timeoutMs = Math.min(this.limits.requestMs, Math.ceil(this.remainingMs()));
        let released = false;
        return {
            timeoutMs,
            firstTokenTimeoutMs: Math.min(this.limits.firstTokenMs, timeoutMs),
            release: (actualTokens?: number) => {
                if (released) return;
                released = true;
                this.providers--;
                // Keep the reservation when the provider omitted usage or the request failed.
                if (actualTokens !== undefined && Number.isSafeInteger(actualTokens) && actualTokens > 0) {
                    this.tokens += actualTokens - reserved;
                }
            },
        };
    }

    reserveBrowser() {
        this.requireActive();
        if (this.browserTasks >= this.limits.browserConcurrency) throw new MotionBudgetError("A motion browser task is already running.");
        this.browserTasks++;
        let released = false;
        return () => {
            if (released) return;
            released = true;
            this.browserTasks--;
        };
    }

    startCritique() {
        this.requireActive();
        if (this.critiques >= this.limits.critiqueRounds) throw new MotionBudgetError("Motion critique round limit reached.");
        this.critiques++;
    }

    waitForBrowser() {
        if (this.waitingSince !== undefined) return;
        this.requireActive();
        if (this.providers || this.browserTasks) throw new MotionBudgetError("Finish active motion work before waiting.");
        this.waitingSince = this.now();
    }

    resumeBrowser() {
        if (this.waitingSince === undefined) return;
        const waited = this.now() - this.waitingSince;
        if (this.browserWait + waited >= this.limits.browserWaitMs) throw new MotionBudgetError("Motion browser wait expired.");
        this.browserWait += waited;
        this.waitingSince = undefined;
    }

    summary() {
        return { attempts: this.attempts, critiqueRounds: this.critiques, accountedTokens: this.tokens };
    }
}
