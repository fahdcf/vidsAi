import { motionSceneSchema } from "../../shared/motion/schema";

const common = {
    componentVersion: 1, start_frame: 0, end_frame: 60,
    finish: { grain: 0, vignette: 0 },
    palette: { background: "#101010", foreground: "#ffffff", primary: "#ff2200", accent: "#ff7766", muted: "#444444" },
};
const label = { id: "label", kind: "text", text: "Channels", size: 0.09, maxWidth: 0.6, color: "foreground" };
const card = { id: "card", kind: "rect", width: 0.8, height: 0.3, radius: 0.02, color: "muted" };
const graph = (id: string, layers: unknown[]) => motionSceneSchema.parse({ ...common, id, type: "graph", params: { layers } });

export const motionQualityCases = {
    occludedLabel: {
        scene: graph("covered-label", [label, card]),
        corrected: graph("visible-label", [card, label]),
        requiredCopy: ["Channels"],
    },
    clippedHeadline: {
        scene: graph("clipped-headline", [{ ...label, text: "Clean transcripts, ready for any AI workflow.", transform: { x: 0.04 } }]),
        corrected: graph("visible-headline", [{ ...label, text: "Clean transcripts, ready for any AI workflow." }]),
        requiredCopy: ["Clean transcripts, ready for any AI workflow."],
    },
    missingCta: {
        scene: graph("missing-cta", [{ ...label, text: "Join 10,000+ users." }]),
        corrected: graph("visible-cta", [{ ...label, text: "Join 10,000+ users." },
            { ...label, id: "cta", text: "Start free", size: 0.05, transform: { y: 0.72 } }]),
        requiredCopy: ["Join 10,000+ users.", "Start free"],
    },
    wrongComponent: {
        scene: motionSceneSchema.parse({ ...common, id: "wrong-impact", type: "impact", params: { headline: "Paste a YouTube video." } }),
        corrected: graph("play-icon-hook", [{ ...card, id: "play", width: 0.17, height: 0.12, color: "primary", transform: { y: 0.3 } },
            { id: "play-triangle", kind: "path", color: "foreground", transform: { y: 0.3 },
                commands: [{ op: "M", x: -0.012, y: -0.026 }, { op: "L", x: 0.02, y: 0 }, { op: "L", x: -0.012, y: 0.026 }, { op: "Z" }] },
            { ...label, text: "Paste a YouTube video." }]),
        requiredCopy: ["Paste a YouTube video."],
    },
};
