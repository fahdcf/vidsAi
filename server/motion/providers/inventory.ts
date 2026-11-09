import { readFileSync } from "node:fs";
import { z } from "zod";

const catalogSchema = z.object({
    models: z.record(z.string(), z.object({
        catalogId: z.string(),
        apiModel: z.string().nullish(),
        family: z.string(),
        credentialEnv: z.string(),
        sharedCredentialEnv: z.string().nullish(),
        endpoint: z.string().nullish(),
        functionId: z.string().nullish(),
    })),
});

const historicalSchema = z.object({
    http: z.array(z.object({ alias: z.string(), passed: z.boolean() })).default([]),
    actualScenePlanner: z.array(z.object({ alias: z.string(), passed: z.boolean() })).default([]),
    actualEditingPlanner: z.array(z.object({ alias: z.string(), passed: z.boolean() })).default([]),
});

const catalog = catalogSchema.parse(JSON.parse(readFileSync(new URL("../../../nvidia/models.json", import.meta.url), "utf8")));
const historical = historicalSchema.parse(JSON.parse(readFileSync(new URL("../../../nvidia/LIVE_RESULTS.json", import.meta.url), "utf8")));

export const motionRoutes = ["AGENT_COMPLEX", "WRITING", "MEDIA_UNDERSTANDING"] as const;
export type MotionRoute = typeof motionRoutes[number];
export type MotionCapability = "text" | "image" | "thinking" | "stream";
export type MotionEvidence = {
    model: string;
    endpoint: string;
    capability: MotionCapability;
    result: "reachable" | "qualified" | "unsupported" | "temporarily_unavailable";
};

export type MotionProvider = {
    alias: string;
    id: string;
    model: string;
    family: string;
    endpoint: string | null;
    functionId: string | null;
    credential: string | undefined;
};

export function configuredMotionProviders(env: NodeJS.ProcessEnv = process.env): MotionProvider[] {
    return Object.entries(catalog.models).flatMap(([alias, entry]) => {
        const prefix = entry.credentialEnv.replace(/_API_KEY$/, "");
        const id = env[`${prefix}_MODEL_ID`]?.trim();
        if (!id) return [];
        const family = env[`${prefix}_API_FAMILY`]?.trim() || entry.family;
        const endpoint = env[`${prefix}_ENDPOINT`]?.trim()
            || (family === "chat" ? env.NVIDIA_CHAT_ENDPOINT?.trim() : undefined)
            || entry.endpoint
            || null;
        return [{
            alias,
            id,
            model: id === entry.catalogId ? entry.apiModel ?? id : id,
            family,
            endpoint,
            functionId: env[`${prefix}_FUNCTION_ID`]?.trim() || entry.functionId || null,
            credential: env[entry.credentialEnv]?.trim() || env[entry.sharedCredentialEnv || "NVIDIA_API_KEY"]?.trim(),
        }];
    });
}

export function motionRouteProviders(route: MotionRoute, env: NodeJS.ProcessEnv = process.env) {
    if (env.NVIDIA_PROVIDER_ENABLED !== "true") return [];
    const configured = configuredMotionProviders(env);
    const ids = [
        env[`NVIDIA_ROUTE_${route}_PRIMARY`] || "",
        ...(env[`NVIDIA_ROUTE_${route}_FALLBACKS`] || "").split(","),
    ].map((id) => id.trim()).filter(Boolean);
    return [...new Set(ids)].flatMap((id) => {
        const model = configured.find((candidate) => candidate.id === id);
        return model?.family === "chat" && model.credential && model.endpoint ? [model] : [];
    });
}

const capabilities = ["text", "image", "thinking", "stream"] as const;

export function publicMotionInventory(env: NodeJS.ProcessEnv = process.env, evidence: readonly MotionEvidence[] = []) {
    return {
        enabled: env.NVIDIA_PROVIDER_ENABLED === "true",
        routes: Object.fromEntries(motionRoutes.map((route) => [
            route, motionRouteProviders(route, env).map(({ alias }) => alias),
        ])),
        models: configuredMotionProviders(env).map((model) => {
            const catalogEntry = catalog.models[model.alias];
            const sameModel = model.id === catalogEntry.catalogId;
            return {
                alias: model.alias,
                model: sameModel ? catalogEntry.catalogId : "configured override",
                family: model.family === catalogEntry.family ? catalogEntry.family : "configured override",
                credentialsConfigured: Boolean(model.credential),
                endpointConfigured: Boolean(model.endpoint),
                historical: {
                    httpSmoke: sameModel && historical.http.some((row) => row.alias === model.alias && row.passed),
                    scenePlanner: sameModel && historical.actualScenePlanner.some((row) => row.alias === model.alias && row.passed),
                    editorPlanner: sameModel && historical.actualEditingPlanner.some((row) => row.alias === model.alias && row.passed),
                },
                capabilities: Object.fromEntries(capabilities.map((capability) => {
                    const latest = evidence.filter((item) => item.model === model.model &&
                        item.endpoint === model.endpoint && item.capability === capability).at(-1);
                    const state = model.family !== "chat" ? "unsupported"
                        : !model.credential || !model.endpoint ? "temporarily_unavailable"
                        : latest?.result ?? "configured";
                    return [capability, state];
                })),
            };
        }),
    };
}
