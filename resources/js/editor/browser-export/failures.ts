export function browserExportFailure(error: unknown) {
    let current = error;
    for (let depth = 0; depth < 4 && current instanceof Error; depth++, current = current.cause) {
        if (current.name === "QuotaExceededError") return "There is not enough browser storage for this export. Free up space and retry.";
        if (["NotAllowedError", "SecurityError", "NoModificationAllowedError"].includes(current.name)) {
            return "The browser could not access export storage or media. Check permissions and retry.";
        }
        if (["EncodingError", "OperationError"].includes(current.name) ||
            /(?:graphics|encoder|device|context).{0,24}(?:lost|reset|reclaimed)/i.test(current.message)) {
            return "The browser lost the video encoder or graphics context. Retry the saved export.";
        }
    }
    return error instanceof Error ? error.message : "Export failed.";
}
