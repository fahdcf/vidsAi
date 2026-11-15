import { z } from "zod";

const convert = (output: z.ZodType, compact = false) => z.toJSONSchema(output, {
    io: "input", unrepresentable: "any", reused: compact ? "ref" : "inline",
});
const schemas = new WeakMap<z.ZodType, ReturnType<typeof convert>>();
const promptSchemas = new WeakMap<z.ZodType, ReturnType<typeof convert>>();

export function motionOutputJsonSchema(output: z.ZodType) {
    const cached = schemas.get(output);
    if (cached) return cached;
    const value = convert(output);
    schemas.set(output, value);
    return value;
}

export function motionPromptJsonSchema(output: z.ZodType) {
    const cached = promptSchemas.get(output);
    if (cached) return cached;
    const full = motionOutputJsonSchema(output);
    const size = JSON.stringify(full).length;
    const compact = size > 12_000 ? convert(output, true) : full;
    const value = JSON.stringify(compact).length < size ? compact : full;
    promptSchemas.set(output, value);
    return value;
}
