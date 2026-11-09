import React from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { BlobSource, Input, MP4, VideoSampleSink } from "mediabunny";
import { VideoMerger } from "../../shared/compositions";
import { renderBrowserMp4 } from "../../resources/js/editor/browser-export/render";
import { motionBenchmark, motionReferenceTimes } from "./motion-benchmark";

function tone(seconds: number) {
    const rate = 16_000;
    const count = rate * seconds;
    const bytes = new Uint8Array(44 + count * 2);
    const data = new DataView(bytes.buffer);
    const str = (index: number, value: string) => bytes.set(new TextEncoder().encode(value), index);
    str(0, "RIFF"); data.setUint32(4, 36 + count * 2, true); str(8, "WAVE");
    str(12, "fmt "); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
    data.setUint16(22, 1, true); data.setUint32(24, rate, true); data.setUint32(28, rate * 2, true);
    data.setUint16(32, 2, true); data.setUint16(34, 16, true); str(36, "data"); data.setUint32(40, count * 2, true);
    for (let i = 0; i < count; i++) {
        const t = i / rate;
        data.setInt16(44 + i * 2, Math.round(Math.sin(t * 220 * Math.PI * 2) * Math.exp(-(t % 0.5) * 14) * 7200), true);
    }
    return new Blob([bytes], { type: "audio/wav" });
}

export async function verifyMotionBrowser(full: boolean) {
    const editState = motionBenchmark(full);
    const { width, height, fps, total_frames } = editState;
    const audio = URL.createObjectURL(tone(total_frames / fps));
    editState.tracks.audio.push({ id: "fixture-audio", type: "music", url: audio, volume: 0.35, start_frame: 0, end_frame: total_frames, fade_in_frames: 0, fade_out_frames: 4 });
    const root = createRoot(document.getElementById("probe")!);
    const handle = React.createRef<PlayerRef>();
    const first = Math.round(fps * 0.8);
    let preview: Uint8ClampedArray;
    try {
        root.render(<Player component={VideoMerger} inputProps={{ editState }} ref={handle}
            durationInFrames={total_frames} compositionWidth={width} compositionHeight={height} fps={fps} initialFrame={first}
            style={{ width: Math.min(width, 640), aspectRatio: width / height }} />);
        const painted = async (frame: number) => {
            const deadline = performance.now() + 12000;
            while (performance.now() < deadline) {
                const context = document.querySelector<HTMLCanvasElement>(`canvas[data-motion-frame="${frame}"]`)?.getContext("2d");
                if (context) return context;
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }
            throw new Error(`Motion preview frame ${frame} did not become ready.`);
        };
        const context = await painted(first);
        if (!handle.current) throw new Error("The preview player is unavailable.");
        preview = context.getImageData(0, 0, width, height).data;
        if (preview[3] === 0) throw new Error("The motion preview stayed blank.");
        handle.current.seekTo(2);
        await painted(2);
        handle.current.seekTo(first);
        const repeated = (await painted(first)).getImageData(0, 0, width, height).data;
        if (!preview.every((value, index) => value === repeated[index])) throw new Error("Motion seeking changed frame pixels.");
    } finally {
        root.unmount();
    }

    try {
        const controller = new AbortController();
        try {
            const abandoned = await renderBrowserMp4(editState, controller.signal, (progress) => {
                if (progress > 0) controller.abort();
            });
            await abandoned.release();
            throw new Error("The motion export ignored cancellation.");
        } catch (error) {
            if (!(error instanceof DOMException) || error.name !== "AbortError") throw error;
        }
        const artifact = await renderBrowserMp4(editState, AbortSignal.timeout(120000), () => {});
        try {
            const input = new Input({ source: new BlobSource(artifact.file), formats: [MP4] });
            let averageError = 0;
            try {
                const track = await input.getPrimaryVideoTrack();
                if (!track || !await input.getPrimaryAudioTrack()) throw new Error("The export is missing a video or audio track.");
                const frame = await new VideoSampleSink(track).getSample(first / fps);
                if (!frame) throw new Error("The exported sample frame is missing.");
                const canvas = new OffscreenCanvas(width, height);
                const context = canvas.getContext("2d")!;
                try { frame.draw(context, 0, 0); } finally { frame.close(); }
                const encoded = context.getImageData(0, 0, width, height).data;
                for (let i = 0; i < encoded.length; i += 4) {
                    averageError += Math.abs(encoded[i] - preview[i]) + Math.abs(encoded[i + 1] - preview[i + 1]) + Math.abs(encoded[i + 2] - preview[i + 2]);
                }
                averageError /= width * height * 3;
                if (averageError > 8) throw new Error(`Preview and encoded frames differ (MAE ${averageError}).`);
            } finally {
                input.dispose();
            }
            const blob = new Blob([await artifact.file.arrayBuffer()], { type: "video/mp4" });
            const href = URL.createObjectURL(blob);
            const download = document.createElement("a");
            download.href = href;
            download.download = "motion-benchmark.mp4";
            download.click();
            setTimeout(() => URL.revokeObjectURL(href), 10000);
            return { width, height, fps, frames: total_frames, averageError, bytes: artifact.file.size, referenceTimes: full ? motionReferenceTimes : [] };
        } finally {
            await artifact.release();
        }
    } finally {
        URL.revokeObjectURL(audio);
    }
}
