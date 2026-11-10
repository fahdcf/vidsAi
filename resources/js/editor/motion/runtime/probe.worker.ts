import variant from "@jitl/quickjs-wasmfile-release-sync";
import wasmLocation from "@jitl/quickjs-wasmfile-release-sync/wasm?url";
import { newQuickJSWASMModuleFromVariant, newVariant } from "quickjs-emscripten-core";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { probeCommands, probeLimits, probeRequest, type ProbeResult } from "./probe-contract";

const heapPages = 256;
const encoder = new TextEncoder();

function runtimeDiagnostic(stack: string, sourceMap: string, offset: number): ProbeResult {
    const match = /scene\.js:(\d+)(?::(\d+))?/.exec(stack);
    let line = 1, column = 1;
    if (match && Number(match[1]) > offset) {
        const original = originalPositionFor(new TraceMap(sourceMap), { line: Number(match[1]) - offset, column: Math.max(0, Number(match[2] ?? 1) - 1) });
        line = original.line ?? line;
        column = (original.column ?? 0) + 1;
    }
    return { ok: false, reason: "execution", diagnostic: { phase: "runtime", code: "scene_exception", file: "scene.ts", line, column,
        message: "The scene frame function threw an exception." } };
}

async function evaluate(raw: unknown): Promise<ProbeResult> {
    const request = probeRequest.safeParse(raw);
    if (!request.success) return { ok: false, reason: "input" };
    const { version, frames, fps, source, assetHandles, program } = request.data;
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
                const input = JSON.stringify({ version, frame, fps, assetHandles, properties: program?.properties });
                const prelude = `(() => {
                    "use strict";
                    const stringify = JSON.stringify;
                    delete Math.random;
                    const math = Object.freeze({ sin: Math.sin, cos: Math.cos, PI: Math.PI });
                    const sdk = Object.freeze({ math,
                        rect: ${program ? '(id, x, y, width, height, color) => ({ kind: "rect", id, x, y, width, height, color })' : '(x, y, width, height, color) => ({ kind: "rect", x, y, width, height, color })'},
                        asset: ${program ? '(id, handle, x, y, width, height) => ({ kind: "asset", id, handle, x, y, width, height })' : '(handle, x, y, width, height) => ({ kind: "asset", handle, x, y, width, height })'},
                    });
                    const input = ${input};
                    Object.freeze(input.assetHandles);
                    if (input.properties) Object.freeze(input.properties);
                    Object.freeze(input);
                    try {
                        const render = (\n`;
                const codePrefix = program ? "(() => {\nconst exports = {};\n" : "";
                const code = program ? `${codePrefix}${source}\nreturn exports.frame;\n})()` : source;
                const result = ctx.evalCode(`${prelude}${code}\n);
                        const json = stringify(render(input, sdk));
                        return typeof json === "string" && json.length <= ${probeLimits.outputBytes} ? json : "";
                    } catch (error) {
                        return "!" + (typeof error?.stack === "string" ? error.stack.slice(0, 512) : "");
                    }
                })()`, "scene.js", { type: "global" });
                if (result.error) {
                    result.error.dispose();
                    return { ok: false, reason: interrupted ? "interrupted" : "execution" };
                }
                const json = result.value.consume(ctx.getString);
                if (interrupted || performance.now() - start > 25) return { ok: false, reason: "interrupted" };
                if (json.startsWith("!")) return program ? runtimeDiagnostic(json.slice(1), program.sourceMap, (prelude + codePrefix).split("\n").length - 1)
                    : { ok: false, reason: "execution" };
                if (!json || encoder.encode(json).length > probeLimits.outputBytes) return { ok: false, reason: "output" };
                const commands = probeCommands.safeParse(JSON.parse(json));
                if (!commands.success || commands.data.some((command) => command.kind === "asset" && !assetHandles.includes(command.handle))) {
                    return { ok: false, reason: "output" };
                }
                if (program && (commands.data.some(({ id }) => id === undefined) ||
                    new Set(commands.data.map(({ id }) => id)).size !== commands.data.length)) return { ok: false, reason: "output" };
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
