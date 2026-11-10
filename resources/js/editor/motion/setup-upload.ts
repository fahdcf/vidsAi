import { api } from "../api";
import type { MotionAudioSelection } from "./AudioPicker";
import type { MotionReferenceSelection } from "./ReferencePicker";
import { bindUploadedMotionReference, loadMotionReference, type SavedMotionReference } from "./reference-storage";
import { referenceAudioConversionVersion, type motionAssetProvenance } from "../../../../shared/motion/assets";
import type { z } from "zod";
import { analyzeMotionAudio, extractReferenceAudio } from "./audio-analysis";

export type MotionSetupRequirements = { reference: boolean; audio: boolean; logo: boolean;
    referenceAudio?: "auto" | "muted"; speechTiming?: boolean };
export type MotionSetupFiles = { reference: MotionReferenceSelection | null; audio: MotionAudioSelection | null; logo: File | null; muteReferenceAudio?: boolean };
export type MotionUploadProgress = { name: string; fraction: number | null };
export type MotionUploadReceipts = {
    reference?: { selection: MotionReferenceSelection; saved: SavedMotionReference };
    logo?: { file: File; id: string };
    audio?: { file: File; id: string };
    extracted?: { key: string; audio: (Pick<MotionAudioSelection, "file" | "cues" | "analysis"> & { trackId: number }) | null };
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
    receipts: MotionUploadReceipts, requirements: MotionSetupRequirements, seconds: number,
) {
    const base = `/projects/${projectId}`;
    async function add<T>(name: string, file: File, kind?: "image" | "audio", provenance: z.infer<typeof motionAssetProvenance> = { kind: "imported" }) {
        const form = new FormData();
        form.append("file", file);
        if (kind) {
            form.append("kind", kind);
            form.append("provenance", JSON.stringify(provenance));
        }
        progress({ name, fraction: 0 });
        return upload<T>(base + (kind ? "/motion-assets" : "/assets"), form, signal, (fraction) => progress({ name, fraction }));
    }
    let reference: SavedMotionReference | null = null;
    if (files.reference) {
        if (receipts.reference?.selection === files.reference) reference = receipts.reference.saved;
        else {
            const { asset_id } = await add<{ asset_id: string }>("reference", files.reference.file);
            reference = await bindUploadedMotionReference(projectId, asset_id, files.reference, signal);
            receipts.reference = { selection: files.reference, saved: reference };
        }
    } else if (requirements.reference) {
        reference = await loadMotionReference(projectId, signal);
        if (!reference?.available) throw new Error("Choose the reference file to resume setup.");
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
    let selection: Pick<MotionAudioSelection, "file" | "cues" | "analysis"> | null = files.audio;
    let provenance: z.infer<typeof motionAssetProvenance> = { kind: "imported" };
    let referenceAudio: "silent" | "muted" | undefined;
    if (requirements.referenceAudio && !selection) {
        if (files.muteReferenceAudio || requirements.referenceAudio === "muted") referenceAudio = "muted";
        else if (reference?.metadata.interval) {
            const { start, end } = reference.metadata.interval;
            const clippedEnd = Math.min(end, start + seconds, 30);
            const key = JSON.stringify([reference.assetId, reference.metadata.sha256, start, clippedEnd, referenceAudioConversionVersion]);
            if (receipts.extracted?.key !== key) {
                progress({ name: "extracting reference audio", fraction: null });
                let source: Blob | undefined = files.reference?.file;
                if (!source) {
                    const response = await fetch(reference.url, { signal });
                    if (!response.ok) throw new Error("The saved reference could not be loaded. Choose it again to resume.");
                    source = await response.blob();
                }
                const result = await extractReferenceAudio(source, { start, end: clippedEnd }, signal);
                const extracted = result ? { ...result, ...await analyzeMotionAudio(result.file, seconds, signal) } : null;
                receipts.extracted = { key, audio: extracted };
            }
            const extracted = receipts.extracted.audio;
            selection = extracted;
            if (!extracted) referenceAudio = "silent";
            else provenance = { kind: "reference_derived", sourceId: reference.assetId, startSeconds: start, endSeconds: clippedEnd,
                audioExtraction: { sourceSha256: reference.metadata.sha256, trackId: extracted.trackId, conversionVersion: referenceAudioConversionVersion } };
        } else referenceAudio = "silent";
    }
    let audio = null;
    if (selection) {
        if (receipts.audio?.file !== selection.file) {
            receipts.audio = { file: selection.file, ...(await add<{ id: string }>("soundtrack", selection.file, "audio", provenance)) };
        }
        const cues = [...new Map(selection.cues.map(({ seconds, confidence, source }) =>
            [Math.floor(seconds * 30), { frame: Math.floor(seconds * 30), confidence, source }])).values()];
        audio = { id: receipts.audio.id, cues, analysis: selection.analysis };
    }
    progress({ name: "project setup", fraction: null });
    await api(`/motion-runs/${runId}/setup`, { referenceBindingId: reference?.bindingId ?? null, logoId, audio, referenceAudio }, "POST", signal);
}
