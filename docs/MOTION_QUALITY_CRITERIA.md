# Motion graphics acceptance criteria

These thresholds are frozen before the live model run. The verification report records each outcome and any remaining defects.

## Required checks

- The run starts from a new project, an editable brief, and the supplied reference. The motion director, reference analyst, copywriter, visual designer, motion engineer, and visual critic each produce a separate artifact. Diagnostics show thinking on roles configured to use it.
- The saved 15-second landscape document contains seven editable scene families in order. The cut targets are 2.0, 4.0, 6.0, 8.0, 10.35, and 12.5 seconds. Each cut can differ by up to 0.15 seconds.
- The brief's exact copy appears in the intended scene. The pink, orange, cream, peach, and dark palette remains consistent. The attached soundtrack plays with no unexpected dropout.
- The full 720p/30 and 1080p/60 MP4 files decode with H.264 and AAC, have 450 and 900 video frames respectively, and contain 15 seconds of video. The synchronized benchmark cue lands within one output frame. Preview-to-encoded RGB mean absolute error is at most 8 on the 0–255 scale for the sampled benchmark frames.
- Representative frames and actual playback show all seven families. At least six families reproduce their signature motion landmark. The required families are falling impact and rings, masked kinetic type, grid morph, easing comparison, tunnel and particle sphere, liquid deformation, and closing identity. Record any approximation explicitly.
- The browser exports the saved revision without calling a server render endpoint. The exported draft remains editable and supports focused revisions without changing untouched scenes.

## Visual review

Score each category on a five-point scale after comparing the actual generated output with the supplied source and prior reconstruction. Require at least **4 out of 5 in every category**. Record the reviewer and the observed evidence. The in-app critic output can inform review alongside playback, timestamped frame comparisons, and independent decoding.

| Category | Minimum for 4 |
| --- | --- |
| Typography | Exact requested wording, readable hierarchy, and no unintended clipping of headlines or labels. |
| Composition | Intentional placement and safe margins throughout, including the illustrated and text-led scenes. |
| Movement | At least six signature motion landmarks, with coherent easing and visible liquid deformation. |
| Continuity | Cut timings within tolerance, no unexplained blank sequence, and coherent palette and pacing across scenes. |
| Brief adherence | Seven ordered editable families, approved warm palette and soundtrack, and the requested duration and closing identity. |

Use the shared verification harness for technical checks. Use the live project and its exported MP4 for the final visual ratings.
