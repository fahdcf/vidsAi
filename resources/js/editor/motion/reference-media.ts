import { BlobSource, Input, MP4, VideoSampleSink } from "mediabunny";
import { inspectBrowserMedia } from "../browser-export/inspect-media";
import type { BrowserMotionReference, ReferenceCropBounds } from "../../../../shared/motion/browser-tools";
import { findReferenceCrop, referenceCropCanvas } from "./reference-crop";

export async function loadMotionReference(reference: BrowserMotionReference, signal: AbortSignal) {
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
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    signal.throwIfAborted();
    if (Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("") !== reference.metadata.sha256) {
        throw new Error("The selected reference file changed.");
    }
    return new Blob([bytes]);
}

export async function inspectMotionReference(source: Blob, kind: "image" | "video", signal: AbortSignal) {
    const metadata = await inspectBrowserMedia(source, kind, signal, { videoOnly: true });
    if (metadata.video) {
        const { duration } = metadata.video;
        if (!(duration > 0 && duration <= 30.001)) {
            throw new Error("Use a motion reference of 30 seconds or less.");
        }
        return { ...metadata, duration };
    }
    return metadata;
}

export type MotionReferenceFrame = { requestedTime: number; sourceTime: number; image: Blob; detail?: { bounds: ReferenceCropBounds; image: Blob } };
type SampleOptions = { crop?: ReferenceCropBounds; maxEdge?: number; detailCrop?: boolean };

export async function sampleMotionReference(
    source: Blob, times: readonly number[], signal: AbortSignal, options: SampleOptions = {},
): Promise<MotionReferenceFrame[]> {
    const maxEdge = options.maxEdge ?? 480;
    if (!Number.isInteger(maxEdge) || maxEdge < 128 || maxEdge > 960) throw new Error("Unsupported reference sampling resolution.");
    const crop = options.crop;
    if (crop && (Object.values(crop).some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
        crop.width <= 0 || crop.height <= 0 || crop.left + crop.width > 1 || crop.top + crop.height > 1)) {
        throw new Error("The reference crop must stay inside the frame.");
    }
    const maxSamples = maxEdge > 480 || crop || options.detailCrop ? 8 : 32;
    if (times.length < 1 || times.length > maxSamples || times.some((time, index) =>
        !Number.isFinite(time) || time < 0 || (index > 0 && time <= times[index - 1])
    )) {
        throw new Error(`Provide one to ${maxSamples} ascending reference sample times.`);
    }
    const metadata = await inspectMotionReference(source, "video", signal);
    if (!metadata.video || !metadata.duration || times.at(-1)! >= metadata.duration) {
        throw new Error("Reference sample times must be inside the video.");
    }
    signal.throwIfAborted();
    const input = new Input({ source: new BlobSource(source, { maxCacheSize: 1024 * 1024 }), formats: [MP4] });
    const dispose = () => input.dispose();
    signal.addEventListener("abort", dispose, { once: true });
    try {
        const track = await input.getPrimaryVideoTrack();
        if (!track) throw new Error("The reference has no video track.");
        const first = await track.getFirstTimestamp();
        const { displayWidth, displayHeight } = metadata.video;
        const sw = displayWidth * (crop?.width ?? 1);
        const sh = displayHeight * (crop?.height ?? 1);
        const scale = Math.min(1, maxEdge / Math.max(sw, sh));
        const canvas = new OffscreenCanvas(Math.max(1, Math.round(sw * scale)), Math.max(1, Math.round(sh * scale)));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D is unavailable for reference analysis.");
        const frames: MotionReferenceFrame[] = [];
        for await (const sample of new VideoSampleSink(track).samplesAtTimestamps(times.map((time) => first + time))) {
            if (!sample) throw new Error("A reference sample could not be decoded.");
            let sourceTime: number;
            let detail: { bounds: ReferenceCropBounds; canvas: OffscreenCanvas } | undefined;
            try {
                signal.throwIfAborted();
                sourceTime = sample.timestamp - first;
                if (crop) sample.draw(context, displayWidth * crop.left, displayHeight * crop.top, sw, sh, 0, 0, canvas.width, canvas.height);
                else sample.draw(context, 0, 0, canvas.width, canvas.height);
                if (options.detailCrop && !crop) {
                    const bounds = findReferenceCrop(canvas);
                    if (bounds) {
                        const cropWidth = displayWidth * bounds.width, cropHeight = displayHeight * bounds.height;
                        const canvas = referenceCropCanvas(cropWidth, cropHeight);
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            sample.draw(ctx, displayWidth * bounds.left, displayHeight * bounds.top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
                            detail = { bounds, canvas };
                        }
                    }
                }
            } finally {
                sample.close();
            }
            const image = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
            signal.throwIfAborted();
            const closeup = detail && { bounds: detail.bounds, image: await detail.canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 }) };
            frames.push({ requestedTime: times[frames.length], sourceTime, image, detail: closeup });
        }
        if (frames.length !== times.length) throw new Error("The browser returned incomplete reference samples.");
        return frames;
    } finally {
        signal.removeEventListener("abort", dispose);
        dispose();
    }
}
