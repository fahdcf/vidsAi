import React, { useState } from "react";
import Shell from "../Shell";
import Icon from "../Icon";
import { api } from "../api";
export default function Create() {
    const [data, setData] = useState({
        name: "",
        type: "product",
        category: "",
        description: "",
        language: "english",
        video_format: ["9:16"],
        script_option: "paste",
        custom_script: "",
        voiceover_option: "upload",
        voiceover_file: null as File | null,
    });
    const [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const set = (key: string, value: any) =>
        setData((old) => ({ ...old, [key]: value }));
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!data.voiceover_file) {
            setError("Choose an MP3 or WAV voiceover to get started.");
            return;
        }
        if (data.voiceover_file.size > 10 * 1024 * 1024) {
            setError("Choose a voiceover under 10 MB.");
            return;
        }
        setBusy(true);
        setError("");
        const form = new FormData();
        for (const [k, v] of Object.entries(data)) {
            if (v instanceof File) form.append(k, v);
            else if (Array.isArray(v))
                v.forEach((s, i) => form.append(`${k}[${i}]`, s));
            else if (v !== null) form.append(k, String(v));
        }
        try {
            const r = await api("/create", form);
            window.location.href = r.redirect;
        } catch (e) {
            setError((e as Error).message);
            setBusy(false);
        }
    }
    return (
        <Shell
            title="Create a video"
            description="Start with your story. We’ll help you find the right shots."
        >
            <div className="create-layout">
                <form className="panel create-form" onSubmit={submit}>
                    <fieldset disabled={busy}>
                        <section className="form-section">
                            <h2>
                                <span className="section-number">01</span>Tell
                                us about your project
                            </h2>
                            <p>
                                A few details help us find footage that fits
                                your story.
                            </p>
                            <label>
                                Project name
                                <input
                                    required
                                    maxLength={255}
                                    value={data.name}
                                    onChange={(e) =>
                                        set("name", e.target.value)
                                    }
                                    placeholder="e.g. Everyday adventures"
                                />
                            </label>
                            <div className="row">
                                <label>
                                    Type
                                    <select
                                        value={data.type}
                                        onChange={(e) =>
                                            set("type", e.target.value)
                                        }
                                    >
                                        <option value="product">Product</option>
                                        <option value="service">Service</option>
                                    </select>
                                </label>
                                <label>
                                    Category
                                    <input
                                        required
                                        maxLength={255}
                                        value={data.category}
                                        onChange={(e) =>
                                            set("category", e.target.value)
                                        }
                                        placeholder="e.g. Lifestyle, travel, skincare"
                                    />
                                </label>
                            </div>
                            <label>
                                Description
                                <textarea
                                    required
                                    maxLength={2000}
                                    value={data.description}
                                    onChange={(e) =>
                                        set("description", e.target.value)
                                    }
                                    placeholder="What are you creating, and what should it feel like?"
                                />
                            </label>
                        </section>
                        <section className="form-section">
                            <h2>
                                <span className="section-number">02</span>Give
                                your story a voice
                            </h2>
                            <p>
                                Your narration sets the rhythm for scenes and
                                captions.
                            </p>
                            <div className="row">
                                <label>
                                    Language
                                    <select
                                        value={data.language}
                                        onChange={(e) =>
                                            set("language", e.target.value)
                                        }
                                    >
                                        {[
                                            { id: "english", name: "English" },
                                            { id: "arabic", name: "Arabic" },
                                            {
                                                id: "moroccan",
                                                name: "Moroccan Darija",
                                            },
                                            { id: "french", name: "French" },
                                            { id: "spanish", name: "Spanish" },
                                        ].map((l) => (
                                            <option value={l.id} key={l.id}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Script
                                    <select
                                        value={data.script_option}
                                        onChange={(e) =>
                                            set("script_option", e.target.value)
                                        }
                                    >
                                        <option value="paste">
                                            Use my script
                                        </option>
                                        <option value="generate">
                                            Use the voiceover transcript
                                        </option>
                                    </select>
                                </label>
                            </div>
                            {data.script_option === "paste" && (
                                <label>
                                    Your script
                                    <textarea
                                        required
                                        maxLength={5000}
                                        dir="auto"
                                        value={data.custom_script}
                                        onChange={(e) =>
                                            set("custom_script", e.target.value)
                                        }
                                        placeholder="Paste the words spoken in your voiceover."
                                    />
                                </label>
                            )}
                            <label className="upload-tile">
                                <Icon name="upload" size={23} />
                                <strong>
                                    {data.voiceover_file
                                        ? data.voiceover_file.name
                                        : "Drop in your voiceover"}
                                </strong>
                                <small>
                                    Click to choose an MP3 or WAV · up to 10 MB
                                </small>
                                <input
                                    required
                                    aria-label="Voiceover (MP3 or WAV, up to 10 MB)"
                                    type="file"
                                    accept=".mp3,.wav"
                                    onChange={(e) =>
                                        set(
                                            "voiceover_file",
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                />
                            </label>
                            <p className="small-text muted">
                                Use a clear recording. If you paste a script,
                                match it to the spoken words.
                            </p>
                        </section>
                        <section className="form-section">
                            <h2>
                                <span className="section-number">03</span>Choose
                                your canvas
                            </h2>
                            <p>
                                Pick the format that fits where your story will
                                live.
                            </p>
                            <div className="format-options">
                                {[
                                    { id: "9:16", name: "Portrait", shape: "" },
                                    {
                                        id: "16:9",
                                        name: "Landscape",
                                        shape: "format-landscape",
                                    },
                                    {
                                        id: "1:1",
                                        name: "Square",
                                        shape: "format-square",
                                    },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        aria-pressed={
                                            data.video_format[0] === f.id
                                        }
                                        onClick={() =>
                                            set("video_format", [f.id])
                                        }
                                        className="format-choice"
                                    >
                                        <span
                                            className={`format-shape ${f.shape}`}
                                        />
                                        <strong>{f.name}</strong>
                                        <small>{f.id}</small>
                                    </button>
                                ))}
                            </div>
                            <label className="advanced-format">
                                Video format
                                <select
                                    aria-label="Video format"
                                    value={data.video_format[0]}
                                    onChange={(e) =>
                                        set("video_format", [e.target.value])
                                    }
                                >
                                    {["9:16", "16:9", "1:1", "all"].map((f) => (
                                        <option key={f}>{f}</option>
                                    ))}
                                </select>
                            </label>
                            {data.video_format[0] === "all" && (
                                <p className="notice">
                                    All three formats will be saved to this
                                    project. The first canvas is exported; you
                                    can change it in the editor.
                                </p>
                            )}
                        </section>
                        {error && (
                            <p role="alert" className="error">
                                {error}
                            </p>
                        )}
                        <footer className="form-submit">
                            <p>You’ll review every scene before moving on.</p>
                            <button
                                className="primary"
                                disabled={busy}
                                type="submit"
                            >
                                {busy
                                    ? "Creating your project…"
                                    : "Generate scenes"}
                                <Icon name="arrowRight" />
                            </button>
                        </footer>
                    </fieldset>
                </form>
                <aside className="create-aside">
                    <Icon name="sparkles" size={26} />
                    <span className="eyebrow">
                        {" "}
                        A LITTLE DIRECTION. YOUR VISION.
                    </span>
                    <h2>
                        From a few words
                        <br />
                        to something worth watching.
                    </h2>
                    <p>
                        You’re in control at every step. Think of us as your
                        creative starting point.
                    </p>
                    {[
                        [
                            "Find your scenes",
                            "We match your narration with relevant footage.",
                        ],
                        [
                            "Make it yours",
                            "Review each shot, trim it, or upload your own.",
                        ],
                        [
                            "Give it a style",
                            "Choose captions, transitions, and a soundtrack.",
                        ],
                        [
                            "Finish in the editor",
                            "Refine the timeline and export your video.",
                        ],
                    ].map(([title, text], i) => (
                        <div className="creation-step" key={title}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <div>
                                <strong>{title}</strong>
                                <p>{text}</p>
                            </div>
                        </div>
                    ))}
                </aside>
            </div>
        </Shell>
    );
}
