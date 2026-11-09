/// <reference types="vite/client" />

import { Audio, Video } from "@remotion/media";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { CompositionMedia, VideoMerger } from "@vidsai/compositions";
import { documentSchema, type Document } from "@vidsai/contracts";
import type { ComponentProps, ContextType } from "react";
import { prepareBrowserAudio } from "./audio";
import { browserExportQualities, BrowserRenderProfileError, validateBrowserRenderProfile, type BrowserExportQuality } from "./profile";
import { checkBrowserOutput, invalidateBrowserOutputProbe, mp4Encoding } from "./capabilities";
import { openBrowserOutput } from "./output";
import type { MotionAssetFiles } from "../../../../shared/motion/assets";

type VideoProps = ComponentProps<ContextType<typeof CompositionMedia>["Video"]>;

function BrowserVideo({ style, ...props }: VideoProps) {
    const { objectFit, ...layout } = style ?? {};
    const fit = objectFit === "contain" || objectFit === "fill" ||
        objectFit === "none" || objectFit === "scale-down" ? objectFit : "cover";
    return <Video {...props} style={layout} objectFit={fit} disallowFallbackToOffthreadVideo />;
}

function BrowserComposition(props: { editState: Document; motionAssets?: MotionAssetFiles; motionScale?: number }) {
    return (
        <CompositionMedia.Provider value={{ Video: BrowserVideo, Audio }}>
            <VideoMerger {...props} />
        </CompositionMedia.Provider>
    );
}

export async function renderBrowserMp4(
    snapshot: Document,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
    lifecycle?: {
        id: string;
        canvas?: { width: number; height: number; scale: number };
        motionAssets?: MotionAssetFiles;
        quality?: BrowserExportQuality;
        onRendering: () => Promise<void>;
        onFinalizing: () => Promise<void>;
    },
) {
    signal.throwIfAborted();
    const editState = documentSchema.parse(structuredClone(snapshot)) as Document;
    const canvas = lifecycle?.canvas ?? { width: editState.width, height: editState.height, scale: 1 };
    const quality = lifecycle?.quality ?? "standard";
    const issues = validateBrowserRenderProfile(editState, canvas, quality);
    if (issues.length) throw new BrowserRenderProfileError(issues);
    const sources = [
        ...editState.tracks.video.map((clip) => clip.clip_url),
        ...editState.tracks.audio.map((track) => track.url),
        ...editState.tracks.overlays.map((overlay) => overlay.src),
    ];
    if (sources.some((source) => !/^(https?:\/\/|blob:)/i.test(source))) {
        throw new Error("Resolve project media before exporting.");
    }
    const { width, height, fps, total_frames } = editState;
    const muted =
        !editState.tracks.audio.some((track) => track.volume > 0) &&
        !editState.tracks.video.some(
            (clip) => clip.media_type === "video" && clip.volume > 0,
        );
    const options = {
        ...mp4Encoding,
        videoBitrate: browserExportQualities[quality].videoBitrate,
        audioCodec: muted ? null : "aac",
        muted,
    } as const;
    try {
        await checkBrowserOutput({ ...options, width: canvas.width, height: canvas.height, fps, outputTarget: "web-fs" }, signal);
    } catch (error) {
        signal.throwIfAborted();
        if (quality === "standard") throw error;
        throw new Error(`This browser could not prepare ${browserExportQualities[quality].name}. Select 720p and start a new export.`, { cause: error });
    }
    if (!muted) await prepareBrowserAudio(editState, signal);
    signal.throwIfAborted();
    const output = await openBrowserOutput(
        total_frames / fps, muted, signal, lifecycle?.id, lifecycle?.onFinalizing, options.videoBitrate,
    );
    try {
        await lifecycle?.onRendering();
        signal.throwIfAborted();
        const ExportComposition = (props: { editState: Document }) => (
            <BrowserComposition {...props} motionAssets={lifecycle?.motionAssets} motionScale={canvas.scale} />
        );
        await renderMediaOnWeb({
            ...options,
            scale: canvas.scale,
            outputWritable: output.writable,
            composition: {
                id: "VidsAIBrowserExport",
                component: ExportComposition,
                width,
                height,
                fps,
                durationInFrames: total_frames,
                defaultProps: { editState },
            },
            inputProps: { editState },
            signal,
            onProgress: ({ progress }) => onProgress(progress),
            pageResponsiveness: "high",
            mediaCacheSizeInBytes: 64 * 1024 * 1024,
            licenseKey: "free-license",
            isProduction: import.meta.env.PROD,
        });
        const artifact = await output.getArtifact();
        signal.throwIfAborted();
        return artifact;
    } catch (error) {
        if (!signal.aborted) invalidateBrowserOutputProbe();
        await output.release().catch(() => {});
        signal.throwIfAborted();
        throw output.getFailure() ?? error;
    }
}
