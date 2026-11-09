# Geometry and particles

Use bounded geometry counts. Add depth through scale, perspective and speed differences. Prefer a radial reveal and a clear focal point.

Skill version 1 requires renderer version 1 and component version 1. Input contract MotionPlan. Output contract MotionScene.

Supported components are grid, tunnel. Available tools for eligible roles are get_motion_component_schema, build_motion_scene.

Reduce overlapping complexity when a scene exceeds its browser budget.

```json
[
  {
    "brief": "Morph a field of squares into circles in a radial wave.",
    "scene": {
      "id": "geometry-and-particles-1",
      "type": "grid",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "columns": 21,
        "rows": 13
      }
    }
  },
  {
    "brief": "Move through nested hexagons before resolving into a particle sphere.",
    "scene": {
      "id": "geometry-and-particles-2",
      "type": "tunnel",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "sides": 6,
        "sphereParticles": 420
      }
    }
  }
]
```
