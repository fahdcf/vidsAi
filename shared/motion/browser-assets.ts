import { motionFontFamilies, type ReadyMotionAssets } from "./render";
import type { MotionScene } from "./schema";
import { motionAssetByteLimit, parseMotionVectors, type MotionAssetFiles, type MotionVectors } from "./assets";
import { graphAssetRefs } from "./graph";
import { imageDimensions } from "./image-dimensions";
import type { BrowserMotionProgram } from "./runtime/browser-program";

const bundled = {
    archivo_black: { name: "VidsAI Archivo Black", url: "/motion-fonts/ArchivoBlack-Regular.ttf" },
    space_mono: { name: "VidsAI Space Mono", url: "/motion-fonts/SpaceMono-Regular.ttf" },
};
const styledMono = [
    { name: bundled.space_mono.name, url: "/motion-fonts/SpaceMono-Bold.ttf", weight: "700", style: "normal" },
    { name: bundled.space_mono.name, url: "/motion-fonts/SpaceMono-Italic.ttf", weight: "400", style: "italic" },
    { name: bundled.space_mono.name, url: "/motion-fonts/SpaceMono-BoldItalic.ttf", weight: "700", style: "italic" },
];
const loading = new Map<string, Promise<void>>();

export async function prepareMotionFont(scene: MotionScene, signal: AbortSignal): Promise<ReadyMotionAssets> {
    signal.throwIfAborted();
    const faces: { name: string; url: string; weight?: string; style?: string }[] = Object.values(bundled);
    if (scene.type === "graph") faces.push(...styledMono);
    await Promise.all(faces.map(({ name, url, weight, style }) => {
        let pending = loading.get(url);
        if (!pending) {
            pending = new FontFace(name, `url("${url}")`, { weight, style }).load().then((font) => {
                document.fonts.add(font);
            }).catch((error) => {
                loading.delete(url);
                throw error;
            });
            loading.set(url, pending);
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
    const images: Record<string, ImageBitmap> = {};
    const imageIds = new Set(scene.type === "graph" ? [...graphAssetRefs(scene.params.layers), ...(scene.params.program?.assets ?? [])]
        .filter(({ kind }) => kind === "image").map(({ id }) => id) : []);
    let program: BrowserMotionProgram | undefined;
    const fonts: FontFace[] = [];
    const release = () => {
        for (const face of fonts.splice(0)) document.fonts.delete(face);
        for (const [id, image] of Object.entries(images)) { image.close(); delete images[id]; }
        program?.close();
    };
    try {
        for (const ref of scene.assets) {
            if (ref.kind === "image" && !imageIds.has(ref.id)) continue;
            const saved = preloaded?.[ref.id];
            const file = saved ? null : await readAsset(projectId, ref, signal);
            if (ref.kind === "image") {
                const image = saved?.kind === "image" ? saved.file : file;
                if (!image || !image.size || image.size > motionAssetByteLimit.image) throw new Error("The graph image is unavailable or too large.");
                const header = new Uint8Array(await image.slice(0, 256 * 1024).arrayBuffer());
                const { width, height } = imageDimensions(header, image.size);
                if (!width || !height || Math.max(width, height) > 4096 || width * height > 4_000_000) throw new Error("The graph image exceeds the pixel budget.");
                signal.throwIfAborted();
                images[ref.id] = await createImageBitmap(image);
                signal.throwIfAborted();
            } else if (ref.kind === "vectors") {
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
        if (scene.type === "graph" && scene.params.program) {
            const { prepareBrowserProgram } = await import("./runtime/browser-program");
            program = await prepareBrowserProgram(scene.params.program, scene.params.programValues, scene.end_frame - scene.start_frame, signal);
        }
        return { ...ready, images, vectors, program, release };
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
