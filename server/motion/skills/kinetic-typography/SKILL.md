# Kinetic typography

Choose short readable phrases, a clear type hierarchy and generous safe areas. Use type fit and masked reveals. Preserve Arabic shaping and the user’s language.

Skill version 1 requires renderer version 1 and component version 1. Input contract MotionPlan. Output contract MotionScene.

Supported components are kinetic_words, impact. Available tools for eligible roles are get_motion_component_schema, patch_motion_scene.

Reduce the number of words or lengthen the scene if copy has too little hold time.

```json
[
  {
    "brief": "Reveal four short English words with a masked rise and a repeated low-contrast background.",
    "scene": {
      "id": "kinetic-typography-1",
      "type": "kinetic_words",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "words": [
          "TIMING",
          "SPACING",
          "FEEL"
        ]
      }
    }
  },
  {
    "brief": "Use an Arabic headline with the system font fallback and two deliberate lines.",
    "scene": {
      "id": "kinetic-typography-2",
      "type": "impact",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "headline": "MAKE IDEAS MOVE"
      }
    }
  }
]
```
