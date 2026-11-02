import React, { useState, useEffect } from "react";
import Shell from "../Shell";
import { api } from "../api";
import Editor from "./Editor";
import WanControls from "../WanControls";
export function Processing({ project }: any) {
    const [state, setState] = useState<any>(project);
    const [error, setError] = useState("");
    useEffect(() => {
        let disposed = false;
        const check = async () => {
            try {
                const r = await api(
                    `/processing/${project.id}/status`,
                    undefined,
                    "GET",
                );
                if (disposed) return;
                setState(r);
                if (r.redirect_url) window.location.href = r.redirect_url;
            } catch (e) {
                if (!disposed) setError((e as Error).message);
            }
        };
        void check();
        const timer = setInterval(check, 2000);
        return () => {
            disposed = true;
            clearInterval(timer);
        };
    }, [project.id]);
    return (
        <Shell title="Processing Your Video Ad">
            <section className="panel">
                <h2>{project.name}</h2>
                <p role="status">{state.status?.replaceAll("_", " ")}</p>
                <progress max="100" value={state.progress || 10} />
                {(state.error_message || error) && (
                    <p role="alert" className="error">
                        {state.error_message || error}
                    </p>
                )}
                {state.status === "failed" && (
                    <button
                        onClick={async () => {
                            try {
                                const r = await api(
                                    `/projects/${project.id}/retry`,
                                    {},
                                );
                                window.location.href = r.redirect;
                            } catch (e) {
                                setError((e as Error).message);
                            }
                        }}
                    >
                        Retry Project
                    </button>
                )}
                <p>
                    You can return to your dashboard while processing continues.
                </p>
            </section>
        </Shell>
    );
}
export function Review({ project, scenes: initial }: any) {
    const [rows, setRows] = useState<any[]>(initial);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const edit = (id: number, key: string, value: any) =>
        setRows((old) =>
            old.map((s) => (s.id === id ? { ...s, [key]: value } : s)),
        );
    async function replace(s: any, file: File) {
        setBusy(true);
        setError("");
        try {
            const form = new FormData();
            form.append("file", file);
            const asset = await api(`/projects/${project.id}/assets`, form);
            const r = await api(
                `/projects/${project.id}/edit-state`,
                undefined,
                "GET",
            );
            await api(`/projects/${project.id}/commands`, {
                commandId: crypto.randomUUID(),
                expectedRevision: r.edit_state.revision,
                operations: [
                    {
                        tool: "replace_asset",
                        params: {
                            id: `scene_${s.id}`,
                            url: asset.url,
                            media_type: asset.media_type,
                            asset_id: asset.asset_id,
                        },
                    },
                ],
            });
            edit(s.id, "video_url", asset.url);
            edit(s.id, "type", asset.media_type);
            edit(s.id, "start_time", 0);
            if (asset.duration_seconds)
                edit(
                    s.id,
                    "end_time",
                    Math.min(asset.duration_seconds, s.gemini_duration || 3),
                );
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <Shell title="Review your scenes">
            {project.timing_warning && (
                <p role="alert">{project.timing_warning}</p>
            )}
            <div className="project-grid">
                {rows.map((s) => (
                    <section key={s.id} className="panel">
                        <h2>Scene {s.scene_number}</h2>
                        <p>{s.script_text}</p>
                        {s.type === "image" ? (
                            <img
                                alt={"Scene " + s.scene_number}
                                src={s.video_url}
                                style={{ width: "100%" }}
                            />
                        ) : (
                            <video
                                src={s.video_url}
                                controls
                                preload="metadata"
                                style={{ width: "100%" }}
                            />
                        )}
                        <div className="row">
                            <label>
                                Start (seconds)
                                <input
                                    type="number"
                                    min="0"
                                    step=".01"
                                    value={s.start_time || 0}
                                    onChange={(e) =>
                                        edit(
                                            s.id,
                                            "start_time",
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </label>
                            <label>
                                End (seconds)
                                <input
                                    type="number"
                                    min=".01"
                                    step=".01"
                                    value={s.end_time ?? s.gemini_duration}
                                    onChange={(e) =>
                                        edit(
                                            s.id,
                                            "end_time",
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <label>
                            Search keyword
                            <input
                                value={s.keywords || ""}
                                onChange={(e) =>
                                    edit(s.id, "keywords", e.target.value)
                                }
                            />
                        </label>
                        <button
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    await api(
                                        `/scenes/${s.id}/regenerate-proxy`,
                                        {
                                            keywords: [
                                                s.keywords || s.script_text,
                                            ],
                                        },
                                    );
                                    window.location.reload();
                                } catch (e) {
                                    setError((e as Error).message);
                                    setBusy(false);
                                }
                            }}
                        >
                            Find another clip
                        </button>
                        <label>
                            Replace media
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                                disabled={busy}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void replace(s, file);
                                }}
                            />
                        </label>
                        <WanControls scene={s} />
                    </section>
                ))}
            </div>
            {error && (
                <p role="alert" className="error">
                    {error}
                </p>
            )}
            <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                    setBusy(true);
                    try {
                        const r = await api(`/review/${project.id}/confirm`, {
                            scenes: rows.map((s) => ({
                                scene_id: s.id,
                                video_url: s.video_url,
                                start_time: Number(s.start_time || 0),
                                end_time: Number(
                                    s.end_time ?? s.gemini_duration,
                                ),
                            })),
                        });
                        window.location.href = r.redirect;
                    } catch (e) {
                        setError((e as Error).message);
                        setBusy(false);
                    }
                }}
            >
                Confirm All Scenes
            </button>
        </Shell>
    );
}
export function Subtitles(props: any) {
    return <Editor {...props} />;
}
export function Final({ project, latestExport }: any) {
    return (
        <Shell title="Your video is ready">
            <section className="panel">
                <h2>{project.name}</h2>
                {latestExport?.status === "done" ? (
                    <>
                        <video
                            controls
                            style={{ width: "100%", maxHeight: 540 }}
                            src={latestExport.output_url}
                        />
                        <a
                            className="button primary"
                            href={latestExport.output_url}
                        >
                            Download MP4
                        </a>
                    </>
                ) : (
                    <p>No completed export is available yet.</p>
                )}
                <a className="button" href={`/projects/${project.id}/editor`}>
                    Continue editing
                </a>
            </section>
        </Shell>
    );
}
export function Auth({ register = false }: any) {
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <Shell title={register ? "Create account" : "Sign in"}>
            <form
                className="panel create-form"
                onSubmit={async (e) => {
                    e.preventDefault();
                    setError("");
                    setBusy(true);
                    const data = Object.fromEntries(
                        new FormData(e.currentTarget),
                    );
                    try {
                        const r = await api(
                            register ? "/register" : "/login",
                            data,
                        );
                        window.location.href = r.redirect;
                    } catch (e) {
                        setError((e as Error).message);
                        setBusy(false);
                    }
                }}
            >
                {register && (
                    <label>
                        Name
                        <input id="name" name="name" required />
                    </label>
                )}
                <label>
                    Email
                    <input id="email" name="email" type="email" required />
                </label>
                <label>
                    Password
                    <input
                        id="password"
                        name="password"
                        type="password"
                        minLength={8}
                        required
                    />
                </label>
                {error && (
                    <p role="alert" className="error">
                        {error}
                    </p>
                )}
                <button className="primary" disabled={busy} type="submit">
                    {register ? "Create account" : "Sign in"}
                </button>
                <a href={register ? "/login" : "/register"}>
                    {register
                        ? "Already have an account?"
                        : "Create an account"}
                </a>
                {!register && <a href="/forgot-password">Forgot password?</a>}
            </form>
        </Shell>
    );
}
export function Profile({ user }: any) {
    const [message, setMessage] = useState("");
    const submit =
        (url: string, method: string) =>
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            try {
                await api(
                    url,
                    Object.fromEntries(new FormData(e.currentTarget)),
                    method,
                );
                setMessage("Saved");
            } catch (e) {
                setMessage((e as Error).message);
            }
        };
    return (
        <Shell title="Your account">
            <p role="status">{message}</p>
            <form
                className="panel create-form"
                onSubmit={submit("/profile", "PATCH")}
            >
                <label>
                    Name
                    <input name="name" defaultValue={user.name} required />
                </label>
                <label>
                    Email
                    <input
                        name="email"
                        type="email"
                        defaultValue={user.email}
                        required
                    />
                </label>
                <button>Save profile</button>
            </form>
            <form
                className="panel create-form"
                onSubmit={submit("/password", "PUT")}
            >
                <label>
                    Current password
                    <input name="current_password" type="password" required />
                </label>
                <label>
                    New password
                    <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                    />
                </label>
                <button>Update password</button>
            </form>
            <form
                className="panel create-form"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                        !window.confirm(
                            "Permanently delete your account and projects?",
                        )
                    )
                        return;
                    try {
                        await api(
                            "/profile",
                            Object.fromEntries(new FormData(e.currentTarget)),
                            "DELETE",
                        );
                        window.location.href = "/login";
                    } catch (e) {
                        setMessage((e as Error).message);
                    }
                }}
            >
                <h2>Delete account</h2>
                <label>
                    Confirm password
                    <input name="password" type="password" required />
                </label>
                <button>Delete account</button>
            </form>
            <button
                onClick={async () => {
                    await api("/logout", {});
                    window.location.href = "/login";
                }}
            >
                Sign out
            </button>
        </Shell>
    );
}
