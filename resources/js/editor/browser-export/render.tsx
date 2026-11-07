import { Audio, Video } from "@remotion/media";
import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { CompositionMedia, VideoMerger } from "@vidsai/compositions";
import { documentSchema, type Document } from "@vidsai/contracts";
import type { ComponentProps, ContextType } from "react";
import { prepareBrowserAudio } from "./audio";

type VideoProps = ComponentProps<ContextType<typeof CompositionMedia>["Video"]>;

function BrowserVideo({ style, ...props }: VideoProps) {
    const { objectFit, ...layout } = style ?? {};
    const fit = objectFit === "contain" || objectFit === "fill" ||
        objectFit === "none" || objectFit === "scale-down" ? objectFit : "cover";
    return <Video {...props} style={layout} objectFit={fit} disallowFallbackToOffthreadVideo />;
}

function BrowserComposition(props: { editState: Document }) {
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
) {
    signal.throwIfAborted();
    const editState = documentSchema.parse(structuredClone(snapshot)) as Document;
    if (!editState.tracks.video.length) {
        throw new Error("Add a video clip or image before exporting.");
    }
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
        container: "mp4",
        videoCodec: "h264",
        audioCodec: muted ? null : "aac",
        muted,
        videoBitrate: 4_000_000,
        audioBitrate: 128_000,
        // Only the three-second fixture uses this buffered prototype output.
        outputTarget: "arraybuffer",
    } as const;
    const support = await canRenderMediaOnWeb({ ...options, width, height });
    signal.throwIfAborted();
    if (!support.canRender) {
        throw new Error(support.issues.map(({ message }) => message).join(" "));
    }
    if (!muted) await prepareBrowserAudio(editState, signal);
    signal.throwIfAborted();
    const result = await renderMediaOnWeb({
        ...options,
        composition: {
            id: "VidsAIBrowserExport",
            component: BrowserComposition,
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
        isProduction: false,
    });
    signal.throwIfAborted();
    return result.getBlob();
}
