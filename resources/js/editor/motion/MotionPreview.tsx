import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoMerger } from "@vidsai/compositions";
import type { Document } from "@vidsai/contracts";

export type MotionPreviewHandle = { seekTo: (frame: number) => void; play: () => void };

export default function MotionPreview({ draft, playerRef, label = "Draft preview", initialFrame }: {
    draft: Document; playerRef?: React.Ref<MotionPreviewHandle>; label?: string; initialFrame?: number;
}) {
    const player = useRef<PlayerRef>(null);
    const audio = useRef<HTMLAudioElement>(null);
    const chosen = useRef(initialFrame ?? 0);
    const [position, setPosition] = useState(initialFrame ?? 0);
    const [playing, setPlaying] = useState(false);
    const [failedAudio, setFailedAudio] = useState("");
    const [track] = draft.tracks.audio;
    const eligible = !draft.tracks.video.length && draft.tracks.audio.length === 1 && track.start_frame === 0 &&
        track.end_frame === draft.total_frames && track.volume > 0;
    const stableId = eligible ? /^asset:([a-f0-9-]{36})$/i.exec(track.url)?.[1] : null;
    const audioUrl = eligible ? stableId ? `/projects/${encodeURIComponent(draft.project_id)}/assets/${stableId}` : track.url : "";
    const clocked = Boolean(audioUrl && audioUrl !== failedAudio);
    const duration = draft.total_frames / draft.fps;
    const maxWidth = Math.min(720, Math.round(420 * draft.width / draft.height));

    function seek(frame: number) {
        const next = Math.min(draft.total_frames - 1, Math.max(0, frame));
        chosen.current = next;
        setPosition(next);
        player.current?.seekTo(next);
        const media = audio.current;
        if (clocked && media && media.readyState > 0) media.currentTime = next / draft.fps;
    }

    function play() {
        const media = audio.current;
        if (!clocked || !media) { player.current?.play(); return; }
        if (chosen.current >= draft.total_frames - 1) seek(0);
        media.volume = track.fade_in_frames && chosen.current === 0 ? 0 : Math.min(1, track.volume);
        void media.play().catch((error: DOMException) => { if (error.name !== "AbortError") setFailedAudio(audioUrl); });
    }

    useImperativeHandle(playerRef, () => ({ seekTo: seek, play }));
    useEffect(() => {
        if (!clocked || !playing) return;
        let animation: number;
        const advance = () => {
            const media = audio.current;
            if (!media || media.paused) return;
            const next = Math.min(draft.total_frames - 1, Math.floor(media.currentTime * draft.fps));
            if (chosen.current !== next) {
                chosen.current = next;
                setPosition(next);
                player.current?.seekTo(next);
            }
            const fadeIn = track.fade_in_frames ? Math.min(1, next / track.fade_in_frames) : 1;
            const fadeOut = track.fade_out_frames ? Math.min(1, (draft.total_frames - next) / track.fade_out_frames) : 1;
            media.volume = Math.min(1, track.volume * fadeIn * fadeOut);
            if (media.currentTime >= duration) media.pause();
            else animation = requestAnimationFrame(advance);
        };
        animation = requestAnimationFrame(advance);
        return () => cancelAnimationFrame(animation);
    }, [clocked, duration, draft.fps, draft.total_frames, playing, track]);
    const visual = useMemo(() => clocked ? { ...draft, tracks: { ...draft.tracks, audio: [] } } : draft, [clocked, draft]);

    return <section className="panel motion-preview" aria-label={label}>
        <header><h2>{label}</h2><span className="muted">{duration.toFixed(1)}s</span></header>
        <Player ref={player} component={VideoMerger}
            inputProps={{ editState: visual, motionScale: Math.min(1, 720 / Math.max(draft.width, draft.height)),
                motionSoundtrack: clocked ? track : undefined }}
            durationInFrames={draft.total_frames} compositionWidth={draft.width} compositionHeight={draft.height}
            fps={draft.fps} initialFrame={initialFrame} controls={!clocked} clickToPlay={!clocked} spaceKeyToPlayOrPause={!clocked}
            style={{ width: "100%", maxWidth, aspectRatio: `${draft.width}/${draft.height}` }} />
        {clocked && <div className="motion-preview-transport" data-audio-clock>
            <audio ref={audio} src={audioUrl} preload="metadata" hidden
                onLoadedMetadata={() => { if (audio.current) audio.current.currentTime = chosen.current / draft.fps; }}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => {
                    setPlaying(false);
                    seek(draft.total_frames - 1);
                }} onError={() => setFailedAudio(audioUrl)} />
            <button type="button" onClick={() => { if (playing) audio.current?.pause(); else play(); }}>
                {playing ? "Pause preview" : "Play preview"}
            </button>
            <input type="range" min={0} max={draft.total_frames - 1} step={1} value={position}
                aria-label="Seek preview" aria-valuetext={`${(position / draft.fps).toFixed(2)} seconds`}
                onChange={(event) => seek(Number(event.currentTarget.value))} />
            <span className="muted">{(position / draft.fps).toFixed(1)}s</span>
        </div>}
    </section>;
}
