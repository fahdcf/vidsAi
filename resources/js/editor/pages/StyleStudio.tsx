import usePreviewHeight from "../usePreviewHeight";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoMerger } from "@vidsai/compositions";
import {
    normalizeDocument,
    transitions,
    type Document,
    type Operation,
} from "@vidsai/contracts";
import { applyOperations } from "@vidsai/editing-core";
import Shell from "../Shell";
import Icon from "../Icon";
import StyleGallery, { captionPresets } from "../StyleGallery";
import MusicLibrary from "../MusicLibrary";
import MediaThumb from "../MediaThumb";
import { api } from "../api";
const transitionName = (s: string) =>
    s === "none"
        ? "Clean cut"
        : s
              .split("-")
              .map((v) => v[0].toUpperCase() + v.slice(1))
              .join(" ");
export default function StyleStudio({ project, document: initial }: any) {
    const previewHeight = usePreviewHeight();
    const [doc, setDoc] = useState<Document>(() => normalizeDocument(initial));
    const first = doc.tracks.subtitles[0];
    const initialConfig = {
        fontSize: String(first?.config.fontSize || "44px"),
        fontFamily: String(first?.config.fontFamily || "Arial"),
        textColor: String(first?.config.textColor || "#ffffff"),
        backgroundColor: String(first?.config.backgroundColor || "#000000"),
        position: first?.position || "bottom",
    };
    const [style, setStyle] = useState(first?.style || "default"),
        [config, setConfig] = useState(initialConfig),
        [transition, setTransition] = useState(
            doc.tracks.video[0]?.transition_out?.type || "none",
        );
    const [baseline, setBaseline] = useState(() =>
        JSON.stringify({ style, config, transition }),
    );
    const [texts, setTexts] = useState<Record<string, string>>(() =>
        Object.fromEntries(doc.tracks.subtitles.map((s) => [s.id, s.text])),
    );
    const [tab, setTab] = useState("Styles"),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [saved, setSaved] = useState("All changes saved");
    const player = useRef<PlayerRef>(null);
    const leaving = useRef(false);
    const operations = useMemo(() => {
        const previous = JSON.parse(baseline);
        const ops: Operation[] = [];
        if (style !== previous.style)
            ops.push({ tool: "set_subtitle_style", params: { style } });
        if (JSON.stringify(config) !== JSON.stringify(previous.config))
            ops.push({ tool: "update_subtitle_config", params: { config } });
        if (transition !== previous.transition)
            ops.push({
                tool: "set_transition",
                params: {
                    type: transition,
                    duration_frames: Math.round(doc.fps * 0.4),
                },
            });
        for (const s of doc.tracks.subtitles)
            if (texts[s.id] !== undefined && texts[s.id] !== s.text)
                ops.push({
                    tool: "update_subtitle",
                    params: { id: s.id, text: texts[s.id] },
                });
        return ops;
    }, [style, config, transition, baseline, texts, doc]);
    const preview = useMemo(
        () => (operations.length ? applyOperations(doc, operations) : doc),
        [doc, operations],
    );
    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (operations.length && !leaving.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [operations.length]);
    async function save(extra: Operation[] = [], next = false) {
        const size = parseFloat(config.fontSize);
        if (!Number.isFinite(size) || size < 12 || size > 180) {
            setError("Choose a font size between 12 and 180 pixels.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const ops = [...operations, ...extra];
            if (ops.length) {
                let current = doc;
                for (let offset = 0; offset < ops.length; offset += 30) {
                    const r = await api(`/projects/${project.id}/commands`, {
                        commandId: crypto.randomUUID(),
                        expectedRevision: current.revision,
                        operations: ops.slice(offset, offset + 30),
                    });
                    current = normalizeDocument(r.edit_state);
                    setDoc(current);
                }
                setBaseline(JSON.stringify({ style, config, transition }));
                setSaved("All changes saved");
            }
            if (next) {
                leaving.current = true;
                window.location.href = `/projects/${project.id}/editor`;
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    const music = doc.tracks.audio.find((a) => a.type === "music");
    const sampleFrame = Math.min(
        doc.total_frames - 1,
        (doc.tracks.subtitles[0]?.words?.[0]?.start_frame ??
            doc.tracks.subtitles[0]?.start_frame ??
            0) + Math.round(doc.fps * 0.2),
    );
    return (
        <Shell
            title="Style your video"
            description="Find the look. Set the mood. Make every word count."
            actions={
                <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void save([], true)}
                >
                    Open editor
                    <Icon name="arrowRight" />
                </button>
            }
        >
            {error && (
                <p role="alert" className="error">
                    {error}
                </p>
            )}
            <div className="style-studio">
                <section className="style-browser panel">
                    <nav className="studio-tabs" aria-label="Video styling">
                        {[
                            { name: "Styles", icon: "caption" },
                            { name: "Transitions", icon: "film" },
                            { name: "Music", icon: "music" },
                            { name: "Captions", icon: "caption" },
                            { name: "Clips", icon: "grid" },
                        ].map((t) => (
                            <button
                                key={t.name}
                                aria-pressed={tab === t.name}
                                onClick={() => setTab(t.name)}
                            >
                                <Icon name={t.icon} size={16} />
                                {t.name}
                            </button>
                        ))}
                    </nav>
                    <div className="style-browser-body">
                        {tab === "Styles" && (
                            <>
                                <div className="section-bar">
                                    <div>
                                        <span className="eyebrow">
                                            THE WORDS DESERVE A LOOK
                                        </span>
                                        <h2>Caption styles</h2>
                                        <p className="muted">
                                            Pick a preset. See it on your video
                                            instantly.
                                        </p>
                                    </div>
                                    <span className="count-pill">
                                        7 presets
                                    </span>
                                </div>
                                <StyleGallery
                                    value={style}
                                    disabled={busy}
                                    onChoose={(id) => {
                                        setStyle(id as typeof style);
                                        player.current?.seekTo(sampleFrame);
                                    }}
                                />
                                <section className="customization">
                                    <div className="section-bar">
                                        <h3>Make it yours</h3>
                                        <span className="muted small-text">
                                            Live customization
                                        </span>
                                    </div>
                                    <div className="row">
                                        <label>
                                            Font family
                                            <select
                                                value={config.fontFamily}
                                                onChange={(e) =>
                                                    setConfig({
                                                        ...config,
                                                        fontFamily:
                                                            e.target.value,
                                                    })
                                                }
                                            >
                                                {[
                                                    ...new Set([
                                                        config.fontFamily,
                                                        "Arial",
                                                        "Inter",
                                                        "Georgia",
                                                        "Verdana",
                                                        "Courier New",
                                                    ]),
                                                ].map((f) => (
                                                    <option key={f}>{f}</option>
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
                                                value={
                                                    parseFloat(
                                                        config.fontSize,
                                                    ) || ""
                                                }
                                                onChange={(e) =>
                                                    setConfig({
                                                        ...config,
                                                        fontSize:
                                                            e.target.value +
                                                            "px",
                                                    })
                                                }
                                            />
                                        </label>
                                    </div>
                                    <div className="row">
                                        <label>
                                            Text color
                                            <input
                                                type="color"
                                                value={
                                                    /^#[0-9a-f]{6}$/i.test(
                                                        config.textColor,
                                                    )
                                                        ? config.textColor
                                                        : "#ffffff"
                                                }
                                                onChange={(e) =>
                                                    setConfig({
                                                        ...config,
                                                        textColor:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label>
                                            Background
                                            <input
                                                type="color"
                                                value={
                                                    /^#[0-9a-f]{6}$/i.test(
                                                        config.backgroundColor,
                                                    )
                                                        ? config.backgroundColor
                                                        : "#000000"
                                                }
                                                onChange={(e) =>
                                                    setConfig({
                                                        ...config,
                                                        backgroundColor:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                    </div>
                                    <span className="field-label">
                                        Caption position
                                    </span>
                                    <div className="position-options">
                                        {["top", "center", "bottom"].map(
                                            (p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    aria-label={`Captions at ${p}`}
                                                    aria-pressed={
                                                        config.position === p
                                                    }
                                                    onClick={() =>
                                                        setConfig({
                                                            ...config,
                                                            position:
                                                                p as typeof config.position,
                                                        })
                                                    }
                                                >
                                                    <span
                                                        className={`position-box position-${p}`}
                                                    >
                                                        <i />
                                                    </span>
                                                    {p[0].toUpperCase() +
                                                        p.slice(1)}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                    <button
                                        disabled={busy || !operations.length}
                                        onClick={() => void save()}
                                    >
                                        Save caption style
                                        <Icon name="check" size={15} />
                                    </button>
                                </section>
                            </>
                        )}
                        {tab === "Transitions" && (
                            <>
                                <div className="section-bar">
                                    <div>
                                        <span className="eyebrow">
                                            A LITTLE FLOW GOES A LONG WAY
                                        </span>
                                        <h2>Between the scenes</h2>
                                        <p className="muted">
                                            One consistent transition across
                                            your story.
                                        </p>
                                    </div>
                                </div>
                                <div className="transition-gallery">
                                    {transitions.map((t) => (
                                        <button
                                            key={t}
                                            className={`transition-card ${transition === t ? "is-selected" : ""}`}
                                            aria-label={`Use ${transitionName(t)} transition`}
                                            aria-pressed={transition === t}
                                            disabled={busy}
                                            onClick={() => {
                                                setTransition(t);
                                                player.current?.seekTo(
                                                    Math.max(
                                                        0,
                                                        (doc.tracks.video[0]
                                                            ?.end_frame || 30) -
                                                            15,
                                                    ),
                                                );
                                            }}
                                        >
                                            <span
                                                className={`transition-sample transition-${t}`}
                                            >
                                                <i>A</i>
                                                <b>B</b>
                                            </span>
                                            <strong>{transitionName(t)}</strong>
                                            {transition === t && (
                                                <Icon name="check" size={14} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="notice">
                                    Play across a cut in the preview to see your
                                    transition. Saves apply to every scene.
                                </p>
                                <button
                                    disabled={busy || !operations.length}
                                    onClick={() => void save()}
                                >
                                    Save transitions
                                    <Icon name="check" />
                                </button>
                            </>
                        )}
                        {tab === "Music" && (
                            <>
                                <div className="section-bar">
                                    <div>
                                        <span className="eyebrow">
                                            SET THE MOOD
                                        </span>
                                        <h2>A soundtrack for your story</h2>
                                        <p className="muted">
                                            Preview a track, then add it to your
                                            video.
                                        </p>
                                    </div>
                                </div>
                                {music && (
                                    <div className="selected-music">
                                        <Icon name="music" />
                                        <div>
                                            <strong>
                                                Background music selected
                                            </strong>
                                            <span>
                                                Included in your preview and
                                                export
                                            </span>
                                        </div>
                                        <button
                                            className="icon-button"
                                            aria-label="Remove music"
                                            disabled={busy}
                                            onClick={() =>
                                                void save([
                                                    {
                                                        tool: "set_music",
                                                        params: { url: null },
                                                    },
                                                ])
                                            }
                                        >
                                            <Icon name="close" />
                                        </button>
                                    </div>
                                )}
                                <MusicLibrary
                                    busy={busy}
                                    onChoose={(url) =>
                                        void save([
                                            {
                                                tool: "set_music",
                                                params: { url, volume: 0.2 },
                                            },
                                        ])
                                    }
                                />
                                {music && (
                                    <form
                                        className="music-level"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const volume = Number(
                                                new FormData(
                                                    e.currentTarget,
                                                ).get("volume"),
                                            );
                                            void save([
                                                {
                                                    tool: "set_music",
                                                    params: {
                                                        url: music.url,
                                                        volume,
                                                    },
                                                },
                                            ]);
                                        }}
                                    >
                                        <label>
                                            Music volume
                                            <input
                                                aria-label="Music volume"
                                                type="range"
                                                name="volume"
                                                min="0"
                                                max="1"
                                                step=".05"
                                                defaultValue={music.volume}
                                            />
                                        </label>
                                        <button disabled={busy}>
                                            Save volume
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                        {tab === "Captions" && (
                            <>
                                <div className="section-bar">
                                    <div>
                                        <span className="eyebrow">
                                            YOUR VOICE, ON SCREEN
                                        </span>
                                        <h2>Fine-tune the words</h2>
                                        <p className="muted">
                                            Select a caption to jump to that
                                            moment.
                                        </p>
                                    </div>
                                    <span className="count-pill">
                                        {doc.tracks.subtitles.length} captions
                                    </span>
                                </div>
                                <div className="caption-list">
                                    {doc.tracks.subtitles.map((s, i) => (
                                        <div className="caption-row" key={s.id}>
                                            <button
                                                className="caption-time"
                                                onClick={() =>
                                                    player.current?.seekTo(
                                                        s.start_frame,
                                                    )
                                                }
                                                aria-label={`Preview caption ${i + 1}`}
                                            >
                                                {(
                                                    s.start_frame / doc.fps
                                                ).toFixed(1)}
                                                s<Icon name="play" size={12} />
                                            </button>
                                            <label>
                                                <span>Caption {i + 1}</span>
                                                <textarea
                                                    aria-label={`Caption ${i + 1}`}
                                                    dir="auto"
                                                    value={
                                                        texts[s.id] ?? s.text
                                                    }
                                                    onChange={(e) =>
                                                        setTexts({
                                                            ...texts,
                                                            [s.id]: e.target
                                                                .value,
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    disabled={busy || !operations.length}
                                    onClick={() => void save()}
                                >
                                    Save caption text
                                    <Icon name="check" />
                                </button>
                            </>
                        )}
                        {tab === "Clips" && (
                            <>
                                <div className="section-bar">
                                    <div>
                                        <h2>Your story, shot by shot</h2>
                                        <p className="muted">
                                            Jump to a scene or return to review
                                            to replace its footage.
                                        </p>
                                    </div>
                                    <a
                                        className="button small"
                                        href={`/review/${project.id}`}
                                    >
                                        Review scenes
                                    </a>
                                </div>
                                <div className="style-clip-list">
                                    {doc.tracks.video.map((c, i) => (
                                        <button
                                            key={c.id}
                                            onClick={() =>
                                                player.current?.seekTo(
                                                    c.start_frame,
                                                )
                                            }
                                        >
                                            <MediaThumb
                                                url={c.clip_url}
                                                type={c.media_type}
                                            />
                                            <span>
                                                <strong>
                                                    Scene{" "}
                                                    {String(i + 1).padStart(
                                                        2,
                                                        "0",
                                                    )}
                                                </strong>
                                                <small>
                                                    {(
                                                        (c.end_frame -
                                                            c.start_frame) /
                                                        doc.fps
                                                    ).toFixed(1)}{" "}
                                                    seconds
                                                </small>
                                            </span>
                                            <Icon name="play" size={15} />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </section>
                <aside className="style-preview-column">
                    <section id="style-preview" className="panel style-preview">
                        <div className="section-bar">
                            <span className="eyebrow">
                                <span className="live-dot" />
                                LIVE PREVIEW
                            </span>
                            <span className="muted small-text">
                                {doc.width} × {doc.height}
                            </span>
                        </div>
                        <div className="style-player">
                            <Player
                                ref={player}
                                component={VideoMerger}
                                inputProps={{ editState: preview }}
                                durationInFrames={preview.total_frames}
                                compositionWidth={preview.width}
                                compositionHeight={preview.height}
                                fps={preview.fps}
                                controls
                                initialFrame={sampleFrame}
                                style={{
                                    width: "100%",
                                    maxWidth: Math.round(
                                        (doc.width / doc.height) *
                                            previewHeight,
                                    ),
                                    aspectRatio: `${doc.width}/${doc.height}`,
                                }}
                            />
                        </div>
                        <div className="preview-details">
                            <span>
                                <Icon name="caption" size={15} />
                                {
                                    captionPresets.find((s) => s.id === style)
                                        ?.name
                                }
                            </span>
                            <span>
                                <Icon name="clock" size={15} />
                                {(doc.total_frames / doc.fps).toFixed(1)}{" "}
                                seconds
                            </span>
                            <span>
                                <Icon name="film" size={15} />
                                {doc.tracks.video.length} scenes
                            </span>
                        </div>
                    </section>
                    <section className="style-summary">
                        <span className="eyebrow">LOOKING GOOD?</span>
                        <h2>Take it to the timeline.</h2>
                        <p>
                            Refine scene timing, add overlays, or ask your
                            editing assistant for the finishing touches.
                        </p>
                        <button
                            className="primary full-width"
                            disabled={busy}
                            onClick={() => void save([], true)}
                        >
                            Save & open editor
                            <Icon name="arrowRight" />
                        </button>
                        <span
                            className={`save-status ${operations.length ? "dirty" : ""}`}
                            role="status"
                        >
                            {busy
                                ? "Saving changes…"
                                : operations.length
                                  ? "Previewing unsaved changes"
                                  : saved}
                            <Icon
                                name={operations.length ? "clock" : "check"}
                                size={13}
                            />
                        </span>
                    </section>
                </aside>
            </div>
            <div className="style-mobile-actions">
                <a className="button ghost" href="#style-preview">
                    <Icon name="play" />
                    Preview changes
                </a>
                <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void save([], true)}
                >
                    Save & open editor
                    <Icon name="arrowRight" />
                </button>
            </div>
        </Shell>
    );
}
