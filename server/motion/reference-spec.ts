import { z } from "zod";
import { motionEvidenceFramesPerSheet } from "../../shared/motion/browser-tools";
import type { ReferenceAnalysis } from "../../shared/motion/reference";
import { referenceSceneProposalSchema, referenceSceneSpecSchema, type ReferenceSceneSpec } from "../../shared/motion/reference-spec";
import { MotionAgentUnavailable, runMotionAgent, type MotionAgentContext, type MotionVisionImage } from "./agent-call";
import type { MotionStoryboard } from "./agents";
import { MotionBudgetError } from "./budget";
import { sceneReferenceEvidence } from "./reference-segments";

export async function runReferenceSpec(context: MotionAgentContext, storyboard: MotionStoryboard, reference: ReferenceAnalysis,
    sheets: readonly MotionVisionImage[], detailFrames: readonly { sceneId: string; time: number; image: MotionVisionImage }[]) {
    const available = 8 - sheets.length;
    const detailCount = Math.min(available, detailFrames.length);
    const details = Array.from({ length: detailCount }, (_, index) => detailFrames[Math.floor(index * detailFrames.length / detailCount)]);
    const tiles = reference.measured.timestamps.map((time, index) => ({ id: `s${index}`, time,
        imageNumber: 1 + Math.floor(index / motionEvidenceFramesPerSheet), tile: 1 + index % motionEvidenceFramesPerSheet }));
    const detailSamples = details.map(({ sceneId, time }, index) => ({ id: `f${index}`, sceneId, time, imageNumber: sheets.length + index + 1 }));
    const inputs = storyboard.scenes.map((scene) => {
        const notes = sceneReferenceEvidence(reference, scene, context.document);
        const sourceInterval = notes?.timing ?? null;
        const evidence = notes ? [...tiles, ...detailSamples.filter(({ sceneId }) => sceneId === scene.id)]
            .filter(({ time }) => sourceInterval ? time >= sourceInterval.start && time <= sourceInterval.end : time === 0)
            .map(({ id, time }) => ({ id, time })) : [];
        return { sceneId: scene.id, sourceInterval, sourceSceneIndex: notes?.sourceSceneIndex ?? null, requiredCopy: scene.copy, evidence, notes };
    });
    const schema = z.object({ scenes: z.array(referenceSceneProposalSchema).length(inputs.length) }).strict();
    const expand = (proposals: z.infer<typeof schema>["scenes"]): ReferenceSceneSpec[] => {
        const byId = new Map(proposals.map((proposal) => [proposal.sceneId, proposal]));
        if (byId.size !== inputs.length) throw new Error("A reference specification needs one proposal per scene.");
        return inputs.map(({ notes: _notes, ...scene }) => {
            const proposal = byId.get(scene.sceneId);
            if (!proposal) throw new Error("The reference specification used an unexpected scene ID.");
            return referenceSceneSpecSchema.parse({ ...proposal, ...scene, source: "vision" });
        });
    };
    try {
        const result = await runMotionAgent(context, "referenceSpec", "MEDIA_UNDERSTANDING", {
            scenes: inputs, contactSheetTiles: tiles, detailFrames: detailSamples,
        }, schema, {
            images: [...sheets, ...details.map(({ image }) => image)], requestTimeoutMs: 45_000,
            validate: ({ scenes }) => { expand(scenes); },
        });
        return { specs: expand(result.value.scenes), source: "vision" as const };
    } catch (error) {
        context.signal.throwIfAborted();
        if (!(error instanceof MotionAgentUnavailable) && !(error instanceof MotionBudgetError)) throw error;
        const specs = inputs.map(({ notes: _notes, ...scene }) => referenceSceneSpecSchema.parse({
            ...scene, objects: [], events: [], source: "observations",
            uncertainties: ["The structured visual analysis was unavailable. Use the saved observations and frames."],
        }));
        return { specs, source: "observations" as const };
    }
}
