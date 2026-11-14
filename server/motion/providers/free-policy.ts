import { z } from "zod";
import type { MotionProvider } from "./inventory";

const prices = z.record(z.string(), z.union([z.number(), z.string()]));
const priceCatalog = z.object({ data: z.array(z.object({ id: z.string(), pricing: prices })) });
const endpointCatalog = z.object({ data: z.object({ id: z.string(), endpoints: z.array(z.object({
    tag: z.string(),
    pricing: prices,
})) }) });
const allowlist = z.array(z.object({ model: z.string(), providerSlug: z.string() }).strict()).max(12);
const zero = (value: number | string) => typeof value === "number" ? value === 0 : /^0(?:\.0+)?$/.test(value);
const freePrices = (pricing: z.infer<typeof prices>) => pricing.prompt !== undefined && pricing.completion !== undefined &&
    Object.values(pricing).every(zero);

export async function freeProviderRouting(provider: MotionProvider, signal: AbortSignal) {
    if (!provider.adapter || provider.adapter === "nvidia") return {};
    const denied = () => new Error("An optional route needs verified zero-price model and endpoint access.");
    if (provider.adapter !== "openrouter" || !provider.providerSlug ||
        !/^[a-z0-9_.-]+\/[a-z0-9_.-]+:free$/i.test(provider.model)) throw denied();
    const routes = z.string().transform((value, ctx) => {
        try { return JSON.parse(value) as unknown; } catch { ctx.addIssue({ code: "custom", message: "Invalid allowlist JSON." }); return z.NEVER; }
    }).pipe(allowlist).safeParse(process.env.MOTION_OPENROUTER_FREE_ALLOWLIST || "[]");
    if (!routes.success || !routes.data.some(({ model, providerSlug }) =>
        model === provider.model && providerSlug === provider.providerSlug)) throw denied();
    const checkSignal = AbortSignal.any([signal, AbortSignal.timeout(5_000)]);
    const get = async (endpoint: string) => {
        const response = await fetch(endpoint, { signal: checkSignal, redirect: "error", headers: {
            Authorization: `Bearer ${provider.credential}`, Accept: "application/json",
        } });
        if (!response.ok) throw denied();
        const body = await response.text();
        if (body.length > 5_000_000) throw denied();
        return JSON.parse(body) as unknown;
    };
    const [author, slug] = provider.model.split("/");
    try {
        const [models, endpoints] = await Promise.all([get("https://openrouter.ai/api/v1/models"),
            get(`https://openrouter.ai/api/v1/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`)]);
        const listed = priceCatalog.parse(models).data.find(({ id }) => id === provider.model);
        const choices = endpointCatalog.parse(endpoints).data;
        const endpoint = choices.id === provider.model ? choices.endpoints.find(({ tag }) => tag === provider.providerSlug) : undefined;
        if (!listed || !endpoint || !freePrices(listed.pricing) || !freePrices(endpoint.pricing)) throw denied();
    } catch {
        signal.throwIfAborted();
        throw denied();
    }
    return { provider: { only: [provider.providerSlug], allow_fallbacks: false,
        max_price: { prompt: 0, completion: 0, image: 0, request: 0 } } };
}
