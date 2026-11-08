import { getClipSequenceTiming, type Document } from "@vidsai/contracts";

export const browserRenderProfile = {
    version: 1,
    maxSeconds: 60,
    maxFps: 30,
    maxFrames: 1800,
    longEdge: 1280,
    shortEdge: 720,
    maxClips: 20,
    maxActiveVideo: 2,
    maxActiveAudio: 2,
    maxOverlays: 10,
    maxActiveOverlays: 2,
    maxCaptions: 200,
    maxTimedWords: 1000,
    maxSourceBytes: 100 * 1024 * 1024,
    maxProjectSourceBytes: 300 * 1024 * 1024,
    maxSourceSeconds: 120,
    maxSourceVideoLongEdge: 1920,
    maxSourceVideoShortEdge: 1080,
    maxImagePixels: 4_000_000,
    maxImageEdge: 4096,
    maxAudioRate: 48000,
} as const;

export type BrowserRenderIssue = {
    code:
        | "empty_timeline"
        | "duration"
        | "frame_rate"
        | "canvas"
        | "clip_count"
        | "clip_overlap"
        | "video_concurrency"
        | "audio_concurrency"
        | "overlay_count"
        | "overlay_concurrency"
        | "caption_count"
        | "caption_overlap"
        | "timed_word_count";
    message: string;
};

type Span = { start_frame: number; end_frame: number };

function peakActive(spans: Span[]) {
    const events = spans.flatMap(({ start_frame, end_frame }) => [
        { frame: start_frame, delta: 1 },
        { frame: end_frame, delta: -1 },
    ]);
    // End an existing item before starting another at the same frame.
    events.sort((a, b) => a.frame - b.frame || a.delta - b.delta);
    let active = 0;
    let peak = 0;
    for (const { delta } of events) {
        active += delta;
        peak = Math.max(active, peak);
    }
    return peak;
}

export function browserExportCanvas({ width, height }: Pick<Document, "width" | "height">) {
    const p = browserRenderProfile;
    const maxWidth = width > height ? p.longEdge : p.shortEdge;
    const maxHeight = height > width ? p.longEdge : p.shortEdge;
    const maxScale = Math.min(1, maxWidth / width, maxHeight / height);
    if (maxScale === 1) return { width, height, scale: 1 };
    const longEdge = Math.max(width, height);
    for (let edge = Math.floor(longEdge * maxScale); edge >= 2; edge--) {
        // The encoder rounds each scaled dimension up. Keep both dimensions even.
        const scale = (edge - 1e-8) / longEdge;
        const w = Math.ceil(width * scale);
        const h = Math.ceil(height * scale);
        if (w > 0 && h > 0 && w % 2 === 0 && h % 2 === 0) return { width: w, height: h, scale };
    }
    return { width, height, scale: 1 };
}

export function validateBrowserRenderProfile(
    snapshot: Document,
    canvas: Pick<Document, "width" | "height"> = snapshot,
): BrowserRenderIssue[] {
    const p = browserRenderProfile;
    const { fps, total_frames: frames, tracks } = snapshot;
    const { width, height } = canvas;
    const issues: BrowserRenderIssue[] = [];
    function limit(
        exceeds: boolean,
        code: BrowserRenderIssue["code"],
        message: string,
    ) {
        if (exceeds) issues.push({ code, message });
    }

    limit(!tracks.video.length, "empty_timeline", "Add a video clip or image before exporting.");
    limit(frames > p.maxFrames || frames > fps * p.maxSeconds, "duration",
        `Shorten the timeline to ${p.maxSeconds} seconds or less.`);
    limit(fps > p.maxFps, "frame_rate", `Use a frame rate of ${p.maxFps} FPS or less.`);
    const maxWidth = width > height ? p.longEdge : p.shortEdge;
    const maxHeight = height > width ? p.longEdge : p.shortEdge;
    limit(width > maxWidth || height > maxHeight, "canvas",
        `Choose an output of ${maxWidth}×${maxHeight} or smaller for this orientation.`);
    limit(tracks.video.length > p.maxClips, "clip_count",
        `Use ${p.maxClips} clips or fewer.`);
    limit(peakActive(tracks.video) > 1, "clip_overlap",
        "Move overlapping timeline clips next to each other. Use a transition to blend them.");

    const sorted = [...tracks.video].sort((a, b) => a.start_frame - b.start_frame);
    const videos = sorted.flatMap((clip, i) => {
        if (clip.media_type !== "video") return [];
        const timing = getClipSequenceTiming(clip, sorted[i - 1] ?? null, i === sorted.length - 1);
        return [{
            start_frame: timing.from,
            end_frame: Math.min(frames, timing.from + timing.durationInFrames),
            volume: clip.volume,
        }];
    });
    limit(peakActive(videos) > p.maxActiveVideo, "video_concurrency",
        "Shorten overlapping transitions so no more than two videos play together.");
    const audible = [...tracks.audio, ...videos].filter((track) => track.volume > 0);
    limit(peakActive(audible) > p.maxActiveAudio, "audio_concurrency",
        "Mute or move audio so no more than two sources play together, including clip sound.");

    limit(tracks.overlays.length > p.maxOverlays, "overlay_count",
        `Use ${p.maxOverlays} overlays or fewer.`);
    // The current composition paints an overlay through its final frame.
    const overlays = tracks.overlays.map((overlay) => ({
        ...overlay,
        end_frame: Math.min(frames, overlay.end_frame + 1),
    }));
    limit(peakActive(overlays) > p.maxActiveOverlays, "overlay_concurrency",
        "Move or shorten overlays so no more than two are visible together.");
    limit(tracks.subtitles.length > p.maxCaptions, "caption_count",
        `Use ${p.maxCaptions} caption segments or fewer.`);
    limit(peakActive(tracks.subtitles) > 1, "caption_overlap",
        "Adjust caption timing so only one caption segment appears at a time.");
    const wordCount = tracks.subtitles.reduce((total, cue) => total + (cue.words?.length ?? 0), 0);
    limit(wordCount > p.maxTimedWords, "timed_word_count",
        `Use ${p.maxTimedWords} timed caption words or fewer.`);
    return issues;
}

export class BrowserRenderProfileError extends Error {
    constructor(readonly issues: BrowserRenderIssue[]) {
        super(issues.map(({ message }) => message).join(" "));
        this.name = "BrowserRenderProfileError";
    }
}
