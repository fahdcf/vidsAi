import React, { useRef, useState } from "react";
import type { Document, Operation } from "@vidsai/contracts";
import Shell from "../Shell";
import MusicLibrary from "../MusicLibrary";
import { api } from "../api";
import MotionPreview, { type MotionPreviewHandle } from "../motion/MotionPreview";
import MotionSceneControls from "../motion/MotionSceneControls";
import { motionSceneLabel } from "../motion/MotionStoryboard";
import "../styles/motion-workspace.css";

export default function MotionReview({ projectId, name, document: initial, stage }: {
    projectId: number; name: string; document: Document; stage: "review" | "style";
}) {
    const [doc, setDoc] = useState(initial);
    const [selected, setSelected] = useState(initial.tracks.motion_graphics[0]?.id ?? "");
    const [tab, setTab] = useState<"scenes" | "music" | "captions">("scenes");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const player = useRef<MotionPreviewHandle>(null);
    const scenes = doc.tracks.motion_graphics;
    const scene = scenes.find(({ id }) => id === selected) ?? scenes[0];
    const music = doc.tracks.audio.find(({ type }) => type === "music");
    const styling = stage === "style";
    const base = `/projects/${projectId}`;

    async function save(operations: Operation[]) {
        if (busy) return;
        setBusy(true); setError(""); setSaved(false);
        try {
            const { edit_state } = await api<{ edit_state: Document }>(base + "/commands", {
                commandId: crypto.randomUUID(), expectedRevision: doc.revision, operations,
            });
            setDoc(edit_state);
            setSaved(true);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not save the scene.");
        } finally {
            setBusy(false);
        }
    }

    return <Shell title={styling ? "Style motion graphics" : "Review motion scenes"} description={name} motionStep={styling ? 2 : 1}
        actions={<a className="button primary" href={base + (styling ? "/editor" : "/motion-style")}>
            {styling ? "Open editor" : "Continue to style"}
        </a>}>
        {!scene ? <section className="panel motion-review-panel"><p>Create a draft in Motion chat before reviewing its scenes.</p>
            <a className="button" href={base + "/motion"}>Open motion chat</a></section>
            : <div className="motion-review-grid">
                <section className="panel motion-review-panel">
                    {styling && <nav className="motion-scene-actions" aria-label="Style tools">
                        <button type="button" aria-pressed={tab === "scenes"} onClick={() => setTab("scenes")}>Visual style</button>
                        <button type="button" aria-pressed={tab === "music"} onClick={() => setTab("music")}>Music</button>
                        {doc.tracks.subtitles.length > 0 && <button type="button" aria-pressed={tab === "captions"}
                            onClick={() => setTab("captions")}>Captions</button>}
                    </nav>}
                    {tab === "scenes" && <>
                        <label>Scene<select aria-label="Scene" value={scene.id} onChange={(event) => {
                            const next = scenes.find(({ id }) => id === event.currentTarget.value);
                            if (next) { setSelected(next.id); player.current?.seekTo(next.start_frame); }
                        }}>{scenes.map(({ id, type, start_frame, end_frame }, index) =>
                            <option key={id} value={id}>Scene {index + 1} · {motionSceneLabel[type]} · {((end_frame - start_frame) / doc.fps).toFixed(1)}s</option>
                        )}</select></label>
                        <MotionSceneControls key={scene.id + ":" + doc.revision} scene={scene} scenes={scenes} mode={stage} busy={busy} save={(ops) => void save(ops)} />
                    </>}
                    {tab === "music" && <>
                        {music && <div className="motion-scene-actions">
                            <span className="status-pill">Soundtrack selected</span>
                            <button type="button" disabled={busy} onClick={() => void save([{ tool: "set_music", params: { url: null } }])}>Remove soundtrack</button>
                        </div>}
                        <MusicLibrary busy={busy} onChoose={(url) => void save([{ tool: "set_music", params: { url, volume: 0.3 } }])} />
                    </>}
                    {tab === "captions" && doc.tracks.subtitles.map((caption, index) => <form key={caption.id + ":" + doc.revision}
                        onSubmit={(event) => {
                            event.preventDefault();
                            const text = String(new FormData(event.currentTarget).get("text") ?? "");
                            void save([{ tool: "update_subtitle", params: { id: caption.id, text } }]);
                        }}>
                        <label>Caption {index + 1}<textarea name="text" defaultValue={caption.text} /></label>
                        <button type="submit" disabled={busy}>Save caption</button>
                    </form>)}
                    {error && <p className="notice warning" role="alert">{error}</p>}
                    {saved && <p className="muted" role="status">Saved to this project.</p>}
                </section>
                <MotionPreview draft={doc} playerRef={player} label="Live preview" />
            </div>}
    </Shell>;
}
