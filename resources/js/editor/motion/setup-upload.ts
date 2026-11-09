import { api } from "../api";
import type { MotionAudioSelection } from "./AudioPicker";
import type { MotionReferenceSelection } from "./ReferencePicker";
import { bindUploadedMotionReference } from "./reference-storage";

export type MotionSetupRequirements = { reference: boolean; audio: boolean; logo: boolean };
export type MotionSetupFiles = { reference: MotionReferenceSelection | null; audio: MotionAudioSelection | null; logo: File | null };
export type MotionUploadProgress = { name: string; fraction: number | null };
export type MotionUploadReceipts = {
    reference?: { selection: MotionReferenceSelection; id: string };
    logo?: { file: File; id: string };
    audio?: { file: File; id: string };
};

function upload<T>(url: string, form: FormData, signal: AbortSignal, progress: (fraction: number | null) => void) {
    signal.throwIfAborted();
    return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();
        const cleanup = () => signal.removeEventListener("abort", abort);
        xhr.open("POST", url);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("X-CSRF-TOKEN", document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "");
        xhr.responseType = "json";
        xhr.upload.onprogress = (event) => progress(event.lengthComputable ? event.loaded / event.total : null);
        xhr.onload = () => {
            cleanup();
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as T);
            else reject(new Error(xhr.response?.message || "The attachment upload could not be completed."));
        };
        xhr.onerror = () => { cleanup(); reject(new Error("The connection dropped during upload.")); };
        xhr.onabort = () => { cleanup(); reject(signal.reason ?? new DOMException("Upload cancelled.", "AbortError")); };
        signal.addEventListener("abort", abort, { once: true });
        xhr.send(form);
    });
}

export async function uploadMotionSetup(
    projectId: number, runId: string, files: MotionSetupFiles, signal: AbortSignal, progress: (value: MotionUploadProgress) => void,
    receipts: MotionUploadReceipts,
) {
    const base = `/projects/${projectId}`;
    async function add<T>(name: string, file: File, kind?: "image" | "audio") {
        const form = new FormData();
        form.append("file", file);
        if (kind) {
            form.append("kind", kind);
            form.append("provenance", JSON.stringify({ kind: "imported" }));
        }
        progress({ name, fraction: 0 });
        return upload<T>(base + (kind ? "/motion-assets" : "/assets"), form, signal, (fraction) => progress({ name, fraction }));
    }
    let referenceBindingId = null;
    if (files.reference) {
        if (receipts.reference?.selection === files.reference) referenceBindingId = receipts.reference.id;
        else {
            const { asset_id } = await add<{ asset_id: string }>("reference", files.reference.file);
            referenceBindingId = (await bindUploadedMotionReference(projectId, asset_id, files.reference, signal))?.bindingId ?? null;
            if (referenceBindingId) receipts.reference = { selection: files.reference, id: referenceBindingId };
        }
    }
    let logoId = null;
    if (files.logo) {
        if (receipts.logo?.file !== files.logo) {
            const { inspectBrowserMedia } = await import("../browser-export/inspect-media");
            await inspectBrowserMedia(files.logo, "image", signal);
            receipts.logo = { file: files.logo, ...(await add<{ id: string }>("logo", files.logo, "image")) };
        }
        logoId = receipts.logo.id;
    }
    let audio = null;
    if (files.audio) {
        if (receipts.audio?.file !== files.audio.file) {
            receipts.audio = { file: files.audio.file, ...(await add<{ id: string }>("soundtrack", files.audio.file, "audio")) };
        }
        const cues = [...new Map(files.audio.cues.map(({ seconds, confidence, source }) =>
            [Math.floor(seconds * 30), { frame: Math.floor(seconds * 30), confidence, source }])).values()];
        audio = { id: receipts.audio.id, cues };
    }
    progress({ name: "project setup", fraction: null });
    await api(`/motion-runs/${runId}/setup`, { referenceBindingId, logoId, audio }, "POST", signal);
}
