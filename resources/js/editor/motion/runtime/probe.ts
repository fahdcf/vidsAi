import { probeLimits, probeRequest, type ProbeRequest, type ProbeResult } from "./probe-contract";

export async function runMotionRuntimeProbe(input: ProbeRequest, signal?: AbortSignal): Promise<ProbeResult> {
    if (!probeRequest.safeParse(input).success) return { ok: false, reason: "input" };
    signal?.throwIfAborted();
    const worker = new Worker(new URL("./probe.worker.ts", import.meta.url), { type: "module" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
        return await new Promise<ProbeResult>((resolve, reject) => {
            abort = () => reject(signal?.reason);
            timer = setTimeout(() => resolve({ ok: false, reason: "deadline" }), probeLimits.deadlineMs);
            worker.onmessage = ({ data }: MessageEvent<ProbeResult>) => resolve(data);
            worker.onerror = () => resolve({ ok: false, reason: "startup" });
            signal?.addEventListener("abort", abort, { once: true });
            worker.postMessage(input);
        });
    } finally {
        clearTimeout(timer);
        if (abort) signal?.removeEventListener("abort", abort);
        worker.terminate();
    }
}
