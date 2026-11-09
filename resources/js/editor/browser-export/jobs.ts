import { documentSchema, type Document } from "@vidsai/contracts";
import {
    readBrowserExport, saveBrowserExport,
    type BrowserExportJob, type BrowserExportScope, type BrowserExportState,
} from "./job-store";
import type { AssetResolverOptions, resolveBrowserAssets } from "./resolve-assets";
import type { renderBrowserMp4 } from "./render";
import { browserExportCanvas } from "./profile";
import { exportDirectoryName, removeExportDirectory } from "./storage";

const lockName = "vidsai-browser-export";
const activeStates: BrowserExportState[] = ["preparing", "rendering", "finalizing"];
const interruptionMessage = "Export was interrupted. Retry from the saved version.";
const timeoutMs = 15 * 60_000;
const stallMs = 60_000;

export type BrowserExportProgress = {
    state: BrowserExportState;
    progress: number;
    revision: number;
    error?: string;
};

function validateScope(scope: BrowserExportScope) {
    if (!scope.accountId || !scope.projectId) throw new Error("A project and account are required to export.");
}

function exportLocks() {
    if (!navigator.locks) throw new Error("This browser cannot coordinate local exports across tabs.");
    return navigator.locks;
}

async function cleanupJob(job: BrowserExportJob) {
    if (!navigator.storage?.getDirectory) return false;
    try {
        const root = await navigator.storage.getDirectory();
        await removeExportDirectory(root, "media", job.id);
        if (job.output?.id !== job.id) await removeExportDirectory(root, "output", job.id);
        if (job.supersededOutputId && job.supersededOutputId !== job.output?.id) {
            await removeExportDirectory(root, "output", job.supersededOutputId);
            delete job.supersededOutputId;
            await saveBrowserExport(job);
        }
        return true;
    } catch (error) {
        console.warn("Could not clean up browser export files", error);
        return false;
    }
}

async function recover(scope: BrowserExportScope, requireCleanup = false) {
    const job = await readBrowserExport(scope);
    if (!job) return;
    if (activeStates.includes(job.state)) {
        job.state = "interrupted";
        job.error = interruptionMessage;
        await saveBrowserExport(job);
    }
    if (!await cleanupJob(job) && requireCleanup) {
        throw new Error("The browser could not clean up the previous export. Check storage permissions and try again.");
    }
    return job;
}

export async function loadBrowserExport(scope: BrowserExportScope) {
    validateScope(scope);
    return exportLocks().request(lockName, { ifAvailable: true }, (lock) =>
        lock ? recover(scope) : readBrowserExport(scope),
    );
}

export async function getBrowserExportFile(scope: BrowserExportScope, id: string) {
    validateScope(scope);
    const job = await readBrowserExport(scope);
    if (job?.output?.id !== id) throw new Error("No saved export is available for this project.");
    try {
        const root = await navigator.storage.getDirectory();
        const directory = await root.getDirectoryHandle(exportDirectoryName("output", id));
        const file = await (await directory.getFileHandle("video.mp4")).getFile();
        if (file.size !== job.output.size) throw new Error("The saved file changed.");
        return file;
    } catch (error) {
        throw new Error("The saved export is no longer on this device. Export the project again.", { cause: error });
    }
}

export async function runBrowserExport(
    scope: BrowserExportScope,
    snapshot: Document,
    options: AssetResolverOptions,
    externalSignal: AbortSignal,
    onUpdate: (status: BrowserExportProgress) => void,
) {
    validateScope(scope);
    externalSignal.throwIfAborted();
    const savedSnapshot = documentSchema.parse(structuredClone(snapshot)) as Document;
    if (savedSnapshot.project_id !== scope.projectId) throw new Error("The export snapshot belongs to another project.");
    const sources = [
        ...savedSnapshot.tracks.video.map((clip) => clip.clip_url),
        ...savedSnapshot.tracks.audio.map((track) => track.url),
        ...savedSnapshot.tracks.overlays.map((overlay) => overlay.src),
    ];
    if (sources.some((source) => /^blob:/i.test(source.trimStart()))) {
        throw new Error("Relink temporary media before saving an export.");
    }

    return exportLocks().request(lockName, { ifAvailable: true }, async (lock) => {
        if (!lock) throw new Error("An export is already running in another tab. Try again when it finishes.");
        externalSignal.throwIfAborted();
        const previous = await recover(scope, true);
        const job: BrowserExportJob = {
            ...scope,
            id: crypto.randomUUID(),
            snapshot: savedSnapshot,
            state: "preparing",
            output: previous?.output,
            supersededOutputId: previous?.supersededOutputId,
        };
        await saveBrowserExport(job);

        const interrupted = new AbortController();
        const stalled = new AbortController();
        const deadline = AbortSignal.timeout(timeoutMs);
        const signal = AbortSignal.any([externalSignal, interrupted.signal, stalled.signal, deadline]);
        const leave = () => interrupted.abort();
        window.addEventListener("pagehide", leave, { once: true });
        let watchdog: ReturnType<typeof setTimeout> | undefined;
        let progress = 0;
        let prepared: Awaited<ReturnType<typeof resolveBrowserAssets>> | undefined;
        let artifact: Awaited<ReturnType<typeof renderBrowserMp4>> | undefined;
        let persistedOutput = false;
        const emit = () => {
            try {
                onUpdate({ state: job.state, progress, revision: savedSnapshot.revision, error: job.error });
            } catch (error) {
                console.warn("Could not show browser export progress", error);
            }
        };
        const setState = async (state: BrowserExportState) => {
            job.state = state;
            await saveBrowserExport(job);
            emit();
        };
        const resetWatchdog = () => {
            clearTimeout(watchdog);
            watchdog = setTimeout(() => stalled.abort(), stallMs);
        };

        try {
            emit();
            const [assets, renderer] = await Promise.all([import("./resolve-assets"), import("./render")]);
            const canvas = browserExportCanvas(savedSnapshot);
            prepared = await assets.resolveBrowserAssets(savedSnapshot, options, signal, job.id, canvas);
            artifact = await renderer.renderBrowserMp4(prepared.document, signal, (next) => {
                if (next <= progress) return;
                progress = Math.min(1, next);
                resetWatchdog();
                emit();
            }, {
                id: job.id,
                canvas,
                motionAssets: prepared.motionAssets,
                onRendering: async () => {
                    await setState("rendering");
                    resetWatchdog();
                },
                onFinalizing: async () => {
                    resetWatchdog();
                    await setState("finalizing");
                },
            });
            signal.throwIfAborted();
            progress = 1;
            job.supersededOutputId = job.output?.id;
            job.output = { id: job.id, revision: savedSnapshot.revision, size: artifact.file.size };
            await setState("succeeded");
            persistedOutput = true;
            return { job, file: artifact.file };
        } catch (error) {
            job.output = previous?.output;
            job.supersededOutputId = previous?.supersededOutputId;
            if (interrupted.signal.aborted) {
                job.error = interruptionMessage;
                await setState("interrupted");
            } else if (externalSignal.aborted) {
                await setState("cancelled");
            } else {
                job.error = stalled.signal.aborted
                    ? "Export stopped making progress. Try again or shorten the timeline."
                    : deadline.aborted
                      ? "Export took too long. Try again or shorten the timeline."
                      : error instanceof Error ? error.message : "Export failed.";
                await setState("failed");
            }
            throw new Error(job.error ?? "Export cancelled.", { cause: error });
        } finally {
            clearTimeout(watchdog);
            window.removeEventListener("pagehide", leave);
            await prepared?.release().catch(() => {});
            if (!persistedOutput) await artifact?.release().catch(() => {});
            await cleanupJob(job);
        }
    });
}
