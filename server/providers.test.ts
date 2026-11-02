import { test } from "node:test";
import assert from "node:assert/strict";
import { modelJson } from "./providers";
import { wanPayload, wanModels } from "./wan";
test("scene model routing rejects malformed output and tries the full configured fallback", async () => {
    const original = globalThis.fetch;
    const env = { ...process.env };
    const models: string[] = [];
    process.env.NVIDIA_SUPER_VL_API_KEY = "test-primary";
    process.env.NVIDIA_LIGHTNING_API_KEY = "test-fallback";
    process.env.NVIDIA_ROUTE_WRITING_PRIMARY =
        "nvidia/nemotron-3.5-super-vl-120b-a12b";
    process.env.NVIDIA_ROUTE_WRITING_FALLBACKS =
        "nvidia/nemotron-3.5-lightning-30b-a3b";
    try {
        globalThis.fetch = async (_url, options) => {
            const payload = JSON.parse(String(options?.body));
            models.push(payload.model);
            assert.equal(
                (options?.headers as any).Authorization,
                models.length === 1
                    ? "Bearer test-primary"
                    : "Bearer test-fallback",
            );
            return new Response(
                JSON.stringify({
                    choices: [
                        {
                            message: {
                                content:
                                    models.length === 1
                                        ? "not JSON"
                                        : '{"phrases":["valid"]}',
                            },
                        },
                    ],
                }),
            );
        };
        const result = await modelJson("WRITING", "test", (r) => {
            if (!Array.isArray(r.phrases)) throw new Error("Invalid");
        });
        assert.deepEqual(result, { phrases: ["valid"] });
        assert.equal(models.length, 2);
    } finally {
        globalThis.fetch = original;
        for (const key of Object.keys(process.env))
            if (!(key in env)) delete process.env[key];
        Object.assign(process.env, env);
    }
});
test("all seven retained WAN models validate resolutions and image conditioning", () => {
    assert.equal(Object.keys(wanModels).length, 7);
    for (const [id, model] of Object.entries(wanModels) as any) {
        const input = {
            model: id,
            resolution: model.default_resolution,
            prompt: "A cinematic bottle",
            ...(id.includes("-i2v-")
                ? { image_url: "https://example.com/image.png" }
                : {}),
        };
        const body = wanPayload(input);
        assert.equal(body.parameters.size, model.default_resolution);
        assert.equal(body.model, id);
    }
    assert.throws(() =>
        wanPayload({
            model: "unknown",
            resolution: "1920*1080",
            prompt: "test",
        }),
    );
    assert.throws(() =>
        wanPayload({
            model: "wan2.2-i2v-plus",
            resolution: "1920*1080",
            prompt: "test",
        }),
    );
});
