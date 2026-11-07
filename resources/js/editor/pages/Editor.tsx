import PanelResizers from "../PanelResizers";
import AssistantPanel from "../AssistantPanel";

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

import Icon from "../Icon";

import Timeline from "../Timeline";

import StyleGallery from "../StyleGallery";

import { api } from "../api";

import MusicLibrary from "../MusicLibrary";

type Project = { id: number; name: string; status: string };

export default function Editor({
    project,

    document: initial,

    latestExport,

    pendingRun,

    history = [],

    agentHistory = [],
}: {
    project: Project;

    document: Document;

    latestExport?: any;

    pendingRun?: any;

    history?: Document[];

    agentHistory?: any[];
}) {
    const [doc, setDoc] = useState(() => normalizeDocument(initial));

    const [busy, setBusy] = useState(false);

    const [error, setError] = useState("");

    const [save, setSave] = useState("Saved");

    const [selected, setSelected] = useState(doc.tracks.video[0]?.id || "");

    const [tab, setTab] = useState("Scene");

    const [assistantOpen, setAssistantOpen] = useState(
        () => window.innerWidth >= 1180,
    );

    const [compact, setCompact] = useState(() => window.innerWidth < 1180);

    const [toolsOpen, setToolsOpen] = useState(() => window.innerWidth >= 1400);

    const [assistantWide, setAssistantWide] = useState(false);

    const [planning, setPlanning] = useState(false),
        [applying, setApplying] = useState(false),
        [assistantError, setAssistantError] = useState("");

    const previewCanvas = useRef<HTMLDivElement>(null);

    const [previewSize, setPreviewSize] = useState({ width: 640, height: 360 });

    useEffect(() => {
        const resize = () => setCompact(window.innerWidth < 1180);

        window.addEventListener("resize", resize);

        return () => window.removeEventListener("resize", resize);
    }, []);

    useEffect(() => {
        if (!previewCanvas.current) return;

        const observer = new ResizeObserver(([entry]) =>
            setPreviewSize({
                width: entry.contentRect.width,

                height: entry.contentRect.height,
            }),
        );

        observer.observe(previewCanvas.current);

        return () => observer.disconnect();
    }, []);

    const [frame, setFrame] = useState(0);

    const [playing, setPlaying] = useState(false);

    const player = useRef<PlayerRef>(null);

    const [undo, setUndo] = useState<Document[]>(history);

    const [redo, setRedo] = useState<Document[]>([]);

    const [exportId, setExportId] = useState<string | null>(
        latestExport?.id || null,
    );

    const [job, setJob] = useState<any>(latestExport || null);

    const [message, setMessage] = useState("");

    const [chat, setChat] = useState<{ role: string; text: string }[]>(() =>
        agentHistory.flatMap((run) => {
            let proposal: any;

            try {
                proposal = JSON.parse(run.plan || "null");
            } catch {}

            return [
                { role: "You", text: run.message },

                ...(proposal?.reply
                    ? [{ role: "Assistant", text: proposal.reply }]
                    : []),

                ...(run.status === "applied"
                    ? [
                          {
                              role: "Assistant",

                              text: "Changes applied to your video.",
                          },
                      ]
                    : run.status === "cancelled"
                      ? [{ role: "Assistant", text: "Proposal discarded." }]
                      : []),
            ];
        }),
    );

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

        if (target.closest("[data-no-autosave]")) return;

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

                if (!disposed) {
                    setJob(r);
                }
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

        const onPlay = () => setPlaying(true);

        const onPause = () => setPlaying(false);

        p.addEventListener("frameupdate", update);

        p.addEventListener("play", onPlay);

        p.addEventListener("pause", onPause);

        p.addEventListener("ended", onPause);

        return () => {
            p.removeEventListener("frameupdate", update);

            p.removeEventListener("play", onPlay);

            p.removeEventListener("pause", onPause);

            p.removeEventListener("ended", onPause);
        };
    }, []);

    const run = async () => {
        if (!message.trim() || busy || plan?.plan?.operations?.length) return;

        setBusy(true);

        setAssistantError("");

        setError("");

        setPlanning(true);

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
            setAssistantError((e as Error).message);
        } finally {
            setBusy(false);

            setPlanning(false);
        }
    };

    const applyPlan = async () => {
        setBusy(true);

        setApplying(true);

        setAssistantError("");

        setError("");

        try {
            const r = await api(`${base}/agent-runs/${plan.runId}/execute`, {});

            setUndo([...undo, doc]);

            setRedo([]);

            const next = normalizeDocument(r.edit_state);

            docRef.current = next;

            setDoc(next);

            setFormVersion((v) => v + 1);

            setChat((previous) => [
                ...previous,

                {
                    role: "Assistant",

                    text: `Applied ${plan.plan.operations.length} changes to your video.`,
                },
            ]);

            setPlan(null);

            setSave("Saved");
        } catch (e) {
            setAssistantError((e as Error).message);
        } finally {
            setBusy(false);

            setApplying(false);
        }
    };

    async function discardPlan() {
        if (busy || !plan) return;

        setBusy(true);

        setAssistantError("");

        try {
            await api(`${base}/agent-runs/${plan.runId}`, undefined, "DELETE");

            setPlan(null);

            setChat((c) => [
                ...c,

                { role: "Assistant", text: "Proposal discarded." },
            ]);
        } catch (e) {
            setAssistantError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function resumePlan() {
        setBusy(true);

        setPlanning(true);

        setAssistantError("");

        try {
            const r = await api(`${base}/agent-runs`, {
                runId: pendingRun.id,

                message: pendingRun.message,
            });

            setPlan(r);

            setChat((c) => [...c, { role: "Assistant", text: r.plan.reply }]);
        } catch (e) {
            setAssistantError((e as Error).message);
        } finally {
            setBusy(false);

            setPlanning(false);
        }
    }

    function move(delta: number) {
        if (!clip) return;

        const order = doc.tracks.video.map((c) => c.id);

        const i = order.indexOf(clip.id);

        if (i + delta < 0 || i + delta >= order.length) return;

        [order[i], order[i + delta]] = [order[i + delta], order[i]];

        void edit([{ tool: "reorder_scenes", params: { order } }]);
    }

    return (
        <Shell
            editor
            title={project.name}
            description="Your story. Your finishing touches."
        >
            <div className="editor-toolbar">
                <a className="editor-back" href="/dashboard" aria-label="Back to projects" title="Back to projects"><Icon name="arrowLeft" size={17}/></a>
                <span className="editor-project-title" title={project.name}>{project.name}</span>
                <button
                    data-assistant-toggle
                    aria-pressed={assistantOpen}
                    onClick={() => setAssistantOpen((v) => !v)}
                >
                    <Icon name="sparkles" />
                    Assistant
                </button>

                <span aria-live="polite" className="muted">
                    {save}
                </span>

                <button
                    disabled={
                        busy || save === "Unsaved changes" || !undo.length
                    }
                    onClick={() => void restore("undo")}
                    aria-label="Undo" title="Undo"
                >
                    <Icon name="undo" size={14} />
                </button>

                <button
                    disabled={
                        busy || save === "Unsaved changes" || !redo.length
                    }
                    onClick={() => void restore("redo")}
                    aria-label="Redo" title="Redo"
                >
                    <Icon name="redo" size={14} />
                </button>

                <a href={`/review/${project.id}`}>Scenes</a>

                <a href={`/subtitle-styles/${project.id}`}>Style</a>

                <button
                    aria-pressed={toolsOpen}
                    onClick={() => setToolsOpen((v) => !v)}
                >
                    <Icon name="settings" size={16} />
                    Tools
                </button>

                {job && (
                    <section
                        className="export-status-inline"
                        aria-label="Export status"
                    >
                        <div>
                            <h2>Export: {job.status}</h2>

                            {job.status === "done" &&
                                job.revision !== doc.revision && (
                                    <p className="muted">Older version</p>
                                )}

                            {["queued", "rendering"].includes(job.status) && (
                                <progress
                                    aria-label="Export progress"
                                    max={1}
                                    value={job.progress}
                                />
                            )}

                            {job.error && <p className="error">{job.error}</p>}
                        </div>

                        {job.output_url && (
                            <a className="button" href={job.output_url} aria-label="Download MP4" title="Download MP4">
                                <Icon name="download" size={15}/>
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

                <button
                    className="primary"
                    aria-label="Export video"
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

                            setJob({ status: "queued", progress: 0 });

                            setExportId(r.export_id);
                        } catch (e) {
                            setError((e as Error).message);
                        }
                    }}
                >
                    <Icon name="download" size={15} />

                    {["queued", "rendering"].includes(job?.status)
                        ? "Rendering…"
                        : "Export"}
                </button>
            </div>

            {error && (
                <div role="alert" className="error">
                    {error}
                </div>
            )}

            <div
                className={`editor-workspace ${assistantOpen && !compact ? "assistant-open" : ""} ${assistantWide ? "chat-wide" : ""} ${toolsOpen ? "tools-open" : ""}`}
            >
                <PanelResizers/>
                <div className="editor-grid">
                    <AssistantPanel
                        open={assistantOpen}
                        overlay={compact}
                        wide={assistantWide}
                        onClose={() => {
                            setAssistantOpen(false);

                            (
                                window.document.querySelector(
                                    "[data-assistant-toggle]",
                                ) as HTMLElement
                            )?.focus();
                        }}
                        onExpand={() => {
                            setAssistantWide((v) => !v);

                            setToolsOpen(false);
                        }}
                        chat={chat}
                        message={message}
                        onMessage={setMessage}
                        onSend={() => void run()}
                        plan={plan}
                        onApply={() => void applyPlan()}
                        onDiscard={() => void discardPlan()}
                        onResume={() => void resumePlan()}
                        canResume={Boolean(
                            pendingRun &&
                                ["planning", "failed"].includes(
                                    pendingRun.status,
                                ),
                        )}
                        busy={busy || save === "Unsaved changes"}
                        planning={planning}
                        applying={applying}
                        error={assistantError}
                        document={doc}
                    />

                    <section className="panel preview">
                        <div className="preview-topline">
                            <span>
                                <span className="live-dot" />
                                VIDEO PREVIEW
                            </span>

                            <span>
                                {doc.width} × {doc.height}
                            </span>
                        </div>

                        <div className="preview-canvas" ref={previewCanvas}>
                            <Player
                                ref={player}
                                component={VideoMerger}
                                inputProps={{ editState: doc }}
                                durationInFrames={doc.total_frames}
                                compositionWidth={doc.width}
                                compositionHeight={doc.height}
                                fps={doc.fps}
                                controls={false}
                                style={{
                                    width: Math.max(
                                        1,

                                        Math.min(
                                            previewSize.width,

                                            (previewSize.height * doc.width) /
                                                doc.height,
                                        ),
                                    ),

                                    aspectRatio: `${doc.width}/${doc.height}`,

                                    height: Math.max(
                                        1,

                                        Math.min(
                                            previewSize.height,

                                            (previewSize.width * doc.height) /
                                                doc.width,
                                        ),
                                    ),
                                }}
                            />
                        </div>

                        <div className="playhead">
                            <button
                                className="preview-play"
                                aria-label={
                                    playing ? "Pause preview" : "Play preview"
                                }
                                onClick={() =>
                                    playing
                                        ? player.current?.pause()
                                        : player.current?.play()
                                }
                            >
                                <Icon
                                    name={playing ? "pause" : "play"}
                                    size={18}
                                />
                            </button>

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

                            <button
                                aria-label="Fullscreen preview"
                                onClick={() =>
                                    player.current?.requestFullscreen()
                                }
                            >
                                ⛶
                            </button>
                        </div>
                    </section>

                    <aside className="panel inspector" hidden={!toolsOpen}>
                        <header className="inspector-heading">
                            <h2>Editing tools</h2>

                            <button
                                className="icon-button"
                                aria-label="Close tools"
                                onClick={() => setToolsOpen(false)}
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </header>

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

                                                    trim_in: Math.round(
                                                        Number(f.get("in")) *
                                                            doc.fps,
                                                    ),

                                                    trim_out: Math.round(
                                                        Number(f.get("out")) *
                                                            doc.fps,
                                                    ),

                                                    speed: Number(
                                                        f.get("speed"),
                                                    ),
                                                },
                                            },

                                            {
                                                tool: "set_animation",

                                                params: {
                                                    id: clip.id,

                                                    animation:
                                                        f.get("animation"),
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

                                    <label className="upload-tile">
                                        <Icon name="upload" />
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

                                    <details>
                                        <summary>
                                            Advanced media settings
                                        </summary>

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
                                                {[
                                                    "video",

                                                    "image",

                                                    "generated",
                                                ].map((x) => (
                                                    <option key={x}>{x}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </details>

                                    <div className="row">
                                        <label>
                                            Source in (seconds)
                                            <input
                                                name="in"
                                                type="number"
                                                min={0}
                                                step="any"
                                                defaultValue={Number(
                                                    (
                                                        clip.trim_in / doc.fps
                                                    ).toFixed(3),
                                                )}
                                            />
                                        </label>

                                        <label>
                                            Source out (seconds)
                                            <input
                                                name="out"
                                                type="number"
                                                min={0.01}
                                                step="any"
                                                defaultValue={Number(
                                                    (
                                                        clip.trim_out / doc.fps
                                                    ).toFixed(3),
                                                )}
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
                                            {[
                                                "none",

                                                "zoom-in",

                                                "zoom-out",
                                            ].map((x) => (
                                                <option key={x}>{x}</option>
                                            ))}
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

                                            const f = new FormData(
                                                e.currentTarget,
                                            );

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
                                                                f.get(
                                                                    "background",
                                                                ),

                                                            position:
                                                                f.get(
                                                                    "position",
                                                                ),

                                                            fontFamily:
                                                                f.get("font"),
                                                        },
                                                    },
                                                },
                                            ]);
                                        }}
                                    >
                                        <h2>Caption appearance</h2>

                                        <StyleGallery
                                            compact
                                            value={
                                                doc.tracks.subtitles[0]
                                                    ?.style || "default"
                                            }
                                            disabled={
                                                busy ||
                                                save === "Unsaved changes"
                                            }
                                            onChoose={(style) => {
                                                void edit([
                                                    {
                                                        tool: "set_subtitle_style",

                                                        params: { style },
                                                    },
                                                ]).then(() =>
                                                    setFormVersion(
                                                        (v) => v + 1,
                                                    ),
                                                );
                                            }}
                                        />

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
                                                            ?.config.fontSize ||
                                                            44,
                                                    ),
                                                )}
                                            />
                                        </label>

                                        <label>
                                            Font family
                                            <input
                                                name="font"
                                                defaultValue={String(
                                                    doc.tracks.subtitles[0]
                                                        ?.config.fontFamily ||
                                                        "Arial",
                                                )}
                                            />
                                        </label>

                                        <label>
                                            Text color
                                            <input
                                                name="color"
                                                defaultValue={String(
                                                    doc.tracks.subtitles[0]
                                                        ?.config.textColor ||
                                                        "#ffffff",
                                                )}
                                            />
                                        </label>

                                        <label>
                                            Background
                                            <input
                                                name="background"
                                                defaultValue={String(
                                                    doc.tracks.subtitles[0]
                                                        ?.config
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
                                                {[
                                                    "top",

                                                    "center",

                                                    "bottom",
                                                ].map((x) => (
                                                    <option key={x}>{x}</option>
                                                ))}
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
                                    <MusicLibrary
                                        busy={busy}
                                        onChoose={(url) =>
                                            void edit([
                                                {
                                                    tool: "set_music",

                                                    params: {
                                                        url,

                                                        volume: 0.2,
                                                    },
                                                },
                                            ])
                                        }
                                    />

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();

                                            const f = new FormData(
                                                e.currentTarget,
                                            );

                                            void edit([
                                                {
                                                    tool: "set_music",

                                                    params: {
                                                        url:
                                                            f.get("url") ||
                                                            null,

                                                        volume: Number(
                                                            f.get("volume"),
                                                        ),
                                                    },
                                                },
                                            ]);
                                        }}
                                    >
                                        <h2>Background music</h2>

                                        <a href="#music-library">
                                            Browse music library
                                        </a>

                                        <label>
                                            Music URL
                                            <input
                                                name="url"
                                                type="url"
                                                defaultValue={
                                                    doc.tracks.audio.find(
                                                        (a) =>
                                                            a.type === "music",
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
                                                        (a) =>
                                                            a.type === "music",
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

                                                            fade_in_frames:
                                                                Number(
                                                                    f.get(
                                                                        "fadeIn",
                                                                    ),
                                                                ),

                                                            fade_out_frames:
                                                                Number(
                                                                    f.get(
                                                                        "fadeOut",
                                                                    ),
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

                                            const f = new FormData(
                                                e.currentTarget,
                                            );

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

                                                        position:
                                                            f.get("position"),

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
                                            <input
                                                type="url"
                                                name="src"
                                                required
                                            />
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

                                                            params: {
                                                                id: o.id,
                                                            },
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

                                                        params: {
                                                            width,

                                                            height,
                                                        },
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
                                                doc.tracks.video[0]
                                                    ?.transition_out?.type ||
                                                "none"
                                            }
                                            onChange={(e) =>
                                                void edit([
                                                    {
                                                        tool: "set_transition",

                                                        params: {
                                                            type: e.target
                                                                .value,

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

                <Timeline
                    document={doc}
                    selected={selected}
                    frame={frame}
                    busy={busy}
                    onSelect={(id) => {
                        flushAutosave();

                        setSelected(id);

                        setTab("Scene");

                        setToolsOpen(true);
                    }}
                    onSeek={(n) => {
                        setFrame(n);

                        player.current?.seekTo(n);
                    }}
                    onReorder={(order) =>
                        void edit([
                            { tool: "reorder_scenes", params: { order } },
                        ])
                    }
                />
            </div>
        </Shell>
    );
}
