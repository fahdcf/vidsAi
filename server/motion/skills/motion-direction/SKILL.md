# Motion direction

Establish one premise and a visual progression. Reserve a readable final hold. Assign each scene a role and preserve the brief’s wording when explicitly requested.

Skill version 1 requires renderer version 1 and component version 1. Input contract ReferenceAnalysis. Output contract MotionPlan.

Supported components are impact, identity. Available tools for eligible roles are list_motion_components, propose_motion_plan.

A timeline gap fails the compiler. Fit all scenes to the chosen frame duration.

```json
[
  {
    "brief": "Introduce an idea with an impact and keep the headline visible long enough to read.",
    "scene": {
      "id": "motion-direction-1",
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
    "brief": "Close with a brand name and one short supporting line.",
    "scene": {
      "id": "motion-direction-2",
      "type": "identity",
      "componentVersion": 1,
      "start_frame": 0,
      "end_frame": 60,
      "params": {
        "title": "VIDSAI",
        "detail": "MOTION DESIGN"
      }
    }
  }
]
```
