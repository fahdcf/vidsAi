import React, { useState, useEffect, useRef } from "react";
import Shell from "../Shell";
import Icon from "../Icon";
import MediaThumb from "../MediaThumb";
import WanControls from "../WanControls";
import { api } from "../api";
export default function Review({ project, scenes: initial }: any) {
    const key = `vidsai:review:${project.id}`;
    const source = useRef<Record<number, any>>(
        Object.fromEntries(initial.map((s: any) => [s.id, s])),
    );
    const [draft] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem(key) || "{}");
        } catch {
            return {};
        }
    });
    const [rows, setRows] = useState<any[]>(() =>
        initial.map((s: any) =>
            draft[s.id]?.baseUrl === s.video_url
                ? { ...s, ...draft[s.id].row }
                : s,
        ),
    );
    const [approved, setApproved] = useState<number[]>(() =>
        initial
            .filter((s: any) =>
                draft[s.id]?.baseUrl === s.video_url
                    ? draft[s.id].approved
                    : Boolean(s.approved),
            )
            .map((s: any) => s.id),
    );
    const [index, setIndex] = useState(0),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [notice, setNotice] = useState("");
    const video = useRef<HTMLVideoElement>(null);
    const active = rows[index];
    useEffect(() => {
        try {
            sessionStorage.setItem(
                key,
                JSON.stringify(
                    Object.fromEntries(
                        rows.map((s) => [
                            s.id,
                            {
                                baseUrl: source.current[s.id]?.video_url,
                                row: s,
                                approved: approved.includes(s.id),
                            },
                        ]),
                    ),
                ),
            );
        } catch {}
    }, [rows, approved, key]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                (e.target as HTMLElement).closest(
                    "input,textarea,select,button,[contenteditable]",
                ) ||
                e.altKey ||
                e.ctrlKey ||
                e.metaKey
            )
                return;
            if (e.key === "ArrowRight") {
                e.preventDefault();
                setIndex((i) => Math.min(rows.length - 1, i + 1));
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [rows.length]);
    const edit = (id: number, values: any) => {
        setRows((old) =>
            old.map((s) => (s.id === id ? { ...s, ...values } : s)),
        );
        setApproved((old) => old.filter((v) => v !== id));
        setNotice("");
    };
    const valid = (s: any) =>
        Number.isFinite(Number(s.start_time)) &&
        Number.isFinite(Number(s.end_time ?? s.gemini_duration)) &&
        Number(s.end_time ?? s.gemini_duration) > Number(s.start_time || 0) &&
        Number(s.start_time || 0) >= 0 &&
        (s.type === "image" ||
            !s.duration_seconds ||
            Number(s.end_time ?? s.gemini_duration) <=
                Number(s.duration_seconds) + 0.01);
    async function replace(s: any, file: File) {
        setBusy(true);
        setError("");
        try {
            const { inspectBrowserMedia } = await import("../browser-export/inspect-media");
            await inspectBrowserMedia(file, /\.(png|jpe?g)$/i.test(file.name) ? "image" : "video", new AbortController().signal);
            const form = new FormData();
            form.append("file", file);
            const asset = await api(`/projects/${project.id}/assets`, form);
            edit(s.id, {
                video_url: asset.url,
                type: asset.media_type,
                thumbnail_path: asset.media_type === "image" ? asset.url : null,
                start_time: 0,
                end_time: asset.duration_seconds
                    ? Math.min(asset.duration_seconds, s.gemini_duration || 3)
                    : Number(s.end_time ?? s.gemini_duration ?? 3),
                duration_seconds: asset.duration_seconds,
            });
            setNotice("Media replaced. Preview it, then confirm this scene.");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    async function regenerate() {
        setBusy(true);
        setError("");
        try {
            await api(`/scenes/${active.id}/regenerate-proxy`, {
                keywords: [active.keywords || active.script_text],
            });
            const fresh = await api(
                `/api/page?path=${encodeURIComponent("/review/" + project.id)}`,
                undefined,
                "GET",
            );
            const updated = fresh.props.scenes.find(
                (s: any) => s.id === active.id,
            );
            source.current[active.id] = updated;
            edit(active.id, updated);
            setNotice("A new clip is ready to review.");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    async function confirmAll() {
        if (rows.some((s) => !valid(s))) {
            setError(
                "Check each source window. The end must follow the start and stay inside the clip.",
            );
            setIndex(rows.findIndex((s) => !valid(s)));
            return;
        }
        setBusy(true);
        setError("");
        try {
            const r = await api(`/review/${project.id}/confirm`, {
                scenes: rows.map((s) => ({
                    scene_id: s.id,
                    video_url: s.video_url,
                    start_time: Number(s.start_time || 0),
                    end_time: Number(s.end_time ?? s.gemini_duration),
                })),
            });
            try {
                sessionStorage.removeItem(key);
            } catch {}
            window.location.href = r.redirect;
        } catch (e) {
            setError((e as Error).message);
            setBusy(false);
        }
    }
    if (!active)
        return (
            <Shell title="Review your scenes">
                <div className="empty-state">
                    <Icon name="film" />
                    <h2>Your scenes are not ready yet</h2>
                    <a
                        className="button primary"
                        href={`/processing/${project.id}`}
                    >
                        View processing
                    </a>
                </div>
            </Shell>
        );
    const start = Number(active.start_time || 0),
        end = Number(active.end_time ?? active.gemini_duration ?? 3),
        duration = Math.max(0, end - start);
    const confirmed = approved.includes(active.id);
    return (
        <Shell
            title="Review your scenes"
            description="Shape your story, one scene at a time. Preview, trim, and make it yours."
            actions={
                <span className="project-name-tag">
                    <Icon name="film" />
                    {project.name}
                </span>
            }
        >
            {project.timing_warning && (
                <p className="notice warning" role="alert">
                    {project.timing_warning}
                </p>
            )}
            {error && (
                <p className="error" role="alert">
                    {error}
                </p>
            )}
            <div className="review-workspace">
                <section className="review-stage panel">
                    <div className="section-bar">
                        <span className="eyebrow">
                            SCENE {String(index + 1).padStart(2, "0")}{" "}
                            <span className="muted">
                                / {String(rows.length).padStart(2, "0")}
                            </span>
                        </span>
                        <span
                            className={`status-pill ${confirmed ? "ready" : ""}`}
                        >
                            {confirmed ? (
                                <>
                                    <Icon name="check" size={12} />
                                    Confirmed
                                </>
                            ) : (
                                "Needs review"
                            )}
                        </span>
                    </div>
                    <div className="scene-preview" key={active.video_url}>
                        {active.type === "image" ? (
                            <img
                                alt={`Scene ${active.scene_number}`}
                                src={active.video_url}
                            />
                        ) : (
                            <video
                                ref={video}
                                src={active.video_url}
                                controls
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={() => {
                                    if (video.current)
                                        video.current.currentTime = start;
                                }}
                                onTimeUpdate={() => {
                                    if (
                                        video.current &&
                                        video.current.currentTime >= end &&
                                        !video.current.paused
                                    )
                                        video.current.pause();
                                }}
                            />
                        )}
                        <span className="preview-duration">
                            <Icon name="clock" size={12} />
                            {duration.toFixed(2)}s selected
                        </span>
                    </div>
                    <div className="scene-narration">
                        <span className="eyebrow">THE STORY IN THIS SCENE</span>
                        <p dir="auto">{active.script_text}</p>
                    </div>
                    <div className="scene-stage-footer">
                        <button
                            className="button ghost"
                            disabled={busy || index === 0}
                            aria-label="Previous scene"
                            onClick={() => setIndex((i) => i - 1)}
                        >
                            <Icon name="arrowLeft" />
                            Previous
                        </button>
                        <span className="muted">
                            {index + 1} of {rows.length} scenes
                        </span>
                        <button
                            className="button ghost"
                            disabled={busy || index === rows.length - 1}
                            aria-label="Next scene"
                            onClick={() => setIndex((i) => i + 1)}
                        >
                            Next
                            <Icon name="arrowRight" />
                        </button>
                    </div>
                </section>
                <aside className="review-tools panel">
                    <div className="section-bar">
                        <h2>Make it your scene</h2>
                        <Icon name="settings" />
                    </div>
                    <div className="tool-section">
                        <h3>
                            <Icon name="scissors" />
                            Trim footage
                        </h3>
                        <p className="muted small-text">
                            Choose the part of the source you want to use.
                        </p>
                        <div className="row">
                            <label>
                                Start (seconds)
                                <input
                                    type="number"
                                    min="0"
                                    step=".01"
                                    value={active.start_time ?? 0}
                                    onChange={(e) =>
                                        edit(active.id, {
                                            start_time: Number(e.target.value),
                                        })
                                    }
                                />
                            </label>
                            <label>
                                End (seconds)
                                <input
                                    type="number"
                                    min=".01"
                                    step=".01"
                                    value={
                                        active.end_time ??
                                        active.gemini_duration
                                    }
                                    onChange={(e) =>
                                        edit(active.id, {
                                            end_time: Number(e.target.value),
                                        })
                                    }
                                />
                            </label>
                        </div>
                        <div className="trim-visual">
                            <span
                                style={{
                                    left: `${Math.min(95, (start / (active.duration_seconds || end)) * 100)}%`,
                                    right: `${Math.max(0, 100 - (end / (active.duration_seconds || end)) * 100)}%`,
                                }}
                            />
                        </div>
                        {!valid(active) && (
                            <p className="field-error">
                                Choose a valid start and end inside the source.
                            </p>
                        )}
                        <div className="trim-actions">
                            <button
                                className="text-button"
                                disabled={busy || active.type === "image"}
                                onClick={() =>
                                    edit(active.id, {
                                        start_time:
                                            Math.round(
                                                (video.current?.currentTime ||
                                                    0) * 100,
                                            ) / 100,
                                    })
                                }
                            >
                                Set start here
                            </button>
                            <button
                                className="text-button"
                                disabled={busy || active.type === "image"}
                                onClick={() =>
                                    edit(active.id, {
                                        end_time:
                                            Math.round(
                                                (video.current?.currentTime ||
                                                    end) * 100,
                                            ) / 100,
                                    })
                                }
                            >
                                Set end here
                            </button>
                        </div>
                        <div className="detail-pair">
                            <span>Selected duration</span>
                            <strong>{duration.toFixed(2)} seconds</strong>
                        </div>
                    </div>
                    <div className="tool-section">
                        <h3>
                            <Icon name="film" />
                            Find the right shot
                        </h3>
                        <label>
                            Search keyword
                            <input
                                value={active.keywords || ""}
                                onChange={(e) =>
                                    edit(active.id, {
                                        keywords: e.target.value,
                                    })
                                }
                                placeholder="e.g. bottle, outdoor adventure"
                            />
                        </label>
                        <button
                            className="full-width"
                            disabled={busy}
                            onClick={() => void regenerate()}
                        >
                            <Icon name="refresh" />
                            {busy ? "Working…" : "Find another clip"}
                        </button>
                        <label className="upload-tile">
                            <Icon name="upload" />
                            <strong>Replace media</strong>
                            <small>
                                Choose an image or video · up to 100 MB
                            </small>
                            <input
                                aria-label="Replace media"
                                type="file"
                                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                                disabled={busy}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void replace(active, f);
                                    e.target.value = "";
                                }}
                            />
                        </label>
                        <WanControls key={active.id} scene={active} />
                    </div>
                    {notice && (
                        <p className="notice" role="status">
                            {notice}
                        </p>
                    )}
                    <button
                        className={`full-width ${confirmed ? "confirmed-button" : "primary"}`}
                        disabled={busy || !valid(active)}
                        onClick={() => {
                            setApproved((old) => [
                                ...new Set([...old, active.id]),
                            ]);
                            setNotice(`Scene ${index + 1} confirmed.`);
                            if (index < rows.length - 1) setIndex((i) => i + 1);
                        }}
                    >
                        <Icon name="check" />
                        {confirmed
                            ? "Scene confirmed"
                            : index === rows.length - 1
                              ? "Confirm scene"
                              : "Confirm scene & next"}
                    </button>
                    <button
                        className="text-button full-width"
                        disabled={busy}
                        onClick={() =>
                            edit(active.id, { ...source.current[active.id] })
                        }
                    >
                        Reset this scene
                    </button>
                </aside>
                <section
                    className="scene-strip panel"
                    aria-label="Scene navigation"
                >
                    <div className="section-bar">
                        <div>
                            <h2>Your storyboard</h2>
                            <p className="muted small-text">
                                Select a scene to review. Use left and right
                                arrow keys to move between scenes.
                            </p>
                        </div>
                        <span className="count-pill">{rows.length} scenes</span>
                    </div>
                    <div className="scene-thumbnails">
                        {rows.map((s, i) => (
                            <button
                                type="button"
                                key={s.id}
                                aria-label={`Review scene ${i + 1}`}
                                aria-current={index === i ? "true" : undefined}
                                className={`scene-thumbnail ${index === i ? "active" : ""}`}
                                onClick={() => setIndex(i)}
                            >
                                <MediaThumb
                                    url={s.thumbnail_path || s.video_url}
                                    type={s.thumbnail_path ? "image" : s.type}
                                />
                                <span className="scene-thumbnail-caption">
                                    <strong>
                                        Scene {String(i + 1).padStart(2, "0")}
                                    </strong>
                                    <small>
                                        {Number(
                                            (s.end_time ?? s.gemini_duration) -
                                                (s.start_time || 0),
                                        ).toFixed(1)}
                                        s
                                    </small>
                                </span>
                                {approved.includes(s.id) && (
                                    <span className="scene-approved">
                                        <Icon name="check" size={11} />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </section>
            </div>
            <footer className="workflow-footer">
                <div className="review-completion">
                    <span className="completion-circle">
                        <Icon name="check" />
                    </span>
                    <div>
                        <strong>
                            {approved.length} of {rows.length} scenes confirmed
                        </strong>
                        <p>Happy with your story? Give it a style.</p>
                    </div>
                </div>
                <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void confirmAll()}
                >
                    {busy
                        ? "Saving scenes…"
                        : approved.length === rows.length
                          ? "Continue to styling"
                          : "Confirm All Scenes"}
                    <Icon name="arrowRight" />
                </button>
            </footer>
        </Shell>
    );
}
