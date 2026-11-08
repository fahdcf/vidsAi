import type { TimelineClipItem } from "../timeline";

export function getClipSequenceTiming(
  clip: TimelineClipItem,
  previous: TimelineClipItem | null,
  isLastClip: boolean,
) {
  const clipDuration = Math.max(1, clip.end_frame - clip.start_frame);
  const enterTransitionFrames = Math.max(0, previous?.transition_out?.duration_frames ?? 0);
  const exitTransitionFrames = Math.max(0, clip.transition_out?.duration_frames ?? 0);
  return {
    from: Math.max(0, clip.start_frame - enterTransitionFrames),
    durationInFrames: clipDuration + enterTransitionFrames + (isLastClip ? 0 : exitTransitionFrames),
    enterTransitionFrames,
    exitTransitionFrames,
  };
}
