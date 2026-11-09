# Audio and pacing

Anchor important visual changes to reliable cues where appropriate. Preserve narration duration. A user-selected audio file and a licensed track are separate provenance sources.

Skill version 1 requires renderer version 1 and component version 1. Input contract MotionCues. Output contract MotionScene.

Supported components are impact, easing. Available tools for eligible roles are validate_motion_document, patch_motion_scene.

Avoid forcing beats when onset confidence is low. Preserve an explicit manual cue.

```json
[
  {
    "brief": "Shift an impact slightly to meet a reliable beat cue inside the scene.",
    "scene": {
      "id": "audio-and-pacing-1",
      "type": "impact",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "headline": "MAKE IDEAS MOVE"
      }
    }
  },
  {
    "brief": "Give an easing comparison enough time to show all three trajectories.",
    "scene": {
      "id": "audio-and-pacing-2",
      "type": "easing",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "heading": "EASING"
      }
    }
  }
]
```
