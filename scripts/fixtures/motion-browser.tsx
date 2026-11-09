import React from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { AudioSampleSink, BlobSource, Input, MP4, VideoSampleSink, type InputAudioTrack } from "mediabunny";
import { applyOperations } from "../../shared/editing-core";
import { VideoMerger } from "../../shared/compositions";
import { renderBrowserMp4 } from "../../resources/js/editor/browser-export/render";
import { browserExportCanvas, prepareBrowserExportTimeline, type BrowserExportQuality } from "../../resources/js/editor/browser-export/profile";
import { motionBenchmark, motionReferenceTimes } from "./motion-benchmark";
import { prepareMotionSceneAssets } from "../../shared/motion/browser-assets";
import { drawMotionFrame } from "../../shared/motion/render";
import type { Document } from "../../shared/contracts";
import type { MotionAssetFiles } from "../../shared/motion/assets";
import type { InputVideoTrack } from "mediabunny";
import { drawMotionText, fitMotionText, motionTextDirection } from "../../shared/motion/text";
import { normalizeDocument } from "../../shared/contracts";

function tone(seconds: number, steady = false, cue?: number) {
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
        const envelope = cue !== undefined ? (t >= cue && t < cue + 0.12 ? 1 : 0) : steady ? 1 : Math.exp(-(t % 0.5) * 14);
        data.setInt16(44 + i * 2, Math.round(Math.sin(t * 220 * Math.PI * 2) * envelope * 7200), true);
    }
    return new Blob([bytes], { type: "audio/wav" });
}

async function decodedAudioOnset(track: InputAudioTrack, time: number, threshold: number) {
    for await (const sample of new AudioSampleSink(track).samples(time - 0.1, time + 0.12)) {
        try {
            const pcm = new Float32Array(sample.numberOfFrames);
            sample.copyTo(pcm, { format: "f32-planar", planeIndex: 0 });
            const index = pcm.findIndex((value) => Math.abs(value) > threshold);
            if (index >= 0) return sample.timestamp + index / sample.sampleRate;
        } finally { sample.close(); }
    }
    return null;
}

export async function verifyMotionLayoutAndSync() {
    const fixture = motionBenchmark(false);
    const longText = "حركة مدروسة ونص واضح يحافظان على إيقاع المشهد";
    const layouts = [];
    for (const [width, height] of [[1080, 1920], [1080, 1080]]) {
        const formatted = applyOperations(fixture, [{ tool: "set_format", params: { width, height } }]);
        if (formatted.width !== width || formatted.height !== height) throw new Error("Motion aspect ratio did not update.");
        const scene = formatted.tracks.motion_graphics[0];
        const assets = await prepareMotionSceneAssets(scene, formatted.project_id, AbortSignal.timeout(10_000));
        const canvas = new OffscreenCanvas(width / 2, height / 2);
        const ctx = canvas.getContext("2d")!;
        try {
            const box = { x: 25, y: 50, width: canvas.width - 50, height: 200, maxSize: 65, maxLines: 3, align: "center" as const };
            const fitted = fitMotionText(ctx, longText, assets.fontFamily, box);
            ctx.font = `42px ${assets.fontFamily}`;
            const shaped = ctx.measureText("سلام").width;
            const isolated = [..."سلام"].reduce((sum, char) => sum + ctx.measureText(char).width, 0);
            if (motionTextDirection(longText) !== "rtl" || shaped >= isolated || fitted.size < 30) {
                throw new Error("Arabic text did not shape and fit the selected layout.");
            }
            drawMotionText(ctx, longText, assets.fontFamily, "#fff0d5", box);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let ink = 0;
            for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
                if (!pixels[(y * canvas.width + x) * 4 + 3]) continue;
                if (x < box.x - 2 || x > box.x + box.width + 2 || y < box.y || y > box.y + box.height) {
                    throw new Error("Responsive motion text spilled outside the layout.");
                }
                ink++;
            }
            if (ink < 250) throw new Error("The motion text did not paint.");
            layouts.push({ width, height, size: fitted.size, lines: fitted.lines.length, ink, shaped, isolated });
        } finally { assets.release(); }
    }
    const soundtrack = URL.createObjectURL(tone(3, false, 1));
    const input = normalizeDocument({
        ...fixture, width: 1920, height: 1080,
        tracks: {
            ...fixture.tracks,
            audio: [{ id: "pulse", type: "music", url: soundtrack, volume: 0.7, start_frame: 0, end_frame: 90,
                fade_in_frames: 0, fade_out_frames: 0 }],
            motion_graphics: ["#101010", "#eaeaea"].map((background, i) => ({
                id: "sync-" + i, type: "graph", componentVersion: 1, start_frame: i * 30, end_frame: i ? 90 : 30,
                palette: { ...fixture.tracks.motion_graphics[0].palette, background },
                finish: { grain: 0, vignette: 0, framing: false },
                params: { layers: [{ kind: "rect", id: "point", width: 0.01, height: 0.01, color: "foreground" }] },
            })),
        },
    });
    const draft = prepareBrowserExportTimeline(input, "motion1080smooth");
    try {
        const { artifact } = await measureMotionExport(draft, "motion1080smooth");
        try {
            const media = new Input({ source: new BlobSource(artifact.file), formats: [MP4] });
            try {
                const video = await media.getPrimaryVideoTrack();
                const audio = await media.getPrimaryAudioTrack();
                if (!video || !audio) throw new Error("The sync test needs both media tracks.");
                const sink = new VideoSampleSink(video);
                const canvas = new OffscreenCanvas(1920, 1080);
                const ctx = canvas.getContext("2d")!;
                const lightAt = async (frame: number) => {
                    const sample = await sink.getSample(frame / draft.fps);
                    if (!sample) throw new Error("A sync marker frame is missing.");
                    try { sample.draw(ctx, 0, 0); return ctx.getImageData(40, 40, 1, 1).data[0]; }
                    finally { sample.close(); }
                };
                if (await lightAt(59) > 100 || await lightAt(60) < 150) throw new Error("The visual marker moved from frame 60.");
                const audioOnset = await decodedAudioOnset(audio, 1, 0.055);
                if (audioOnset === null || Math.abs(audioOnset - 1) > 1 / draft.fps) {
                    throw new Error(`Audio/video onset exceeds one output frame (${audioOnset}).`);
                }
                const href = URL.createObjectURL(new Blob([await artifact.file.arrayBuffer()], { type: "video/mp4" }));
                const download = document.createElement("a");
                download.href = href; download.download = "motion-sync.mp4"; download.click();
                setTimeout(() => URL.revokeObjectURL(href), 10_000);
                return { width: draft.width, height: draft.height, fps: draft.fps, frames: draft.total_frames,
                    layouts, audioOnset, videoOnset: 1, differenceMs: Math.abs(audioOnset - 1) * 1000 };
            } finally { media.dispose(); }
        } finally { await artifact.release(); }
    } finally { URL.revokeObjectURL(soundtrack); }
}

async function measureMotionDrawing(draft: Document, assets?: MotionAssetFiles) {
    const canvas = document.createElement("canvas");
    canvas.width = draft.width; canvas.height = draft.height;
    const ctx = canvas.getContext("2d")!;
    const samples: number[] = [];
    try {
        for (const scene of draft.tracks.motion_graphics) {
            const ready = await prepareMotionSceneAssets(scene, draft.project_id, AbortSignal.timeout(10_000), assets);
            try {
                for (const at of [0.13, 0.33, 0.51, 0.67, 0.83]) {
                    const frame = Math.floor((scene.end_frame - scene.start_frame - 1) * at);
                    const start = performance.now();
                    drawMotionFrame({ ctx, scene, frame, width: draft.width, height: draft.height, fps: draft.fps }, ready);
                    samples.push(performance.now() - start);
                }
            } finally { ready.release(); }
        }
    } finally { canvas.width = 0; canvas.height = 0; }
    samples.sort((a, b) => a - b);
    return { samples: samples.length, p95Ms: samples[Math.ceil(samples.length * 0.95) - 1], maxMs: samples.at(-1) };
}

async function inspectSceneCoverage(draft: Document, track: InputVideoTrack, motionAssets?: MotionAssetFiles) {
    const decode = new VideoSampleSink(track);
    const canvas = new OffscreenCanvas(draft.width, draft.height);
    const ctx = canvas.getContext("2d")!;
    const thumbnails = new OffscreenCanvas(320, 180);
    const thumb = thumbnails.getContext("2d", { willReadFrequently: true })!;
    const report = [];
    for (const scene of draft.tracks.motion_graphics) {
        const duration = scene.end_frame - scene.start_frame;
        const frame = scene.start_frame + Math.floor((duration - 1) * 0.67);
        const assets = await prepareMotionSceneAssets(scene, draft.project_id, AbortSignal.timeout(10_000), motionAssets);
        try {
            drawMotionFrame({ ctx, scene, frame: frame - scene.start_frame, fps: draft.fps, width: draft.width, height: draft.height }, assets);
        } finally { assets.release(); }
        thumb.drawImage(canvas, 0, 0, 320, 180);
        const expected = thumb.getImageData(0, 0, 320, 180).data;
        const sample = await decode.getSample(frame / draft.fps);
        if (!sample) throw new Error(`The encoded video does not cover scene ${scene.id}.`);
        let timestamp: number;
        try { timestamp = sample.timestamp; sample.draw(thumb, 0, 0, 320, 180); } finally { sample.close(); }
        const actual = thumb.getImageData(0, 0, 320, 180).data;
        let delta = 0;
        for (let index = 0; index < actual.length; index += 4) {
            for (let channel = 0; channel < 3; channel++) delta += Math.abs(actual[index + channel] - expected[index + channel]);
        }
        const mae = delta / (320 * 180 * 3);
        if (mae > 8 || Math.abs(timestamp - frame / draft.fps) > 0.001) throw new Error(`The encoded ${scene.id} scene differs from its preview.`);
        report.push({ id: scene.id, type: scene.type, from: scene.start_frame, to: scene.end_frame, sampleFrame: frame, timestamp, mae });
    }
    return report;
}

export async function inspectSavedMotionExport(draft: Document, file: Blob, quality: BrowserExportQuality, assets: MotionAssetFiles) {
    const { width, height } = browserExportCanvas(draft, quality);
    const timeline = { ...prepareBrowserExportTimeline(draft, quality), width, height };
    const input = new Input({ source: new BlobSource(file), formats: [MP4] });
    try {
        const track = await input.getPrimaryVideoTrack();
        if (!track) throw new Error("The exported draft has no video track.");
        return await inspectSceneCoverage(timeline, track, assets);
    } finally { input.dispose(); }
}

function benchmarkLifecycle(draft: Document, quality: BrowserExportQuality, assets?: MotionAssetFiles) {
    return { id: crypto.randomUUID(), motionAssets: assets, quality, canvas: browserExportCanvas(draft, quality),
        onRendering: async () => {}, onFinalizing: async () => {} };
}

async function measureMotionExport(draft: Document, quality: BrowserExportQuality, assets?: MotionAssetFiles) {
    const start = performance.now();
    let last = start, peakTimerDelayMs = 0, ticks = 0;
    const heap = () => (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
    const jsHeapBeforeBytes = heap();
    let jsHeapPeakBytes = jsHeapBeforeBytes;
    const timer = setInterval(() => {
        const now = performance.now();
        peakTimerDelayMs = Math.max(peakTimerDelayMs, now - last - 100);
        last = now;
        ticks++;
        const current = heap();
        if (current !== null) jsHeapPeakBytes = Math.max(jsHeapPeakBytes ?? 0, current);
    }, 100);
    const longTasks: number[] = [];
    const observer = PerformanceObserver.supportedEntryTypes.includes("longtask")
        ? new PerformanceObserver((list) => { for (const entry of list.getEntries()) longTasks.push(entry.duration); }) : null;
    observer?.observe({ type: "longtask" });
    const status = document.documentElement.dataset;
    status.motionRender = "preparing";
    status.motionProgress = "0";
    try {
        const artifact = await renderBrowserMp4(draft, AbortSignal.timeout(180_000), (progress) => {
            const step = String(Math.floor(progress * 20) * 5);
            if (step !== status.motionProgress) status.motionProgress = step;
        }, {
            ...benchmarkLifecycle(draft, quality, assets),
            onRendering: async () => { status.motionRender = "rendering"; },
        });
        const elapsedMs = performance.now() - start;
        return { artifact, performance: { elapsedMs, meanMsPerFrame: elapsedMs / draft.total_frames,
            peakTimerDelayMs, ticks, longTasks: longTasks.length, longestTaskMs: Math.max(0, ...longTasks),
            jsHeapBeforeBytes, jsHeapPeakBytes } };
    } finally { status.motionRender = "finished"; clearInterval(timer); observer?.disconnect(); }
}

export async function verifyMotionBrowser(full: boolean, trace = false, quality: BrowserExportQuality = "standard", bridge = false) {
    const fixture = motionBenchmark(full);
    const editState = quality === "standard" ? fixture : prepareBrowserExportTimeline({ ...fixture, width: 1920, height: 1080 }, quality);
    const { width, height, fps, total_frames } = editState;
    let motionAssets: MotionAssetFiles | undefined;
    let vectorFrames = 0;
    if (trace) {
        const blob = await (await fetch("/__motion_source.mp4")).blob();
        const { traceReferenceShapes } = await import("../../resources/js/editor/motion/reference-trace");
        const data = await traceReferenceShapes(blob, { interval: { start: 10.35, end: 12.5 },
            colors: ["#ee426e", "#e35a9d", "#f487ad", "#2353ec"], highlights: true, frames: 60 }, AbortSignal.timeout(30_000));
        vectorFrames = data.frames.length;
        const id = crypto.randomUUID();
        motionAssets = { [id]: { kind: "vectors", data } };
        const liquid = editState.tracks.motion_graphics.find(({ type }) => type === "liquid");
        if (liquid?.type !== "liquid") throw new Error("The full benchmark needs a liquid scene.");
        liquid.params = { mode: "vectors", assetId: id, style: "liquid_gradient" };
        liquid.assets = [{ id, kind: "vectors" }];
    }
    const audio = URL.createObjectURL(tone(total_frames / fps));
    editState.tracks.audio.push({ id: "fixture-audio", type: "music", url: audio, volume: 0.35, start_frame: 0, end_frame: total_frames, fade_in_frames: 0, fade_out_frames: 4 });
    const root = createRoot(document.getElementById("probe")!);
    const handle = React.createRef<PlayerRef>();
    const first = Math.round(fps * 0.8);
    let preview: Uint8ClampedArray;
    try {
        root.render(<Player component={VideoMerger} inputProps={{ editState, motionAssets }} ref={handle}
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
        context.canvas.dispatchEvent(new Event("contextlost", { cancelable: true }));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!document.querySelector('[role="alert"]')?.textContent?.includes("graphics context was lost")) {
            throw new Error("The preview did not report a lost graphics context.");
        }
        context.canvas.dispatchEvent(new Event("contextrestored"));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (document.querySelector('[role="alert"]')) throw new Error("The preview did not recover its graphics context.");
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
            }, benchmarkLifecycle(editState, quality, motionAssets));
            await abandoned.release();
            throw new Error("The motion export ignored cancellation.");
        } catch (error) {
            if (!(error instanceof DOMException) || error.name !== "AbortError") throw error;
        }
        const drawStats = await measureMotionDrawing(editState, motionAssets);
        const { artifact, performance } = await measureMotionExport(editState, quality, motionAssets);
        try {
            const input = new Input({ source: new BlobSource(artifact.file), formats: [MP4] });
            let averageError = 0;
            let sync: { audioOnset: number; videoBoundary: number; differenceMs: number } | undefined;
            let coverage: Awaited<ReturnType<typeof inspectSceneCoverage>> = [];
            let codecs: { video: string | null; audio: string | null; videoSeconds: number; containerSeconds: number } | undefined;
            try {
                const track = await input.getPrimaryVideoTrack();
                const audioTrack = await input.getPrimaryAudioTrack();
                if (!track || !audioTrack) throw new Error("The export is missing a video or audio track.");
                codecs = { video: await track.getCodec(), audio: await audioTrack.getCodec(),
                    videoSeconds: await track.computeDuration(), containerSeconds: await input.computeDuration() };
                coverage = await inspectSceneCoverage(editState, track, motionAssets);
                if (full) {
                    const boundary = editState.tracks.motion_graphics.at(-1)!.start_frame / fps;
                    const frame = await new VideoSampleSink(track).getSample(boundary);
                    const onset = await decodedAudioOnset(audioTrack, boundary, 0.024);
                    const videoTime = frame?.timestamp;
                    frame?.close();
                    if (onset === null || videoTime === undefined || Math.abs(videoTime - boundary) > 0.001 ||
                        Math.abs(onset - videoTime) > 1 / fps) throw new Error(`The benchmark audio cue is out of sync (${onset}, ${videoTime}).`);
                    sync = { audioOnset: onset, videoBoundary: videoTime, differenceMs: Math.abs(onset - videoTime) * 1000 };
                }
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
            if (bridge) Object.assign(window, { vidsaiMotionVerificationFile: blob });
            else {
                const href = URL.createObjectURL(blob);
                const download = document.createElement("a");
                download.href = href;
                download.download = "motion-benchmark.mp4";
                download.click();
                setTimeout(() => URL.revokeObjectURL(href), 10000);
            }
            return { width, height, fps, quality, frames: total_frames, averageError, bytes: artifact.file.size, performance, drawStats, vectorFrames, sync,
                referenceTimes: full ? motionReferenceTimes : [], coverage, codecs };
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
