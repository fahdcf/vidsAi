# Liquid and vectors

Use procedural blobs for editable organic motion. Use a vector artifact only when a reference interval and colors isolate the intended shape. A traced vector has a stable owned asset ID and explicit source provenance.

Skill version 1 requires renderer version 1 and component version 1. Input contract ReferenceAnalysis. Output contract MotionScene.

Supported components are liquid, graph. Available tools for eligible roles are get_motion_component_schema, build_motion_scene.

Use procedural liquid when no validated vector asset is available.

```json
[
  {
    "brief": "Build an orange and pink liquid scene with six moving blobs.",
    "scene": {
      "id": "liquid-and-vector-tracing-1",
      "type": "liquid",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "mode": "procedural",
        "blobs": 6
      }
    }
  },
  {
    "brief": "Use a bounded closed path as an editable approximation when color tracing cannot isolate the reference.",
    "scene": {
      "id": "liquid-and-vector-tracing-2",
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
