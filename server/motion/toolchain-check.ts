import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { motionRendererVersion } from "../../shared/motion/registry";
import { motionCompilerVersion, motionProgramRendererVersion, motionProgramVersion } from "../../shared/motion/scene-program";
import { motionThreeCapability } from "../../shared/motion/three-scene";

const root = new URL("../../", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root));
const json = <T>(file: string): T => JSON.parse(read(file).toString("utf8")) as T;

export function verifyMotionToolchain() {
    const manifest = json<{ fonts: string[]; fontHashes: Record<string, string>; sceneRuntime: {
        sdkVersion: number; rendererVersion: number; packages: Record<string, string>;
    } }>("motion-toolchain.json");
    const { sdkVersion, rendererVersion, packages } = manifest.sceneRuntime;
    const locked = json<{ packages: Record<string, { version: string }> }>("package-lock.json").packages;
    const dependencies = json<{ dependencies: Record<string, string> }>("package.json").dependencies;
    if (sdkVersion !== motionProgramVersion || rendererVersion !== motionRendererVersion || rendererVersion !== motionProgramRendererVersion ||
        packages.typescript !== motionCompilerVersion || `three@${packages.three}` !== motionThreeCapability.engine ||
        packages["quickjs-emscripten-core"] !== packages["@jitl/quickjs-wasmfile-release-sync"]) {
        throw new Error("The motion SDK, compiler and renderer versions do not match the resource manifest.");
    }
    for (const [name, version] of Object.entries(packages)) {
        const installed = json<{ version: string }>(`node_modules/${name}/package.json`);
        if (dependencies[name] !== version || locked[`node_modules/${name}`]?.version !== version || installed.version !== version) {
            throw new Error(`The motion toolchain requires ${name} ${version}. Run npm ci.`);
        }
    }
    for (const font of manifest.fonts) {
        const hash = createHash("sha256").update(read(`public/${font}`)).digest("hex");
        if (hash !== manifest.fontHashes[font]) throw new Error(`The bundled motion font ${font} failed verification.`);
    }
}
