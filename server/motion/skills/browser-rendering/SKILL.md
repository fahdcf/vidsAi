# Browser rendering

Design within the declared output profile. Use integer frame boundaries, deterministic seeds, stable project-owned assets and a short resource budget.

Skill version 2 requires renderer version 1 and component version 1. Input contract MotionPlan. Output contract MotionScene.

Supported components are grid, liquid. Available tools for eligible roles are validate_motion_document, get_motion_component_schema.

Fix invalid scene intervals before requesting an actual preview.

Compile scene modules before preview. Repair the cited source line with a bounded patch and validate the new build in the browser before integration.

```json
[
  {
    "brief": "Limit the grid to the supported row and column counts.",
    "scene": {
      "id": "browser-rendering-1",
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
    "brief": "Choose procedural liquid when there is no verified vector asset and preserve the browser output profile.",
    "scene": {
      "id": "browser-rendering-2",
      "type": "liquid",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "mode": "procedural",
        "blobs": 6
      }
    }
  }
]
```
