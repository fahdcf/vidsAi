import { z } from "zod";
import { motionComponentTypes, motionRendererVersion } from "../../shared/motion/registry";
import { motionSceneSchema } from "../../shared/motion/schema";
import { buildMotionPrompt, motionCapabilityManifest, motionPromptRoles, motionSkillManifest, motionSkillSource } from "./prompts";
import { motionProgramExamples } from "./program-examples";
import { motionSdkHelpers } from "../../shared/motion/scene-sdk";
import { motionToolManifest, type ToolRole } from "./tools";
import { verifyMotionToolchain } from "./toolchain-check";

const examplesSchema = z.array(z.object({
    brief: z.string().trim().min(10),
    scene: motionSceneSchema,
}).strict()).min(2);

export function validateMotionResources() {
    verifyMotionToolchain();
    const roles: ToolRole[] = ["referenceAnalyst", "director", "copywriter", "designer", "motionEngineer", "critic", "integrator", "editor"];
    const tools = new Set(roles.flatMap((role) => motionToolManifest(role).map(({ name }) => name)));
    if (new Set(motionSkillManifest.map(({ id }) => id)).size !== motionSkillManifest.length) throw new Error("Duplicate motion skill.");
    const baseHelpers = new Set(["text", "path", "rect", "asset", ...Object.keys(motionSdkHelpers)]);
    const capabilities = motionCapabilityManifest.capabilities;
    if (new Set(capabilities.map(({ id }) => id)).size !== capabilities.length || capabilities.some(({ skill, examples }) =>
        !motionSkillManifest.some(({ id }) => id === skill) || examples.some((id) =>
            !motionProgramExamples.some((example) => example.id === id && baseHelpers.has(example.helper))))) {
        throw new Error("A motion capability points to a missing skill or SDK example.");
    }
    let examples = 0;
    const fence = String.fromCharCode(96).repeat(3);
    for (const { id } of motionSkillManifest) {
        const skill = motionSkillSource(id);
        if (skill.rendererVersion !== motionRendererVersion ||
            skill.tools.some((tool) => !tools.has(tool)) ||
            skill.components.some((name) => !motionComponentTypes.some((type) => type === name))) {
            throw new Error(`Invalid capabilities in motion skill ${id}.`);
        }
        const block = skill.text.split(fence + "json")[1]?.split(fence)[0];
        if (!block) throw new Error(`Missing examples in motion skill ${id}.`);
        const values = examplesSchema.parse(JSON.parse(block));
        if (values.some(({ scene }) => !skill.components.includes(scene.type))) throw new Error(`An example uses an undeclared component in ${id}.`);
        examples += values.length;
    }
    for (const role of motionPromptRoles) {
        buildMotionPrompt(role, {
            brief: "Build a short motion study.", revision: 1, width: 1280, height: 720, fps: 30, frames: 90,
            input: {}, maxOutputTokens: 8192,
        }, z.object({ summary: z.string() }).strict());
    }
    return { skills: motionSkillManifest.length, prompts: motionPromptRoles.length, examples };
}
