import React, { useEffect, useState } from "react";
import { api } from "./api";
export default function WanControls({ scene }: { scene: any }) {
    const [capabilities, setCapabilities] = useState<any>(null);
    const [model, setModel] = useState("");
    const [resolution, setResolution] = useState("");
    const [prompt, setPrompt] = useState(scene.prompt || scene.script_text);
    const [image, setImage] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let disposed = false;
        api("/api/providers", undefined, "GET")
            .then((c) => {
                if (disposed) return;
                setCapabilities(c);
                const id = Object.keys(c.wanModels)[0];
                setModel(id);
                setResolution(c.wanModels[id].default_resolution);
            })
            .catch(() => {
                if (!disposed)
                    setMessage("Video generation settings are unavailable.");
            });
        return () => {
            disposed = true;
        };
    }, []);
    useEffect(() => {
        if (!busy) return;
        const timer = setInterval(() => {
            api(`/scenes/${scene.id}/ai-status`, undefined, "GET")
                .then((s) => {
                    if (s.job?.status === "failed") {
                        setBusy(false);
                        setMessage(s.job.error || "Video generation failed");
                    } else if (s.job?.status === "done")
                        window.location.reload();
                })
                .catch((e) => {
                    setBusy(false);
                    setMessage(e.message);
                });
        }, 3000);
        return () => clearInterval(timer);
    }, [busy, scene.id]);
    return (
        <details>
            <summary>Generate AI video</summary>
            {!capabilities?.wanConfigured ? (
                <p>
                    WAN AI is not configured. Its model settings are saved for
                    later use.
                </p>
            ) : (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        setMessage("Video generation queued");
                        try {
                            await api(`/scenes/${scene.id}/ai-video`, {
                                model,
                                resolution,
                                prompt,
                                ...(image ? { image_url: image } : {}),
                            });
                        } catch (e) {
                            setBusy(false);
                            setMessage((e as Error).message);
                        }
                    }}
                >
                    <label>
                        Video model
                        <select
                            value={model}
                            disabled={busy}
                            onChange={(e) => {
                                setModel(e.target.value);
                                setResolution(
                                    capabilities.wanModels[e.target.value]
                                        .default_resolution,
                                );
                            }}
                        >
                            {Object.keys(capabilities.wanModels).map((id) => (
                                <option key={id}>{id}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Resolution
                        <select
                            value={resolution}
                            disabled={busy}
                            onChange={(e) => setResolution(e.target.value)}
                        >
                            {(
                                capabilities.wanModels[model]?.resolutions || []
                            ).map((size: string) => (
                                <option key={size}>{size}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Video description
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            required
                            maxLength={5000}
                        />
                    </label>
                    {model.includes("-i2v-") && (
                        <label>
                            Public image URL
                            <input
                                type="url"
                                required
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                placeholder="https://"
                            />
                        </label>
                    )}
                    <button disabled={busy}>Generate video</button>
                </form>
            )}
            {message && <p role="status">{message}</p>}
        </details>
    );
}
