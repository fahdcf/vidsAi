import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { runtime } from "../../env";
import { motionRouteProviders, type MotionCapability, type MotionRoute } from "./inventory";

const reportSchema = z.object({
    inventory: z.object({ models: z.array(z.object({
        alias: z.string(),
        model: z.string(),
        capabilities: z.record(z.string(), z.string()),
    })) }),
});

export async function qualifiedMotionProviders(route: MotionRoute, capabilities: readonly MotionCapability[]) {
    const filename = path.join(runtime, "motion-verification", "model-qualification.json");
    const content = await readFile(filename, "utf8").catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return null;
    });
    if (!content) return [];
    const report = reportSchema.parse(JSON.parse(content));
    return motionRouteProviders(route).filter((provider) =>
        provider.endpoint === "https://integrate.api.nvidia.com/v1/chat/completions" &&
        report.inventory.models.some((entry) =>
        entry.alias === provider.alias && entry.model === provider.id &&
        capabilities.every((capability) => entry.capabilities[capability] === "qualified")));
}
