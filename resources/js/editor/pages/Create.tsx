import React from "react";
import { useForm } from "@inertiajs/react";
import Shell from "../Shell";
export default function Create() {
    const f = useForm({
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
    return (
        <Shell title="Create a video">
            <form
                className="panel create-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    f.post("/create", { forceFormData: true });
                }}
            >
                <label>
                    Project name
                    <input
                        required
                        value={f.data.name}
                        onChange={(e) => f.setData("name", e.target.value)}
                    />
                </label>
                <div className="row">
                    <label>
                        Type
                        <select
                            value={f.data.type}
                            onChange={(e) => f.setData("type", e.target.value)}
                        >
                            <option value="product">Product</option>
                            <option value="service">Service</option>
                        </select>
                    </label>
                    <label>
                        Category
                        <input
                            required
                            value={f.data.category}
                            onChange={(e) =>
                                f.setData("category", e.target.value)
                            }
                        />
                    </label>
                </div>
                <label>
                    Description
                    <textarea
                        required
                        maxLength={2000}
                        value={f.data.description}
                        onChange={(e) =>
                            f.setData("description", e.target.value)
                        }
                    />
                </label>
                <div className="row">
                    <label>
                        Language
                        <select
                            value={f.data.language}
                            onChange={(e) =>
                                f.setData("language", e.target.value)
                            }
                        >
                            {[
                                "english",
                                "arabic",
                                "moroccan",
                                "french",
                                "spanish",
                            ].map((x) => (
                                <option key={x}>{x}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Video format
                        <select
                            value={f.data.video_format[0]}
                            onChange={(e) =>
                                f.setData("video_format", [e.target.value])
                            }
                        >
                            {["9:16", "16:9", "1:1", "all"].map((x) => (
                                <option key={x}>{x}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <label>
                    Script
                    <select
                        value={f.data.script_option}
                        onChange={(e) =>
                            f.setData("script_option", e.target.value)
                        }
                    >
                        <option value="paste">Use my script</option>
                        <option value="generate">
                            Generate from description
                        </option>
                    </select>
                </label>
                {f.data.script_option === "paste" && (
                    <label>
                        Your script
                        <textarea
                            required
                            dir="auto"
                            value={f.data.custom_script}
                            onChange={(e) =>
                                f.setData("custom_script", e.target.value)
                            }
                        />
                    </label>
                )}
                <label>
                    Voiceover (MP3 or WAV, up to 10 MB)
                    <input
                        required
                        type="file"
                        accept=".mp3,.wav"
                        onChange={(e) =>
                            f.setData(
                                "voiceover_file",
                                e.target.files?.[0] || null,
                            )
                        }
                    />
                </label>
                <p className="muted">
                    Uploaded voiceover is available. AI voice generation and
                    videos without narration are planned features.
                </p>
                {Object.entries(f.errors).map(([key, value]) => (
                    <p className="error" key={key}>
                        {value}
                    </p>
                ))}
                {f.progress && (
                    <progress max="100" value={f.progress.percentage} />
                )}
                <button className="primary" disabled={f.processing}>
                    {f.processing ? "Creating project…" : "Generate scenes"}
                </button>
            </form>
        </Shell>
    );
}
