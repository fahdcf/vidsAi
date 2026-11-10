import type { Document } from "@vidsai/contracts";
import type { MotionRunView } from "./chat-api";

type Scene = Document["tracks"]["motion_graphics"][number];
export const motionSceneLabel = {
    impact: "Impact", kinetic_words: "Kinetic typography", grid: "Geometric grid", easing: "Easing study",
    tunnel: "Depth tunnel", liquid: "Liquid shapes", identity: "Identity card", graph: "Custom scene",
} as const;

export function motionSceneCopy(scene: Scene) {
    switch (scene.type) {
        case "impact": return scene.params.headline;
        case "kinetic_words": return scene.params.words.join(" ");
        case "easing": return scene.params.heading;
        case "identity": return scene.params.title;
        default: return "";
    }
}

export default function MotionStoryboard({ draft, storyboard, canRevise, onPreview, onRevise }: {
    draft: Document | null; storyboard: MotionRunView["storyboard"]; canRevise: boolean;
    onPreview: (frame: number) => void; onRevise: (id: string, index: number) => void;
}) {
    const scenes = draft?.tracks.motion_graphics.map((scene) => ({
        ...scene, copy: motionSceneCopy(scene), purpose: storyboard?.scenes.find(({ id }) => id === scene.id)?.purpose,
        referenceSceneIndex: storyboard?.scenes.find(({ id }) => id === scene.id)?.referenceSceneIndex,
    })) ?? storyboard?.scenes ?? [];
    if (!scenes.length) return null;
    return <section className="panel motion-storyboard" aria-label="Storyboard">
        <h2>Storyboard</h2>
        {storyboard?.referenceIntent && <p className="muted">
            {storyboard.referenceIntent === "match" ? "Reference match" : "Reference inspired"} · {storyboard.timingMode === "source" ? "Source cuts" : "Custom timing"}
        </p>}
        <ol>{scenes.map((scene, index) => <li key={scene.id}>
            <details>
                <summary><span>Scene {index + 1} · {motionSceneLabel[scene.type as keyof typeof motionSceneLabel] ?? "Motion scene"}</span>
                    <span className="muted">{((scene.end_frame - scene.start_frame) / (draft?.fps ?? 30)).toFixed(1)}s</span></summary>
                <div className="motion-scene-detail">
                    {scene.purpose && <p>{scene.purpose}</p>}
                    {typeof scene.referenceSceneIndex === "number" && <p className="muted">Reference scene {scene.referenceSceneIndex + 1}</p>}
                    {scene.copy && <p className="motion-scene-copy">{scene.copy}</p>}
                    {"palette" in scene && <div className="motion-scene-palette" aria-label="Scene palette">
                        {Object.entries(scene.palette).map(([name, color]) => <span key={name} style={{ backgroundColor: color }}
                            aria-label={`${name} ${color}`} title={`${name} ${color}`} />)}
                    </div>}
                    {draft && <div className="motion-scene-actions">
                        <button type="button" className="small" onClick={() => onPreview(scene.start_frame)}>Preview scene</button>
                        {canRevise && <button type="button" className="small" onClick={() => onRevise(scene.id, index)}>Revise this scene</button>}
                    </div>}
                </div>
            </details>
        </li>)}</ol>
    </section>;
}
