// remotion/utils/legacyAdapter.ts
// Converts the legacy flat render payload into the new EditState format.
// This adapter exists so server.js does not need to change during this refactor.
// Once Laravel is updated to send EditState directly, this file can be deleted.

import {
  EditState,
  TimelineAudioItem,
  TimelineClipItem,
  TimelineOverlayItem,
  TimelineSubtitleItem,
  TransitionType,
} from "../shared/timeline";

// This interface should match what server.js currently sends to Remotion.
// Checked against mergeVideos.js inputProps; supports both transition and transitionType.
export interface LegacyRenderPayload {
  clips: string[];
  clipDurations?: number[];
  clipStartTimes?: number[];
  clipEndTimes?: number[];
  fps?: number;
  width?: number;
  height?: number;
  mediaTypes?: Array<"video" | "image">;
  animations?: string[];
  voiceOver?: string;
  voiceOverVolume?: number;
  music?: string;
  musicVolume?: number;
  aspectRatio?: string;
  transition?: string;
  transitionType?: string;
  subtitleStyle?: string;
  subtitles?: Array<{
    text: string;
    start: number;
    end: number;
    position?: string;
    style?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string | number;
    fontFamily?: string;
    config?: Record<string, unknown>;
    words?: Array<{ word: string; start: number; end: number }>;
  }>;
  overlays?: Array<{
    src: string;
    start: number;
    end: number;
    position?: string;
    width?: number;
    opacity?: number;
    animation?: string;
  }>;
  projectId?: string;
  language?: string;
}

function getDimensions(aspectRatio?: string): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case "4:5":
      return { width: 1080, height: 1350 };
    case "21:9":
      return { width: 1920, height: 824 };
    case "3:2":
      return { width: 1620, height: 1080 };
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "16:9":
      return { width: 1920, height: 1080 };
    default:
      return { width: 1080, height: 1920 }; // default to vertical
  }
}

function normalizeTransitionType(raw?: string): TransitionType {
  switch (raw) {
    case "fade":
    case "zoom-in":
    case "zoom-out":
    case "slide-left":
    case "slide-right":
    case "slide-up":
    case "slide-down":
    case "none":
      return raw;
    default:
      return "none";
  }
}

export function legacyPayloadToEditState(
  payload: LegacyRenderPayload,
): EditState {
  const fps = payload.fps ?? 30;
  const dimensions = getDimensions(payload.aspectRatio);
  const width = payload.width ?? dimensions.width;
  const height = payload.height ?? dimensions.height;
  const globalTransition = normalizeTransitionType(
    payload.transition ?? payload.transitionType,
  );

  // --- Build video track -----------------------------------------------------
  let currentFrame = 0;
  const videoTrack: TimelineClipItem[] = (payload.clips || []).map(
    (clipUrl, index) => {
      const durationSeconds = (payload.clipDurations || [])[index] ?? 3;
      const durationFrames = Math.round(durationSeconds * fps);
      const startFrame = currentFrame;
      const endFrame = currentFrame + durationFrames;
      currentFrame = endFrame;

      const hasNextClip = index < (payload.clips?.length ?? 0) - 1;
      const animationRaw = (payload.animations || [])[index] ?? "none";
      const mediaTypeRaw = (payload.mediaTypes || [])[index] ?? "video";

      return {
        id: `clip_${index}`,
        clip_url: clipUrl,
        media_type: mediaTypeRaw === "image" ? "image" : "video",
        start_frame: startFrame,
        end_frame: endFrame,
        trim_in: Math.round((payload.clipStartTimes?.[index] ?? 0) * fps),
        trim_out: Math.round(
          (payload.clipEndTimes?.[index] ??
            (payload.clipStartTimes?.[index] ?? 0) + durationSeconds) * fps,
        ),
        animation:
          animationRaw === "zoom-in" || animationRaw === "zoom-out"
            ? animationRaw
            : "none",
        transition_out:
          hasNextClip && globalTransition !== "none"
            ? { type: globalTransition, duration_frames: 15 }
            : null,
        speed: 1.0,
        color_grade: null,
        volume: 0,
      };
    },
  );

  // --- Build subtitle track --------------------------------------------------
  const subtitleTrack: TimelineSubtitleItem[] = (payload.subtitles || []).map(
    (sub, index) => ({
      id: `sub_${index}`,
      text: sub.text,
      start_frame: Math.round(sub.start * fps),
      end_frame: Math.round(sub.end * fps),
      style: (sub.style ||
        payload.subtitleStyle ||
        "default") as TimelineSubtitleItem["style"],
      position: (sub.position as TimelineSubtitleItem["position"]) || "bottom",
      config: {
        backgroundColor: sub.backgroundColor,
        color: sub.textColor,
        fontSize: sub.fontSize,
        fontFamily: sub.fontFamily,
        ...sub.config,
      },
      words: sub.words?.map((w) => ({
        word: w.word,
        start_frame: Math.max(0, Math.round((w.start - sub.start) * fps)),
        end_frame: Math.max(1, Math.round((w.end - sub.start) * fps)),
      })),
    }),
  );

  // --- Build overlay track ---------------------------------------------------
  const overlayTrack: TimelineOverlayItem[] = (payload.overlays || []).map(
    (ov, index) => ({
      id: `overlay_${index}`,
      src: ov.src,
      start_frame: Math.round(ov.start * fps),
      end_frame: Math.round(ov.end * fps),
      position: (ov.position as TimelineOverlayItem["position"]) || "top-right",
      width: ov.width ?? 120,
      opacity: ov.opacity ?? 1.0,
      animation: ov.animation === "fade" ? "fade" : "none",
    }),
  );

  // --- Build audio track -----------------------------------------------------
  const latestSubtitleEnd =
    subtitleTrack.length > 0
      ? Math.max(...subtitleTrack.map((s) => s.end_frame))
      : 0;
  const totalFrames = Math.max(currentFrame, latestSubtitleEnd);

  const audioTrack: TimelineAudioItem[] = [];

  if (payload.voiceOver) {
    audioTrack.push({
      id: "voiceover",
      url: payload.voiceOver,
      type: "voiceover",
      start_frame: 0,
      end_frame: totalFrames,
      volume: payload.voiceOverVolume ?? 1.0,
      fade_in_frames: 0,
      fade_out_frames: 10,
    });
  }

  if (payload.music) {
    audioTrack.push({
      id: "music",
      url: payload.music,
      type: "music",
      start_frame: 0,
      end_frame: totalFrames,
      volume: payload.musicVolume ?? 0.3,
      fade_in_frames: 15,
      fade_out_frames: 15,
    });
  }

  // --- Assemble EditState ----------------------------------------------------
  return {
    version: 1,
    project_id: payload.projectId ?? "unknown",
    fps,
    total_frames: totalFrames,
    width,
    height,
    tracks: {
      video: videoTrack,
      subtitles: subtitleTrack,
      overlays: overlayTrack,
      motion_graphics: [],
      audio: audioTrack,
    },
    metadata: {
      platform: null,
      language: payload.language ?? "en",
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
    },
  };
}
