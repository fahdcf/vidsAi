import React, { useEffect, useRef, useState } from "react";
import { analyzeMotionAudio, type AudioCue } from "./audio-analysis";

export type MotionAudioSelection = { file: File; cues: AudioCue[]; duration: number; usage: "user_supplied" };

export function AudioPicker({ seconds, onChange, disabled }: {
    seconds: number;
    onChange: (audio: MotionAudioSelection | null) => void;
    disabled?: boolean;
}) {
    const [selected, setSelected] = useState<MotionAudioSelection | null>(null);
    const [preview, setPreview] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const running = useRef<AbortController | null>(null);
    const currentUrl = useRef("");
    useEffect(() => () => {
        running.current?.abort();
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    }, []);

    function publish(value: MotionAudioSelection | null) {
        setSelected(value);
        onChange(value);
    }

    async function select(file?: File) {
        running.current?.abort();
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = "";
        setPreview("");
        setError("");
        setBusy(false);
        publish(null);
        if (!file) return;
        const abort = new AbortController();
        running.current = abort;
        setBusy(true);
        try {
            const result = await analyzeMotionAudio(file, seconds, AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]));
            if (abort.signal.aborted) return;
            currentUrl.current = URL.createObjectURL(file);
            setPreview(currentUrl.current);
            publish({ file, ...result, usage: "user_supplied" });
        } catch (cause) {
            if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to inspect the soundtrack.");
        } finally {
            if (running.current === abort) setBusy(false);
        }
    }

    function changeCue(index: number, raw: string) {
        if (!selected) return;
        const seconds = Number(raw);
        if (!raw.trim() || !Number.isFinite(seconds) || seconds < 0 || seconds >= selected.duration ||
            selected.cues.some((cue, i) => i !== index && Math.abs(cue.seconds - seconds) < 0.001)) {
            setError("Cue time must be unique and within the audio.");
            return;
        }
        setError("");
        const cues = selected.cues.map((cue, i): AudioCue => i === index ? { seconds, confidence: 1, source: "manual" } : cue)
            .sort((a, b) => a.seconds - b.seconds);
        publish({ ...selected, cues });
    }

    return (
        <section className="motion-audio">
            <label>Soundtrack (optional)<input type="file" accept=".mp3,.wav,.m4a,.aac" disabled={disabled}
                onChange={(event) => void select(event.currentTarget.files?.[0])} /></label>
            <p className="muted">Choose audio you have permission to use in your export.</p>
            {busy && <p role="status">Finding audio cues…</p>}
            {error && <p role="alert">{error}</p>}
            {preview && <audio src={preview} controls aria-label="Soundtrack preview" />}
            {selected && selected.cues.length > 0 && <details>
                <summary>{selected.cues.length} soundtrack cues</summary>
                {selected.cues.map((cue, index) => <label key={`${index}-${cue.seconds}`}>
                    Cue {index + 1} (seconds)
                    <input type="number" min="0" max={selected.duration} step="0.001" disabled={disabled}
                        defaultValue={cue.seconds} onBlur={(event) => changeCue(index, event.currentTarget.value)} />
                </label>)}
            </details>}
        </section>
    );
}
