import {
    AudioSample, AudioSampleSink, AudioSampleSource, BufferSource, BufferTarget,
    CanvasSource, Input, MP4, Mp4OutputFormat, Output, VideoSampleSink,
} from "mediabunny";
import { canRenderMediaOnWeb } from "@remotion/web-renderer";

export const mp4Encoding = {
    container: "mp4",
    videoCodec: "h264",
    videoBitrate: 4_000_000,
    audioBitrate: 128_000,
    sampleRate: 48000,
} as const;

type OutputConfig = {
    width: number;
    height: number;
    fps: number;
    muted: boolean;
    outputTarget: "arraybuffer" | "web-fs";
};

let verifiedConfig: string | undefined;

export function invalidateBrowserOutputProbe() {
    verifiedConfig = undefined;
}

async function roundTrip(config: OutputConfig, signal: AbortSignal) {
    const canvas = document.createElement("canvas");
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.fillStyle = "#112233";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    const video = new CanvasSource(canvas, { codec: "avc", bitrate: mp4Encoding.videoBitrate });
    const audio = config.muted
        ? null
        : new AudioSampleSource({ codec: "aac", bitrate: mp4Encoding.audioBitrate });
    output.addVideoTrack(video, { frameRate: config.fps });
    if (audio) output.addAudioTrack(audio);

    let input: Input | undefined;
    const abort = () => {
        input?.dispose();
        void output.cancel().catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
        signal.throwIfAborted();
        await output.start();
        await video.add(0, 1 / config.fps, { keyFrame: true });
        if (audio) {
            const frames = Math.max(1024, Math.ceil(mp4Encoding.sampleRate / config.fps));
            const sample = new AudioSample({
                data: new Float32Array(frames * 2),
                format: "f32",
                numberOfChannels: 2,
                sampleRate: mp4Encoding.sampleRate,
                timestamp: 0,
            });
            try {
                await audio.add(sample);
            } finally {
                sample.close();
            }
        }
        await output.finalize();
        signal.throwIfAborted();
        if (!target.buffer?.byteLength) throw new Error("The encoder produced no MP4.");
        input = new Input({ source: new BufferSource(target.buffer), formats: [MP4] });
        const videoTrack = await input.getPrimaryVideoTrack();
        const frame = videoTrack && await new VideoSampleSink(videoTrack).getSample(0);
        if (!frame) throw new Error("The encoded video sample could not be decoded.");
        frame.close();
        if (audio) {
            const audioTrack = await input.getPrimaryAudioTrack();
            const sample = audioTrack && await new AudioSampleSink(audioTrack).getSample(0);
            if (!sample) throw new Error("The encoded audio sample could not be decoded.");
            sample.close();
        }
        signal.throwIfAborted();
    } finally {
        signal.removeEventListener("abort", abort);
        input?.dispose();
        if (output.state !== "finalized" && output.state !== "canceled") {
            await output.cancel().catch(() => {});
        }
        canvas.width = canvas.height = 0;
    }
}

export async function checkBrowserOutput(config: OutputConfig, signal: AbortSignal) {
    signal.throwIfAborted();
    if (!globalThis.isSecureContext) {
        throw new Error("Open VidsAI over HTTPS or on localhost to export in this browser.");
    }
    const support = await canRenderMediaOnWeb({
        ...mp4Encoding,
        ...config,
        audioCodec: config.muted ? null : "aac",
    });
    signal.throwIfAborted();
    if (!support.canRender) {
        throw new Error(support.issues.map(({ message }) => message).join(" "));
    }
    const key = JSON.stringify([config.width, config.height, config.fps, config.muted, config.outputTarget]);
    if (verifiedConfig === key) return;
    try {
        await roundTrip(config, signal);
        verifiedConfig = key;
    } catch (error) {
        signal.throwIfAborted();
        throw new Error("This browser could not encode and decode a test MP4 with the selected settings.", { cause: error });
    }
}
