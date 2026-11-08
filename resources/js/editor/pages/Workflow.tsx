import React, { useState, useEffect } from "react";
import Shell from "../Shell";
import { api } from "../api";
import Icon from "../Icon";
import { useBrowserExport } from "../browser-export/useBrowserExport";

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
        <Shell
            title="Building your storyboard"
            description="Follow your project from narration to scenes."
        >
            <section className="panel processing-card">
                <img className="processing-art" src="/studio/story-sculpture.webp" alt="" width={1024} height={1024} />
                <div className="processing-emblem">
                    <Icon
                        name={state.status === "failed" ? "close" : "sparkles"}
                    />
                </div>
                <span className="eyebrow">
                    {state.status === "failed"
                        ? "LET’S GET THIS BACK ON TRACK"
                        : "YOUR STORY IS TAKING SHAPE"}
                </span>
                <h2>{project.name}</h2>
                <p>
                    {state.status === "failed"
                        ? "Something interrupted this project. Your recording and details are saved, so you can retry."
                        : "We’re listening to your narration, planning your story, and finding footage to bring it to life."}
                </p>
                <ol className="processing-track">
                    {[
                        {
                            id: "transcription",
                            title: "Listen to your narration",
                        },
                        {
                            id: "planning",
                            title: "Find the rhythm of your story",
                        },
                        {
                            id: "footage",
                            title: "Match each scene with footage",
                        },
                        { id: "review", title: "Prepare your storyboard" },
                    ].map((stage, i) => (
                        <li key={stage.id} className={state.stages?.[stage.id] ? "stage-complete" : ""}>
                            <span>
                                {state.stages?.[stage.id] ? (
                                    <Icon name="check" size={15} />
                                ) : (
                                    String(i + 1).padStart(2, "0")
                                )}
                            </span>
                            {stage.title}
                            {state.stages?.[stage.id] && (
                                <span className="stage-done">Done</span>
                            )}
                        </li>
                    ))}
                </ol>
                <progress max="100" value={state.progress || 5} />
                <div className="processing-bottom">
                    <span role="status">
                        {state.status?.replaceAll("_", " ")}
                    </span>
                    <strong>{state.progress || 5}%</strong>
                </div>
                {(state.error_message || error) && (
                    <p role="alert" className="error">
                        {state.error_message || error}
                    </p>
                )}
                {state.status === "failed" && (
                    <button
                        className="primary"
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
                        <Icon name="refresh" />
                        Retry Project
                    </button>
                )}
                <p className="small-text muted">
                    You can leave this page. We’ll keep working on your video.
                </p>
                <a className="button ghost" href="/dashboard">
                    <Icon name="arrowLeft" />
                    Back to projects
                </a>
            </section>
        </Shell>
    );
}
export { default as Review } from "./Review";
export { default as Subtitles } from "./StyleStudio";
export function Final({ project, latestExport, accountId }: any) {
    const local = useBrowserExport(accountId, String(project.id));
    const url = local.outputUrl || (latestExport?.status === "done" ? latestExport.output_url : "");
    return (
        <Shell
            title="Your video is ready"
            description="From a little idea to something worth sharing."
        >
            <div className="final-layout">
                <section className="panel final-preview">
                    {url ? (
                        <video
                            controls
                            playsInline
                            src={url}
                        />
                    ) : (
                        <p>{local.error || "No completed export is available yet."}</p>
                    )}
                </section>
                <aside className="panel final-summary">
                    <span className="completion-circle">
                        <Icon name="check" />
                    </span>
                    <span className="eyebrow">READY FOR THE WORLD</span>
                    <h2>{project.name}</h2>
                    <p>
                        Download your video and share your story. Your project
                        stays here whenever inspiration strikes again.
                    </p>
                    {url && (
                        <a
                            className="button primary"
                            href={url}
                            download={local.outputUrl ? "video.mp4" : undefined}
                        >
                            <Icon name="download" />
                            Download MP4
                        </a>
                    )}
                    <a
                        className="button"
                        href={`/projects/${project.id}/editor`}
                    >
                        Continue editing
                        <Icon name="arrowRight" />
                    </a>
                    <a className="button ghost" href="/dashboard">
                        Back to projects
                    </a>
                </aside>
            </div>
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
