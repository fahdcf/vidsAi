import { Worker } from "node:worker_threads";
import { z } from "zod";
import { sceneProgram, sceneProgramInput } from "../../shared/motion/scene-program";
import { motionSceneId } from "../../shared/motion/schema";
import { commit, document } from "../document";
import { db } from "../database";
import { fail } from "../security";
import type { ProgramCompilation } from "./program-compiler";

const saveProgram = z.object({ commandId: z.uuid(), expectedRevision: z.number().int().nonnegative(),
    sceneId: motionSceneId, input: sceneProgramInput }).strict();
const committed = z.object({ revision: z.number().int().nonnegative() });
let compiling = 0;

export async function compileMotionProgram(input: z.infer<typeof sceneProgramInput>): Promise<ProgramCompilation> {
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const failure = (code: string, message: string): ProgramCompilation => ({ program: null, diagnostics: [
        { phase: "compiler", file: "scene.ts", line: 1, column: 1, code, message },
    ] });
    if (compiling >= 2) return failure("compile_busy", "The scene compiler is busy. Retry shortly.");
    compiling++;
    try {
        const running = worker = new Worker(new URL("./program-compiler-worker.mjs", import.meta.url), {
            execArgv: [], workerData: input,
            resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
        });
        return await new Promise<ProgramCompilation>((resolve) => {
            timer = setTimeout(() => resolve(failure("compile_timeout", "The scene compiler reached its time limit.")), 6_000);
            running.once("message", (result: ProgramCompilation) => {
                if (!result.program) resolve(result);
                else {
                    const checked = sceneProgram.safeParse(result.program);
                    resolve(checked.success ? { program: checked.data, diagnostics: [] } : failure("invalid_build", "The compiler returned an invalid build."));
                }
            });
            running.once("error", () => resolve(failure("compiler_failed", "The isolated scene compiler could not finish.")));
            running.once("exit", () => resolve(failure("compiler_exit", "The isolated scene compiler stopped before returning a build.")));
        });
    } finally {
        clearTimeout(timer);
        try { await worker?.terminate(); } finally { compiling--; }
    }
}

export async function saveMotionProgram(project: Parameters<typeof document>[0], raw: unknown) {
    const { commandId, expectedRevision, sceneId, input } = saveProgram.parse(raw);
    const current = document(project);
    if (current.revision !== expectedRevision && !db.prepare("SELECT 1 FROM edit_commands WHERE id=? AND project_id=?").get(commandId, project.id)) {
        fail(409, "The project changed. Reload before compiling a scene module.");
    }
    const scene = current.tracks.motion_graphics.find(({ id }) => id === sceneId);
    if (scene?.type !== "graph") fail(422, "Select a custom composition before attaching a scene module.");
    if (input.assets.some((ref) => !scene.assets.some(({ id, kind }) => id === ref.id && kind === ref.kind))) {
        fail(422, "A module asset is unavailable in the selected scene.");
    }
    const result = await compileMotionProgram(input);
    if (!result.program) return result;
    return { ...result, ...committed.parse(commit(project, { commandId, expectedRevision,
        operations: [{ tool: "update_motion_scene", params: { id: scene.id, patch: { params: { program: result.program } } } }],
    })) };
}
