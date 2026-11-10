import { programCommands, type ProgramCommand } from "../program-commands";
import { sceneProgram, type SceneProgram, type SceneProgramValues } from "../scene-program";
import { compiledMotionRequest, createMotionRuntimeSession } from "./probe";

const batchSize = 8;
const cacheSize = batchSize * 4;

export async function prepareBrowserProgram(raw: SceneProgram, values: SceneProgramValues | undefined,
    duration: number, signal: AbortSignal) {
    const program = sceneProgram.parse(raw);
    const { buildHash, ...data } = program;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
    if (Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("") !== buildHash) {
        throw new Error("The scene module build changed. Recompile it before rendering.");
    }
    signal.throwIfAborted();
    const request = compiledMotionRequest(program, [], 30, values);
    const handles = new Map(program.assets.map((ref) => [ref.handle, ref]));
    const frames = new Map<string, ProgramCommand[]>();
    const geometry = new Map<string, Path2D>();
    const runtime = createMotionRuntimeSession();
    let pending: Promise<void> | undefined;
    let failure: Error | undefined;
    let closed = false;
    const key = (frame: number, fps: number) => `${fps}/${frame}`;
    async function prepare(frame: number, fps: number): Promise<readonly ProgramCommand[]> {
        if (closed || frame < 0 || frame >= duration || !Number.isInteger(frame)) throw new Error("The scene frame is unavailable.");
        for (;;) {
            if (failure) throw failure;
            const ready = frames.get(key(frame, fps));
            if (ready) return ready;
            if (!pending) {
                const first = Math.floor(frame / batchSize) * batchSize;
                const batch = Array.from({ length: Math.min(batchSize, duration - first) }, (_, index) => first + index);
                pending = runtime.request({ ...request, frames: batch, fps }).then((result) => {
                    if (!result.ok) {
                        const diagnostic = result.diagnostic;
                        throw new Error(diagnostic ? `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`
                            : `The scene worker rejected a frame (${result.reason}).`, { cause: diagnostic });
                    }
                    if (result.frames.length !== batch.length) throw new Error("The scene worker returned an incomplete batch.");
                    for (const [index, output] of result.frames.entries()) {
                        const commands = programCommands.parse(output);
                        if (commands.some(({ id }) => id === undefined) || new Set(commands.map(({ id }) => id)).size !== commands.length ||
                            commands.some((command) => command.kind === "asset" && !handles.has(command.handle)) ||
                            commands.filter(({ kind }) => kind === "text").length > 8 ||
                            commands.filter(({ kind }) => kind === "asset").length > 4 ||
                            commands.filter((command) => command.kind === "asset" && handles.get(command.handle)?.kind === "vectors").length > 1) {
                            throw new Error("The scene worker returned an invalid object ID or asset handle.");
                        }
                        frames.set(key(batch[index], fps), commands);
                    }
                    while (frames.size > cacheSize) frames.delete(frames.keys().next().value!);
                }).catch((error: unknown) => {
                    failure = error instanceof Error ? error : new Error("The scene worker stopped.");
                    runtime.close();
                    throw failure;
                }).finally(() => { pending = undefined; });
            }
            await pending;
        }
    }
    return {
        handles, geometry, prepare, cached: (frame: number, fps: number) => frames.get(key(frame, fps)),
        close() { closed = true; runtime.close(); frames.clear(); geometry.clear(); },
    };
}
export type BrowserMotionProgram = Awaited<ReturnType<typeof prepareBrowserProgram>>;
