import { useEffect, useRef, useState, type FormEvent } from "react";
import { isFollowupSourceTime, referenceCropBounds, referenceMetadata, type BrowserMotionReference } from "../../../../shared/motion/browser-tools";
import { motionAssetProvenance } from "../../../../shared/motion/assets";
import type { z } from "zod";
import { api } from "../api";
import type { MotionScene, SaveMotionOperations } from "./MotionSceneControls";

type Linked = { id: string; name: string; kind: "image" | "vectors"; provenance: z.infer<typeof motionAssetProvenance> };
type Reference = BrowserMotionReference & { available: boolean };

export default function MotionAssetControls({ projectId, scene, busy, save }: {
    projectId: string; scene: MotionScene; busy: boolean; save: SaveMotionOperations;
}) {
    const base = `/projects/${encodeURIComponent(projectId)}`;
    const [reference, setReference] = useState<Reference>();
    const [assets, setAssets] = useState<Linked[]>([]);
    const [crop, setCrop] = useState<{ blob: Blob; url: string; provenance: Linked["provenance"] }>();
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState("");
    const action = useRef<AbortController | undefined>(undefined);
    useEffect(() => {
        const abort = new AbortController();
        void Promise.all([api<{ reference: Reference | null }>(`${base}/motion-reference`, undefined, "GET", abort.signal),
            api<{ assets: Linked[] }>(`${base}/motion-assets`, undefined, "GET", abort.signal)]).then(([{ reference }, { assets }]) => {
            if (abort.signal.aborted) return;
            setAssets(assets);
            if (reference?.available) setReference({ ...reference, metadata: referenceMetadata.parse(reference.metadata) });
        }).catch((failure: unknown) => { if (!abort.signal.aborted) setError(String((failure as Error).message)); });
        return () => { abort.abort(); action.current?.abort(); };
    }, [base]);
    useEffect(() => () => { if (crop) URL.revokeObjectURL(crop.url); }, [crop]);

    function link(asset: Pick<Linked, "id" | "kind">) {
        save([{ tool: "link_motion_asset", params: { id: scene.id, layerId: `media-${crypto.randomUUID()}`, assetId: asset.id, kind: asset.kind } }]);
    }
    async function upload(blob: Blob, filename: string, kind: Linked["kind"], provenance: Linked["provenance"], signal: AbortSignal) {
        const form = new FormData();
        form.set("file", blob, filename);
        form.set("kind", kind);
        form.set("provenance", JSON.stringify(provenance));
        const asset = await api<Linked>(`${base}/motion-assets`, form, "POST", signal);
        signal.throwIfAborted();
        setAssets((items) => [{ ...asset, name: filename }, ...items.filter(({ id }) => id !== asset.id)]);
        link(asset);
    }
    async function run(event: FormEvent<HTMLFormElement>, work: (data: FormData, signal: AbortSignal) => Promise<void>) {
        event.preventDefault();
        if (waiting || busy) return;
        const data = new FormData(event.currentTarget);
        const abort = action.current = new AbortController();
        setWaiting(true);
        setError("");
        try { await work(data, AbortSignal.any([abort.signal, AbortSignal.timeout(45_000)])); }
        catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "The motion asset could not be prepared."); }
        finally { if (!abort.signal.aborted) setWaiting(false); }
    }
    const interval = reference?.metadata.interval;

    return <details className="graph-layer-controls motion-scene-controls">
        <summary>Linked motion assets</summary>
        <p className="muted">Linked raster and vector layers retain their source. Their placement is editable.</p>
        {scene.assets.length > 0 && <ul>{scene.assets.filter(({ kind }) => kind !== "font").map(({ id, kind }) => {
            const asset = assets.find((item) => item.id === id);
            const source = asset?.provenance;
            return <li key={id}>{asset?.name ?? id} · {kind === "image" ? "raster" : "vector"}
                {source?.kind === "reference_crop" ? ` · reference crop at ${source.time.toFixed(2)} s`
                    : source?.kind === "reference_derived" ? ` · reference trace ${source.startSeconds.toFixed(2)}–${source.endSeconds.toFixed(2)} s`
                        : source ? ` · ${source.kind}` : ""}</li>;
        })}</ul>}
        <form data-no-autosave onSubmit={(event) => void run(event, async (data, signal) => {
            const file = data.get("asset");
            if (!(file instanceof File) || !file.size) throw new Error("Choose a PNG, JPEG or SVG file.");
            await upload(file, file.name, /\.svg$/i.test(file.name) ? "vectors" : "image", { kind: "imported" }, signal);
        })}><fieldset disabled={busy || waiting}>
            <label>Import image or SVG<input name="asset" type="file" accept=".png,.jpg,.jpeg,.svg" required /></label>
            <button type="submit">Import and add layer</button>
        </fieldset></form>
        {!!assets.length && <form data-no-autosave onSubmit={(event) => void run(event, async (data) => {
            const asset = assets.find(({ id }) => id === data.get("existing"));
            if (asset) link(asset);
        })}><fieldset disabled={busy || waiting}>
            <label>Project asset<select aria-label="Project asset" name="existing">{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
            <button type="submit">Add selected asset</button>
        </fieldset></form>}
        {reference && <form data-no-autosave onSubmit={(event) => void run(event, async (data, signal) => {
            setCrop(undefined);
            const bounds = referenceCropBounds.parse(Object.fromEntries(["left", "top", "width", "height"].map((key) => [key, Number(data.get(key))])));
            const time = interval ? Number(data.get("time")) : 0;
            if (interval && (time < interval.start || time >= interval.end)) throw new Error("Choose a time inside the selected reference interval.");
            const { loadMotionReference, sampleMotionReference } = await import("./reference-media");
            const source = await loadMotionReference(reference, signal);
            let blob: Blob, sourceTime = 0;
            if (interval) {
                const [frame] = await sampleMotionReference(source, [time], signal, { crop: bounds, maxEdge: 640 });
                if (!isFollowupSourceTime(frame.sourceTime, time, interval)) throw new Error("Choose a time with a decoded frame inside the interval.");
                ({ image: blob, sourceTime } = frame);
            } else {
                const { referenceCropCanvas } = await import("./reference-crop");
                const bitmap = await createImageBitmap(source);
                try {
                    const width = bitmap.width * bounds.width, height = bitmap.height * bounds.height;
                    const canvas = referenceCropCanvas(width, height);
                    canvas.getContext("2d")!.drawImage(bitmap, bounds.left * bitmap.width, bounds.top * bitmap.height, width, height, 0, 0, canvas.width, canvas.height);
                    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
                } finally { bitmap.close(); }
            }
            signal.throwIfAborted();
            setCrop({ blob, url: URL.createObjectURL(blob), provenance: { kind: "reference_crop", sourceId: reference.assetId,
                sourceSha256: reference.metadata.sha256, time: sourceTime, bounds } });
        })}><fieldset disabled={busy || waiting}>
            <legend>Reference crop</legend>
            <div className="motion-fields">
                {interval && <label>Crop time (seconds)<input type="number" name="time" min={interval.start} max={interval.end} step="any" defaultValue={(interval.start + interval.end) / 2} required /></label>}
                {["left", "top", "width", "height"].map((key) => <label key={key}>Crop {key}<input name={key} type="number" min={0} max={1} step="any" defaultValue={key === "left" || key === "top" ? 0.25 : 0.5} required /></label>)}
            </div>
            <button type="submit">Preview reference crop</button>
        </fieldset></form>}
        {crop && <form data-no-autosave onSubmit={(event) => void run(event, async (_, signal) => {
            await upload(crop.blob, "reference-crop.jpg", "image", crop.provenance, signal);
            setCrop(undefined);
        })}><fieldset disabled={busy || waiting}>
            <img src={crop.url} alt="Proposed reference crop" style={{ maxWidth: "100%" }} />
            <button type="submit">Approve crop and add layer</button>
        </fieldset></form>}
        {reference && interval && <form data-no-autosave onSubmit={(event) => void run(event, async (data, signal) => {
            const start = Number(data.get("start")), end = Number(data.get("end"));
            if (start < interval.start || end > interval.end || end <= start || end - start > 6) throw new Error("Choose up to six seconds inside the reference interval.");
            const { loadMotionReference } = await import("./reference-media");
            const { traceReferenceShapes } = await import("./reference-trace");
            const vectors = await traceReferenceShapes(await loadMotionReference(reference, signal), { interval: { start, end }, colors: [], frames: 24 }, signal);
            await upload(new Blob([JSON.stringify(vectors)], { type: "application/json" }), "reference-trace.json", "vectors",
                { kind: "reference_derived", sourceId: reference.assetId, sourceSha256: reference.metadata.sha256, startSeconds: start, endSeconds: end }, signal);
        })}><fieldset disabled={busy || waiting}>
            <legend>Reference shape trace</legend>
            <div className="motion-fields"><label>Trace start<input type="number" name="start" step="any" min={interval.start} max={interval.end} defaultValue={interval.start} required /></label>
                <label>Trace end<input type="number" name="end" step="any" min={interval.start} max={interval.end} defaultValue={Math.min(interval.end, interval.start + 3)} required /></label></div>
            <button type="submit">Trace and add vector layer</button>
        </fieldset></form>}
        {waiting && <p role="status">Preparing motion asset…</p>}
        {error && <p role="alert">{error}</p>}
    </details>;
}
