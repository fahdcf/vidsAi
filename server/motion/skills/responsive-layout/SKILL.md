# Responsive layout

Compose for the requested aspect ratio. Reflow the mark and text in portrait and keep the primary message within the safe area.

Skill version 1 requires renderer version 1 and component version 1. Input contract MotionPlan. Output contract MotionScene.

Supported components are identity, kinetic_words. Available tools for eligible roles are get_motion_component_schema, patch_motion_scene.

Correct overflow through wrapping, shorter approved copy or a smaller type size.

```json
[
  {
    "brief": "Put the logo above the title for a portrait closing card.",
    "scene": {
      "id": "responsive-layout-1",
      "type": "identity",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "title": "VIDSAI",
        "detail": "MOTION DESIGN"
      }
    }
  },
  {
    "brief": "Use fewer words and additional inset in a square composition.",
    "scene": {
      "id": "responsive-layout-2",
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
  }
]
```
