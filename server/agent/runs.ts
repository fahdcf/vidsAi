import { normalizeDocument, type BrowserPlanningLimits } from "../../shared/contracts/index";
import { plan } from "./planner";

const activePlans = new Map<string, ReturnType<typeof plan>>();

export function planAgentRun({
    projectId,
    runId,
    message,
    document,
    browserRenderProfile,
}: {
    projectId: number;
    runId: string;
    message: string;
    document: unknown;
    browserRenderProfile?: BrowserPlanningLimits;
}) {
    const key = `${projectId}:${runId}`;
    const active = activePlans.get(key);
    if (active) return active;

    // The caller validates ownership and stores the immutable run snapshot before planning.
    const pending = plan(message, normalizeDocument(document), {
        browserLimits: browserRenderProfile,
    }).finally(() => activePlans.delete(key));
    activePlans.set(key, pending);
    return pending;
}
