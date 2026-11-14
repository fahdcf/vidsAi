import { z } from "zod";
import { motionEditParameters } from "../../shared/motion/edit";
import { motionSceneId } from "../../shared/motion/schema";
import type { MotionVisionImage } from "./agent-call";
import type { MotionPromptRole } from "./prompts";

const target = z.object({ sceneId: motionSceneId }).strict();
const frame = z.number().int().min(0).max(7199);
const tools = {
    sample_reference: target.extend({ time: z.number().min(0).max(3600) }),
    measure_layout: target,
    render_scene: target.extend({ frames: z.array(frame).min(1).max(4) }),
    patch_scene: target.extend({ patch: motionEditParameters.update_motion_scene.shape.patch }),
};
type Name = keyof typeof tools;
type Request = { [K in Name]: { name: K; args: z.infer<(typeof tools)[K]> } }[Name];
export type AgentToolRequest = Request;
const roles: Partial<Record<MotionPromptRole, readonly Name[]>> = {
    visualDesigner: ["sample_reference", "measure_layout", "render_scene"],
    motionEngineer: ["sample_reference", "measure_layout", "render_scene", "patch_scene"],
    visualCritic: ["sample_reference", "measure_layout", "render_scene"],
    repair: ["sample_reference", "measure_layout", "render_scene", "patch_scene"],
};

export type AgentToolResult = { request: Request; result: unknown; images?: MotionVisionImage[] };
export type AgentToolSession = {
    available: boolean;
    history: (role: MotionPromptRole, sceneId?: string) => AgentToolResult[];
    request: (role: MotionPromptRole, request: Request, sceneId?: string) => never;
};
export const agentToolLimit = 8;
export const agentToolStageLimit = 2;

export function agentToolSchemas(role: MotionPromptRole) {
    return (roles[role] ?? []).map((name) => z.object({
        name: z.literal(name),
        args: tools[name],
    }).strict());
}

export function parseAgentToolRequest(role: MotionPromptRole, raw: unknown): Request {
    for (const schema of agentToolSchemas(role)) {
        const checked = schema.safeParse(raw);
        if (checked.success && JSON.stringify(checked.data).length <= 32_000) return checked.data as Request;
    }
    throw new Error("The specialist requested an invalid or unavailable tool.");
}

export class MotionToolYield extends Error {
    constructor(readonly role: MotionPromptRole, readonly request: Request, readonly payload: unknown) {
        super("The specialist requested a motion tool.");
    }
}
