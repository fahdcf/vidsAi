import { z } from "zod";
import { referenceCropBounds } from "./browser-tools";
import { referenceIntervalSchema } from "./reference";
import { motionColor, motionSceneId } from "./schema";

const label = z.string().trim().min(1).max(120);
const evidenceId = z.string().regex(/^[sf]\d{1,2}$/);
const confidence = z.number().min(0).max(1);
const references = z.array(evidenceId).min(1).max(4);
const event = z.object({
    kind: z.enum(["entrance", "hold", "exit", "transition"]),
    objectId: motionSceneId.nullable(),
    description: label,
    confidence,
    evidenceIds: references.min(2),
}).strict();
const referenceObject = z.object({
    id: motionSceneId, label,
    bounds: referenceCropBounds.nullable(),
    alignment: z.enum(["left", "center", "right"]).nullable(),
    layer: z.number().int().min(0).max(31).nullable(),
    colorRole: z.enum(["background", "foreground", "accent", "surface", "status"]).nullable(),
    color: motionColor.nullable(),
    text: z.object({ value: z.string().trim().min(1).max(180), style: label.nullable() }).strict().nullable(),
    persistentKey: motionSceneId.nullable(),
    confidence,
    evidenceIds: references,
}).strict();

export const referenceSceneProposalSchema = z.object({
    sceneId: motionSceneId,
    objects: z.array(referenceObject).max(8),
    events: z.array(event).max(5),
    uncertainties: z.array(label).max(4),
}).strict();

export const referenceSceneSpecSchema = referenceSceneProposalSchema.extend({
    sourceInterval: referenceIntervalSchema.nullable(),
    sourceSceneIndex: z.number().int().min(0).max(7).nullable().optional(),
    requiredCopy: z.string().max(180),
    evidence: z.array(z.object({ id: evidenceId, time: referenceIntervalSchema.shape.start }).strict()).max(40),
    source: z.enum(["vision", "observations"]),
}).strict().superRefine((scene, ctx) => {
    const times = new Map(scene.evidence.map(({ id, time }) => [id, time]));
    const objectIds = new Set(scene.objects.map(({ id }) => id));
    const interval = scene.sourceInterval;
    if (scene.evidence.some(({ time }) => interval ? time < interval.start || time > interval.end : time !== 0)) {
        ctx.addIssue({ code: "custom", message: "Scene evidence must stay inside the assigned source interval." });
    }
    if (times.size !== scene.evidence.length || objectIds.size !== scene.objects.length) {
        ctx.addIssue({ code: "custom", message: "Scene evidence and object IDs must be unique." });
    }
    for (const object of scene.objects) {
        if (object.evidenceIds.some((id) => !times.has(id))) {
            ctx.addIssue({ code: "custom", message: "An object cites an unavailable source frame." });
        }
    }
    for (const event of scene.events) {
        const cited = event.evidenceIds.map((id) => times.get(id));
        if (!scene.sourceInterval || cited.some((time) => time === undefined) ||
            new Set(cited).size < 2 || (event.objectId !== null && !objectIds.has(event.objectId))) {
            ctx.addIssue({ code: "custom", message: "Motion requires two different source times and a valid object." });
        }
    }
});
export type ReferenceSceneSpec = z.infer<typeof referenceSceneSpecSchema>;
