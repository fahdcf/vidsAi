import type { BrowserMotionInput, BrowserMotionReference, BrowserMotionTask } from "../../../../shared/motion/browser-tools";
import { isFollowupSourceTime, motionEvidenceFramesPerSheet, motionPreviewFramesPerSheet } from "../../../../shared/motion/browser-tools";
import type { Document } from "../../../../shared/contracts";
import { prepareMotionSceneAssets } from "../../../../shared/motion/browser-assets";
import { motionContinuityTarget } from "../../../../shared/motion/continuity";
import { drawMotionFrame } from "../../../../shared/motion/render";
import { soundtrackLevelAt } from "../../../../shared/motion/time-map";
import { api } from "../api";
import { analyzeReferenceFrames } from "./reference-analysis";
import { findReferenceCrop, referenceCropCanvas } from "./reference-crop";
import { sampleMotionReference, type MotionReferenceFrame } from "./reference-media";
import { createReferenceSheet, refineReferenceTimes, sparseReferenceTimes } from "./reference-sheets";

async function sha256(bytes: ArrayBuffer) {
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function encodeEvidence(image: Blob, limit: number, signal: AbortSignal) {
    const buffer = await image.arrayBuffer();
    if (buffer.byteLength > limit) throw new Error("A browser evidence image exceeds its size limit.");
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    const result = { mime: "image/jpeg" as const, base64: btoa(binary), sha256: await sha256(buffer) };
    signal.throwIfAborted();
    return result;
}

async function images(frames: readonly MotionReferenceFrame[], signal: AbortSignal, size = motionEvidenceFramesPerSheet) {
    const results = [];
    for (let index = 0; index < frames.length; index += size) {
        const sheet = await createReferenceSheet(frames.slice(index, index + size), signal);
        results.push(await encodeEvidence(sheet, 600_000, signal));
    }
    return results;
}

async function captureDetails(input: Extract<BrowserMotionInput, { tool: "reference_detail" }>, signal: AbortSignal) {
    const { reference, samples } = input;
    const source = await referenceFile(reference, signal);
    try {
        let frames: Pick<MotionReferenceFrame, "image" | "detail">[];
        if (reference.metadata.kind === "video") {
            const times = [...new Set(samples.map(({ time }) => time))].sort((a, b) => a - b);
            const captured = await sampleMotionReference(source, times.map((time) => time + 0.00001), signal, { maxEdge: 960, detailCrop: true });
            if (captured.some(({ sourceTime }, index) => Math.abs(sourceTime - times[index]) > 0.002)) {
                throw new Error("The detailed frame timestamp changed.");
            }
            frames = samples.map(({ time }) => captured[times.indexOf(time)]);
        } else {
            const bitmap = await createImageBitmap(source);
            try {
                const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
                const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
                const context = canvas.getContext("2d");
                if (!context) throw new Error("Reference image drawing is unavailable.");
                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const image = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
                const bounds = findReferenceCrop(canvas);
                let detail: MotionReferenceFrame["detail"];
                if (bounds) {
                    const width = bitmap.width * bounds.width, height = bitmap.height * bounds.height;
                    const crop = referenceCropCanvas(width, height);
                    const ctx = crop.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(bitmap, bitmap.width * bounds.left, bitmap.height * bounds.top, width, height, 0, 0, crop.width, crop.height);
                        detail = { bounds, image: await crop.convertToBlob({ type: "image/jpeg", quality: 0.7 }) };
                    }
                }
                frames = samples.map(() => ({ image, detail }));
            } finally { bitmap.close(); }
        }
        const images = await Promise.all(frames.map(({ image }) => encodeEvidence(image, 300_000, signal)));
        const crops = await Promise.all(frames.flatMap(({ detail }, index) => detail && detail.image.size <= 75_000 ? [
            encodeEvidence(detail.image, 75_000, signal).then((image) => ({ ...samples[index], bounds: detail.bounds, image })),
        ] : []));
        return { bindingId: reference.bindingId, samples, images, crops };
    } catch {
        signal.throwIfAborted();
        return { bindingId: reference.bindingId, samples: [], images: [] };
    }
}

async function referenceFile(reference: BrowserMotionReference, signal: AbortSignal) {
    const response = await fetch(reference.url, { signal, credentials: "same-origin" });
    const max = 100 * 1024 * 1024;
    if (!response.ok || !response.body || Number(response.headers.get("content-length")) > max) {
        await response.body?.cancel();
        throw new Error("The selected reference needs to be relinked.");
    }
    let size = 0;
    const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
            size += chunk.byteLength;
            if (size > max) throw new Error("The selected reference exceeds its size limit.");
            controller.enqueue(chunk);
        },
    }));
    const bytes = await new Response(body).arrayBuffer();
    if (await sha256(bytes) !== reference.metadata.sha256) throw new Error("The selected reference file changed.");
    return new Blob([bytes]);
}

async function captureFollowups(input: Extract<BrowserMotionInput, { tool: "reference_followup" }>, signal: AbortSignal) {
    const { reference, requests } = input;
    const source = await referenceFile(reference, signal);
    const followups = [];
    const images = [];
    for (const { sceneId, time, bounds, interval } of requests) {
        try {
            let image: Blob;
            let sourceTime = 0;
            if (reference.metadata.kind === "video") {
                const [frame] = await sampleMotionReference(source, [time], signal, { crop: bounds, maxEdge: bounds ? 640 : 960 });
                ({ image, sourceTime } = frame);
            } else {
                if (!bounds) continue;
                const bitmap = await createImageBitmap(source);
                try {
                    const width = bitmap.width * bounds.width, height = bitmap.height * bounds.height;
                    const canvas = referenceCropCanvas(width, height);
                    const context = canvas.getContext("2d");
                    if (!context) continue;
                    context.drawImage(bitmap, bitmap.width * bounds.left, bitmap.height * bounds.top, width, height, 0, 0, canvas.width, canvas.height);
                    image = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
                } finally { bitmap.close(); }
            }
            if (!isFollowupSourceTime(sourceTime, time, interval)) continue;
            images.push(await encodeEvidence(image, 300_000, signal));
            followups.push({ sceneId, time, bounds, sourceTime });
        } catch {
            signal.throwIfAborted();
        }
    }
    return { bindingId: reference.bindingId, followups, images };
}

async function captureReference(reference: BrowserMotionReference, signal: AbortSignal) {
    const source = await referenceFile(reference, signal);
    const { interval } = reference.metadata;
    let frames: MotionReferenceFrame[];
    let candidateChanges: Awaited<ReturnType<typeof analyzeReferenceFrames>>["changes"] = [];
    if (interval) {
        const sparse = await sampleMotionReference(source, sparseReferenceTimes(interval), signal);
        const { cuts, changes } = await analyzeReferenceFrames(sparse, signal);
        candidateChanges = changes;
        const ranked = [...cuts].sort((a, b) => b.score - a.score);
        for (const change of changes) {
            if (ranked.every(({ time }) => Math.abs(time - change.time) >= 0.3)) ranked.push(change);
        }
        const refinedTimes = refineReferenceTimes(interval, ranked.map(({ time }) => time));
        const refined = refinedTimes.length ? await sampleMotionReference(source, refinedTimes, signal) : [];
        frames = [...new Map([...sparse, ...refined].map((item) => [Math.max(0, item.sourceTime), item])).values()]
            .sort((a, b) => a.sourceTime - b.sourceTime);
    } else {
        frames = [{ requestedTime: 0, sourceTime: 0, image: source }];
    }
    const { palette, cuts } = await analyzeReferenceFrames(frames, signal);
    return {
        bindingId: reference.bindingId,
        measured: { timestamps: frames.map(({ sourceTime }) => Math.max(0, sourceTime)), palette, candidateCuts: cuts, candidateChanges },
        images: await images(frames, signal),
    };
}

const previewFrames = new Map<string, Blob>();

async function renderPreview(draft: Document, signal: AbortSignal) {
    const scenes = [...draft.tracks.motion_graphics].sort((a, b) => a.layer - b.layer);
    const soundtrack = draft.tracks.audio.find(({ id }) => id === "motion-soundtrack");
    const frames = [...new Set(scenes.flatMap(({ start_frame, end_frame }) => {
        const span = end_frame - start_frame - 1;
        const accents = draft.metadata.motion_cues?.filter(({ frame }) => frame > start_frame && frame < end_frame - 1);
        const middle = accents?.reduce<{ frame: number; confidence: number } | undefined>((best, cue) =>
            !best || cue.confidence > best.confidence ? cue : best, undefined)?.frame ?? start_frame + Math.floor(span / 2);
        return [start_frame + Math.floor(span * 0.16), middle, start_frame + Math.floor(span * 0.86)];
    }))]
        .sort((a, b) => a - b);
    if (!frames.length || frames.length > 32) throw new Error("The draft has no bounded motion preview.");
    const ratio = Math.min(1, 480 / Math.max(draft.width, draft.height));
    const width = Math.max(1, Math.round(draft.width * ratio));
    const height = Math.max(1, Math.round(draft.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    const composite = new OffscreenCanvas(width, height);
    const target = composite.getContext("2d");
    if (!context || !target) throw new Error("Canvas 2D is unavailable.");
    const assets = new Map<string, Awaited<ReturnType<typeof prepareMotionSceneAssets>>>();
    const samples: MotionReferenceFrame[] = [];
    try {
        for (const frame of frames) {
            signal.throwIfAborted();
            const active = scenes.filter(({ start_frame, end_frame }) => frame >= start_frame && frame < end_frame);
            const targets = active.map((scene) => motionContinuityTarget(scene, scenes));
            const key = await sha256(new TextEncoder().encode(JSON.stringify([draft.project_id, width, height, draft.fps, frame, active, targets])).buffer);
            const time = frame / draft.fps;
            const cached = previewFrames.get(key);
            if (cached) {
                previewFrames.delete(key);
                previewFrames.set(key, cached);
                samples.push({ requestedTime: time, sourceTime: time, image: cached });
                continue;
            }
            target.fillStyle = "#000";
            target.fillRect(0, 0, width, height);
            for (const [index, scene] of active.entries()) {
                let ready = assets.get(scene.id);
                if (!ready) {
                    ready = await prepareMotionSceneAssets(scene, draft.project_id, signal);
                    assets.set(scene.id, ready);
                }
                const audioLevel = soundtrackLevelAt(frame, draft.fps, draft.metadata.motion_audio_analysis, soundtrack);
                await ready.program?.prepare(frame - scene.start_frame, draft.fps);
                signal.throwIfAborted();
                drawMotionFrame({ ctx: context, scene, nextScene: targets[index], frame: frame - scene.start_frame, fps: draft.fps, width, height, audioLevel }, ready);
                target.drawImage(canvas, 0, 0);
            }
            const image = await composite.convertToBlob({ type: "image/jpeg", quality: 0.84 });
            signal.throwIfAborted();
            if (image.size <= 160_000) {
                previewFrames.set(key, image);
                if (previewFrames.size > 64) previewFrames.delete(previewFrames.keys().next().value!);
            }
            samples.push({ requestedTime: time, sourceTime: time, image });
        }
        return { frames, framesPerSheet: motionPreviewFramesPerSheet,
            images: await images(samples, signal, motionPreviewFramesPerSheet) };
    } finally {
        for (const ready of assets.values()) ready.release();
        canvas.width = 0; canvas.height = 0;
    }
}

export async function runMotionBrowserInput(input: BrowserMotionInput, signal: AbortSignal) {
    if (input.tool === "reference_capture") return captureReference(input.reference, signal);
    if (input.tool === "reference_detail") return captureDetails(input, signal);
    if (input.tool === "reference_followup") return captureFollowups(input, signal);
    if (input.tool === "preview") return renderPreview(input.document, signal);
    const { reference, interval, colors } = input;
    const source = await referenceFile(reference, signal);
    const { traceReferenceShapes } = await import("./reference-trace");
    let vectors;
    try {
        vectors = await traceReferenceShapes(source, { interval, colors, highlights: true, frames: 60 }, signal);
    } catch {
        signal.throwIfAborted();
        return { status: "approximation", bindingId: reference.bindingId };
    }
    const form = new FormData();
    form.append("file", new Blob([JSON.stringify(vectors)], { type: "application/json" }), "liquid-vectors.json");
    form.append("kind", "vectors");
    form.append("provenance", JSON.stringify({ kind: "reference_derived", sourceId: reference.assetId,
        startSeconds: interval.start, endSeconds: interval.end }));
    const url = new URL(reference.url, location.origin);
    const project = /^\/projects\/(\d+)\/assets\//.exec(url.pathname)?.[1];
    if (!project || url.origin !== location.origin) throw new Error("The trace asset must belong to this project.");
    const { id: assetId } = await api<{ id: string }>(`/projects/${project}/motion-assets`, form, "POST", signal);
    return { status: "traced", bindingId: reference.bindingId, assetId };
}

export async function runNextMotionBrowserTask(runId: string, signal: AbortSignal) {
    const base = `/motion-runs/${encodeURIComponent(runId)}/browser`;
    const { task } = await api<{ task: BrowserMotionTask | null }>(base + "/claim", {}, "POST", signal);
    if (!task) return false;
    const taskUrl = base + "/" + task.id;
    const abort = new AbortController();
    const taskSignal = AbortSignal.any([signal, abort.signal, AbortSignal.timeout(180_000)]);
    let expiry = setTimeout(() => abort.abort(), Math.max(1, task.leaseExpires - Date.now()));
    let heartbeating = false;
    const heartbeat = setInterval(async () => {
        if (heartbeating || taskSignal.aborted) return;
        heartbeating = true;
        try {
            const { leaseExpires } = await api<{ leaseExpires: number }>(taskUrl + "/heartbeat", { token: task.token }, "POST", taskSignal);
            if (taskSignal.aborted) return;
            clearTimeout(expiry);
            expiry = setTimeout(() => abort.abort(), Math.max(1, leaseExpires - Date.now()));
        } catch (error) {
            const status = error && typeof error === "object" && "status" in error ? error.status : null;
            if (status === 401 || status === 403 || status === 404 || status === 409) abort.abort();
        } finally {
            heartbeating = false;
        }
    }, 10_000);
    try {
        const result = await runMotionBrowserInput(task.input, taskSignal);
        await api(taskUrl, { token: task.token, expectedRevision: task.expectedRevision, result }, "PUT", taskSignal);
        return true;
    } catch (error) {
        if (!signal.aborted) {
            await api(taskUrl + "/release", { token: task.token }, "POST", AbortSignal.timeout(3000)).catch(() => {});
        }
        throw error;
    } finally {
        clearInterval(heartbeat);
        clearTimeout(expiry);
        abort.abort();
    }
}
