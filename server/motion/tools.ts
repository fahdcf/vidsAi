import { randomUUID } from "node:crypto";
import { z } from "zod";
import { applyOperations, motionToolNames } from "../../shared/editing-core";
import { operationSchema } from "../../shared/contracts";
import { motionPlanSchema } from "../../shared/motion/compile";
import { motionEditParameters } from "../../shared/motion/edit";
import { describeMotionComponent, motionComponentTypes } from "../../shared/motion/registry";
import { db, insert, now } from "../database";
import { commit, document } from "../document";
import { fail } from "../security";
import { validateMotionAssetOwnership } from "./assets";

export type ToolRole = "referenceAnalyst" | "director" | "copywriter" | "designer" | "motionEngineer" | "critic" | "integrator" | "editor";
type ToolContext = { projectId: number; accountId: number; role: ToolRole; signal: AbortSignal };
const draftHandle = z.object({ draftId: z.uuid(), projectId: z.number().int().positive(), expectedRevision: z.number().int().nonnegative() }).strict();
const revision = z.number().int().nonnegative();
const result = z.object({ revision, projectId: z.number().int().positive() }).strict();
const committed = z.object({ revision });
const operationBatch = z.array(operationSchema).min(1).max(12).refine((ops) =>
    ops.every(({ tool }) => motionToolNames.includes(tool)), "Only motion operations may enter a motion draft.");

function stage(project: ReturnType<typeof ownedProject>, expectedRevision: number, raw: unknown) {
    const operations = operationBatch.parse(raw);
    return db.transaction(() => {
        const current = document(project);
        if (current.revision !== expectedRevision) fail(409, "The project changed. Reopen the motion draft.");
        const candidate = applyOperations(current, operations);
        validateMotionAssetOwnership(project.id, candidate);
        const draftId = randomUUID();
        insert("motion_drafts", {
            id: draftId, project_id: project.id, expected_revision: expectedRevision,
            operations: JSON.stringify(operations), created_at: now(),
        });
        return { draftId, projectId: project.id, expectedRevision };
    }).immediate();
}

function ownedProject(context: ToolContext) {
    const project = db.prepare("SELECT * FROM projects WHERE id=? AND user_id=? AND workflow='motion_graphics'")
        .get(context.projectId, context.accountId);
    if (!project) fail(404, "Motion project not found.");
    return project as Record<string, any> & { id: number };
}

const reads: ToolRole[] = ["referenceAnalyst", "director", "copywriter", "designer", "motionEngineer", "critic", "integrator", "editor"];
const builders: ToolRole[] = ["motionEngineer", "integrator", "editor"];
function tool<I, O>(roles: ToolRole[], input: z.ZodType<I>, output: z.ZodType<O>, cost: number,
    run: (input: I, project: ReturnType<typeof ownedProject>) => unknown) {
    return {
        roles, cost,
        execute(value: unknown, project: ReturnType<typeof ownedProject>) {
            return output.parse(run(input.parse(value), project));
        },
    };
}
const descriptor = z.object({
    type: z.enum(motionComponentTypes),
    name: z.string(),
    description: z.string(),
    rendererVersion: z.number().int().positive(),
    componentVersion: z.number().int().positive(),
    layouts: z.array(z.enum(["16:9", "9:16", "1:1"])),
    editable: z.array(z.string()),
    defaults: z.record(z.string(), z.unknown()),
    params: z.record(z.string(), z.unknown()),
}).strict();
const registry = {
    list_motion_components: tool(reads, z.object({}).strict(), z.array(descriptor), 1,
        () => motionComponentTypes.map(describeMotionComponent)),
    get_motion_component_schema: tool(reads, z.object({ type: z.enum(motionComponentTypes) }).strict(), descriptor, 1,
        ({ type }) => describeMotionComponent(type)),
    validate_motion_document: tool(reads, z.object({ expectedRevision: revision, operations: operationBatch }).strict(),
        z.object({ valid: z.literal(true), revision }).strict(), 2,
        ({ operations, expectedRevision }, project) => {
            const current = document(project);
            if (current.revision !== expectedRevision) fail(409, "The project changed. Reopen the motion draft.");
            const candidate = applyOperations(current, operations);
            validateMotionAssetOwnership(project.id, candidate);
            return { valid: true, revision: current.revision };
        }),
    propose_motion_plan: tool(["director", "integrator"], z.object({ expectedRevision: revision, plan: motionPlanSchema }).strict(),
        draftHandle, 3, ({ expectedRevision, plan }, project) => stage(project, expectedRevision, [{ tool: "replace_motion_plan", params: plan }])),
    build_motion_scene: tool(builders, z.object({ expectedRevision: revision, scene: motionEditParameters.add_motion_scene }).strict(),
        draftHandle, 2, ({ expectedRevision, scene }, project) => stage(project, expectedRevision, [{ tool: "add_motion_scene", params: scene }])),
    patch_motion_scene: tool(builders, z.object({ expectedRevision: revision, operations: operationBatch }).strict(),
        draftHandle, 2, ({ expectedRevision, operations }, project) => stage(project, expectedRevision, operations)),
    commit_motion_revision: tool(["editor"], z.object({ draftId: z.uuid() }).strict(), result, 2,
        ({ draftId }, project) => {
            const draft = db.prepare("SELECT expected_revision,operations FROM motion_drafts WHERE id=? AND project_id=?")
                .get(draftId, project.id) as { expected_revision: number; operations: string } | undefined;
            if (!draft) fail(404, "Motion draft not found.");
            const applied = committed.parse(commit(project, {
                commandId: draftId, expectedRevision: draft.expected_revision,
                operations: operationBatch.parse(JSON.parse(draft.operations)),
            }));
            return { revision: applied.revision, projectId: project.id };
        }),
    restore_motion_revision: tool(["editor"], z.object({ commandId: z.uuid(), expectedRevision: revision, restoreRevision: revision }).strict(),
        result, 2, (request, project) => ({ revision: committed.parse(commit(project, request)).revision, projectId: project.id })),
};

export function motionToolManifest(role: ToolRole) {
    return Object.entries(registry).filter(([, entry]) => entry.roles.includes(role)).map(([name, entry]) => ({
        name, cost: entry.cost,
    }));
}

export function executeMotionTool(context: ToolContext, name: string, value: unknown) {
    context.signal.throwIfAborted();
    if (!Object.hasOwn(registry, name)) fail(422, "Unknown motion tool.");
    const entry = registry[name as keyof typeof registry];
    if (!entry.roles.includes(context.role)) fail(403, "This role cannot execute that motion tool.");
    return entry.execute(value, ownedProject(context));
}
