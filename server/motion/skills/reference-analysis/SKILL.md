# Reference analysis

Distinguish measured timestamps, swatches and cut candidates from estimated scene boundaries. Describe only visible lettering and positions. A still image can support visual composition and palette, with timing set to null.

Skill version 1 requires renderer version 1 and component version 1. Input contract ReferenceAnalysis. Output contract MotionScene.

Supported components are kinetic_words, graph. Available tools for eligible roles are validate_motion_document, get_motion_component_schema.

Unreadable text uses null. Ask for a closer sample if the copy is essential.

```json
[
  {
    "brief": "Sample a title before and after its reveal. Use the first visible word and label its timing estimated.",
    "scene": {
      "id": "reference-analysis-1",
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
    "brief": "Use an image of a colored circle to guide the composition. Leave motion observations empty.",
    "scene": {
      "id": "reference-analysis-2",
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
