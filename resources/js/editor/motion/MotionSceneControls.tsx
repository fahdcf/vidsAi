import type { FormEvent } from "react";
import type { Document, Operation } from "@vidsai/contracts";
import type { MotionGraphNode } from "../../../../shared/motion/graph";
import { motionSceneCopy } from "./MotionStoryboard";

export type MotionScene = Document["tracks"]["motion_graphics"][number];
export type SaveMotionOperations = (operations: Operation[]) => void;
type NumericEffect = { key: string; label: string; value: number; min: number; max: number; step: number };

function sceneEffects(scene: MotionScene): NumericEffect[] {
    const field = (key: string, label: string, value: number, min: number, max: number, step = 1) =>
        ({ key, label, value, min, max, step });
    switch (scene.type) {
        case "impact": return [
            field("ringCount", "Rings", scene.params.ringCount, 1, 8),
            field("particles", "Particles", scene.params.particles, 0, 240),
            field("impactAt", "Impact point", scene.params.impactAt, 0.15, 0.7, 0.01),
        ];
        case "grid": return [
            field("columns", "Columns", scene.params.columns, 2, 24),
            field("rows", "Rows", scene.params.rows, 2, 24),
            field("spin", "Spin", scene.params.spin, -2, 2, 0.01),
        ];
        case "tunnel": return [
            field("rings", "Rings", scene.params.rings, 4, 32),
            field("sides", "Sides", scene.params.sides, 3, 12),
            field("sphereParticles", "Particles", scene.params.sphereParticles, 0, 800),
        ];
        case "liquid": return scene.params.mode === "procedural" ? [field("blobs", "Shapes", scene.params.blobs, 2, 10)] : [];
        default: return [];
    }
}

function graphText(nodes: readonly MotionGraphNode[]): { id: string; text: string }[] {
    return nodes.flatMap((node) => node.kind === "text" ? [{ id: node.id, text: node.text }]
        : node.kind === "group" ? graphText(node.children) : []);
}

export default function MotionSceneControls({ scene, scenes, mode, busy, save }: {
    scene: MotionScene; scenes: readonly MotionScene[]; mode: "review" | "style" | "editor"; busy: boolean; save: SaveMotionOperations;
}) {
    const index = scenes.findIndex(({ id }) => id === scene.id);
    const next = scenes.find(({ start_frame }) => start_frame === scene.end_frame);
    const draftCopy = motionSceneCopy(scene);
    const text = scene.type === "graph" ? graphText(scene.params.layers) : draftCopy ? [{ id: "", text: draftCopy }] : [];
    const review = mode !== "style";
    const style = mode !== "review";
    const colors = Object.entries(scene.palette);
    const maxTransition = Math.min(60, scene.end_frame - scene.start_frame - 1);
    const effects = mode === "editor" ? sceneEffects(scene) : [];

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const operations: Operation[] = [];
        if (review) {
            for (const field of text) {
                const changed = String(data.get("text-" + field.id) ?? "").trim();
                if (changed !== field.text) operations.push({
                    tool: "set_motion_text", params: { id: scene.id, text: changed, ...(field.id ? { layerId: field.id } : {}) },
                });
            }
            if (scene.type === "identity") {
                const detail = String(data.get("identity-detail") ?? "").trim();
                const tag = String(data.get("identity-tag") ?? "").trim();
                if (detail !== scene.params.detail || tag !== scene.params.tag) operations.push({
                    tool: "update_motion_scene", params: { id: scene.id, patch: { params: { detail, tag } } },
                });
            }
            const cut = Number(data.get("cut"));
            if (next && cut !== scene.end_frame) operations.push({ tool: "set_motion_cut", params: { id: scene.id, frame: cut } });
        }
        if (style) {
            const transition = data.get("transition");
            const frames = Number(data.get("transition-frames"));
            const adjustedCut = review && next ? Number(data.get("cut")) : scene.end_frame;
            const transitionLimit = Math.min(maxTransition, adjustedCut - scene.start_frame - 1);
            operations.push({ tool: "update_motion_scene", params: { id: scene.id, patch: {
                font: data.get("font"), motionRate: Number(data.get("rate")),
                transitionIn: transitionLimit > 0 && transition && transition !== "none"
                    ? { kind: transition, frames: Math.min(transitionLimit, Math.max(1, frames)) } : null,
                ...(effects.length ? { params: Object.fromEntries(effects.map(({ key }) => [key, Number(data.get("effect-" + key))])) } : {}),
            } } });
            operations.push({ tool: "set_motion_palette", params: { id: scene.id,
                palette: Object.fromEntries(colors.map(([name]) => [name, data.get("palette-" + name)])) } });
        }
        if (operations.length) save(operations);
    }

    function move(direction: number) {
        const order = scenes.map(({ id }) => id);
        const destination = index + direction;
        if (destination < 0 || destination >= order.length) return;
        [order[index], order[destination]] = [order[destination], order[index]];
        save([{ tool: "reorder_motion_scenes", params: { order } }]);
    }

    return <form className="motion-scene-controls" data-no-autosave={mode === "editor" || undefined} onSubmit={submit}>
        <fieldset disabled={busy}>
            {review && <>
                {text.map((field, i) => <label key={field.id}>{field.id ? `Scene text ${i + 1}` : "Scene text"}
                    <textarea name={"text-" + field.id} rows={2} required maxLength={180} defaultValue={field.text} />
                </label>)}
                {scene.type === "identity" && <>
                    <label>Supporting line<input name="identity-detail" maxLength={100} defaultValue={scene.params.detail} /></label>
                    <label>Tagline<input name="identity-tag" maxLength={80} defaultValue={scene.params.tag} /></label>
                </>}
                {next && <label>End frame<input name="cut" type="number" required step={1}
                    min={scene.start_frame + 1} max={next.end_frame - 1} defaultValue={scene.end_frame} /></label>}
                {scenes.length > 1 && <div className="motion-scene-actions">
                    <button type="button" disabled={index === 0} onClick={() => move(-1)}>Move earlier</button>
                    <button type="button" disabled={index === scenes.length - 1} onClick={() => move(1)}>Move later</button>
                </div>}
            </>}
            {style && <>
                <div className="motion-fields">
                    <label>Typography<select aria-label="Typography" name="font" defaultValue={scene.font}>
                        <option value="archivo_black">Archivo Black</option><option value="space_mono">Space Mono</option>
                        <option value="system">System sans</option>
                    </select></label>
                    <label>Motion pace<input name="rate" type="number" min="0.5" max="2" step="0.01" defaultValue={scene.motionRate ?? 1} required /></label>
                </div>
                <div className="motion-palette-fields">{colors.map(([name, color]) =>
                    <label key={name}>{name}<input type="color" name={"palette-" + name} defaultValue={color} /></label>)}</div>
                {maxTransition >= 1 && <div className="motion-fields">
                    <label>Entrance transition<select name="transition" defaultValue={scene.transitionIn?.kind ?? "none"}>
                        <option value="none">None</option><option value="fade">Fade</option><option value="wipe">Wipe</option>
                        <option value="scale">Scale</option>
                    </select></label>
                    <label>Transition frames<input name="transition-frames" type="number" min={1} max={maxTransition} step={1}
                        defaultValue={scene.transitionIn?.frames ?? Math.min(maxTransition, 10)} required /></label>
                </div>}
                {effects.length > 0 && <div className="motion-palette-fields">
                    {effects.map(({ key, label, value, min, max, step }) => <label key={key}>{label}
                        <input name={"effect-" + key} type="number" required defaultValue={value} min={min} max={max} step={step} />
                    </label>)}
                </div>}
            </>}
            {(style || text.length > 0 || next) && <button type="submit" className="primary">Save scene</button>}
        </fieldset>
    </form>;
}
