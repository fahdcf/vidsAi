import type { Document } from "../contracts";
import type { MotionAudioAnalysis } from "./schema";

type Interval = { start: number; end: number };
type OutputClock = Pick<Document, "fps" | "total_frames">;

export function referenceClock(interval: Interval, { fps, total_frames }: OutputClock) {
    const duration = interval.end - interval.start;
    const sourcePacing = Math.abs(duration - total_frames / fps) <= 1 / fps + 1e-9;
    return { ...interval, sourcePacing, secondsPerFrame: sourcePacing ? 1 / fps : duration / total_frames };
}

export function referenceTimeAt(frame: number, clock: ReturnType<typeof referenceClock>) {
    return Math.min(clock.end, clock.start + Math.max(0, frame) * clock.secondsPerFrame);
}

export function referenceFrameAt(time: number, clock: ReturnType<typeof referenceClock>, totalFrames: number) {
    return Math.min(totalFrames, Math.max(0, Math.round((time - clock.start) / clock.secondsPerFrame)));
}

export function motionTimeMap(document: Document, reference: Interval | null) {
    const { fps, total_frames, metadata } = document;
    const track = document.tracks.audio.find(({ id }) => id === "motion-soundtrack");
    return {
        fps, outputFrames: total_frames,
        reference: reference ? referenceClock(reference, document) : null,
        soundtrack: track ? {
            sourceStart: metadata.motion_audio_start ?? (metadata.motion_audio_source === "reference" ? reference?.start ?? 0 : 0),
            source: metadata.motion_audio_source === "reference" ? "reference" as const : "uploaded" as const,
            startFrame: track.start_frame, endFrame: track.end_frame, secondsPerFrame: 1 / fps,
        } : null,
    };
}
export type MotionTimeMap = ReturnType<typeof motionTimeMap>;

export function soundtrackLevelAt(frame: number, fps: number, analysis: MotionAudioAnalysis | undefined,
    track: Document["tracks"]["audio"][number] | undefined) {
    if (!analysis || !track) return undefined;
    if (frame < track.start_frame || frame >= track.end_frame || track.volume <= 0) return 0;
    const index = (frame - track.start_frame) / fps * 10;
    const low = Math.floor(index);
    const next = index - low;
    const peak = Math.max(0.003, ...analysis.energy);
    const level = ((analysis.energy[low] ?? 0) * (1 - next) + (analysis.energy[low + 1] ?? 0) * next) / peak;
    const fadeIn = track.fade_in_frames ? (frame - track.start_frame) / track.fade_in_frames : 1;
    const fadeOut = track.fade_out_frames ? (track.end_frame - frame) / track.fade_out_frames : 1;
    return Math.min(1, level * track.volume * Math.min(1, fadeIn, fadeOut));
}
