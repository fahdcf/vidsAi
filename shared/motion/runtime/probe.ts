import { probeLimits, probeRequest, type ProbeRequest, type ProbeResult } from "./probe-contract";
import { resolveSceneProgramValues, sceneProgram, type SceneProgram, type SceneProgramValues } from "../scene-program";

export function runCompiledMotionProbe(raw: SceneProgram, frames: readonly number[], fps: number, signal?: AbortSignal) {
    return runMotionRuntimeProbe(compiledMotionRequest(raw, frames, fps), signal);
}

export function compiledMotionRequest(raw: SceneProgram, frames: readonly number[], fps: number, values?: SceneProgramValues): ProbeRequest {
    const program = sceneProgram.parse(raw);
    return { version: 1, fps, frames: [...frames], source: program.code, assetHandles: program.assets.map(({ handle }) => handle),
        program: { sourceMap: program.sourceMap, properties: resolveSceneProgramValues(program, values) } };
}

export function createMotionRuntimeSession() {
    const worker = new Worker(new URL("./probe.worker.ts", import.meta.url), { type: "module" });
    let cancel: (() => void) | undefined;
    let closed = false;
    function close() {
        if (closed) return;
        closed = true;
        cancel?.();
        worker.terminate();
    }
    async function request(input: ProbeRequest, signal?: AbortSignal): Promise<ProbeResult> {
        if (!probeRequest.safeParse(input).success) return { ok: false, reason: "input" };
        signal?.throwIfAborted();
        if (closed || cancel) throw new Error("The scene worker is unavailable.");
        let timer: ReturnType<typeof setTimeout> | undefined;
        const abort = () => close();
        try {
            return await new Promise<ProbeResult>((resolve, reject) => {
                cancel = () => reject(signal?.reason ?? new DOMException("Scene worker closed", "AbortError"));
                timer = setTimeout(() => { resolve({ ok: false, reason: "deadline" }); close(); }, probeLimits.deadlineMs);
                worker.onmessage = ({ data }: MessageEvent<ProbeResult>) => resolve(data);
                worker.onerror = () => { resolve({ ok: false, reason: "startup" }); close(); };
                signal?.addEventListener("abort", abort, { once: true });
                worker.postMessage(input);
            });
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            cancel = undefined;
            worker.onmessage = worker.onerror = null;
        }
    }
    return { request, close };
}

export async function runMotionRuntimeProbe(input: ProbeRequest, signal?: AbortSignal): Promise<ProbeResult> {
    const runtime = createMotionRuntimeSession();
    try { return await runtime.request(input, signal); }
    finally { runtime.close(); }
}
