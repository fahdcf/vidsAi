import { parentPort, workerData } from "node:worker_threads";
import { tsImport } from "tsx/esm/api";

const { compileSceneProgram } = await tsImport("./program-compiler.ts", import.meta.url);
parentPort?.postMessage(compileSceneProgram(workerData));
