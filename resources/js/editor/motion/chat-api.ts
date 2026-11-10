import type { MotionSetupRequirements } from "./setup-upload";
import type { MotionQuality } from "../../../../shared/motion/schema";

export type MotionStatus = "queued" | "working" | "waiting_for_browser" | "ready" | "failed" | "cancelled";
export type MotionEvent = { id: number; type: string; data: Record<string, unknown>; created_at: number };
export type MotionRunView = {
    id: string;
    projectId: number;
    startingRevision: number;
    targetSceneId: string | null;
    storyboard: { title: string; scenes: { id: string; type: string; start_frame: number; end_frame: number; copy: string; purpose: string }[] } | null;
    status: MotionStatus;
    error: string | null;
    pendingSetup: MotionSetupRequirements | null;
    replacementRunId: string | null;
    draftVersion: string | null;
    draftApplied: boolean;
    needsApproval: boolean;
    reviewUnavailable: boolean;
    quality?: MotionQuality | null;
    editorAvailable: boolean;
    canRetry: boolean;
    counts: { complete: number; total: number };
    stages: { name: string; lane: "provider" | "browser" | "local"; status: "pending" | "running" | "done" | "failed" | "cancelled";
        startedAt: number | null; error: string | null;
        activity: { state: string; mode: string; model: string } | null }[];
    attachments: { reference: { name: string; bindingId: string; available: boolean } | null; logo: boolean; audio: boolean;
        audioSource?: "reference" | "uploaded" | "silent" | "muted" };
    messages: { id: number; role: "user" | "assistant" | "system"; text: string; created_at: number; run_id: string }[];
    events: MotionEvent[];
};

export const motionRunUrl = (id: string) => `/motion-runs/${encodeURIComponent(id)}`;
export const isWorkingMotion = (status?: MotionStatus) =>
    status === "queued" || status === "working" || status === "waiting_for_browser";
