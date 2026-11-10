import type { MotionAudioAnalysis, MotionCue, MotionGeneration, MotionScene } from "./motion/schema";

// remotion/types/timeline.ts
// Master data contract for VidsAI video edit state.
// This single object drives: Remotion render, browser Player preview,
// AI agent tool execution, chat editing, and future manual timeline editor.
// DO NOT modify field names without updating all consumers.

export type TransitionType =
  | 'fade'
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'none';

export type AnimationType = 'zoom-in' | 'zoom-out' | 'none';

export type MediaType = 'video' | 'image' | 'generated';

export type SubtitleStyle =
  | 'progressive_highlight'
  | 'tiktok_trending'
  | 'arabic_banner'
  | 'rectangular'
  | 'rounded_progressive'
  | 'rectangular_banner'
  | 'default';

export type SubtitlePosition = 'top' | 'center' | 'bottom';

export type OverlayPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export type AudioType = 'voiceover' | 'music' | 'sfx';

export type Platform = 'tiktok' | 'youtube' | 'reels' | 'ads' | null;
export type ProjectWorkflow = 'video_from_scratch' | 'motion_graphics';

// --- Track Item Interfaces ---------------------------------------------------

export interface TransitionConfig {
  type: TransitionType;
  duration_frames: number;
}

export interface TimelineClipItem {
  id: string;
  clip_url: string;
  media_type: MediaType;
  /** Absolute frame on the timeline where this clip starts */
  start_frame: number;
  /** Absolute frame on the timeline where this clip ends */
  end_frame: number;
  /** Frame offset into the source clip to start playing from */
  trim_in: number;
  /** Frame offset into the source clip to stop playing at */
  trim_out: number;
  animation: AnimationType;
  /** Transition to apply at the END of this clip going into the next. Null for last clip. */
  transition_out: TransitionConfig | null;
  /** Playback speed multiplier. 1.0 = normal, 0.5 = half speed, 2.0 = double speed */
  speed: number;
  /** Reserved for future color grading presets */
  color_grade: string | null;
  /** Volume for clips that have embedded audio (0.0 to 1.0) */
  volume: number;
}

export interface SubtitleConfig {
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  bold?: boolean;
}

export interface TimelineSubtitleItem {
  id: string;
  text: string;
  start_frame: number;
  end_frame: number;
  style: SubtitleStyle;
  position: SubtitlePosition;
  config: Record<string, unknown>;
  /** Word-level timing data from Deepgram for progressive_highlight style */
  words?: Array<{
    word: string;
    start_frame: number;
    end_frame: number;
  }>;
}

export interface TimelineOverlayItem {
  id: string;
  src: string;
  start_frame: number;
  end_frame: number;
  position: OverlayPosition;
  width: number;
  opacity: number;
  animation: 'fade' | 'none';
}

export interface TimelineAudioItem {
  id: string;
  url: string;
  type: AudioType;
  start_frame: number;
  end_frame: number;
  /** Volume multiplier. 1.0 = original, 0.3 = ducked under voiceover */
  volume: number;
  fade_in_frames: number;
  fade_out_frames: number;
}

// --- Master Edit State -------------------------------------------------------

export interface EditStateTracks {
  video: TimelineClipItem[];
  subtitles: TimelineSubtitleItem[];
  overlays: TimelineOverlayItem[];
  motion_graphics: MotionScene[];
  audio: TimelineAudioItem[];
}

export interface EditStateMetadata {
  workflow?: ProjectWorkflow;
  motion_cues?: MotionCue[];
  motion_audio_analysis?: MotionAudioAnalysis;
  motion_speech_requested?: boolean;
  motion_audio_source?: "reference" | "uploaded" | "silent" | "muted";
  motion_generation?: MotionGeneration;
  platform: Platform;
  language: string;
  created_at: string;
  last_modified: string;
}

export interface EditState {
  /** Increments on every change. Used for versioning and cache busting. */
  version: number;
  project_id: string;
  fps: number;
  total_frames: number;
  /** Composition width in pixels. 1080 for 9:16 and 1:1, 1920 for 16:9 */
  width: number;
  /** Composition height in pixels. 1920 for 9:16, 1080 for 16:9, 1080 for 1:1 */
  height: number;
  tracks: EditStateTracks;
  metadata: EditStateMetadata;
}
