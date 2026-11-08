import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./test-fixtures/editing";
import { applyOperations } from "../shared/editing-core/index";
import { normalizeDocument } from "../shared/contracts/index";
import { legacyPayloadToEditState } from "./legacy-document";
import { plan } from "./agent/planner";
test("legacy requests preserve source offsets, word timing, custom canvas and audio gain", () => {
  const d = normalizeDocument(
    legacyPayloadToEditState({
      clips: ["movie.mp4"],
      clipDurations: [3],
      clipStartTimes: [2],
      clipEndTimes: [5],
      fps: 24,
      width: 640,
      height: 480,
      voiceOver: "voice.wav",
      voiceOverVolume: 1.3,
      subtitles: [
        {
          text: "Hello",
          start: 1,
          end: 2,
          fontSize: "32px",
          fontFamily: "Arial",
          words: [{ word: "Hello", start: 1, end: 2 }],
        },
      ],
    }),
  );
  assert.equal(d.tracks.video[0].trim_in, 48);
  assert.equal(d.tracks.video[0].trim_out, 120);
  assert.equal(d.width, 640);
  assert.equal(d.fps, 24);
  assert.equal(d.tracks.subtitles[0].words?.[0].start_frame, 0);
  assert.equal(d.tracks.subtitles[0].config.fontSize, "32px");
  assert.equal(d.tracks.audio[0].volume, 1.3);
});
test("shortening preserves narration and bounds every surviving track", () => {
  const d = fixture();
  d.tracks.audio = [
    {
      id: "voice",
      type: "voiceover",
      url: "voice.wav",
      start_frame: 0,
      end_frame: 30,
      volume: 1,
      fade_in_frames: 0,
      fade_out_frames: 0,
    },
  ];
  const next = applyOperations(d, [
    { tool: "set_duration", params: { total_frames: 40 } },
  ]);
  assert.equal(next.total_frames, 40);
  assert.equal(next.tracks.video.at(-1)?.end_frame, 40);
  assert.equal(next.tracks.subtitles[0].end_frame, 40);
  assert.equal(next.tracks.audio[0].end_frame, 30);
  assert.throws(
    () =>
      applyOperations(d, [
        { tool: "set_duration", params: { total_frames: 20 } },
      ]),
    /cut narration/,
  );
});
test("agent evaluation tasks restyle, reformat and shorten without providers", async () => {
  const d = fixture();
  const result = await plan(
    "Use tiktok trending captions and make a square version and shorten to 1.5 seconds",
    d,
    { providers: false },
  );
  assert.equal(result.operations.length, 3);
  const next = applyOperations(d, result.operations);
  assert.equal(next.tracks.subtitles[0].style, "tiktok_trending");
  assert.equal(next.width, next.height);
  assert.equal(next.total_frames, 45);
  assert.equal(next.revision, 2);
});
test("legacy normalization preserves trim, captions, dimensions and unknown metadata", () => {
  const d = fixture();
  d.tracks.video[0].trim_in = 3;
  Object.assign(d.metadata, { custom: "keep" });
  const out = normalizeDocument(d);
  assert.deepEqual(out, d);
  assert.equal(out.schemaVersion, 1);
  assert.equal(out.revision, 1);
});
test("reorder is complete, deterministic, immutable and preserves narration timing", () => {
  const d = fixture();
  const out = applyOperations(d, [
    { tool: "reorder_scenes", params: { order: ["b", "a"] } },
  ]);
  assert.deepEqual(
    out.tracks.video.map((c) => [c.id, c.start_frame, c.end_frame]),
    [
      ["b", 0, 30],
      ["a", 30, 60],
    ],
  );
  assert.deepEqual(out.tracks.subtitles, d.tracks.subtitles);
  assert.equal(d.tracks.video[0].id, "a");
  assert.equal(out.revision, 2);
  for (const order of [["a"], ["a", "a"], ["a", "unknown"]])
    assert.throws(() =>
      applyOperations(d, [{ tool: "reorder_scenes", params: { order } }]),
    );
});
test("all six existing tools and additional editing operations validate as one revision", () => {
  const d = applyOperations(fixture(), [
    { tool: "set_subtitle_style", params: { style: "arabic_banner" } },
    { tool: "set_transition", params: { type: "slide-left" } },
    {
      tool: "set_music",
      params: { url: "https://example.com/music.mp3", volume: 0.2 },
    },
    { tool: "set_volume", params: { track: "music", volume: 0.4 } },
    {
      tool: "update_subtitle_config",
      params: { config: { fontSize: "48px", position: "top" } },
    },
    { tool: "trim_clip", params: { id: "a", trim_in: 4, trim_out: 20 } },
    {
      tool: "add_overlay",
      params: {
        id: "logo",
        src: "https://example.com/logo.png",
        start_frame: 0,
        end_frame: 30,
      },
    },
    { tool: "set_format", params: { width: 1080, height: 1350 } },
  ]);
  assert.equal(d.revision, 2);
  assert.equal(d.tracks.audio[0].volume, 0.4);
  assert.equal(d.tracks.subtitles[0].position, "top");
  assert.equal(d.tracks.video[0].trim_in, 4);
  assert.equal(d.tracks.overlays.length, 1);
  assert.equal(d.width, 1080);
});
test("reject invalid dimensions, versions, tools, timing and volumes", () => {
  assert.throws(() => normalizeDocument({ ...fixture(), schemaVersion: 2 }));
  assert.throws(() => normalizeDocument({ ...fixture(), height: 823 }));
  for (const op of [
    { tool: "unknown", params: {} },
    { tool: "set_volume", params: { track: "music", volume: 5 } },
    { tool: "trim_clip", params: { id: "a", trim_in: 8, trim_out: 2 } },
    { tool: "set_format", params: { width: 1080, height: 823 } },
  ])
    assert.throws(() => applyOperations(fixture(), [op]));
});
test("legacy ratios use the same valid canvas as the renderer", () => {
  for (const [ratio, w, h] of [
    ["4:5", 1080, 1350],
    ["21:9", 1920, 824],
    ["3:2", 1620, 1080],
  ] as const) {
    const d = legacyPayloadToEditState({
      clips: ["clip.mp4"],
      aspectRatio: ratio,
    });
    assert.equal(d.width, w);
    assert.equal(d.height, h);
  }
});
test("local agent prepares a multi-step request without external providers", async () => {
  const result = await plan(
    "Make captions bigger and use fade transitions",
    fixture(),
  );
  assert.equal(result.operations.length, 2);
  const d = applyOperations(fixture(), result.operations);
  assert.equal(d.tracks.subtitles[0].config.fontSize, "36px");
  assert.equal(d.tracks.video[0].transition_out?.type, "fade");
});
