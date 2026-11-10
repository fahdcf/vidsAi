import { BlobSource, Input, MP4, VideoSampleSink } from "mediabunny";
import { inspectBrowserMedia } from "../browser-export/inspect-media";

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

export type MotionReferenceFrame = { requestedTime: number; sourceTime: number; image: Blob };
type ReferenceCrop = { left: number; top: number; width: number; height: number };
type SampleOptions = { crop?: ReferenceCrop; maxEdge?: number };

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
    const maxSamples = maxEdge > 480 || crop ? 8 : 32;
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
            try {
                signal.throwIfAborted();
                sourceTime = sample.timestamp - first;
                if (crop) sample.draw(context, displayWidth * crop.left, displayHeight * crop.top, sw, sh, 0, 0, canvas.width, canvas.height);
                else sample.draw(context, 0, 0, canvas.width, canvas.height);
            } finally {
                sample.close();
            }
            const image = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
            signal.throwIfAborted();
            frames.push({ requestedTime: times[frames.length], sourceTime, image });
        }
        if (frames.length !== times.length) throw new Error("The browser returned incomplete reference samples.");
        return frames;
    } finally {
        signal.removeEventListener("abort", dispose);
        dispose();
    }
}
