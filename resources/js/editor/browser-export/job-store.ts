import type { Document } from "@vidsai/contracts";

export type BrowserExportScope = { accountId: string; projectId: string };
export type BrowserExportState =
    | "preparing" | "rendering" | "finalizing"
    | "succeeded" | "failed" | "cancelled" | "interrupted";

export type BrowserExportJob = BrowserExportScope & {
    id: string;
    snapshot: Document;
    state: BrowserExportState;
    error?: string;
    output?: { id: string; revision: number; size: number };
    supersededOutputId?: string;
};

const storeName = "latest-jobs";

async function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    if (!globalThis.indexedDB) throw new Error("This browser cannot save export recovery information.");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open("vidsai-browser-export", 1);
        open.onupgradeneeded = () => {
            open.result.createObjectStore(storeName, { keyPath: ["accountId", "projectId"] });
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
    });
    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const request = run(transaction.objectStore(storeName));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => reject(transaction.error ?? request.error);
        });
    } finally {
        db.close();
    }
}

export function readBrowserExport(scope: BrowserExportScope): Promise<BrowserExportJob | undefined> {
    return withStore("readonly", (store) => store.get([scope.accountId, scope.projectId]));
}

export async function saveBrowserExport(job: BrowserExportJob) {
    await withStore("readwrite", (store) => store.put(job));
}
