type ExportDirectory = "media" | "output";

export function exportDirectoryName(kind: ExportDirectory, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid browser export ID.");
    return `vidsai-export-${kind}-${id}`;
}

export async function removeExportDirectory(
    root: FileSystemDirectoryHandle,
    kind: ExportDirectory,
    id: string,
) {
    try {
        await root.removeEntry(exportDirectoryName(kind, id), { recursive: true });
    } catch (error) {
        if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
    }
}
