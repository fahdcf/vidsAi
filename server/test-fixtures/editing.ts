import { normalizeDocument } from "../../shared/contracts/index";
export function fixture(projectId = "fixture") {
  return normalizeDocument({
    version: 1,
    project_id: projectId,
    fps: 30,
    total_frames: 60,
    width: 640,
    height: 360,
    tracks: {
      video: [
        {
          id: "a",
          clip_url: "migration-fixtures/red.svg",
          media_type: "image",
          start_frame: 0,
          end_frame: 30,
          trim_in: 0,
          trim_out: 30,
          animation: "none",
          transition_out: { type: "fade", duration_frames: 5 },
          speed: 1,
          color_grade: null,
          volume: 0,
        },
        {
          id: "b",
          clip_url: "migration-fixtures/blue.svg",
          media_type: "image",
          start_frame: 30,
          end_frame: 60,
          trim_in: 0,
          trim_out: 30,
          animation: "none",
          transition_out: null,
          speed: 1,
          color_grade: null,
          volume: 0,
        },
      ],
      subtitles: [
        {
          id: "s",
          text: "Hello · مرحبا بالعالم",
          start_frame: 0,
          end_frame: 60,
          style: "default",
          position: "bottom",
          config: { fontSize: "24px" },
        },
      ],
      audio: [],
      overlays: [],
      motion_graphics: [],
    },
    metadata: {
      language: "ar",
      platform: null,
      created_at: "2026-11-01T00:00:00Z",
      last_modified: "2026-11-01T00:00:00Z",
    },
  });
}
