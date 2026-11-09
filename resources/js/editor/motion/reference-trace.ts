import { z } from "zod";
import { motionVectorAsset, type MotionVectors } from "../../../../shared/motion/assets";
import { motionColor } from "../../../../shared/motion/schema";
import { referenceIntervalSchema } from "../../../../shared/motion/reference";
import { analyzeReferenceFrames } from "./reference-analysis";
import { sampleMotionReference, type MotionReferenceFrame } from "./reference-media";

export const traceOptionsSchema = z.object({
    interval: referenceIntervalSchema,
    colors: z.array(motionColor).max(6),
    tolerance: z.number().min(0.03).max(0.45).default(0.19),
    frames: z.number().int().min(2).max(72).default(36),
    highlights: z.boolean().default(false),
}).strict();
export type ReferenceTraceOptions = z.infer<typeof traceOptionsSchema>;
export type TraceWorkerRequest = { options: ReferenceTraceOptions; frames: MotionReferenceFrame[] };

export async function traceReferenceShapes(source: Blob, rawOptions: unknown, signal: AbortSignal): Promise<MotionVectors> {
    const options = traceOptionsSchema.parse(rawOptions);
    const { start, end } = options.interval;
    const duration = end - start;
    if (duration > 6) throw new Error("Select up to six seconds for vector tracing.");
    const times = Array.from({ length: options.frames }, (_, i) => start + duration * (i + 0.5) / options.frames);
    const frames: MotionReferenceFrame[] = [];
    for (let offset = 0; offset < times.length; offset += 32) {
        frames.push(...await sampleMotionReference(source, times.slice(offset, offset + 32), signal));
    }
    if (!options.colors.length) {
        const { palette } = await analyzeReferenceFrames(frames.filter((_, index) => index % 4 === 0), signal, true);
        options.colors = palette.filter(({ weight }) => weight >= 0.002).map(({ color }) => color);
        if (!options.colors.length) throw new Error("The selected interval has no isolatable shape colors.");
    }
    signal.throwIfAborted();
    const worker = new Worker(new URL("./reference-trace.worker.ts", import.meta.url), { type: "module" });
    try {
        return await new Promise<MotionVectors>((resolve, reject) => {
            const aborted = () => reject(signal.reason);
            signal.addEventListener("abort", aborted, { once: true });
            const dispose = () => signal.removeEventListener("abort", aborted);
            worker.onmessage = (event) => {
                dispose();
                if (event.data?.error) reject(new Error(String(event.data.error)));
                else {
                    const result = motionVectorAsset.safeParse(event.data);
                    if (result.success) resolve(result.data);
                    else reject(new Error("The traced vector artifact failed validation."));
                }
            };
            worker.onerror = () => { dispose(); reject(new Error("The reference trace worker failed.")); };
            if (signal.aborted) { dispose(); aborted(); }
            else worker.postMessage({ options, frames } satisfies TraceWorkerRequest);
        });
    } finally {
        worker.terminate();
    }
}
