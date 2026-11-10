import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Shell from "../Shell";
import Icon from "../Icon";
import { api } from "../api";
import { isWorkingMotion, motionRunUrl, type MotionRunView } from "../motion/chat-api";
import MotionProgress from "../motion/MotionProgress";
import MotionPreview, { type MotionPreviewHandle } from "../motion/MotionPreview";
import MotionStoryboard from "../motion/MotionStoryboard";
import type { Document } from "@vidsai/contracts";
import { ReferencePicker, type MotionReferenceSelection } from "../motion/ReferencePicker";
import { AudioPicker, type MotionAudioSelection } from "../motion/AudioPicker";
import { uploadMotionReference } from "../motion/reference-storage";
import { uploadMotionSetup, type MotionSetupFiles, type MotionSetupRequirements, type MotionUploadProgress, type MotionUploadReceipts } from "../motion/setup-upload";
import "../styles/motion-workspace.css";

export default function MotionChat({ projectId, name, runId, seconds, pendingSetup, initialAttachments }: {
    projectId: number; name: string; runId: string | null; seconds: number;
    pendingSetup: MotionSetupRequirements | null; initialAttachments?: MotionSetupFiles;
}) {
    const [setup, setSetup] = useState(pendingSetup);
    const [reference, setReference] = useState<MotionReferenceSelection | null>(initialAttachments?.reference ?? null);
    const [audio, setAudio] = useState<MotionAudioSelection | null>(initialAttachments?.audio ?? null);
    const [muteReferenceAudio, setMuteReferenceAudio] = useState(initialAttachments?.muteReferenceAudio ?? false);
    const [logo, setLogo] = useState<File | null>(initialAttachments?.logo ?? null);
    const [relinkSelection, setRelinkSelection] = useState<MotionReferenceSelection | null>(null);
    const [progress, setProgress] = useState<MotionUploadProgress | null>(null);
    const [error, setError] = useState("");
    const [run, setRun] = useState<MotionRunView | null>(null);
    const [runError, setRunError] = useState("");
    const [sessionExpired, setSessionExpired] = useState(false);
    const [browserError, setBrowserError] = useState("");
    const [draft, setDraft] = useState<Document | null>(null);
    const [before, setBefore] = useState<Document | null>(null);
    const [comparing, setComparing] = useState(false);
    const [message, setMessage] = useState("");
    const [target, setTarget] = useState<{ id: string; index: number } | null>(null);
    const [sending, setSending] = useState(false);
    const [controlError, setControlError] = useState("");
    const operation = useRef<AbortController | null>(null);
    const browserWork = useRef<AbortController | null>(null);
    const browserPaused = useRef(false);
    const receipts = useRef<MotionUploadReceipts>({});
    const refresh = useRef<() => void>(() => {});
    const submitted = useRef<{ key: string; id: string } | null>(null);
    const player = useRef<MotionPreviewHandle>(null);
    const composer = useRef<HTMLTextAreaElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const historyList = useRef<HTMLOListElement>(null);
    const followHistory = useRef(true);
    const lastMessageId = run?.messages.at(-1)?.id;

    useEffect(() => {
        if (initialAttachments) heading.current?.focus({ preventScroll: true });
    }, [initialAttachments]);
    useLayoutEffect(() => {
        const list = historyList.current;
        if (list && followHistory.current) list.scrollTop = list.scrollHeight;
    }, [lastMessageId]);

    async function attach(files: MotionSetupFiles) {
        if (!setup || !runId || operation.current) return;
        if ((setup.audio && !files.audio) || (setup.logo && !files.logo)) {
            setError("Choose all the attachments for this project.");
            return;
        }
        const controller = new AbortController();
        operation.current = controller;
        setError("");
        try {
            await uploadMotionSetup(projectId, runId, files, controller.signal, setProgress, receipts.current, setup, seconds);
            if (!controller.signal.aborted) setSetup(null);
        } catch (error) {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Project setup could not finish.");
        } finally {
            if (operation.current === controller) {
                setProgress(null);
                operation.current = null;
            }
        }
    }

    useEffect(() => {
        if (initialAttachments) void attach(initialAttachments);
        return () => { operation.current?.abort(); operation.current = null; };
    }, [runId]);

    useEffect(() => {
        if (!runId) return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let debounce: ReturnType<typeof setTimeout> | undefined;
        let stream: EventSource | null = null;
        let cursor = 0;
        let draftVersion: string | null = null;
        let fetching = false;
        const trigger = () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => void read(), 120);
        };
        const connect = () => {
            if (stream || typeof EventSource !== "function") return;
            stream = new EventSource(motionRunUrl(runId) + `/events?after=${cursor}`);
            stream.addEventListener("motion", trigger);
            stream.addEventListener("terminal", () => {
                stream?.close();
                stream = null;
                trigger();
            });
        };
        const browserTask = async () => {
            if (browserWork.current || browserPaused.current || controller.signal.aborted) return;
            const local = new AbortController();
            browserWork.current = local;
            const signal = AbortSignal.any([local.signal, controller.signal]);
            try {
                const { runNextMotionBrowserTask } = await import("../motion/browser-runner");
                if (await runNextMotionBrowserTask(runId, signal)) {
                    setBrowserError("");
                    trigger();
                }
            } catch (error) {
                if (!signal.aborted) {
                    browserPaused.current = true;
                    setBrowserError(error instanceof Error ? error.message : "This browser task could not finish.");
                }
            } finally {
                if (browserWork.current === local) browserWork.current = null;
            }
        };
        const read = async () => {
            if (controller.signal.aborted || fetching) return;
            fetching = true;
            clearTimeout(timer);
            try {
                const result = await api<MotionRunView>(motionRunUrl(runId) + `?after=${cursor}`, undefined, "GET", controller.signal);
                if (result.projectId !== projectId) throw new Error("This run belongs to another project.");
                if (controller.signal.aborted) return;
                setRun(result);
                cursor = result.events.at(-1)?.id ?? cursor;
                setRunError("");
                setSessionExpired(false);
                if (!result.pendingSetup) setSetup(null);
                if (result.replacementRunId && result.status === "cancelled") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("run", result.replacementRunId);
                    window.location.replace(url.href);
                    return;
                }
                if (isWorkingMotion(result.status)) {
                    connect();
                    timer = setTimeout(read, 2200);
                    if (result.status === "waiting_for_browser") void browserTask();
                } else {
                    stream?.close();
                    stream = null;
                    browserWork.current?.abort();
                }
                if (result.draftVersion && result.draftVersion !== draftVersion) {
                    const saved = await api<{ draft: { document: Document } | null; before: Document | null }>(
                        motionRunUrl(runId) + "/draft", undefined, "GET", controller.signal,
                    );
                    if (!controller.signal.aborted) {
                        draftVersion = result.draftVersion;
                        setDraft(saved.draft?.document ?? null);
                        setBefore(saved.before);
                    }
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                const status = error && typeof error === "object" && "status" in error ? error.status : null;
                if (status === 401 || status === 419) {
                    setSessionExpired(true);
                    stream?.close();
                    stream = null;
                    browserWork.current?.abort();
                    setRunError("Your session expired. Sign in again to resume this project.");
                    return;
                }
                setRunError(error instanceof Error ? error.message : "Motion progress could not be loaded.");
                timer = setTimeout(read, 4000);
            } finally {
                fetching = false;
            }
        };
        refresh.current = () => { void read(); };
        void read();
        return () => { clearTimeout(timer); clearTimeout(debounce); stream?.close(); controller.abort(); };
    }, [projectId, runId]);

    async function send(event: React.FormEvent) {
        event.preventDefault();
        const text = message.trim();
        if (!text || !run || setup || sending) return;
        const key = JSON.stringify({ text, sceneId: target?.id ?? null, status: run.status });
        if (submitted.current?.key !== key) submitted.current = { key, id: crypto.randomUUID() };
        setSending(true);
        setControlError("");
        try {
            const requestId = submitted.current.id;
            if (isWorkingMotion(run.status)) {
                await api(motionRunUrl(run.id) + "/feedback", { requestId, text });
                followHistory.current = true;
                setMessage("");
                submitted.current = null;
                refresh.current();
            } else {
                const created = await api<{ id: string }>(`/projects/${projectId}/motion-runs`, {
                    requestId, brief: text, referenceBindingId: run.attachments.reference?.available ? run.attachments.reference.bindingId : null,
                    targetSceneId: target?.id ?? null,
                });
                window.location.assign(`/projects/${projectId}/motion?run=${created.id}`);
            }
        } catch (error) {
            setControlError(error instanceof Error ? error.message : "The message could not be sent.");
        } finally {
            setSending(false);
        }
    }

    async function stop() {
        if (!runId || sending) return;
        setSending(true);
        setControlError("");
        try {
            await api(motionRunUrl(runId) + "/cancel", {});
            operation.current?.abort();
            browserWork.current?.abort();
            refresh.current();
        } catch (error) {
            setControlError(error instanceof Error ? error.message : "The motion run could not be stopped.");
        } finally {
            setSending(false);
        }
    }

    function resumeBrowser() {
        browserPaused.current = false;
        setBrowserError("");
        refresh.current();
    }

    async function retry() {
        if (!run || sending) return;
        setSending(true);
        setControlError("");
        try {
            await api(motionRunUrl(run.id) + "/retry", {});
            resumeBrowser();
        } catch (error) {
            setControlError(error instanceof Error ? error.message : "The stage could not be retried.");
        } finally {
            setSending(false);
        }
    }

    async function applyDraft(partial: boolean) {
        if (!run || sending) return;
        setSending(true);
        setControlError("");
        try {
            await api(motionRunUrl(run.id) + "/apply", { expectedRevision: run.startingRevision, partial });
            if (partial || run.reviewUnavailable) window.location.assign(`/projects/${projectId}/editor`);
            else refresh.current();
        } catch (error) {
            setControlError(error instanceof Error ? error.message : "The draft could not be applied.");
        } finally {
            setSending(false);
        }
    }

    async function relink(event: React.FormEvent) {
        event.preventDefault();
        if (!relinkSelection || !run?.attachments.reference || sending) return;
        setSending(true);
        setControlError("");
        try {
            await uploadMotionReference(projectId, relinkSelection, AbortSignal.timeout(120_000), run.attachments.reference.bindingId);
            setRelinkSelection(null);
            resumeBrowser();
        } catch (error) {
            setControlError(error instanceof Error ? error.message : "The reference could not be relinked.");
        } finally {
            setSending(false);
        }
    }

    return <Shell title={name} description="Motion graphics workspace" motionStep={0}>
        <div className="motion-chat">
        {setup && <section className="panel motion-chat-setup">
            <h2>Preparing your project</h2>
            {progress && <div role="status">
                <p>{progress.name === "extracting reference audio" ? "Extracting reference audio…"
                    : progress.name === "project setup" ? "Saving project attachments…" : `Uploading ${progress.name}…`}</p>
                <progress max={1} value={progress.fraction ?? undefined} aria-label={`Upload ${progress.name}`} />
            </div>}
            {error && <p className="notice warning" role="alert">{error}</p>}
            {setup && !progress && (error || !initialAttachments) && <form onSubmit={(event) => {
                event.preventDefault();
                void attach({ reference, logo, audio, muteReferenceAudio });
            }}>
                {setup.reference && <><ReferencePicker onChange={setReference} />{reference && <p>{reference.file.name}</p>}</>}
                {setup.logo && <label>Logo<input type="file" accept=".png,.jpg,.jpeg"
                    onChange={(event) => setLogo(event.currentTarget.files?.[0] ?? null)} />{logo?.name}</label>}
                {(setup.audio || setup.referenceAudio === "auto") && <><AudioPicker seconds={seconds} onChange={setAudio} />{audio && <p>{audio.file.name}</p>}</>}
                {setup.referenceAudio === "auto" && <label><input type="checkbox" checked={muteReferenceAudio}
                    onChange={(event) => setMuteReferenceAudio(event.currentTarget.checked)} /> Mute reference audio</label>}
                <button type="submit" className="primary">Resume setup</button>
            </form>}
            <p className="muted">The configured AI service analyzes reference samples. The browser renders the final video on this device.</p>
        </section>}
        <div className="motion-chat-columns">
        <section className="panel motion-chat-conversation" aria-label="Motion conversation">
            <header>
                <div><h2 ref={heading} tabIndex={-1}>Motion chat</h2><p className="muted">The conversation and draft stay with this project.</p></div>
                {isWorkingMotion(run?.status) && <button type="button" className="ghost" disabled={sending || sessionExpired} onClick={() => void stop()}>
                    Stop run
                </button>}
            </header>
            <div className="motion-attachment-list" aria-label="Project attachments">
                {(run?.attachments.reference || reference) && <span><Icon name="film" size={14} />
                    {run?.attachments.reference?.name ?? reference?.file.name}</span>}
                {(run?.attachments.logo || logo) && <span><Icon name="image" size={14} /> Logo</span>}
                {(run?.attachments.audio || audio) && <span><Icon name="music" size={14} />
                    {run?.attachments.audioSource === "reference" ? "Audio from reference" : "Soundtrack"}</span>}
            </div>
            {run?.timeMap?.reference && <p className="muted">
                {run.timeMap.reference.sourcePacing ? "The reference keeps its source pacing." : "Reference pacing is scaled to the project duration."}
                {run.timeMap.soundtrack && " The soundtrack keeps its original speed."}
                {run.timeMap.soundtrack && run.timeMap.soundtrack.endFrame < run.timeMap.outputFrames &&
                    ` Audio ends at ${(run.timeMap.soundtrack.endFrame / run.timeMap.fps).toFixed(2)} seconds.`}
            </p>}
            {runError && <p role="alert" className="notice warning">{runError}</p>}
            {sessionExpired && <a href="/login" className="button ghost">Sign in to resume</a>}
            {run?.attachments.reference && !run.attachments.reference.available && !sessionExpired &&
                <form className="motion-relink" onSubmit={relink}>
                    <p className="notice warning">Relink the original reference file and interval to resume this run.</p>
                    <ReferencePicker onChange={setRelinkSelection} disabled={sending} />
                    <button type="submit" disabled={sending || !relinkSelection}>Relink reference</button>
                </form>}
            <ol ref={historyList} className="motion-messages" aria-label="Conversation history" aria-live="polite"
                aria-relevant="additions" tabIndex={0} onScroll={(event) => {
                    const list = event.currentTarget;
                    followHistory.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
                }}>
                {run?.messages.map(({ id, role, text }) => <li key={id} className={`motion-message motion-message--${role}`}>
                    <span>{role === "user" ? "You" : "VidsAI"}</span>
                    <p>{text}</p>
                </li>)}
            </ol>
            {!setup && !run && <p role="status">Opening conversation…</p>}
            {run?.error && <p role="status" className="notice warning">{run.error}</p>}
            {run && !sessionExpired && <div className="motion-scene-actions">
                {run.canRetry && <button type="button" onClick={() => void retry()} disabled={sending}>
                    {run.status === "failed" ? "Retry failed stage" : "Resume run"}
                </button>}
                {browserError && isWorkingMotion(run.status) && <button type="button" onClick={resumeBrowser}>Resume browser work</button>}
                {run.editorAvailable && <>
                    <a className="button ghost" href={`/projects/${projectId}/motion-review`}>Review motion scenes</a>
                    <a className="button ghost" href={`/projects/${projectId}/editor`}>Open editor</a>
                </>}
                {draft && !run.draftApplied && ["failed", "cancelled"].includes(run.status) &&
                    <button type="button" onClick={() => void applyDraft(true)} disabled={sending}>Open saved partial draft</button>}
                {draft && run.needsApproval && run.status === "ready" && !run.draftApplied &&
                    <button type="button" className="primary" onClick={() => void applyDraft(false)} disabled={sending}>
                        {run.reviewUnavailable ? "Open draft in editor" : run.targetSceneId ? "Apply scene revision" : "Apply revision"}
                    </button>}
                {run.needsApproval && run.draftApplied && <span role="status" className="status-pill ready">Revision applied</span>}
            </div>}
            <form className="motion-composer" onSubmit={send}>
                {target && <p className="motion-scope">Revising scene {target.index + 1}
                    <button type="button" className="small ghost" onClick={() => setTarget(null)}>Clear selection</button></p>}
                <label>Message<textarea ref={composer} rows={3} value={message} disabled={!run || !!setup || sending || sessionExpired}
                    maxLength={isWorkingMotion(run?.status) ? 1000 : 4000}
                    placeholder="Describe an adjustment to the draft"
                    aria-describedby="motion-composer-shortcut"
                    onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                        }
                    }}
                    onChange={(event) => setMessage(event.currentTarget.value)} /></label>
                <span id="motion-composer-shortcut" className="muted motion-shortcut">Ctrl or ⌘ + Enter to send</span>
                {controlError && <p role="alert" className="notice warning">{controlError}</p>}
                <button type="submit" className="primary" disabled={!run || !!setup || sending || sessionExpired || !message.trim()}>
                    {isWorkingMotion(run?.status) ? "Send feedback" : "Start a revision"}
                </button>
            </form>
        </section>
        <aside className="motion-chat-inspector">
            {run && !setup && <MotionProgress run={run} browserError={browserError} />}
            {draft && <MotionPreview draft={draft} playerRef={player} />}
            <MotionStoryboard draft={draft} storyboard={run?.storyboard ?? null}
                canRevise={run?.status === "ready" || Boolean(run?.draftApplied && run.editorAvailable)}
                onPreview={(frame) => { player.current?.seekTo(frame); player.current?.play(); }}
                onRevise={(id, index) => { setTarget({ id, index }); composer.current?.focus(); }} />
        </aside>
        </div>
        {before && draft && run?.needsApproval && <details className="panel motion-compare"
            onToggle={(event) => setComparing(event.currentTarget.open)}>
            <summary>Compare before and after</summary>
            {comparing && <div className="motion-compare-grid">
                <MotionPreview draft={before} label="Before"
                    initialFrame={before.tracks.motion_graphics.find(({ id }) => id === run.targetSceneId)?.start_frame} />
                <MotionPreview draft={draft} label="After"
                    initialFrame={draft.tracks.motion_graphics.find(({ id }) => id === run.targetSceneId)?.start_frame} />
            </div>}
        </details>}
        </div>
    </Shell>;
}
