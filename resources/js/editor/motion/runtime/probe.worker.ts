import variant from "@jitl/quickjs-wasmfile-release-sync";
import wasmLocation from "@jitl/quickjs-wasmfile-release-sync/wasm?url";
import { newQuickJSWASMModuleFromVariant, newVariant } from "quickjs-emscripten-core";
import { probeCommands, probeLimits, probeRequest, type ProbeResult } from "./probe-contract";

const heapPages = 256;
const encoder = new TextEncoder();

async function evaluate(raw: unknown): Promise<ProbeResult> {
    const request = probeRequest.safeParse(raw);
    if (!request.success) return { ok: false, reason: "input" };
    const { version, frames, fps, source, assetHandles } = request.data;
    const memory = new WebAssembly.Memory({ initial: heapPages, maximum: heapPages });
    let vm: Awaited<ReturnType<typeof newQuickJSWASMModuleFromVariant>>;
    try {
        vm = await newQuickJSWASMModuleFromVariant(newVariant(variant, { wasmLocation, wasmMemory: memory }));
        if (vm.getWasmMemory() !== memory) return { ok: false, reason: "startup" };
    } catch {
        return { ok: false, reason: "startup" };
    }
    const output: Extract<ProbeResult, { ok: true }> = { ok: true, frames: [], frameMs: [], heapBytes: memory.buffer.byteLength };
    for (const frame of frames) {
        const start = performance.now();
        let checks = 0;
        let interrupted = false;
        const runtime = vm.newRuntime();
        try {
            runtime.setMemoryLimit(4 * 1024 * 1024);
            runtime.setMaxStackSize(128 * 1024);
            runtime.setInterruptHandler(() => interrupted ||= ++checks > 32 || performance.now() - start > 25);
            const ctx = runtime.newContext({ intrinsics: { BaseObjects: true, Eval: true, JSON: true } });
            try {
                const input = JSON.stringify({ version, frame, fps, assetHandles });
                const result = ctx.evalCode(`(() => {
                    "use strict";
                    const stringify = JSON.stringify;
                    delete Math.random;
                    const math = Object.freeze({ sin: Math.sin, cos: Math.cos, PI: Math.PI });
                    const sdk = Object.freeze({ math,
                        rect: (x, y, width, height, color) => ({ kind: "rect", x, y, width, height, color }),
                        asset: (handle, x, y, width, height) => ({ kind: "asset", handle, x, y, width, height }),
                    });
                    const input = ${input};
                    Object.freeze(input.assetHandles);
                    Object.freeze(input);
                    const render = (${source}\n);
                    const json = stringify(render(input, sdk));
                    return typeof json === "string" && json.length <= ${probeLimits.outputBytes} ? json : "";
                })()`, "scene.js", { type: "global" });
                if (result.error) {
                    result.error.dispose();
                    return { ok: false, reason: interrupted ? "interrupted" : "execution" };
                }
                const json = result.value.consume(ctx.getString);
                if (interrupted || performance.now() - start > 25) return { ok: false, reason: "interrupted" };
                if (!json || encoder.encode(json).length > probeLimits.outputBytes) return { ok: false, reason: "output" };
                const commands = probeCommands.safeParse(JSON.parse(json));
                if (!commands.success || commands.data.some((command) => command.kind === "asset" && !assetHandles.includes(command.handle))) {
                    return { ok: false, reason: "output" };
                }
                output.frames.push(commands.data);
                output.frameMs.push(performance.now() - start);
            } finally {
                ctx.dispose();
            }
        } finally {
            runtime.dispose();
        }
    }
    return output;
}

globalThis.addEventListener("message", async (event: MessageEvent<unknown>) => {
    let result: ProbeResult;
    try { result = await evaluate(event.data); } catch { result = { ok: false, reason: "execution" }; }
    postMessage(result);
}, { once: true });
