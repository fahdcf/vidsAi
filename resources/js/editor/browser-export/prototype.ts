import { documentSchema, type Document } from "@vidsai/contracts";
import { renderBrowserMp4 } from "./render";
import { inspectBrowserMedia, type BrowserMediaKind } from "./inspect-media";

const fixtureInput = document.querySelector<HTMLInputElement>("#fixture")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const cancelButton = document.querySelector<HTMLButtonElement>("#cancel")!;
const status = document.querySelector("#status")!;
const download = document.querySelector<HTMLAnchorElement>("#download")!;
let active: AbortController | undefined;

fixtureInput.addEventListener("change", () => {
    exportButton.disabled = !fixtureInput.files?.length;
});

cancelButton.addEventListener("click", () => active?.abort());

exportButton.addEventListener("click", async () => {
    if (active) return;
    const controller = new AbortController();
    active = controller;
    const urls = new Map<File, string>();
    if (download.hasAttribute("href")) URL.revokeObjectURL(download.href);
    download.removeAttribute("href");
    download.hidden = true;
    exportButton.disabled = fixtureInput.disabled = true;
    cancelButton.disabled = false;
    status.textContent = "Checking local export support…";

    try {
        const files = Array.from(fixtureInput.files ?? []);
        if (files.reduce((bytes, file) => bytes + file.size, 0) > 10 * 1024 * 1024) {
            throw new Error("The prototype only accepts the small reference fixture.");
        }
        const manifest = files.find((file) => file.name === "project.json");
        if (!manifest) throw new Error("The fixture folder must contain project.json.");
        const doc = documentSchema.parse(JSON.parse(await manifest.text())) as Document;
        if (
            doc.project_id !== "iphone-export-reference" ||
            doc.width !== 360 || doc.height !== 640 ||
            doc.total_frames !== 90 || doc.fps !== 30
        ) {
            throw new Error("Select the three-second VidsAI reference fixture.");
        }
        const base = manifest.webkitRelativePath.slice(0, -"project.json".length);
        const inspected = new Map<File, BrowserMediaKind>();
        const resolve = async (src: string, kind: BrowserMediaKind) => {
            const file = files.find(({ webkitRelativePath }) => webkitRelativePath === base + src);
            if (!file) throw new Error(`Missing fixture asset: ${src}`);
            if (inspected.get(file) !== kind) {
                await inspectBrowserMedia(file, kind, controller.signal);
                inspected.set(file, kind);
            }
            let url = urls.get(file);
            if (!url) {
                url = URL.createObjectURL(file);
                urls.set(file, url);
            }
            return url;
        };
        for (const clip of doc.tracks.video) {
            clip.clip_url = await resolve(clip.clip_url, clip.media_type === "video" ? "video" : "image");
        }
        for (const track of doc.tracks.audio) track.url = await resolve(track.url, "audio");
        for (const overlay of doc.tracks.overlays) overlay.src = await resolve(overlay.src, "image");

        const mp4 = await renderBrowserMp4(doc, controller.signal, (progress) => {
            status.textContent = `Rendering locally… ${Math.round(progress * 100)}%`;
        });
        controller.signal.throwIfAborted();
        download.href = URL.createObjectURL(mp4);
        download.hidden = false;
        status.textContent = "Local MP4 ready.";
    } catch (error) {
        status.textContent = controller.signal.aborted
            ? "Export cancelled."
            : `Export failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
        urls.forEach((url) => URL.revokeObjectURL(url));
        cancelButton.disabled = true;
        exportButton.disabled = fixtureInput.disabled = false;
        active = undefined;
    }
});
