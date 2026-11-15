import { z } from "zod";

const convert = (output: z.ZodType) => z.toJSONSchema(output, { io: "input", unrepresentable: "any" });
const schemas = new WeakMap<z.ZodType, ReturnType<typeof convert>>();

export function motionOutputJsonSchema(output: z.ZodType) {
    const cached = schemas.get(output);
    if (cached) return cached;
    const value = convert(output);
    schemas.set(output, value);
    return value;
}
