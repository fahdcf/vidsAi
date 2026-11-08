import { documentSchema, type Document } from "@vidsai/contracts";
import { getBrowserExportFile, loadBrowserExport, runBrowserExport } from "./jobs";

const fixtureInput = document.querySelector<HTMLInputElement>("#fixture")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const cancelButton = document.querySelector<HTMLButtonElement>("#cancel")!;
const status = document.querySelector("#status")!;
const download = document.querySelector<HTMLAnchorElement>("#download")!;
let active: AbortController | undefined;
const scope = { accountId: "development-fixture", projectId: "iphone-export-reference" };

function setDownload(file?: File) {
    if (download.hasAttribute("href")) URL.revokeObjectURL(download.href);
    download.removeAttribute("href");
    download.hidden = !file;
    if (file) download.href = URL.createObjectURL(file);
}

async function restoreExport(updateStatus: boolean) {
    const saved = await loadBrowserExport(scope);
    if (!saved || active) return;
    if (updateStatus) {
        if (saved.state === "succeeded") status.textContent = "Local MP4 ready.";
        if (["failed", "cancelled", "interrupted"].includes(saved.state)) {
            status.textContent = "Select the fixture folder to retry the saved export.";
            exportButton.textContent = "Retry export";
        }
    }
    if (saved.output) {
        const file = await getBrowserExportFile(scope, saved.output.id);
        if (!active) setDownload(file);
    }
}

void restoreExport(true).catch((error: unknown) => {
    if (!active && error instanceof Error) status.textContent = error.message;
});

fixtureInput.addEventListener("change", () => {
    exportButton.disabled = !fixtureInput.files?.length;
});

cancelButton.addEventListener("click", () => active?.abort());

exportButton.addEventListener("click", async () => {
    if (active) return;
    const controller = new AbortController();
    active = controller;
    setDownload();
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
        const selected = documentSchema.parse(JSON.parse(await manifest.text())) as Document;
        if (
            selected.project_id !== scope.projectId ||
            selected.width !== 360 || selected.height !== 640 ||
            selected.total_frames !== 90 || selected.fps !== 30
        ) {
            throw new Error("Select the three-second VidsAI reference fixture.");
        }
        const base = manifest.webkitRelativePath.slice(0, -"project.json".length);
        const saved = await loadBrowserExport(scope);
        const retry = saved && ["failed", "cancelled", "interrupted"].includes(saved.state);
        const { file } = await runBrowserExport(scope, retry ? saved.snapshot : selected, {
            readLocal: async ({ source }) => {
                const file = files.find(({ webkitRelativePath }) => webkitRelativePath === base + source);
                if (!file) throw new Error(`Missing fixture asset: ${source}`);
                return file;
            },
        }, controller.signal, ({ state, progress }) => {
            if (state === "rendering") status.textContent = `Rendering locally… ${Math.round(progress * 100)}%`;
            if (state === "finalizing") status.textContent = "Saving MP4…";
        });
        setDownload(file);
        exportButton.textContent = "Export MP4";
        status.textContent = "Local MP4 ready.";
    } catch (error) {
        status.textContent = controller.signal.aborted
            ? "Export cancelled."
            : `Export failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
        cancelButton.disabled = true;
        exportButton.disabled = fixtureInput.disabled = false;
        active = undefined;
        if (download.hidden) await restoreExport(false).catch(() => {});
    }
});
