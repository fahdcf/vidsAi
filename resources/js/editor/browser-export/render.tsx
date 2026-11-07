import { Audio, Video } from "@remotion/media";
import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { CompositionMedia, VideoMerger } from "@vidsai/compositions";
import type { Document } from "@vidsai/contracts";
import type { ComponentProps, ContextType } from "react";

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
    editState: Document,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
) {
    const { width, height, fps, total_frames } = editState;
    const options = {
        container: "mp4",
        videoCodec: "h264",
        audioCodec: "aac",
        videoBitrate: 4_000_000,
        audioBitrate: 128_000,
        // Only the three-second fixture uses this buffered prototype output.
        outputTarget: "arraybuffer",
    } as const;
    signal.throwIfAborted();
    const support = await canRenderMediaOnWeb({ ...options, width, height });
    signal.throwIfAborted();
    if (!support.canRender) {
        throw new Error(support.issues.map(({ message }) => message).join(" "));
    }
    const result = await renderMediaOnWeb({
        ...options,
        composition: {
            id: "VidsAIBrowserReference",
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
