import React, { useRef, useState } from "react";
import type { Document } from "@vidsai/contracts";
import Icon from "./Icon";
import MediaThumb from "./MediaThumb";
export default function Timeline({
    document: doc,
    selected,
    frame,
    busy,
    onSelect,
    onSeek,
    onReorder,
}: {
    document: Document;
    selected: string;
    frame: number;
    busy: boolean;
    onSelect: (id: string) => void;
    onSeek: (frame: number) => void;
    onReorder: (ids: string[]) => void;
}) {
    const [zoom, setZoom] = useState(1);
    const dragged = useRef<string | null>(null);
    const percent = (n: number) => (n / doc.total_frames) * 100;
    const span = (start: number, end: number) => ({
        left: percent(start) + "%",
        width: Math.max(0.2, percent(end - start)) + "%",
    });
    return (
        <section className="panel timeline-panel">
            <div className="timeline-toolbar">
                <h2>
                    <Icon name="film" size={16} />
                    Timeline
                    <small>
                        {(doc.total_frames / doc.fps).toFixed(2)}s · {doc.fps}{" "}
                        fps
                    </small>
                </h2>
                <div className="timeline-zoom">
                    <button
                        aria-label="Zoom out timeline"
                        disabled={zoom <= 0.5}
                        onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    >
                        −
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                        aria-label="Zoom in timeline"
                        disabled={zoom >= 3}
                        onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    >
                        +
                    </button>
                    <button className="text-button" onClick={() => setZoom(1)}>
                        Fit
                    </button>
                </div>
            </div>
            <div className="timeline-scroll">
                <div
                    className="timeline-canvas"
                    style={{ minWidth: Math.round(780 * zoom) }}
                >
                    <div className="timeline-row timeline-ruler">
                        <span className="timeline-label">
                            <Icon name="clock" size={12} />
                            Time
                        </span>
                        <div className="timeline-track">
                            {Array.from({ length: 11 }, (_, i) => (
                                <button
                                    key={i}
                                    className="ruler-marker"
                                    style={{ left: i * 10 + "%" }}
                                    aria-label={`Seek to ${((i * doc.total_frames) / doc.fps / 10).toFixed(1)} seconds`}
                                    onClick={() =>
                                        onSeek(
                                            Math.min(
                                                doc.total_frames - 1,
                                                Math.round(
                                                    (i * doc.total_frames) / 10,
                                                ),
                                            ),
                                        )
                                    }
                                >
                                    {(
                                        (i * doc.total_frames) /
                                        doc.fps /
                                        10
                                    ).toFixed(1)}
                                    s
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="timeline-row timeline-scenes">
                        <span className="timeline-label">
                            <Icon name="film" size={13} />
                            Scenes
                        </span>
                        <div className="timeline-track">
                            {doc.tracks.video.map((c, i) => (
                                <button
                                    key={c.id}
                                    className={`timeline-clip ${selected === c.id ? "selected" : ""}`}
                                    style={span(c.start_frame, c.end_frame)}
                                    aria-label={`Select scene ${i + 1}`}
                                    aria-pressed={selected === c.id}
                                    draggable={!busy}
                                    disabled={busy}
                                    onDragStart={(e) => {
                                        dragged.current = c.id;
                                        e.dataTransfer.setData(
                                            "text/plain",
                                            c.id,
                                        );
                                        e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                        dragged.current = null;
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const id = dragged.current;
                                        if (!id || id === c.id || busy) return;
                                        const ids = doc.tracks.video.map(
                                            (c) => c.id,
                                        );
                                        const from = ids.indexOf(id),
                                            to = ids.indexOf(c.id);
                                        ids.splice(from, 1);
                                        ids.splice(to, 0, id);
                                        dragged.current = null;
                                        onReorder(ids);
                                    }}
                                    onClick={() => {
                                        onSelect(c.id);
                                        onSeek(c.start_frame);
                                    }}
                                >
                                    <MediaThumb
                                        url={c.clip_url}
                                        type={c.media_type}
                                    />
                                    <strong>
                                        Scene {String(i + 1).padStart(2, "0")}
                                    </strong>
                                    <small>
                                        {(
                                            (c.end_frame - c.start_frame) /
                                            doc.fps
                                        ).toFixed(1)}
                                        s
                                    </small>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="timeline-row">
                        <span className="timeline-label">
                            <Icon name="caption" size={13} />
                            Captions
                        </span>
                        <div className="timeline-track">
                            {doc.tracks.subtitles.map((s, i) => (
                                <button
                                    key={s.id}
                                    className="timeline-caption"
                                    style={span(s.start_frame, s.end_frame)}
                                    aria-label={`Preview caption ${i + 1}`}
                                    title={s.text}
                                    onClick={() => onSeek(s.start_frame)}
                                >
                                    {s.text}
                                </button>
                            ))}
                        </div>
                    </div>
                    {(["voiceover", "music"] as const).map((type) => (
                        <div className="timeline-row" key={type}>
                            <span className="timeline-label">
                                <Icon
                                    name={type === "music" ? "music" : "user"}
                                    size={13}
                                />
                                {type === "music" ? "Music" : "Voiceover"}
                            </span>
                            <div className="timeline-track">
                                {doc.tracks.audio
                                    .filter((a) => a.type === type)
                                    .map((a) => (
                                        <span
                                            key={a.id}
                                            className={`audio-segment ${type === "music" ? "music-segment" : ""}`}
                                            style={span(
                                                a.start_frame,
                                                a.end_frame,
                                            )}
                                        >
                                            {type === "music"
                                                ? "Background music"
                                                : "Your narration"}{" "}
                                            · {Math.round(a.volume * 100)}%
                                        </span>
                                    ))}
                            </div>
                        </div>
                    ))}
                    <div
                        className="timeline-playhead"
                        style={{
                            left: `calc(90px + ${percent(frame)}% - ${(90 * percent(frame)) / 100}px)`,
                        }}
                    />
                </div>
            </div>
            <p className="timeline-help">
                Drag scenes to reorder, or use Move earlier / Move later in the
                scene tools. Select the ruler to seek.
            </p>
        </section>
    );
}
