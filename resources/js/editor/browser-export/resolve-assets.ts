import { documentSchema, type Document } from "@vidsai/contracts";
import { inspectBrowserMedia, type BrowserMediaKind } from "./inspect-media";
import { browserRenderProfile, BrowserRenderProfileError, validateBrowserRenderProfile } from "./profile";
import { exportDirectoryName, removeExportDirectory } from "./storage";

type AssetRequest = {
    projectId: string;
    source: string;
    kind: BrowserMediaKind;
};

export type AssetResolverOptions = {
    readLocal?: (asset: AssetRequest, signal: AbortSignal) => Promise<Blob | null>;
    refreshUrl?: (asset: AssetRequest, signal: AbortSignal) => Promise<string | null>;
};

function remoteUrl(projectId: string, source: string) {
    const stableId = /^asset:([a-f0-9-]{36})$/i.exec(source)?.[1];
    if (stableId) return new URL(`/projects/${encodeURIComponent(projectId)}/assets/${stableId}`, location.origin);
    if (/^(local:|blob:)/i.test(source)) {
        throw new Error("Relink this local file before exporting.");
    }
    const url = new URL(source, location.origin);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
        throw new Error("The media address is unsupported.");
    }
    const privateRoute = /^\/projects\/(\d+)\/(?:voiceover|assets\/[a-f0-9-]{36})$/i.exec(url.pathname);
    if (privateRoute) {
        if (privateRoute[1] !== projectId) throw new Error("This asset belongs to a different project.");
        // Older snapshots can carry expired worker signatures or a previous app origin.
        // The current site's session authorizes this route.
        return new URL(url.pathname, location.origin);
    }
    url.hash = "";
    return url;
}

export async function resolveBrowserAssets(
    snapshot: Document,
    options: AssetResolverOptions,
    signal: AbortSignal,
    id: string = crypto.randomUUID(),
) {
    signal.throwIfAborted();
    const document = documentSchema.parse(structuredClone(snapshot)) as Document;
    const issues = validateBrowserRenderProfile(document);
    if (issues.length) throw new BrowserRenderProfileError(issues);

    const local = new Map<string, Blob | null>();
    const downloaded = new Map<string, File>();
    const objectUrls = new Map<Blob, string>();
    const inspected = new Map<Blob, Set<BrowserMediaKind>>();
    let totalBytes = 0;
    let root: FileSystemDirectoryHandle | undefined;
    let directory: FileSystemDirectoryHandle | undefined;
    const directoryName = exportDirectoryName("media", id);
    const { maxProjectSourceBytes, maxSourceBytes } = browserRenderProfile;

    const release = async () => {
        for (const url of objectUrls.values()) URL.revokeObjectURL(url);
        objectUrls.clear();
        local.clear();
        downloaded.clear();
        inspected.clear();
        if (root && directory) {
            await removeExportDirectory(root, "media", id);
            directory = undefined;
        }
    };

    function checkBytes(size: number) {
        if (size > maxSourceBytes) throw new Error("Each source file must be 100 MiB or smaller.");
        if (size + totalBytes > maxProjectSourceBytes) {
            throw new Error("Project source files must total 300 MiB or less.");
        }
    }

    async function download(asset: AssetRequest, url: URL): Promise<File> {
        const cached = downloaded.get(url.href);
        if (cached) return cached;
        if (!navigator.storage?.getDirectory) {
            throw new Error("This browser cannot store temporary source files. Try a supported browser.");
        }
        const downloadSignal = AbortSignal.any([signal, AbortSignal.timeout(120_000)]);
        const request = (address: URL) => fetch(address, {
            mode: "cors",
            credentials: "same-origin",
            cache: "no-store",
            signal: downloadSignal,
        });
        let response: Response;
        try {
            response = await request(url);
            if ([401, 403, 404, 410].includes(response.status) && options.refreshUrl) {
                await response.body?.cancel();
                const renewed = await options.refreshUrl(asset, downloadSignal);
                if (renewed) {
                    response = await request(remoteUrl(document.project_id, renewed));
                }
            }
        } catch (error) {
            signal.throwIfAborted();
            throw new Error("Could not download the media. Check the connection or replace the source.", { cause: error });
        }
        const body = response.body;
        if (!response.ok || !body) {
            await body?.cancel();
            throw new Error(`The media is unavailable or access expired (HTTP ${response.status}). Reopen the project or replace the source.`);
        }
        try {
            checkBytes(Number(response.headers.get("Content-Length") || 0));
            root ??= await navigator.storage.getDirectory();
            directory ??= await root.getDirectoryHandle(directoryName, { create: true });
            const entry = await directory.getFileHandle(String(downloaded.size), { create: true });
            const writer = await entry.createWritable();
            let bytes = 0;
            await body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
                transform(chunk, controller) {
                    bytes += chunk.byteLength;
                    checkBytes(bytes);
                    controller.enqueue(chunk);
                },
            })).pipeTo(writer, { signal: downloadSignal });
            const file = await entry.getFile();
            downloaded.set(url.href, file);
            return file;
        } catch (error) {
            if (!body.locked) await body.cancel().catch(() => {});
            throw error;
        }
    }

    async function resolve(source: string, kind: BrowserMediaKind, label: string) {
        const request = { projectId: document.project_id, source, kind };
        try {
            signal.throwIfAborted();
            if (!local.has(source)) local.set(source, await options.readLocal?.(request, signal) ?? null);
            const file = local.get(source) ?? await download(request, remoteUrl(document.project_id, source));
            let url = objectUrls.get(file);
            if (!url) {
                checkBytes(file.size);
                totalBytes += file.size;
            }
            const kinds = inspected.get(file) ?? new Set<BrowserMediaKind>();
            if (!kinds.has(kind)) {
                await inspectBrowserMedia(file, kind, signal);
                kinds.add(kind);
                inspected.set(file, kinds);
            }
            if (!url) {
                url = URL.createObjectURL(file);
                objectUrls.set(file, url);
            }
            return url;
        } catch (error) {
            signal.throwIfAborted();
            throw new Error(`${label}: ${error instanceof Error ? error.message : "Media could not be prepared."}`, { cause: error });
        }
    }

    try {
        for (const [index, clip] of document.tracks.video.entries()) {
            clip.clip_url = await resolve(clip.clip_url, clip.media_type === "video" ? "video" : "image", `Clip ${index + 1}`);
        }
        for (const [index, track] of document.tracks.audio.entries()) {
            track.url = await resolve(track.url, "audio", `Audio track ${index + 1}`);
        }
        for (const [index, overlay] of document.tracks.overlays.entries()) {
            overlay.src = await resolve(overlay.src, "image", `Overlay ${index + 1}`);
        }
        signal.throwIfAborted();
        return { document, release };
    } catch (error) {
        await release().catch(() => {});
        throw error;
    }
}
