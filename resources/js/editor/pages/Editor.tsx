import React, { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoMerger } from "@vidsai/compositions";
import {
    normalizeDocument,
    styles,
    transitions,
    type Document,
    type Operation,
} from "@vidsai/contracts";
import { applyOperations } from "@vidsai/editing-core";
import Shell from "../Shell";
import { api } from "../api";
type Project = { id: number; name: string; status: string };
export default function Editor({
    project,
    document: initial,
    latestExport,
    pendingRun,
    history = [],
}: {
    project: Project;
    document: Document;
    latestExport?: any;
    pendingRun?: any;
    history?: Document[];
}) {
    const [doc, setDoc] = useState(() => normalizeDocument(initial));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [save, setSave] = useState("Saved");
    const [selected, setSelected] = useState(doc.tracks.video[0]?.id || "");
    const [tab, setTab] = useState("Scene");
    const [frame, setFrame] = useState(0);
    const player = useRef<PlayerRef>(null);
    const [undo, setUndo] = useState<Document[]>(history);
    const [redo, setRedo] = useState<Document[]>([]);
    const [exportId, setExportId] = useState<string | null>(
        latestExport?.id || null,
    );
    const [job, setJob] = useState<any>(latestExport || null);
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
    const [plan, setPlan] = useState<any>(
        pendingRun?.plan
            ? { runId: pendingRun.id, plan: JSON.parse(pendingRun.plan) }
            : null,
    );
    const base = `/projects/${project.id}`;
    const clip = doc.tracks.video.find((c) => c.id === selected);
    async function upload(file: File) {
        if (!clip || busy) return;
        setError("");
        try {
            const data = new FormData();
            data.append("file", file);
            const r = await api(`${base}/assets`, data);
            await edit([
                {
                    tool: "replace_asset",
                    params: {
                        id: clip.id,
                        url: r.url,
                        media_type: r.media_type,
                        asset_id: r.asset_id,
                    },
                },
            ]);
        } catch (e) {
            setError((e as Error).message);
        }
    }
    const docRef = useRef(doc);
    const queue = useRef<Promise<void>>(Promise.resolve());
    const pending = useRef<{
        timer: ReturnType<typeof setTimeout> | null;
        form: HTMLFormElement | null;
    }>({ timer: null, form: null });
    const pendingCount = useRef(0);
    const [formVersion, setFormVersion] = useState(0);
    function flushAutosave() {
        const form = pending.current.form;
        if (pending.current.timer) clearTimeout(pending.current.timer);
        pending.current = { timer: null, form: null };
        if (form?.isConnected) form.requestSubmit();
        return queue.current;
    }
    function scheduleAutosave(event: React.FormEvent<HTMLElement>) {
        const target = event.target as HTMLInputElement;
        if (target.type === "file") return;
        const form = target.closest("form");
        if (!form) return;
        if (pending.current.timer) clearTimeout(pending.current.timer);
        if (pending.current.form && pending.current.form !== form)
            flushAutosave();
        setSave("Unsaved changes");
        pending.current = {
            form,
            timer: setTimeout(() => flushAutosave(), 1000),
        };
    }
    function captureSubmit(event: React.FormEvent<HTMLElement>) {
        if (pending.current.form === event.target) {
            if (pending.current.timer) clearTimeout(pending.current.timer);
            pending.current = { timer: null, form: null };
        } else if (pending.current.form) flushAutosave();
    }
    useEffect(() => {
        const leave = (event: BeforeUnloadEvent) => {
            if (pending.current.form || pendingCount.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", leave);
        return () => {
            window.removeEventListener("beforeunload", leave);
            if (pending.current.timer) clearTimeout(pending.current.timer);
        };
    }, []);
    async function edit(operations: Operation[]) {
        pendingCount.current++;
        setBusy(true);
        setError("");
        setSave("Saving…");
        const task = queue.current.then(async () => {
            const current = docRef.current;
            try {
                applyOperations(current, operations);
                const r = await api(`${base}/commands`, {
                    commandId: crypto.randomUUID(),
                    expectedRevision: current.revision,
                    operations,
                });
                const next = normalizeDocument(r.edit_state);
                docRef.current = next;
                setUndo((previous) => [...previous, current]);
                setRedo([]);
                setDoc(next);
                if (pendingCount.current === 1 && !pending.current.form)
                    setSave("Saved");
            } catch (e) {
                setError((e as Error).message);
                setSave("Changes were not saved");
            } finally {
                pendingCount.current--;
                if (!pendingCount.current) setBusy(false);
            }
        });
        queue.current = task;
        await task;
    }
    async function restore(direction: "undo" | "redo") {
        const stack = direction === "undo" ? undo : redo;
        const target = stack.at(-1);
        if (!target || busy) return;
        setBusy(true);
        setError("");
        try {
            const r = await api(`${base}/restore-revision`, {
                commandId: crypto.randomUUID(),
                expectedRevision: doc.revision,
                restoreRevision: target.revision,
            });
            if (direction === "undo") {
                setUndo(undo.slice(0, -1));
                setRedo([...redo, doc]);
            } else {
                setRedo(redo.slice(0, -1));
                setUndo([...undo, doc]);
            }
            const next = normalizeDocument(r.edit_state);
            docRef.current = next;
            setDoc(next);
            setFormVersion((v) => v + 1);
            setSave("Saved");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    useEffect(() => {
        if (!exportId) return;
        let disposed = false;
        const tick = async () => {
            try {
                const r = await api(
                    `${base}/exports/${exportId}`,
                    undefined,
                    "GET",
                );
                if (!disposed) setJob(r);
            } catch (e) {
                if (!disposed) setError((e as Error).message);
            }
        };
        void tick();
        const timer = setInterval(() => void tick(), 3000);
        return () => {
            disposed = true;
            clearInterval(timer);
        };
    }, [exportId]);
    useEffect(() => {
        const p = player.current;
        if (!p) return;
        const update = (e: any) => setFrame(e.detail.frame);
        p.addEventListener("frameupdate", update);
        return () => p.removeEventListener("frameupdate", update);
    }, []);
    const run = async () => {
        if (!message.trim() || busy) return;
        setBusy(true);
        setError("");
        const text = message;
        setMessage("");
        setChat([...chat, { role: "You", text }]);
        try {
            const r = await api(`${base}/agent-runs`, {
                runId: crypto.randomUUID(),
                message: text,
            });
            setPlan(r);
            setChat((c) => [...c, { role: "Assistant", text: r.plan.reply }]);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const applyPlan = async () => {
        setBusy(true);
        setError("");
        try {
            const r = await api(`${base}/agent-runs/${plan.runId}/execute`, {});
            setUndo([...undo, doc]);
            setRedo([]);
            const next = normalizeDocument(r.edit_state);
            docRef.current = next;
            setDoc(next);
            setFormVersion((v) => v + 1);
            setPlan(null);
            setSave("Saved");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };
    function move(delta: number) {
        if (!clip) return;
        const order = doc.tracks.video.map((c) => c.id);
        const i = order.indexOf(clip.id);
        if (i + delta < 0 || i + delta >= order.length) return;
        [order[i], order[i + delta]] = [order[i + delta], order[i]];
        void edit([{ tool: "reorder_scenes", params: { order } }]);
    }
    return (
        <Shell title={project.name}>
            <div className="editor-toolbar">
                <span aria-live="polite" className="muted">
                    {save} · Revision {doc.revision}
                </span>
                <button
                    disabled={
                        busy || save === "Unsaved changes" || !undo.length
                    }
                    onClick={() => void restore("undo")}
                >
                    Undo
                </button>
                <button
                    disabled={
                        busy || save === "Unsaved changes" || !redo.length
                    }
                    onClick={() => void restore("redo")}
                >
                    Redo
                </button>
                <a href={`/review/${project.id}`}>Review / regenerate media</a>
                <button
                    className="primary"
                    disabled={
                        busy ||
                        save === "Unsaved changes" ||
                        ["queued", "rendering"].includes(job?.status)
                    }
                    onClick={async () => {
                        setError("");
                        try {
                            const r = await api(`${base}/export`, {
                                requestId: crypto.randomUUID(),
                            });
                            setExportId(r.export_id);
                        } catch (e) {
                            setError((e as Error).message);
                        }
                    }}
                >
                    Export video
                </button>
            </div>
            {error && (
                <div role="alert" className="error">
                    {error}
                </div>
            )}
            <div className="editor-grid">
                <section className="panel preview">
                    <Player
                        ref={player}
                        component={VideoMerger}
                        inputProps={{ editState: doc }}
                        durationInFrames={doc.total_frames}
                        compositionWidth={doc.width}
                        compositionHeight={doc.height}
                        fps={doc.fps}
                        controls
                        style={{
                            width: "100%",
                            maxHeight: 540,
                            aspectRatio: `${doc.width}/${doc.height}`,
                        }}
                    />
                    <div className="playhead">
                        <input
                            aria-label="Playhead"
                            type="range"
                            min={0}
                            max={doc.total_frames - 1}
                            value={frame}
                            onChange={(e) => {
                                const n = Number(e.target.value);
                                setFrame(n);
                                player.current?.seekTo(n);
                            }}
                        />
                        <span>
                            {(frame / doc.fps).toFixed(2)} /{" "}
                            {(doc.total_frames / doc.fps).toFixed(2)} s
                        </span>
                    </div>
                </section>
                <aside className="panel inspector">
                    <nav className="tabs">
                        {[
                            "Scene",
                            "Captions",
                            "Audio",
                            "Overlays",
                            "Format",
                        ].map((t) => (
                            <button
                                key={t}
                                aria-pressed={tab === t}
                                onClick={() => {
                                    flushAutosave();
                                    setTab(t);
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </nav>
                    <fieldset
                        onInputCapture={scheduleAutosave}
                        onSubmitCapture={captureSubmit}
                        key={`${tab}-${selected}-${formVersion}`}
                    >
                        {tab === "Scene" && clip && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.currentTarget);
                                    void edit([
                                        {
                                            tool: "trim_clip",
                                            params: {
                                                id: clip.id,
                                                trim_in: Number(f.get("in")),
                                                trim_out: Number(f.get("out")),
                                                speed: Number(f.get("speed")),
                                            },
                                        },
                                        {
                                            tool: "set_animation",
                                            params: {
                                                id: clip.id,
                                                animation: f.get("animation"),
                                            },
                                        },
                                        ...(f.get("url") !== clip.clip_url
                                            ? [
                                                  {
                                                      tool: "replace_asset",
                                                      params: {
                                                          id: clip.id,
                                                          url: f.get("url"),
                                                          media_type:
                                                              f.get("type"),
                                                      },
                                                  },
                                              ]
                                            : []),
                                    ]);
                                }}
                            >
                                <h2>Selected scene</h2>
                                <label>
                                    Upload replacement media
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) void upload(f);
                                        }}
                                    />
                                </label>
                                <p>{clip.id}</p>
                                <label>
                                    Media URL
                                    <input
                                        name="url"
                                        type="url"
                                        required
                                        defaultValue={clip.clip_url}
                                    />
                                </label>
                                <label>
                                    Media type
                                    <select
                                        name="type"
                                        defaultValue={clip.media_type}
                                    >
                                        {["video", "image", "generated"].map(
                                            (x) => (
                                                <option key={x}>{x}</option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <div className="row">
                                    <label>
                                        Source in (frames)
                                        <input
                                            name="in"
                                            type="number"
                                            min={0}
                                            defaultValue={clip.trim_in}
                                        />
                                    </label>
                                    <label>
                                        Source out (frames)
                                        <input
                                            name="out"
                                            type="number"
                                            min={1}
                                            defaultValue={clip.trim_out}
                                        />
                                    </label>
                                </div>
                                <label>
                                    Playback speed
                                    <input
                                        name="speed"
                                        type="number"
                                        min={0.1}
                                        max={8}
                                        step={0.1}
                                        defaultValue={clip.speed}
                                    />
                                </label>
                                <label>
                                    Animation
                                    <select
                                        name="animation"
                                        defaultValue={clip.animation}
                                    >
                                        {["none", "zoom-in", "zoom-out"].map(
                                            (x) => (
                                                <option key={x}>{x}</option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <button>Save scene</button>
                                <div className="row">
                                    <button
                                        type="button"
                                        onClick={() => move(-1)}
                                    >
                                        Move earlier
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => move(1)}
                                    >
                                        Move later
                                    </button>
                                </div>
                            </form>
                        )}
                        {tab === "Captions" && (
                            <>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const f = new FormData(e.currentTarget);
                                        void edit([
                                            {
                                                tool: "set_subtitle_style",
                                                params: {
                                                    style: f.get("style"),
                                                },
                                            },
                                            {
                                                tool: "update_subtitle_config",
                                                params: {
                                                    config: {
                                                        fontSize: `${f.get("size")}px`,
                                                        textColor:
                                                            f.get("color"),
                                                        backgroundColor:
                                                            f.get("background"),
                                                        position:
                                                            f.get("position"),
                                                        fontFamily:
                                                            f.get("font"),
                                                    },
                                                },
                                            },
                                        ]);
                                    }}
                                >
                                    <h2>Caption appearance</h2>
                                    <label>
                                        Style
                                        <select
                                            name="style"
                                            defaultValue={
                                                doc.tracks.subtitles[0]
                                                    ?.style || "default"
                                            }
                                        >
                                            {styles.map((x) => (
                                                <option key={x}>{x}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Font size
                                        <input
                                            name="size"
                                            type="number"
                                            min={12}
                                            max={180}
                                            defaultValue={parseFloat(
                                                String(
                                                    doc.tracks.subtitles[0]
                                                        ?.config.fontSize || 44,
                                                ),
                                            )}
                                        />
                                    </label>
                                    <label>
                                        Font family
                                        <input
                                            name="font"
                                            defaultValue={String(
                                                doc.tracks.subtitles[0]?.config
                                                    .fontFamily || "Arial",
                                            )}
                                        />
                                    </label>
                                    <label>
                                        Text color
                                        <input
                                            name="color"
                                            defaultValue={String(
                                                doc.tracks.subtitles[0]?.config
                                                    .textColor || "#ffffff",
                                            )}
                                        />
                                    </label>
                                    <label>
                                        Background
                                        <input
                                            name="background"
                                            defaultValue={String(
                                                doc.tracks.subtitles[0]?.config
                                                    .backgroundColor ||
                                                    "#000000",
                                            )}
                                        />
                                    </label>
                                    <label>
                                        Position
                                        <select
                                            name="position"
                                            defaultValue={
                                                doc.tracks.subtitles[0]
                                                    ?.position || "bottom"
                                            }
                                        >
                                            {["top", "center", "bottom"].map(
                                                (x) => (
                                                    <option key={x}>{x}</option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                    <button>Save caption style</button>
                                </form>
                                {doc.tracks.subtitles.map((s) => (
                                    <form
                                        key={s.id}
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const f = new FormData(
                                                e.currentTarget,
                                            );
                                            void edit([
                                                {
                                                    tool: "update_subtitle",
                                                    params: {
                                                        id: s.id,
                                                        text: f.get("text"),
                                                    },
                                                },
                                            ]);
                                        }}
                                    >
                                        <label>
                                            Caption {s.id}
                                            <textarea
                                                dir="auto"
                                                name="text"
                                                defaultValue={s.text}
                                            />
                                        </label>
                                        <button>Save text</button>
                                    </form>
                                ))}
                            </>
                        )}
                        {tab === "Audio" && (
                            <>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const f = new FormData(e.currentTarget);
                                        void edit([
                                            {
                                                tool: "set_music",
                                                params: {
                                                    url: f.get("url") || null,
                                                    volume: Number(
                                                        f.get("volume"),
                                                    ),
                                                },
                                            },
                                        ]);
                                    }}
                                >
                                    <h2>Background music</h2>
                                    <a href={`/subtitle-styles/${project.id}`}>
                                        Browse music library
                                    </a>
                                    <label>
                                        Music URL
                                        <input
                                            name="url"
                                            type="url"
                                            defaultValue={
                                                doc.tracks.audio.find(
                                                    (a) => a.type === "music",
                                                )?.url || ""
                                            }
                                        />
                                    </label>
                                    <label>
                                        Volume (0–1)
                                        <input
                                            name="volume"
                                            type="number"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            defaultValue={
                                                doc.tracks.audio.find(
                                                    (a) => a.type === "music",
                                                )?.volume ?? 0.3
                                            }
                                        />
                                    </label>
                                    <button>Save music</button>
                                </form>
                                {doc.tracks.audio.map((a) => (
                                    <form
                                        key={a.id}
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const f = new FormData(
                                                e.currentTarget,
                                            );
                                            void edit([
                                                {
                                                    tool: "set_volume",
                                                    params: {
                                                        track: a.type,
                                                        volume: Number(
                                                            f.get("volume"),
                                                        ),
                                                    },
                                                },
                                                {
                                                    tool: "set_audio_timing",
                                                    params: {
                                                        id: a.id,
                                                        start_frame: Number(
                                                            f.get("start"),
                                                        ),
                                                        end_frame: Number(
                                                            f.get("end"),
                                                        ),
                                                        fade_in_frames: Number(
                                                            f.get("fadeIn"),
                                                        ),
                                                        fade_out_frames: Number(
                                                            f.get("fadeOut"),
                                                        ),
                                                    },
                                                },
                                            ]);
                                        }}
                                    >
                                        <h3>{a.type}</h3>
                                        {[
                                            ["volume", a.volume],
                                            ["start", a.start_frame],
                                            ["end", a.end_frame],
                                            ["fadeIn", a.fade_in_frames],
                                            ["fadeOut", a.fade_out_frames],
                                        ].map(([name, value]) => (
                                            <label key={String(name)}>
                                                {name}
                                                <input
                                                    type="number"
                                                    name={String(name)}
                                                    min={0}
                                                    step={
                                                        name === "volume"
                                                            ? 0.05
                                                            : 1
                                                    }
                                                    defaultValue={value}
                                                />
                                            </label>
                                        ))}
                                        <button>Save audio</button>
                                    </form>
                                ))}
                            </>
                        )}
                        {tab === "Overlays" && (
                            <>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const f = new FormData(e.currentTarget);
                                        void edit([
                                            {
                                                tool: "add_overlay",
                                                params: {
                                                    id: crypto.randomUUID(),
                                                    src: f.get("src"),
                                                    start_frame: Number(
                                                        f.get("start"),
                                                    ),
                                                    end_frame: Number(
                                                        f.get("end"),
                                                    ),
                                                    width: Number(
                                                        f.get("width"),
                                                    ),
                                                    position: f.get("position"),
                                                    opacity: Number(
                                                        f.get("opacity"),
                                                    ),
                                                    animation: "fade",
                                                },
                                            },
                                        ]);
                                    }}
                                >
                                    <h2>Add image overlay</h2>
                                    <label>
                                        Image URL
                                        <input type="url" name="src" required />
                                    </label>
                                    <label>
                                        Start frame
                                        <input
                                            name="start"
                                            type="number"
                                            min={0}
                                            defaultValue={0}
                                        />
                                    </label>
                                    <label>
                                        End frame
                                        <input
                                            name="end"
                                            type="number"
                                            min={1}
                                            defaultValue={doc.total_frames}
                                        />
                                    </label>
                                    <label>
                                        Width (pixels)
                                        <input
                                            name="width"
                                            type="number"
                                            min={1}
                                            max={doc.width}
                                            defaultValue={200}
                                        />
                                    </label>
                                    <label>
                                        Opacity
                                        <input
                                            name="opacity"
                                            type="number"
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            defaultValue={1}
                                        />
                                    </label>
                                    <label>
                                        Position
                                        <select name="position">
                                            {[
                                                "center",
                                                "top-left",
                                                "top-right",
                                                "bottom-left",
                                                "bottom-right",
                                            ].map((x) => (
                                                <option key={x}>{x}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <button>Add overlay</button>
                                </form>
                                {doc.tracks.overlays.map((o) => (
                                    <div key={o.id}>
                                        <p>{o.src}</p>
                                        <button
                                            onClick={() =>
                                                void edit([
                                                    {
                                                        tool: "remove_overlay",
                                                        params: { id: o.id },
                                                    },
                                                ])
                                            }
                                        >
                                            Remove overlay
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                        {tab === "Format" && (
                            <>
                                <h2>Output format</h2>
                                <label>
                                    Canvas
                                    <select
                                        value={`${doc.width}:${doc.height}`}
                                        onChange={(e) => {
                                            const [width, height] =
                                                e.target.value
                                                    .split(":")
                                                    .map(Number);
                                            void edit([
                                                {
                                                    tool: "set_format",
                                                    params: { width, height },
                                                },
                                            ]);
                                        }}
                                    >
                                        {[
                                            [1080, 1920, "9:16"],
                                            [1920, 1080, "16:9"],
                                            [1080, 1080, "1:1"],
                                            [1080, 1350, "4:5"],
                                            [1920, 824, "21:9"],
                                            [1620, 1080, "3:2"],
                                        ].map(([w, h, label]) => (
                                            <option
                                                key={String(label)}
                                                value={`${w}:${h}`}
                                            >
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Transition
                                    <select
                                        defaultValue={
                                            doc.tracks.video[0]?.transition_out
                                                ?.type || "none"
                                        }
                                        onChange={(e) =>
                                            void edit([
                                                {
                                                    tool: "set_transition",
                                                    params: {
                                                        type: e.target.value,
                                                        duration_frames: 15,
                                                    },
                                                },
                                            ])
                                        }
                                    >
                                        {transitions.map((x) => (
                                            <option key={x}>{x}</option>
                                        ))}
                                    </select>
                                </label>
                            </>
                        )}
                    </fieldset>
                </aside>
            </div>
            <section className="panel timeline">
                <h2>Timeline</h2>
                <p className="muted">
                    Captions and narration stay anchored to narration time when
                    scenes move.
                </p>
                <div className="clips">
                    {doc.tracks.video.map((c, i) => (
                        <button
                            className={selected === c.id ? "selected" : ""}
                            style={{ flexGrow: c.end_frame - c.start_frame }}
                            key={c.id}
                            onClick={() => {
                                flushAutosave();
                                setSelected(c.id);
                                setTab("Scene");
                                player.current?.seekTo(c.start_frame);
                            }}
                        >
                            <strong>Scene {i + 1}</strong>
                            <small>
                                {(
                                    (c.end_frame - c.start_frame) /
                                    doc.fps
                                ).toFixed(1)}{" "}
                                s · {c.media_type}
                            </small>
                        </button>
                    ))}
                </div>
            </section>
            {job && (
                <section className="panel">
                    <h2>Export: {job.status}</h2>
                    <progress max={1} value={job.progress} />
                    {job.error && <p className="error">{job.error}</p>}
                    {job.output_url && (
                        <a className="button primary" href={job.output_url}>
                            Download MP4
                        </a>
                    )}
                    {["queued", "rendering"].includes(job.status) && (
                        <button
                            onClick={async () => {
                                try {
                                    await api(
                                        `${base}/exports/${exportId}`,
                                        undefined,
                                        "DELETE",
                                    );
                                    setJob({ ...job, status: "cancelled" });
                                } catch (e) {
                                    setError((e as Error).message);
                                }
                            }}
                        >
                            Cancel export
                        </button>
                    )}
                </section>
            )}
            <section className="panel assistant">
                <h2>Editing assistant</h2>
                {pendingRun &&
                    !plan &&
                    ["planning", "failed"].includes(pendingRun.status) && (
                        <button
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    const r = await api(`${base}/agent-runs`, {
                                        runId: pendingRun.id,
                                        message: pendingRun.message,
                                    });
                                    setPlan(r);
                                } catch (e) {
                                    setError((e as Error).message);
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            Resume previous request
                        </button>
                    )}
                <p className="muted">
                    Describe several edits. Review the proposed changes, then
                    apply them as one undoable step.
                </p>
                {chat.map((c, i) => (
                    <p dir="auto" key={i}>
                        <strong>{c.role}:</strong> {c.text}
                    </p>
                ))}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void run();
                    }}
                >
                    <label>
                        Your request
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Make captions bigger and use fade transitions"
                            maxLength={2000}
                        />
                    </label>
                    <button disabled={busy || save === "Unsaved changes"}>
                        Prepare edits
                    </button>
                </form>
                {plan?.plan.operations.length > 0 && (
                    <div>
                        <ol>
                            {plan.plan.operations.map(
                                (o: Operation, i: number) => (
                                    <li key={i}>
                                        {o.tool.replaceAll("_", " ")}:{" "}
                                        {JSON.stringify(o.params)}
                                    </li>
                                ),
                            )}
                        </ol>
                        <button
                            className="primary"
                            disabled={busy}
                            onClick={() => void applyPlan()}
                        >
                            Apply {plan.plan.operations.length} changes
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await api(
                                        `${base}/agent-runs/${plan.runId}`,
                                        undefined,
                                        "DELETE",
                                    );
                                    setPlan(null);
                                } catch (e) {
                                    setError((e as Error).message);
                                }
                            }}
                        >
                            Discard
                        </button>
                    </div>
                )}
            </section>
        </Shell>
    );
}
