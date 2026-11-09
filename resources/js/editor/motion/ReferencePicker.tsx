import React, { useEffect, useRef, useState } from "react";
import { inspectMotionReference } from "./reference-media";

type Preview = { file: File; url: string; width: number; height: number; duration: number | null };
export type MotionReferenceSelection = {
    file: File;
    kind: "image" | "video";
    width: number;
    height: number;
    interval: { start: number; end: number } | null;
};

export function ReferencePicker({ onChange, disabled }: {
    onChange: (reference: MotionReferenceSelection | null) => void;
    disabled?: boolean;
}) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [start, setStart] = useState("0");
    const [end, setEnd] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const operation = useRef<AbortController | null>(null);
    const objectUrl = useRef<string | null>(null);
    const report = useRef(onChange);
    report.current = onChange;

    useEffect(() => () => {
        operation.current?.abort();
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    }, []);

    const duration = preview?.duration;
    const interval = duration === null || duration === undefined ? null
        : { start: Number(start), end: Number(end) };
    const invalidInterval = interval && (!start.trim() || !end.trim() || !Number.isFinite(interval.start) ||
        !Number.isFinite(interval.end) || interval.start < 0 || interval.end > duration! || interval.end <= interval.start);

    useEffect(() => {
        report.current(preview && !invalidInterval ? {
            file: preview.file,
            kind: preview.duration === null ? "image" : "video",
            width: preview.width, height: preview.height, interval,
        } : null);
    }, [preview, start, end]);

    async function select(file: File | undefined) {
        operation.current?.abort();
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
        setPreview(null);
        report.current(null);
        setError("");
        setLoading(false);
        if (!file) return;
        const kind = /\.mp4$/i.test(file.name) ? "video" : /\.(?:jpe?g|png)$/i.test(file.name) ? "image" : null;
        if (!kind) {
            setError("Choose an MP4 video, JPEG image, or still PNG.");
            return;
        }
        const abort = new AbortController();
        operation.current = abort;
        setLoading(true);
        try {
            const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]);
            const metadata = await inspectMotionReference(file, kind, signal);
            signal.throwIfAborted();
            const width = metadata.video?.displayWidth ?? metadata.width;
            const height = metadata.video?.displayHeight ?? metadata.height;
            if (!width || !height) throw new Error("The reference dimensions could not be read.");
            const duration = metadata.duration ?? null;
            setStart("0");
            setEnd(duration === null ? "" : String(duration));
            const url = URL.createObjectURL(file);
            objectUrl.current = url;
            setPreview({ file, url, width, height, duration });
        } catch (cause) {
            if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "The reference could not be read.");
        } finally {
            if (operation.current === abort) setLoading(false);
        }
    }

    return (
        <section className="motion-reference">
            <label>
                Reference video or image
                <input type="file" accept=".mp4,.jpg,.jpeg,.png" disabled={disabled}
                    onChange={(event) => void select(event.currentTarget.files?.[0])} />
            </label>
            <p className="muted">MP4 up to 30 seconds and 100 MiB, or JPEG/still PNG.</p>
            {loading && <p role="status">Checking reference…</p>}
            {error && <p role="alert">{error}</p>}
            {preview && <>
                {preview.duration === null
                    ? <img src={preview.url} alt="Selected reference" style={{ maxWidth: "100%", maxHeight: 250 }} />
                    : <video src={preview.url} aria-label="Selected reference video" controls preload="metadata" playsInline
                        style={{ maxWidth: "100%", maxHeight: 250 }} />}
                <p>{preview.width} × {preview.height}{preview.duration === null ? "" : ` · ${preview.duration.toFixed(2)} seconds`}</p>
                {interval && <fieldset disabled={disabled}>
                    <legend>Reference interval</legend>
                    <label>Start (seconds)<input type="number" step="any" min="0" max={duration ?? undefined} value={start}
                        onChange={(event) => setStart(event.currentTarget.value)} /></label>
                    <label>End (seconds)<input type="number" step="any" min="0" max={duration ?? undefined} value={end}
                        onChange={(event) => setEnd(event.currentTarget.value)} /></label>
                    {invalidInterval && <p role="alert">Choose an end time after the start and within the reference.</p>}
                </fieldset>}
            </>}
        </section>
    );
}
