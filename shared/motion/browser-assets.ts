import { motionFontFamilies, type ReadyMotionAssets } from "./render";
import type { MotionScene } from "./schema";
import { motionAssetByteLimit, parseMotionVectors, type MotionAssetFiles, type MotionVectors } from "./assets";

const bundled = {
    archivo_black: { name: "VidsAI Archivo Black", url: "/motion-fonts/ArchivoBlack-Regular.ttf" },
    space_mono: { name: "VidsAI Space Mono", url: "/motion-fonts/SpaceMono-Regular.ttf" },
};
const loading = new Map<keyof typeof bundled, Promise<void>>();

export async function prepareMotionFont(scene: MotionScene, signal: AbortSignal): Promise<ReadyMotionAssets> {
    signal.throwIfAborted();
    await Promise.all((Object.keys(bundled) as (keyof typeof bundled)[]).map((key) => {
        let pending = loading.get(key);
        if (!pending) {
            const { name, url } = bundled[key];
            pending = new FontFace(name, `url("${url}")`).load().then((font) => {
                document.fonts.add(font);
            }).catch((error) => {
                loading.delete(key);
                throw error;
            });
            loading.set(key, pending);
        }
        return pending;
    }));
    signal.throwIfAborted();
    return { fontFamily: motionFontFamilies[scene.font] };
}

export async function prepareMotionSceneAssets(
    scene: MotionScene, projectId: string, signal: AbortSignal, preloaded?: MotionAssetFiles,
): Promise<ReadyMotionAssets & { release: () => void }> {
    const ready = await prepareMotionFont(scene, signal);
    const vectors: Record<string, MotionVectors> = {};
    const fonts: FontFace[] = [];
    const release = () => {
        for (const face of fonts.splice(0)) document.fonts.delete(face);
    };
    try {
        for (const ref of scene.assets) {
            if (ref.kind === "image") continue;
            const saved = preloaded?.[ref.id];
            const file = saved ? null : await readAsset(projectId, ref, signal);
            if (ref.kind === "vectors") {
                if (saved?.kind === "vectors") vectors[ref.id] = saved.data;
                else if (file) vectors[ref.id] = parseMotionVectors(await file.text());
                else throw new Error("The vector asset type is incompatible.");
            } else if (ref.id === scene.fontAssetId) {
                const font = saved?.kind === "font" ? saved.file : file;
                if (!font) throw new Error("The project font is unavailable.");
                const family = `VidsAI Project ${ref.id}`;
                const face = await new FontFace(family, await font.arrayBuffer()).load();
                signal.throwIfAborted();
                document.fonts.add(face);
                fonts.push(face);
                ready.fontFamily = `"${family}", ${ready.fontFamily}`;
            }
        }
        signal.throwIfAborted();
        return { ...ready, vectors, release };
    } catch (error) {
        release();
        throw error;
    }
}

async function readAsset(projectId: string, ref: MotionScene["assets"][number], signal: AbortSignal) {
    const response = await fetch(`/projects/${encodeURIComponent(projectId)}/assets/${ref.id}`, {
        signal, credentials: "same-origin",
    });
    const max = motionAssetByteLimit[ref.kind];
    if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > max) {
        await response.body?.cancel();
        throw new Error("A project motion asset is unavailable or exceeds its limit.");
    }
    let size = 0;
    const limited = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
            size += chunk.byteLength;
            if (size > max) throw new Error("A project motion asset exceeds its limit.");
            controller.enqueue(chunk);
        },
    }));
    const file = await new Response(limited).blob();
    signal.throwIfAborted();
    return file;
}
