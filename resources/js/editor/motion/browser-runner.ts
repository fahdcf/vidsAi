import type { BrowserMotionInput, BrowserMotionTask } from "../../../../shared/motion/browser-tools";
import type { Document } from "../../../../shared/contracts";
import { prepareMotionSceneAssets } from "../../../../shared/motion/browser-assets";
import { drawMotionFrame } from "../../../../shared/motion/render";
import { api } from "../api";
import { analyzeReferenceFrames } from "./reference-analysis";
import { sampleMotionReference, type MotionReferenceFrame } from "./reference-media";
import { createReferenceSheet, refineReferenceTimes, sparseReferenceTimes } from "./reference-sheets";

async function sha256(bytes: ArrayBuffer) {
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function images(frames: readonly MotionReferenceFrame[], signal: AbortSignal) {
    const results = [];
    for (let index = 0; index < frames.length; index += 12) {
        const sheet = await createReferenceSheet(frames.slice(index, index + 12), signal);
        const buffer = await sheet.arrayBuffer();
        if (buffer.byteLength > 600_000) throw new Error("A browser contact sheet exceeds its size limit.");
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 8192) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
        }
        results.push({ mime: "image/jpeg" as const, base64: btoa(binary), sha256: await sha256(buffer) });
        signal.throwIfAborted();
    }
    return results;
}

async function captureReference(reference: Extract<BrowserMotionInput, { tool: "reference_capture" }>["reference"], signal: AbortSignal) {
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
    const source = new Blob([bytes]);
    const { interval } = reference.metadata;
    let frames: MotionReferenceFrame[];
    if (interval) {
        const sparse = await sampleMotionReference(source, sparseReferenceTimes(interval), signal);
        const { cuts } = await analyzeReferenceFrames(sparse, signal);
        const refinedTimes = refineReferenceTimes(interval, cuts.map(({ time }) => time)).slice(0, 8);
        const refined = refinedTimes.length ? await sampleMotionReference(source, refinedTimes, signal) : [];
        frames = [...new Map([...sparse, ...refined].map((item) => [Math.max(0, item.sourceTime), item])).values()]
            .sort((a, b) => a.sourceTime - b.sourceTime);
    } else {
        frames = [{ requestedTime: 0, sourceTime: 0, image: source }];
    }
    const { palette, cuts } = await analyzeReferenceFrames(frames, signal);
    return {
        bindingId: reference.bindingId,
        measured: { timestamps: frames.map(({ sourceTime }) => Math.max(0, sourceTime)), palette, candidateCuts: cuts },
        images: await images(frames, signal),
    };
}

const previewFrames = new Map<string, Blob>();

async function renderPreview(draft: Document, signal: AbortSignal) {
    const scenes = [...draft.tracks.motion_graphics].sort((a, b) => a.layer - b.layer);
    const frames = [...new Set(scenes.flatMap(({ start_frame, end_frame }) => {
        const span = end_frame - start_frame - 1;
        const middle = start_frame + Math.floor(span / 2);
        return [start_frame + Math.floor(span * 0.16), middle,
            Math.min(end_frame - 1, middle + Math.max(1, Math.round(draft.fps / 12))),
            start_frame + Math.floor(span * 0.86)];
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
            const key = await sha256(new TextEncoder().encode(JSON.stringify([draft.project_id, width, height, draft.fps, frame, active])).buffer);
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
            for (const scene of active) {
                let ready = assets.get(scene.id);
                if (!ready) {
                    ready = await prepareMotionSceneAssets(scene, draft.project_id, signal);
                    assets.set(scene.id, ready);
                }
                drawMotionFrame({ ctx: context, scene, frame: frame - scene.start_frame, fps: draft.fps, width, height }, ready);
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
        return { frames, images: await images(samples, signal) };
    } finally {
        for (const ready of assets.values()) ready.release();
        canvas.width = 0; canvas.height = 0;
    }
}

export async function runMotionBrowserInput(input: BrowserMotionInput, signal: AbortSignal) {
    return input.tool === "reference_capture" ? captureReference(input.reference, signal) : renderPreview(input.document, signal);
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
