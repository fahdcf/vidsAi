# Visual critique

Inspect actual preview pixels at representative timestamps. Judge readability, hierarchy, palette, pacing and brief adherence. Propose bounded repairs tied to a scene ID.

Skill version 1 requires renderer version 1 and component version 1. Input contract RenderedPreview. Output contract MotionOperations.

Supported components are identity, graph. Available tools for eligible roles are validate_motion_document, patch_motion_scene.

Request another preview when the relevant animation moment is missing.

```json
[
  {
    "brief": "Check the title after its reveal and increase its safe inset if it touches the edge.",
    "scene": {
      "id": "visual-critique-1",
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
    "brief": "Check one image before and one after a transition to distinguish a planned mask from an unintended blank.",
    "scene": {
      "id": "visual-critique-2",
      "type": "graph",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "layers": [
          {
            "id": "shape",
            "kind": "ellipse",
            "width": 0.25,
            "height": 0.25,
            "color": "primary"
          }
        ]
      }
    }
  }
]
```
