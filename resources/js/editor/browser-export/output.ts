import type { StreamTargetChunk } from "mediabunny";
import { mp4Encoding } from "./capabilities";
import { exportDirectoryName, removeExportDirectory } from "./storage";

export type BrowserExportArtifact = {
    file: File;
    release: () => Promise<void>;
};

function storageError(error: unknown) {
    if (error instanceof DOMException) {
        if (error.name === "QuotaExceededError") {
            return new Error("There is not enough browser storage for this export. Free up space and try again.", { cause: error });
        }
        if (["NotAllowedError", "SecurityError", "NoModificationAllowedError"].includes(error.name)) {
            return new Error("The browser could not write the export file. Check storage permissions and try again.", { cause: error });
        }
    }
    return error;
}

export async function openBrowserOutput(
    seconds: number,
    muted: boolean,
    signal: AbortSignal,
    id: string = crypto.randomUUID(),
    onFinalizing?: () => Promise<void>,
    videoBitrate: number = mp4Encoding.videoBitrate,
) {
    const storage = navigator.storage;
    if (!storage?.getDirectory) throw new Error("This browser cannot save a local export file.");
    const estimate = await storage.estimate().catch(() => ({} as StorageEstimate));
    const bitsPerSecond = videoBitrate + (muted ? 0 : mp4Encoding.audioBitrate);
    const requiredBytes = Math.ceil(seconds * bitsPerSecond / 8) * 2 + 100 * 1024 * 1024;
    if (estimate.usage !== undefined && estimate.quota !== undefined &&
        estimate.quota - estimate.usage < requiredBytes) {
        throw storageError(new DOMException("Insufficient export storage", "QuotaExceededError"));
    }
    signal.throwIfAborted();
    const root = await storage.getDirectory().catch((error: unknown) => { throw storageError(error); });
    const name = exportDirectoryName("output", id);
    let directory: FileSystemDirectoryHandle | undefined;
    let file: FileSystemFileHandle | undefined;
    let writer: FileSystemWritableFileStream | undefined;
    let finalized = false;
    let failure: unknown;
    let released = false;

    async function release() {
        if (released) return;
        if (!finalized) await writer?.abort().catch(() => {});
        if (directory) await removeExportDirectory(root, "output", id);
        released = true;
    }

    try {
        directory = await root.getDirectoryHandle(name, { create: true });
        file = await directory.getFileHandle("video.mp4", { create: true });
        writer = await file.createWritable();
        signal.throwIfAborted();
    } catch (error) {
        await release().catch(() => {});
        throw storageError(error);
    }

    const writable = new WritableStream<StreamTargetChunk>({
        async write(chunk) {
            signal.throwIfAborted();
            try {
                await writer.write({ type: "write", position: chunk.position, data: chunk.data });
            } catch (error) {
                failure = storageError(error);
                throw failure;
            }
        },
        async close() {
            try {
                signal.throwIfAborted();
                await onFinalizing?.();
                signal.throwIfAborted();
                await writer.close();
                finalized = true;
            } catch (error) {
                failure = storageError(error);
                throw failure;
            }
        },
        async abort() {
            await writer.abort().catch(() => {});
        },
    });

    return {
        writable,
        release,
        getFailure: () => failure,
        async getArtifact(): Promise<BrowserExportArtifact> {
            if (!finalized) throw new Error("The export file did not finish saving.");
            const saved = await file.getFile();
            if (!saved.size) throw new Error("The export produced an empty MP4.");
            return { file: saved, release };
        },
    };
}
