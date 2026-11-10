import React, { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import Shell from "../Shell";
import { ReferencePicker, type MotionReferenceSelection } from "../motion/ReferencePicker";
import { AudioPicker, type MotionAudioSelection } from "../motion/AudioPicker";
import { api } from "../api";
import MotionChat from "./MotionChat";
import type { MotionSetupRequirements } from "../motion/setup-upload";
import "../styles/motion-workspace.css";

export type MotionCreateInput = {
    name: string;
    prompt: string;
    format: "16:9" | "9:16" | "1:1";
    seconds: number;
    reference: MotionReferenceSelection | null;
    audio: MotionAudioSelection | null;
    logo: File | null;
    muteReferenceAudio?: boolean;
};

export function MotionCreateForm({ submit }: { submit: (input: MotionCreateInput) => Promise<void> }) {
    const [name, setName] = useState("");
    const [prompt, setPrompt] = useState("");
    const [format, setFormat] = useState<MotionCreateInput["format"]>("16:9");
    const [seconds, setSeconds] = useState(15);
    const [mode, setMode] = useState<"prompt" | "reference">("prompt");
    const [reference, setReference] = useState<MotionReferenceSelection | null>(null);
    const [audio, setAudio] = useState<MotionAudioSelection | null>(null);
    const [muteReferenceAudio, setMuteReferenceAudio] = useState(false);
    const [logo, setLogo] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function create(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (!name.trim() || !prompt.trim()) return setError("Add a project name and describe the video.");
        if (mode === "reference" && !reference) return setError("Choose a reference and a valid interval to use this mode.");
        if (logo && (!/\.(?:png|jpe?g)$/i.test(logo.name) || logo.size > 5 * 1024 * 1024)) {
            return setError("Choose a PNG or JPEG logo of 5 MiB or less.");
        }
        setBusy(true);
        try {
            await submit({ name: name.trim(), prompt: prompt.trim(), format, seconds, reference: mode === "reference" ? reference : null, audio, logo, muteReferenceAudio });
        } catch (error) {
            setError(error instanceof Error ? error.message : "The motion project could not be started.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Shell title="Create motion graphics" description="Describe what you want to see move."
            actions={<a className="button ghost" href="/create"><Icon name="arrowLeft" /> Workflows</a>}>
            <form className="panel motion-create" onSubmit={create}>
                <fieldset disabled={busy}>
                    <div className="motion-create-head">
                        <span className="motion-mode-badge"><Icon name="sparkles" size={14} /> Deep creation</span>
                        <p>Specialists plan the scenes, animate them, and review frames rendered in your browser.</p>
                    </div>
                    <label>Project name<input required maxLength={100} placeholder="e.g. A studio showreel"
                        value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
                    <label>Video brief<textarea rows={5} required maxLength={4000}
                        placeholder="Describe the story, exact words, style, and how you want it to move."
                        value={prompt} onChange={(event) => setPrompt(event.currentTarget.value)} /></label>
                    <div className="motion-fields">
                        <label>Aspect ratio<select value={format} onChange={(event) => setFormat(event.currentTarget.value as MotionCreateInput["format"])}>
                            <option value="16:9">16:9 · Landscape</option>
                            <option value="9:16">9:16 · Portrait</option>
                            <option value="1:1">1:1 · Square</option>
                        </select></label>
                        <label>Duration<select value={seconds} onChange={(event) => {
                            setSeconds(Number(event.currentTarget.value));
                            setAudio(null);
                        }}>
                            {[5, 8, 10, 12, 15].map((length) => <option key={length} value={length}>{length} seconds</option>)}
                        </select></label>
                    </div>
                    <fieldset className="motion-mode-options">
                        <legend>Starting point</legend>
                        <label><input type="radio" name="motion-mode" value="prompt" checked={mode === "prompt"}
                            onChange={() => { setReference(null); setMode("prompt"); }} /> Brief only</label>
                        <label><input type="radio" name="motion-mode" value="reference" checked={mode === "reference"}
                            onChange={() => setMode("reference")} /> Match a reference</label>
                    </fieldset>
                    {mode === "reference" && <ReferencePicker onChange={setReference} disabled={busy} />}
                    {mode === "reference" && reference?.kind === "video" && !audio && <label>
                        <input type="checkbox" checked={muteReferenceAudio} onChange={(event) => setMuteReferenceAudio(event.currentTarget.checked)} /> Mute reference audio
                        <span className="muted">Use the video’s audio automatically when no soundtrack is supplied.</span>
                    </label>}
                    <details className="motion-attachments">
                        <summary>Logo and soundtrack <span className="muted">Optional</span></summary>
                        <label>Logo<input type="file" accept=".png,.jpg,.jpeg"
                            onChange={(event) => setLogo(event.currentTarget.files?.[0] ?? null)} /></label>
                        <AudioPicker key={seconds} seconds={seconds} onChange={setAudio} disabled={busy} />
                    </details>
                    {error && <p className="notice warning" role="alert">{error}</p>}
                    <footer className="motion-create-foot">
                        <p className="muted">The AI service analyzes reference samples. Final video rendering runs on this device.</p>
                        <button className="primary" type="submit"><Icon name="arrowRight" /> {busy ? "Opening workspace…" : "Start creating"}</button>
                    </footer>
                </fieldset>
            </form>
        </Shell>
    );
}

export default function MotionCreate() {
    const request = useRef<{ key: string; id: string } | null>(null);
    const [opened, setOpened] = useState<{
        projectId: number; id: string; name: string; pendingSetup: MotionSetupRequirements | null; input: MotionCreateInput;
    } | null>(null);
    useEffect(() => {
        if (!opened) return;
        const reload = () => window.location.reload();
        window.addEventListener("popstate", reload);
        return () => window.removeEventListener("popstate", reload);
    }, [opened]);
    if (opened) return <MotionChat projectId={opened.projectId} name={opened.name} runId={opened.id}
        seconds={opened.input.seconds} pendingSetup={opened.pendingSetup} initialAttachments={opened.input} />;
    return <MotionCreateForm submit={async (input) => {
        const { name, prompt, format, seconds, reference, audio, logo } = input;
        const attachments: MotionSetupRequirements = { reference: Boolean(reference), audio: Boolean(audio), logo: Boolean(logo) };
        if (reference?.kind === "video" && !audio) attachments.referenceAudio = input.muteReferenceAudio ? "muted" : "auto";
        const key = JSON.stringify({ name, prompt, format, seconds, attachments });
        if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
        const result = await api<{ projectId: number; id: string; name: string; pendingSetup: MotionSetupRequirements | null; redirect: string }>(
            "/projects/motion", { requestId: request.current.id, name, prompt, format, seconds, attachments },
        );
        window.history.pushState(null, "", result.redirect);
        setOpened({ ...result, input });
    }} />;
}
