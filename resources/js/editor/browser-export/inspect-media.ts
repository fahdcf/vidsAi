import {
    ADTS, AudioSampleSink, BlobSource, EncodedPacketSink, Input, MP3, MP4,
    VideoSampleSink, WAVE,
    type InputAudioTrack, type InputVideoTrack,
} from "mediabunny";
import { browserRenderProfile as profile } from "./profile";

export type BrowserMediaKind = "video" | "audio" | "image";

export function validateSourceSizes(sources: Iterable<Blob>) {
    let bytes = 0;
    for (const source of new Set(sources)) {
        if (source.size === 0) throw new Error("A source file is empty.");
        if (source.size > profile.maxSourceBytes) {
            throw new Error("Each source file must be 100 MiB or smaller.");
        }
        bytes += source.size;
        if (bytes > profile.maxProjectSourceBytes) {
            throw new Error("Project source files must total 300 MiB or less.");
        }
    }
}

function imageDimensions(bytes: Uint8Array, sourceBytes: number) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (pngSignature.every((byte, i) => bytes[i] === byte)) {
        if (bytes.length < 33 || view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) {
            throw new Error("The PNG header is invalid.");
        }
        // acTL precedes the first IDAT in animated PNGs.
        for (let offset = 33; offset + 8 <= bytes.length;) {
            const length = view.getUint32(offset);
            const type = view.getUint32(offset + 4);
            if (offset + length + 12 > sourceBytes) break;
            if (type === 0x6163544c) throw new Error("Use a still PNG instead of an animated PNG.");
            if (type === 0x49444154) {
                return { width: view.getUint32(16), height: view.getUint32(20) };
            }
            offset += length + 12;
        }
    } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        for (let offset = 2; offset + 4 <= bytes.length;) {
            if (bytes[offset++] !== 0xff) break;
            while (bytes[offset] === 0xff) offset++;
            const marker = bytes[offset++];
            if (offset + 2 > bytes.length || marker === 0xda || marker === 0xd9) break;
            const length = view.getUint16(offset);
            if (length < 2 || offset + length > bytes.length) break;
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
                return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
            }
            offset += length;
        }
    }
    throw new Error("Use a JPEG or still PNG with readable image metadata.");
}

async function audioInfo(track: InputAudioTrack) {
    const [codec, channels, sampleRate] = await Promise.all([
        track.getCodec(), track.getNumberOfChannels(), track.getSampleRate(),
    ]);
    if (!codec || !(codec === "aac" || codec === "mp3" || codec.startsWith("pcm-"))) {
        throw new Error("Use AAC, MP3, or PCM audio.");
    }
    if ((channels !== 1 && channels !== 2) || !(sampleRate > 0 && sampleRate <= profile.maxAudioRate)) {
        throw new Error("Use mono or stereo audio at 48 kHz or less.");
    }
    return { codec, channels, sampleRate };
}

async function videoInfo(track: InputVideoTrack, signal: AbortSignal) {
    const [codec, width, height, displayWidth, displayHeight, rotation, hdr, videoEnd, videoStart] = await Promise.all([
        track.getCodec(), track.getCodedWidth(), track.getCodedHeight(),
        track.getDisplayWidth(), track.getDisplayHeight(), track.getRotation(), track.hasHighDynamicRange(),
        track.computeDuration({ metadataOnly: true }), track.getFirstTimestamp(),
    ]);
    if (codec !== "avc" || hdr) throw new Error("Use an SDR H.264 MP4 for video.");
    for (const [w, h] of [[width, height], [displayWidth, displayHeight]]) {
        if (!(w > 0 && h > 0) || Math.max(w, h) > profile.maxSourceVideoLongEdge ||
            Math.min(w, h) > profile.maxSourceVideoShortEdge) {
            throw new Error("Use video at 1080p or smaller.");
        }
    }

    const timestamps: number[] = [];
    const maxFps = profile.maxSourceVideoFps;
    const maxSamples = profile.maxSourceSeconds * maxFps + 1;
    const frameRateError = `Use constant-frame-rate source video at ${maxFps} FPS or less.`;
    for await (const packet of new EncodedPacketSink(track).packets(undefined, undefined, { metadataOnly: true })) {
        signal.throwIfAborted();
        if (!Number.isFinite(packet.timestamp) || !(packet.duration > 0) || !Number.isFinite(packet.duration)) {
            throw new Error("The video timestamps are invalid.");
        }
        timestamps.push(packet.timestamp);
        if (timestamps.length > maxSamples) throw new Error(frameRateError);
    }
    timestamps.sort((a, b) => a - b);
    if (!timestamps.length || timestamps[0] < -0.001) throw new Error("The video timestamps are invalid.");
    const framePeriod = timestamps.length > 1
        ? (timestamps.at(-1)! - timestamps[0]) / (timestamps.length - 1)
        : 1 / maxFps;
    if (framePeriod < 1 / maxFps - 0.00005 || timestamps.some((timestamp, i) =>
        i > 0 && Math.abs(timestamp - timestamps[i - 1] - framePeriod) > 0.001
    )) {
        throw new Error(frameRateError);
    }
    return { codec, width, height, displayWidth, displayHeight, rotation, fps: 1 / framePeriod, duration: videoEnd - videoStart };
}

export async function inspectBrowserMedia(source: Blob, kind: BrowserMediaKind, signal: AbortSignal, options: { videoOnly?: boolean } = {}) {
    signal.throwIfAborted();
    validateSourceSizes([source]);
    if (kind === "image") {
        const header = await source.slice(0, 256 * 1024).arrayBuffer();
        signal.throwIfAborted();
        const { width, height } = imageDimensions(new Uint8Array(header), source.size);
        if (!(width > 0 && height > 0) || Math.max(width, height) > profile.maxImageEdge ||
            width * height > profile.maxImagePixels) {
            throw new Error("Use an image up to 4 megapixels and 4,096 pixels on either side.");
        }
        const image = await createImageBitmap(source).catch((error: unknown) => {
            throw new Error("This browser could not decode the image.", { cause: error });
        });
        image.close();
        signal.throwIfAborted();
        return { kind, width, height };
    }

    const input = new Input({
        formats: kind === "video" ? [MP4] : [MP3, WAVE, ADTS, MP4],
        source: new BlobSource(source, { maxCacheSize: 1024 * 1024 }),
    });
    const dispose = () => input.dispose();
    signal.addEventListener("abort", dispose, { once: true });
    try {
        if (!await input.canRead()) {
            throw new Error(kind === "video" ? "Use an H.264 MP4 for video." : "Use MP3, WAV, or AAC audio.");
        }
        const tracks = await input.getTracks();
        const videos = tracks.filter((track) => track.isVideoTrack());
        const audios = tracks.filter((track) => track.isAudioTrack());
        if (videos.length !== (kind === "video" ? 1 : 0) || audios.length > 1 ||
            (kind === "audio" && audios.length !== 1) || tracks.length !== videos.length + audios.length) {
            throw new Error("Use a source with a single video track and at most one audio track, or an audio-only file.");
        }
        const includeAudio = kind === "audio" || !options.videoOnly;
        const inspectedTracks = includeAudio ? tracks : videos;
        const first = await input.getFirstTimestamp(inspectedTracks);
        const end = await input.computeDuration(inspectedTracks, { metadataOnly: true });
        const duration = end - first;
        if (!(duration > 0 && duration <= profile.maxSourceSeconds + 0.001)) {
            throw new Error("Use a source with a valid duration of 120 seconds or less.");
        }
        const video = videos.length ? await videoInfo(videos[0], signal) : null;
        const audio = includeAudio && audios.length ? await audioInfo(audios[0]) : null;
        if (videos[0]) {
            const track = videos[0];
            const frame = await track.canDecode() &&
                await new VideoSampleSink(track).getSample(await track.getFirstTimestamp());
            if (!frame) throw new Error("This browser could not decode the source video.");
            frame.close();
        }
        signal.throwIfAborted();
        if (includeAudio && audios[0]) {
            const track = audios[0];
            const sample = await track.canDecode() &&
                await new AudioSampleSink(track).getSample(await track.getFirstTimestamp());
            if (!sample) throw new Error("This browser could not decode the source audio.");
            sample.close();
        }
        signal.throwIfAborted();
        return { kind, duration, video, audio };
    } finally {
        signal.removeEventListener("abort", dispose);
        dispose();
    }
}
