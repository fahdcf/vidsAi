import { getClipSequenceTiming, normalizeDocument, type Document } from "@vidsai/contracts";
import { motionSceneCost } from "../../../../shared/motion/registry";
import { graphShadowCount } from "../../../../shared/motion/graph";

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
    maxSourceVideoFps: 60,
    maxSourceVideoLongEdge: 1920,
    maxSourceVideoShortEdge: 1080,
    maxImagePixels: 4_000_000,
    maxImageEdge: 4096,
    maxAudioRate: 48000,
} as const;

export const motionRenderProfile = {
    maxSeconds: 15,
    maxScenes: 8,
    maxActiveScenes: 2,
    maxGeometry: 1000,
    maxParticles: 1000,
    maxVectorAssets: 2,
    maxAssets: 12,
    maxActiveAssets: 6,
    maxSurfacePixels: 6_220_800,
    maxAssetBytes: 20 * 1024 * 1024,
} as const;

export const browserExportQualities = {
    standard: { name: "720p", longEdge: 1280, shortEdge: 720, maxFps: 30, videoBitrate: 4_000_000 },
    motion1080: { name: "1080p · 30 FPS", longEdge: 1920, shortEdge: 1080, maxFps: 30, videoBitrate: 9_000_000 },
    motion1080smooth: { name: "1080p · 60 FPS", longEdge: 1920, shortEdge: 1080, maxFps: 60, videoBitrate: 14_000_000 },
} as const;
export type BrowserExportQuality = keyof typeof browserExportQualities;

export function supportsHighMotionQuality(draft: Document) {
    const { width, height } = draft;
    return draft.metadata.workflow === "motion_graphics" && draft.tracks.motion_graphics.length > 0 &&
        draft.tracks.video.length === 0 && draft.fps === 30 && draft.total_frames <= 30 * motionRenderProfile.maxSeconds &&
        Math.min(width, height) === 1080 && Math.max(width, height) <= 1920;
}

export function prepareBrowserExportTimeline(draft: Document, quality: BrowserExportQuality = "standard") {
    if (quality === "standard") return draft;
    if (!supportsHighMotionQuality(draft)) {
        throw new Error("1080p motion export needs a 30 FPS motion-only project of 15 seconds or less. Select 720p for this project.");
    }
    if (quality !== "motion1080smooth") return draft;
    const span = <T extends { start_frame: number; end_frame: number }>(item: T) =>
        ({ ...item, start_frame: item.start_frame * 2, end_frame: item.end_frame * 2 });
    return normalizeDocument({
        ...draft,
        fps: 60,
        total_frames: draft.total_frames * 2,
        tracks: {
            ...draft.tracks,
            audio: draft.tracks.audio.map((track) => ({ ...span(track),
                fade_in_frames: track.fade_in_frames * 2, fade_out_frames: track.fade_out_frames * 2 })),
            overlays: draft.tracks.overlays.map(span),
            subtitles: draft.tracks.subtitles.map((caption) => ({ ...span(caption), words: caption.words?.map(span) })),
            motion_graphics: draft.tracks.motion_graphics.map((scene) => {
                const scaled = { ...span(scene), transitionIn: scene.transitionIn ? { ...scene.transitionIn, frames: scene.transitionIn.frames * 2 } : undefined };
                if (scaled.type === "graph" && scaled.params.continuity) {
                    scaled.params = { ...scaled.params, continuity: { ...scaled.params.continuity, frames: scaled.params.continuity.frames * 2 } };
                }
                return scaled;
            }),
        },
        metadata: { ...draft.metadata, motion_cues: draft.metadata.motion_cues?.map((cue) => ({ ...cue, frame: cue.frame * 2 })) },
    });
}

export type BrowserRenderIssue = {
    code:
        | "empty_timeline"
        | "duration"
        | "frame_rate"
        | "canvas"
        | "motion_complexity"
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

export function browserExportCanvas({ width, height }: Pick<Document, "width" | "height">, quality: BrowserExportQuality = "standard") {
    const p = browserExportQualities[quality];
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
    quality: BrowserExportQuality = "standard",
): BrowserRenderIssue[] {
    const p = browserRenderProfile;
    const q = browserExportQualities[quality];
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

    const motion = tracks.motion_graphics;
    limit(!tracks.video.length && !motion.length, "empty_timeline", "Add a video clip, image, or motion scene before exporting.");
    limit(frames > p.maxFrames || frames > fps * p.maxSeconds, "duration",
        `Shorten the timeline to ${p.maxSeconds} seconds or less.`);
    limit(fps > q.maxFps, "frame_rate", `Use a frame rate of ${q.maxFps} FPS or less.`);
    if (quality !== "standard") {
        const valid = snapshot.metadata.workflow === "motion_graphics" && motion.length && tracks.video.length === 0 &&
            fps === q.maxFps && Math.min(width, height) === 1080 && Math.max(width, height) <= 1920;
        limit(!valid, "motion_complexity", "Choose 720p for mixed-media or unsupported motion timelines.");
    }
    if (motion.length) {
        const m = motionRenderProfile;
        limit(frames > fps * m.maxSeconds, "duration", `Keep motion exports at ${m.maxSeconds} seconds or less.`);
        limit(motion.length > m.maxScenes || peakActive(motion) > m.maxActiveScenes, "motion_complexity",
            "Use up to eight motion scenes and no more than two overlapping scenes.");
        limit(new Set(motion.flatMap(({ assets }) => assets.map(({ id }) => id))).size > m.maxAssets, "motion_complexity",
            `Use no more than ${m.maxAssets} project assets inside motion scenes.`);
        const costs = motion.map((scene) => ({ scene, cost: motionSceneCost(scene),
            surfaces: 1 + (scene.transitionIn ? 0.25 : 0) + (scene.type === "graph" ? graphShadowCount(scene.params.layers) * 0.25 : 0) }));
        const overloaded = motion.some(({ start_frame: frame }) => {
            const totals = costs.filter(({ scene }) => scene.start_frame <= frame && frame < scene.end_frame)
                .reduce((sum, { cost, scene, surfaces }) => ({
                    geometry: sum.geometry + cost.geometry,
                    particles: sum.particles + cost.particles,
                    vectors: sum.vectors + cost.vectors,
                    assets: sum.assets + scene.assets.length,
                    surfaces: sum.surfaces + surfaces,
                }), { geometry: 0, particles: 0, vectors: 0, assets: 0, surfaces: 0 });
            return totals.geometry > m.maxGeometry || totals.particles > m.maxParticles || totals.vectors > m.maxVectorAssets ||
                totals.assets > m.maxActiveAssets || width * height * totals.surfaces > m.maxSurfacePixels;
        });
        limit(overloaded, "motion_complexity", "Reduce overlapping motion, effects or assets to fit the browser render budget.");
    }
    const maxWidth = width > height ? q.longEdge : q.shortEdge;
    const maxHeight = height > width ? q.longEdge : q.shortEdge;
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
