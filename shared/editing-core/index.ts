import { z } from "zod";
import { applyMotionEdit, motionEditParameters } from "../motion/edit";
import {
  normalizeDocument,
  styles,
  transitions,
  type Document,
  type Operation,
} from "../contracts/index";
const id = z.string().min(1);
const volume = z.number().min(0).max(1);
const audioVolume = z.number().min(0).max(2);
const frame = z.number().int().nonnegative();
const schemas = {
  set_subtitle_style: z.object({
    style: z.enum(styles),
    scene_id: id.optional(),
    style_config: z.record(z.string(), z.unknown()).optional(),
  }),
  set_transition: z.object({
    type: z.enum(transitions),
    duration_frames: frame.default(15),
    clip_index: frame.optional(),
  }),
  set_music: z.object({
    url: z.string().url().nullable().optional(),
    volume: volume.default(0.3),
  }),
  set_volume: z.object({
    track: z.enum(["voiceover", "music", "sfx"]),
    volume: audioVolume,
  }),
  reorder_scenes: z.object({ order: z.array(id) }),
  update_subtitle_config: z.object({
    config: z.record(z.string(), z.unknown()),
    scene_id: id.optional(),
    size_direction: z.enum(["bigger", "smaller"]).optional(),
  }),
  trim_clip: z.object({
    id,
    trim_in: frame,
    trim_out: frame,
    speed: z.number().min(0.1).max(8).optional(),
  }),
  replace_asset: z.object({
    id,
    url: z.string().url(),
    media_type: z.enum(["video", "image", "generated"]),
    asset_id: z.string().optional(),
  }),
  set_animation: z.object({
    id,
    animation: z.enum(["none", "zoom-in", "zoom-out"]),
  }),
  update_subtitle: z.object({
    id,
    text: z.string(),
    start_frame: frame.optional(),
    end_frame: frame.optional(),
  }),
  add_overlay: z.object({
    id,
    src: z.string().url(),
    start_frame: frame,
    end_frame: frame,
    position: z
      .enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"])
      .default("center"),
    width: z.number().positive().default(25),
    opacity: volume.default(1),
    animation: z.enum(["fade", "none"]).default("fade"),
  }),
  remove_overlay: z.object({ id }),
  set_audio_timing: z.object({
    id,
    start_frame: frame,
    end_frame: frame,
    fade_in_frames: frame,
    fade_out_frames: frame,
  }),
  set_format: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  set_duration: z.object({
    total_frames: z.number().int().positive(),
    preserve_narration: z.boolean().default(true),
  }),
};
export const toolNames = Object.keys(schemas);
export const motionToolNames = Object.keys(motionEditParameters);
export { schemas as editingToolParameters };
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    const error = new Error(message);
    error.name = "EditingValidationError";
    throw error;
  }
}
export function applyOperations(input: unknown, ops: Operation[]): Document {
  const d = normalizeDocument(input);
  for (const op of ops) {
    if (motionToolNames.includes(op.tool)) {
      applyMotionEdit(d, op);
      continue;
    }
    assert(Object.hasOwn(schemas, op.tool), `Unknown tool: ${op.tool}`);
    // Each branch validates its own argument type before changing the document.
    switch (op.tool) {
      case "set_subtitle_style": {
        const p = schemas.set_subtitle_style.parse(op.params);
        d.tracks.subtitles.forEach((s) => {
          if (!p.scene_id || s.id === p.scene_id) {
            s.style = p.style;
            s.config = { ...s.config, ...p.style_config };
          }
        });
        break;
      }
      case "set_transition": {
        const p = schemas.set_transition.parse(op.params);
        if (p.clip_index !== undefined)
          assert(p.clip_index < d.tracks.video.length, "Unknown clip index");
        d.tracks.video.forEach((c, i) => {
          if (p.clip_index === undefined || p.clip_index === i)
            c.transition_out =
              i === d.tracks.video.length - 1 || p.type === "none"
                ? null
                : { type: p.type, duration_frames: p.duration_frames };
        });
        break;
      }
      case "set_music": {
        const p = schemas.set_music.parse(op.params);
        d.tracks.audio = d.tracks.audio.filter((a) => a.type !== "music");
        if (p.url)
          d.tracks.audio.push({
            id: "music",
            url: p.url,
            type: "music",
            start_frame: 0,
            end_frame: d.total_frames,
            volume: p.volume,
            fade_in_frames: Math.min(15, d.total_frames),
            fade_out_frames: Math.min(15, d.total_frames),
          });
        break;
      }
      case "set_volume": {
        const p = schemas.set_volume.parse(op.params);
        d.tracks.audio.forEach((a) => {
          if (a.type === p.track) a.volume = p.volume;
        });
        break;
      }
      case "reorder_scenes": {
        const p = schemas.reorder_scenes.parse(op.params);
        const clips = d.tracks.video;
        assert(
          p.order.length === clips.length &&
            new Set(p.order).size === clips.length &&
            p.order.every((x) => clips.some((c) => c.id === x)),
          "Order must contain every clip exactly once",
        );
        let at = 0;
        d.tracks.video = p.order.map((x) => {
          const c = clips.find((c) => c.id === x)!;
          const duration = c.end_frame - c.start_frame;
          const out = { ...c, start_frame: at, end_frame: at + duration };
          at += duration;
          return out;
        });
        break;
      }
      case "update_subtitle_config": {
        const p = schemas.update_subtitle_config.parse(op.params);
        assert(Object.keys(p.config).length, "Empty caption configuration");
        const allowed = [
          "fontSize",
          "backgroundColor",
          "textColor",
          "color",
          "fontFamily",
          "position",
          "borderRadius",
          "opacity",
          "highlightColor",
          "topTextColor",
          "bottomTextColor",
          "paddingX",
          "paddingY",
          "bold",
        ];
        assert(
          Object.keys(p.config).every((k) => allowed.includes(k)),
          "Unknown caption setting",
        );
        if (p.size_direction) {
          const current = parseFloat(
            String(d.tracks.subtitles[0]?.config.fontSize ?? 32),
          );
          p.config.fontSize = `${Math.max(16, Math.min(96, current + (p.size_direction === "bigger" ? 12 : -12)))}px`;
        }
        if (p.config.position)
          z.enum(["top", "center", "bottom"]).parse(p.config.position);
        d.tracks.subtitles.forEach((s) => {
          if (!p.scene_id || s.id === p.scene_id) {
            s.config = { ...s.config, ...p.config };
            if (p.config.position)
              s.position = p.config.position as typeof s.position;
          }
        });
        break;
      }
      case "trim_clip": {
        const p = schemas.trim_clip.parse(op.params);
        const c = d.tracks.video.find((c) => c.id === p.id);
        assert(c, "Unknown clip");
        assert(p.trim_out > p.trim_in, "Trim end must follow start");
        c.trim_in = p.trim_in;
        c.trim_out = p.trim_out;
        c.speed = p.speed ?? c.speed;
        break;
      }
      case "replace_asset": {
        const p = schemas.replace_asset.parse(op.params);
        const c = d.tracks.video.find((c) => c.id === p.id);
        assert(c, "Unknown clip");
        c.clip_url = p.url;
        c.media_type = p.media_type;
        if (p.asset_id) (c as any).asset_id = p.asset_id;
        break;
      }
      case "set_animation": {
        const p = schemas.set_animation.parse(op.params);
        const c = d.tracks.video.find((c) => c.id === p.id);
        assert(c, "Unknown clip");
        c.animation = p.animation;
        break;
      }
      case "update_subtitle": {
        const p = schemas.update_subtitle.parse(op.params);
        const s = d.tracks.subtitles.find((s) => s.id === p.id);
        assert(s, "Unknown subtitle");
        Object.assign(s, p);
        delete s.words;
        break;
      }
      case "add_overlay": {
        d.tracks.overlays.push(schemas.add_overlay.parse(op.params));
        break;
      }
      case "remove_overlay": {
        const p = schemas.remove_overlay.parse(op.params);
        assert(
          d.tracks.overlays.some((o) => o.id === p.id),
          "Unknown overlay",
        );
        d.tracks.overlays = d.tracks.overlays.filter((o) => o.id !== p.id);
        break;
      }
      case "set_audio_timing": {
        const p = schemas.set_audio_timing.parse(op.params);
        const a = d.tracks.audio.find((a) => a.id === p.id);
        assert(a, "Unknown audio track");
        Object.assign(a, p);
        break;
      }
      case "set_format": {
        const p = schemas.set_format.parse(op.params);
        d.width = p.width;
        d.height = p.height;
        break;
      }
      case "set_duration": {
        const p = schemas.set_duration.parse(op.params);
        if (p.preserve_narration)
          assert(
            d.tracks.audio
              .filter((a) => a.type === "voiceover")
              .every((a) => a.end_frame <= p.total_frames),
            "The requested duration would cut narration. Change narration timing first.",
          );
        d.total_frames = p.total_frames;
        if (d.metadata.motion_cues) {
          d.metadata.motion_cues = d.metadata.motion_cues.filter((cue) => cue.frame < p.total_frames);
        }
        d.tracks.video = d.tracks.video
          .filter((c) => c.start_frame < p.total_frames)
          .map((c) => ({
            ...c,
            end_frame: Math.min(c.end_frame, p.total_frames),
          }));
        d.tracks.motion_graphics = d.tracks.motion_graphics
          .filter((scene) => scene.start_frame < p.total_frames)
          .map((scene) => {
            const end_frame = Math.min(scene.end_frame, p.total_frames);
            const trimmed = { ...scene, end_frame };
            if (trimmed.transitionIn && trimmed.transitionIn.frames >= end_frame - scene.start_frame) {
              delete trimmed.transitionIn;
            }
            return trimmed;
          });
        assert(d.tracks.video.length || d.tracks.motion_graphics.length, "A video needs at least one scene");
        const last = d.tracks.video.at(-1);
        if (last) {
          last.end_frame = p.total_frames;
          last.transition_out = null;
        } else {
          const finalMotion = d.tracks.motion_graphics.reduce((latest, scene) =>
            scene.end_frame > latest.end_frame ? scene : latest);
          finalMotion.end_frame = p.total_frames;
        }
        d.tracks.subtitles = d.tracks.subtitles
          .filter((s) => s.start_frame < p.total_frames)
          .map((s) => {
            const end_frame = Math.min(s.end_frame, p.total_frames);
            const duration = end_frame - s.start_frame;
            return {
              ...s,
              end_frame,
              ...(s.words
                ? {
                    words: s.words
                      .filter((w) => w.start_frame < duration)
                      .map((w) => ({
                        ...w,
                        end_frame: Math.min(w.end_frame, duration),
                      })),
                  }
                : {}),
            };
          });
        d.tracks.audio = d.tracks.audio
          .filter((a) => a.start_frame < p.total_frames)
          .map((a) => ({
            ...a,
            end_frame: Math.min(a.end_frame, p.total_frames),
          }));
        d.tracks.overlays = d.tracks.overlays
          .filter((o) => o.start_frame < p.total_frames)
          .map((o) => ({
            ...o,
            end_frame: Math.min(o.end_frame, p.total_frames),
          }));
        break;
      }
      default:
        throw new Error("Unsupported operation");
    }
  }
  // Captions and narration remain anchored to absolute timeline time on reorder/trim.
  d.revision++;
  d.version = d.revision;
  d.metadata.last_modified = new Date().toISOString();
  return normalizeDocument(d);
}
