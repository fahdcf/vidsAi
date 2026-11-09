import React from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { AudioSampleSink, BlobSource, Input, MP4, VideoSampleSink } from "mediabunny";
import { applyOperations } from "../../shared/editing-core";
import { VideoMerger } from "../../shared/compositions";
import { renderBrowserMp4 } from "../../resources/js/editor/browser-export/render";
import { motionBenchmark, motionReferenceTimes } from "./motion-benchmark";

function tone(seconds: number, steady = false) {
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
        const envelope = steady ? 1 : Math.exp(-(t % 0.5) * 14);
        data.setInt16(44 + i * 2, Math.round(Math.sin(t * 220 * Math.PI * 2) * envelope * 7200), true);
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

export async function verifyMixedMotionBrowser() {
    const response = await fetch("/__motion_source.mp4");
    if (!response.ok) throw new Error("The mixed-media source could not be opened.");
    const video = URL.createObjectURL(await response.blob());
    const audio = URL.createObjectURL(tone(3, true));
    const tile = new OffscreenCanvas(64, 64);
    const draw = tile.getContext("2d")!;
    draw.fillStyle = "#c40ad5";
    draw.fillRect(0, 0, 64, 64);
    const overlay = URL.createObjectURL(await tile.convertToBlob({ type: "image/png" }));
    const base = motionBenchmark(false);
    const first = base.tracks.motion_graphics[0];
    if (first.type !== "impact") throw new Error("The mixed-media fixture needs an impact scene.");
    base.tracks.motion_graphics = [{ ...first, start_frame: 45, end_frame: 90, transitionIn: { kind: "fade", frames: 7 } }];
    base.tracks.video = [{ id: "footage", clip_url: video, start_frame: 0, end_frame: 50, trim_in: 0, trim_out: 50,
        media_type: "video", animation: "none", transition_out: null, speed: 1, volume: 0, color_grade: null }];
    base.tracks.audio = [{ id: "music", type: "music", url: audio, volume: 0.6, start_frame: 0, end_frame: 90,
        fade_in_frames: 15, fade_out_frames: 15 }];
    base.tracks.overlays = [{ id: "mark", src: overlay, start_frame: 0, end_frame: 90, position: "top-right",
        width: 64, opacity: 1, animation: "none" }];
    base.tracks.subtitles = [{ id: "caption", start_frame: 58, end_frame: 85, position: "bottom", style: "rectangular",
        text: "MIXED MEDIA", config: { backgroundColor: "#00ff00", textColor: "#000000" } }];
    const draft = applyOperations(base, [{ tool: "set_music_cues", params: { cues: [{ frame: 64, confidence: 1, source: "manual" }], syncImpact: true } }]);
    const motion = draft.tracks.motion_graphics[0];
    if (motion.type !== "impact" || Math.abs(motion.params.impactAt - (64 - 45) / 45) > 0.001) {
        throw new Error("The impact scene did not align to its audio cue.");
    }
    const root = createRoot(document.getElementById("probe")!);
    try {
        root.render(<Player component={VideoMerger} inputProps={{ editState: draft }}
            durationInFrames={90} compositionWidth={640} compositionHeight={360} fps={30}
            initialFrame={70} style={{ width: 640, aspectRatio: "16/9" }} />);
        const until = performance.now() + 15_000;
        while (!document.querySelector('canvas[data-motion-frame="25"]') && performance.now() < until) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        if (!document.querySelector('canvas[data-motion-frame="25"]') || !document.body.textContent?.includes("MIXED MEDIA")) {
            throw new Error("The mixed-media preview did not paint its motion and caption layers.");
        }
    } finally { root.unmount(); }
    try {
        const artifact = await renderBrowserMp4(draft, AbortSignal.timeout(120_000), () => {});
        try {
            const input = new Input({ source: new BlobSource(artifact.file), formats: [MP4] });
            try {
                const videoTrack = await input.getPrimaryVideoTrack();
                const audioTrack = await input.getPrimaryAudioTrack();
                if (!videoTrack || !audioTrack) throw new Error("The mixed export is missing a media track.");
                const videoSink = new VideoSampleSink(videoTrack);
                const surface = new OffscreenCanvas(640, 360);
                const ctx = surface.getContext("2d")!;
                const inspect = async (frame: number) => {
                    const sample = await videoSink.getSample(frame / 30);
                    if (!sample) throw new Error("The mixed export is missing a sampled frame.");
                    try { sample.draw(ctx, 0, 0); } finally { sample.close(); }
                    return ctx.getImageData(0, 0, 640, 360).data;
                };
                const footage = await inspect(24);
                const graphics = await inspect(70);
                const logoIndex = (36 * 640 + 585) * 4;
                for (const pixels of [footage, graphics]) {
                    if (!(pixels[logoIndex] > 140 && pixels[logoIndex + 1] < 50 && pixels[logoIndex + 2] > 145)) {
                        throw new Error("The mark was not painted above the video and motion layers.");
                    }
                }
                let green = 0, changed = 0;
                for (let i = 0; i < graphics.length; i += 4) {
                    if (graphics[i] < 90 && graphics[i + 1] > 170 && graphics[i + 2] < 100) green++;
                    if (Math.abs(graphics[i] - footage[i]) + Math.abs(graphics[i + 1] - footage[i + 1]) + Math.abs(graphics[i + 2] - footage[i + 2]) > 40) changed++;
                }
                if (green < 100 || changed < 10_000) throw new Error("The encoded motion or caption was not present.");
                const sink = new AudioSampleSink(audioTrack);
                async function rms(time: number) {
                    const sample = await sink.getSample(time);
                    if (!sample) throw new Error("The mixed export is missing a sampled audio packet.");
                    try {
                        const pcm = new Float32Array(sample.numberOfFrames);
                        sample.copyTo(pcm, { format: "f32-planar", planeIndex: 0 });
                        return Math.sqrt(pcm.reduce((sum, value) => sum + value * value, 0) / pcm.length);
                    } finally { sample.close(); }
                }
                const early = await rms(0.1), middle = await rms(1.1), late = await rms(2.9);
                if (!(middle > early * 1.7 && middle > late * 1.7)) {
                    throw new Error(`The soundtrack fades did not survive export (${early}, ${middle}, ${late}).`);
                }
                const href = URL.createObjectURL(new Blob([await artifact.file.arrayBuffer()], { type: "video/mp4" }));
                const download = document.createElement("a");
                download.href = href; download.download = "motion-mixed.mp4"; download.click();
                setTimeout(() => URL.revokeObjectURL(href), 10_000);
                return { frames: 90, width: 640, height: 360, fps: 30, greenCaptionPixels: green, changedPixels: changed, audioRms: { early, middle, late } };
            } finally { input.dispose(); }
        } finally { await artifact.release(); }
    } finally {
        URL.revokeObjectURL(video); URL.revokeObjectURL(audio); URL.revokeObjectURL(overlay);
    }
}
