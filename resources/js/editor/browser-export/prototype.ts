import { documentSchema, type Document } from "@vidsai/contracts";
import { renderBrowserMp4 } from "./render";
import { resolveBrowserAssets } from "./resolve-assets";

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
    let assets: Awaited<ReturnType<typeof resolveBrowserAssets>> | undefined;
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
        assets = await resolveBrowserAssets(doc, {
            readLocal: async ({ source }) => {
                const file = files.find(({ webkitRelativePath }) => webkitRelativePath === base + source);
                if (!file) throw new Error(`Missing fixture asset: ${source}`);
                return file;
            },
        }, controller.signal);

        const mp4 = await renderBrowserMp4(assets.document, controller.signal, (progress) => {
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
        await assets?.release().catch((error: unknown) => console.warn("Could not release export media", error));
        cancelButton.disabled = true;
        exportButton.disabled = fixtureInput.disabled = false;
        active = undefined;
    }
});
