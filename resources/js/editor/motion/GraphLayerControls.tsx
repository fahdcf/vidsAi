import { useState, type FormEvent } from "react";
import { graphLayers, type MotionGraphNode } from "../../../../shared/motion/graph";
import { graphAnimation } from "../../../../shared/motion/graph-animation";
import { resolveGraphColor } from "../../../../shared/motion/graph-style";
import { resolveSceneProgramValues } from "../../../../shared/motion/scene-program";
import type { MotionScene, SaveMotionOperations } from "./MotionSceneControls";

type GraphScene = Extract<MotionScene, { type: "graph" }>;
type Interval = NonNullable<MotionGraphNode["animation"]>[number];
type Layer = { node: MotionGraphNode; depth: number; siblings: MotionGraphNode[]; index: number };
const paintRoles = ["background", "foreground", "primary", "accent", "muted", "success", "warning", "danger"];
const layerProperties = ["x", "y", "scale", "rotation", "opacity", "reveal", "draw", "textReveal", "deform"] as const;
const easings = ["linear", "ease_in", "ease_out", "smooth", "spring", "hold"] as const;

function ProgramProperties({ scene, busy, save }: { scene: GraphScene; busy: boolean; save: SaveMotionOperations }) {
    const { program, programValues } = scene.params;
    if (!program?.properties.length) return null;
    const values = resolveSceneProgramValues(program, programValues);
    return <form className="motion-scene-controls graph-layer-controls" data-no-autosave onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const programValues = Object.fromEntries(program.properties.map(({ id, kind }) => [id,
            kind === "number" ? Number(data.get(id)) : kind === "toggle" ? data.has(id) : String(data.get(id))]));
        if (program.properties.every(({ id }) => programValues[id] === values[id])) return;
        save([{ tool: "update_motion_scene", params: { id: scene.id, patch: { params: { programValues } } } }]);
    }}>
        <fieldset disabled={busy}>
            <legend>Procedural controls</legend>
            {program.properties.map((field) => <label key={field.id}>{field.label}
                {field.kind === "number" ? <input name={field.id} type="number" required min={field.min} max={field.max} step="any" defaultValue={Number(values[field.id])} />
                    : field.kind === "toggle" ? <input name={field.id} type="checkbox" defaultChecked={Boolean(values[field.id])} />
                        : field.kind === "asset" ? <select name={field.id} defaultValue={String(values[field.id])}>{field.options.map((handle) =>
                            <option key={handle} value={handle}>{handle}</option>)}</select>
                        : <input name={field.id} type={field.kind === "color" ? "color" : "text"} maxLength={180} defaultValue={String(values[field.id])} />}
            </label>)}
            <button type="submit" className="primary">Save procedural controls</button>
        </fieldset>
    </form>;
}

function list(nodes: MotionGraphNode[], depth = 0): Layer[] {
    return nodes.flatMap((node, index) => [{ node, depth, siblings: nodes, index },
        ...(node.kind === "group" ? list(node.children, depth + 1) : [])]);
}

function LayerForm({ layer, scene, busy, save, move }: {
    layer: Layer; scene: GraphScene; busy: boolean; save: (change: (layer: Layer) => void) => void; move: (direction: number) => void;
}) {
    const { node } = layer;
    const [rows, setRows] = useState(() => (node.animation ?? []).map((track, index) => ({ key: index, ...track })));
    const [error, setError] = useState("");
    const properties = layerProperties.filter((property) => property === "textReveal" ? node.kind === "text"
        : property === "draw" ? node.kind === "path" && Boolean(node.stroke || node.outline)
            : property === "deform" ? ["rect", "ellipse", "path"].includes(node.kind) : true);
    const position = { x: layer.depth ? 0 : 0.5, y: layer.depth ? 0 : 0.5, scale: 1, rotation: 0, opacity: 1, ...node.transform };

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const animation = graphAnimation.safeParse(rows.map(({ key, ...row }) => row).sort((a, b) => a.start - b.start));
        if (!animation.success) { setError("Use ordered intervals, valid values, and no overlaps on the same property."); return; }
        setError("");
        save(({ node: next }) => {
            for (const key of ["x", "y", "scale", "rotation", "opacity"] as const) {
                const value = Number(data.get(key));
                if (value !== position[key]) next.transform[key] = value;
            }
            if (animation.data.length || next.animation) next.animation = animation.data;
            if ("width" in next) { next.width = Number(data.get("width")); next.height = Number(data.get("height")); }
            if ("color" in next) {
                const colorMode = String(data.get("paint"));
                if (colorMode !== "gradient") {
                    next.color = colorMode === "solid" ? String(data.get("color")) : colorMode;
                    delete next.gradient;
                }
            }
            if (next.kind === "widget") next.label = String(data.get("label")).trim();
            if (next.kind === "text") {
                const text = String(data.get("text")).trim();
                if (text !== next.text) { next.text = text; delete next.spans; }
                next.size = Number(data.get("size"));
                next.maxWidth = Number(data.get("maxWidth"));
                const style = { ...next.typography };
                const family = String(data.get("family"));
                if (family === "archivo_black" || family === "space_mono" || family === "system") style.family = family;
                else delete style.family;
                const weight = Number(data.get("weight")), face = String(data.get("face"));
                const alignment = String(data.get("alignment")), lineHeight = Number(data.get("lineHeight"));
                const boxHeight = String(data.get("boxHeight"));
                if (weight === 700 || style.weight !== undefined) style.weight = weight === 700 ? 700 : 400;
                if (face === "italic" || style.style !== undefined) style.style = face === "italic" ? "italic" : "normal";
                if (alignment !== "center" || style.align !== undefined) style.align = alignment === "left" || alignment === "right" ? alignment : "center";
                if (lineHeight !== 1.17 || style.lineHeight !== undefined) style.lineHeight = lineHeight;
                if (boxHeight) style.boxHeight = Number(boxHeight);
                else delete style.boxHeight;
                if (Object.keys(style).length) next.typography = style;
                else delete next.typography;
            }
        });
    }

    function update(key: number, patch: Partial<Interval>) {
        setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
    }

    const numeric = (name: string, label: string, value: number, min: number, max: number) =>
        <label key={name}>{label}<input name={name} type="number" min={min} max={max} step="any" defaultValue={value} required /></label>;
    return <form className="motion-scene-controls" data-no-autosave onSubmit={submit}>
        <fieldset disabled={busy}>
            <div className="motion-scene-actions">
                <button type="button" disabled={layer.index === 0} onClick={() => move(-1)}>Send backward</button>
                <button type="button" disabled={layer.index === layer.siblings.length - 1} onClick={() => move(1)}>Bring forward</button>
            </div>
            <div className="motion-fields">
                {numeric("x", "Layer X", position.x, -2, 3)}
                {numeric("y", "Layer Y", position.y, -2, 3)}
                {numeric("scale", "Layer scale", position.scale, 0, 8)}
                {numeric("rotation", "Layer rotation", position.rotation, -1440, 1440)}
                {numeric("opacity", "Layer opacity", position.opacity, 0, 1)}
                {"width" in node && <>{numeric("width", "Layer width", node.width, 0.001, 2)}{numeric("height", "Layer height", node.height, 0.001, 2)}</>}
                {"color" in node && <>
                    <label>Layer paint<select aria-label="Layer paint" name="paint" defaultValue={node.gradient ? "gradient" : node.color.startsWith("#") ? "solid" : node.color}>
                        {node.gradient && <option value="gradient">Keep gradient</option>}
                        {paintRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                        <option value="solid">Custom color</option>
                    </select></label>
                    <label>Custom layer color<input name="color" type="color" defaultValue={resolveGraphColor(scene.palette, node.color)} /></label>
                </>}
            </div>
            {node.kind === "widget" && <label>Widget label<input name="label" defaultValue={node.label} maxLength={120} /></label>}
            {node.kind === "text" && <>
                <label>Layer text<textarea aria-label="Layer text" name="text" required maxLength={180} rows={2} defaultValue={node.text} /></label>
                <div className="motion-fields">
                    <label>Layer font<select aria-label="Layer font" name="family" defaultValue={node.typography?.family ?? "inherit"}>
                        <option value="inherit">Scene font</option><option value="archivo_black">Archivo Black</option>
                        <option value="space_mono">Space Mono</option><option value="system">System sans</option>
                    </select></label>
                    <label>Font weight<select aria-label="Font weight" name="weight" defaultValue={node.typography?.weight ?? 400}><option value={400}>Regular</option><option value={700}>Bold</option></select></label>
                    <label>Font style<select name="face" defaultValue={node.typography?.style ?? "normal"}><option value="normal">Normal</option><option value="italic">Italic</option></select></label>
                    <label>Text alignment<select name="alignment" defaultValue={node.typography?.align ?? "center"}><option>left</option><option>center</option><option>right</option></select></label>
                    {numeric("size", "Font size", node.size, 0.015, 0.4)}
                    {numeric("maxWidth", "Text box width", node.maxWidth, 0.001, 2)}
                    {numeric("lineHeight", "Line height", node.typography?.lineHeight ?? 1.17, 0.85, 2.5)}
                    <label>Text box height<input name="boxHeight" type="number" min="0.025" max="1" step="any" defaultValue={node.typography?.boxHeight} placeholder="Auto" /></label>
                </div>
            </>}
            <details open={rows.length > 0 || undefined}>
                <summary>Animation intervals</summary>
                {rows.map(({ key, ...row }, index) => <fieldset key={key} aria-label={`Interval ${index + 1}`}>
                    <div className="motion-fields">
                        <label>Property<select value={row.property} onChange={(event) => update(key, { property: event.currentTarget.value as Interval["property"] })}>
                            {properties.map((property) => <option key={property}>{property}</option>)}
                        </select></label>
                        <label>Easing<select value={row.ease} onChange={(event) => update(key, { ease: event.currentTarget.value as Interval["ease"] })}>
                            {easings.map((ease) => <option key={ease}>{ease}</option>)}
                        </select></label>
                        {(["start", "end", "from", "to"] as const).map((field) => <label key={field}>{field}
                            <input type="number" step="any" required value={row[field]}
                                onChange={(event) => update(key, { [field]: Number(event.currentTarget.value) })} />
                        </label>)}
                    </div>
                    <button type="button" onClick={() => setRows((current) => current.filter((entry) => entry.key !== key))}>Remove interval {index + 1}</button>
                </fieldset>)}
                <button type="button" disabled={rows.length >= 20} onClick={() => setRows((current) => [...current,
                    { key: Math.max(-1, ...current.map(({ key }) => key)) + 1, property: "opacity", start: 0, end: 1, from: 0, to: 1, ease: "linear" }])}>Add interval</button>
            </details>
            {error && <p role="alert">{error}</p>}
            <button className="primary" type="submit">Save layer</button>
        </fieldset>
    </form>;
}

export default function GraphLayerControls({ scene, selected, select, busy, save }: {
    scene: GraphScene; selected?: string; select: (id: string) => void; busy: boolean; save: SaveMotionOperations;
}) {
    const all = list(scene.params.layers);
    const layer = all.find(({ node }) => node.id === selected) ?? all[0];
    const [error, setError] = useState("");
    if (!layer) return null;
    function patch(change: (layer: Layer) => void) {
        const layers = structuredClone(scene.params.layers);
        const target = list(layers).find(({ node }) => node.id === layer.node.id);
        if (!target) return;
        change(target);
        const checked = graphLayers.safeParse(layers);
        if (!checked.success) { setError("These changes don’t fit the selected layer. Check the layer fields and animation values."); return; }
        setError("");
        if (JSON.stringify(checked.data) === JSON.stringify(scene.params.layers)) return;
        save([{ tool: "update_motion_scene", params: { id: scene.id, patch: { params: { layers: checked.data } } } }]);
    }
    return <section className="motion-scene-controls graph-layer-controls" aria-label="Composition layers">
        <label>Composition layer<select aria-label="Composition layer" value={layer.node.id} disabled={busy} onChange={(event) => { setError(""); select(event.currentTarget.value); }}>
            {all.map(({ node, depth }) => <option key={node.id} value={node.id}>{"↳ ".repeat(depth)}{node.id} · {node.kind}</option>)}
        </select></label>
        <LayerForm key={layer.node.id} layer={layer} scene={scene} busy={busy} save={patch}
            move={(direction) => patch(({ siblings, index }) => {
                [siblings[index], siblings[index + direction]] = [siblings[index + direction], siblings[index]];
            })} />
        {error && <p role="alert">{error}</p>}
        <ProgramProperties scene={scene} busy={busy} save={save} />
    </section>;
}
