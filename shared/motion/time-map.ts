import type { Document } from "../contracts";

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
