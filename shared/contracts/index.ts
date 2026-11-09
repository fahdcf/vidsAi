import { z } from "zod";
import type { EditState } from "../timeline";
import { motionCuesSchema, motionGenerationSchema, motionTrackSchema } from "../motion/schema";
export { getClipSequenceTiming } from "./clip-sequence";
export const browserPlanningLimitsSchema = z.object({
  version: z.literal(1),
  maxSeconds: z.number().int().min(1).max(60),
  maxFps: z.number().int().min(1).max(30),
  maxClips: z.number().int().min(1).max(20),
  maxActiveVideo: z.number().int().min(1).max(2),
  maxActiveAudio: z.number().int().min(1).max(2),
  maxOverlays: z.number().int().min(1).max(10),
});
export type BrowserPlanningLimits = z.infer<typeof browserPlanningLimitsSchema>;
export const styles = [
  "progressive_highlight",
  "tiktok_trending",
  "arabic_banner",
  "rectangular",
  "rounded_progressive",
  "rectangular_banner",
  "default",
] as const;
export const transitions = [
  "fade",
  "zoom-in",
  "zoom-out",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
  "none",
] as const;
const frame = z.number().int().nonnegative();
const span = { id: z.string().min(1), start_frame: frame, end_frame: frame };
const config = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.never()).transform(() => ({})),
]);
export const documentSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: frame,
    version: frame,
    project_id: z.string(),
    fps: z.number().int().min(1).max(120),
    total_frames: z.number().int().positive(),
    width: z.number().int().min(2).max(7680),
    height: z.number().int().min(2).max(7680),
    tracks: z
      .object({
        video: z.array(
          z
            .object({
              ...span,
              clip_url: z.string().min(1),
              asset_id: z.string().optional(),
              media_type: z.enum(["video", "image", "generated"]),
              trim_in: frame,
              trim_out: frame,
              animation: z.enum(["none", "zoom-in", "zoom-out"]),
              transition_out: z
                .object({ type: z.enum(transitions), duration_frames: frame })
                .nullable(),
              speed: z.number().min(0.1).max(8),
              volume: z.number().min(0).max(1),
              color_grade: z.string().nullable(),
            })
            .passthrough(),
        ),
        subtitles: z.array(
          z
            .object({
              ...span,
              text: z.string(),
              style: z.enum(styles),
              position: z.enum(["top", "center", "bottom"]),
              config,
              words: z
                .array(
                  z.object({
                    word: z.string(),
                    start_frame: frame,
                    end_frame: frame,
                  }),
                )
                .optional(),
            })
            .passthrough(),
        ),
        overlays: z.array(
          z
            .object({
              ...span,
              src: z.string().min(1),
              position: z.enum([
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "center",
              ]),
              width: z.number().positive(),
              opacity: z.number().min(0).max(1),
              animation: z.enum(["fade", "none"]),
            })
            .passthrough(),
        ),
        audio: z.array(
          z
            .object({
              ...span,
              url: z.string().min(1),
              type: z.enum(["music", "voiceover", "sfx"]),
              volume: z.number().min(0).max(2),
              fade_in_frames: frame,
              fade_out_frames: frame,
            })
            .passthrough(),
        ),
        motion_graphics: motionTrackSchema,
      })
      .passthrough(),
    metadata: z
      .object({
        workflow: z.enum(["video_from_scratch", "motion_graphics"]).default("video_from_scratch"),
        motion_cues: motionCuesSchema.optional(),
        motion_generation: motionGenerationSchema.optional(),
        language: z.string(),
        platform: z.string().nullable(),
        created_at: z.string(),
        last_modified: z.string(),
      })
      .passthrough(),
  })
  .passthrough()
  .superRefine((d, ctx) => {
    if (d.metadata.motion_cues?.some((cue) => cue.frame >= d.total_frames)) {
      ctx.addIssue({ code: "custom", message: "Audio cues must fall inside the project." });
    }
    if (d.width % 2 || d.height % 2)
      ctx.addIssue({
        code: "custom",
        message: "Video dimensions must be even.",
      });
    for (const [name, items] of Object.entries(d.tracks)) {
      if (!Array.isArray(items)) continue;
      const ids = new Set<string>();
      for (const item of items as {
        id: string;
        start_frame: number;
        end_frame: number;
      }[]) {
        if (
          ids.has(item.id) ||
          item.end_frame <= item.start_frame ||
          item.end_frame > d.total_frames
        )
          ctx.addIssue({
            code: "custom",
            message: `Invalid interval or duplicate ID in ${name}.`,
          });
        ids.add(item.id);
      }
    }
  });
export type Document = EditState & { schemaVersion: 1; revision: number };
export function normalizeDocument(input: unknown): Document {
  const d = structuredClone(input) as Document;
  d.schemaVersion ??= 1;
  d.revision ??= d.version ?? 1;
  d.version = d.revision;
  d.tracks.motion_graphics ??= [];
  return documentSchema.parse(d) as Document;
}
export const operationSchema = z
  .object({
    tool: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type Operation = z.infer<typeof operationSchema>;
export const commandSchema = z
  .object({
    commandId: z.string().uuid(),
    projectId: z.string(),
    expectedRevision: frame,
    operations: z.array(operationSchema).min(1).max(30),
  })
  .strict();
