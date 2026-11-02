import React from "react";
import Icon from "./Icon";
export const captionPresets = [
    {
        id: "tiktok_trending",
        name: "TikTok Trending",
        description: "Big words. Big impact.",
        tag: "POPULAR",
    },
    {
        id: "progressive_highlight",
        name: "Progressive Highlight",
        description: "Let every word have its moment.",
    },
    {
        id: "rectangular",
        name: "Classic Box",
        description: "High contrast, always readable.",
    },
    {
        id: "rounded_progressive",
        name: "Rounded Highlight",
        description: "Soft shapes. Standout words.",
    },
    {
        id: "arabic_banner",
        name: "Arabic Banner",
        description: "A bold frame for Arabic captions.",
        tag: "RTL",
    },
    {
        id: "rectangular_banner",
        name: "Rectangular Banner",
        description: "A clean, full-width statement.",
    },
    { id: "default", name: "Minimal", description: "Keep the story in focus." },
];
export default function StyleGallery({
    value,
    onChoose,
    disabled = false,
    compact = false,
}: {
    value: string;
    onChoose: (style: string) => void;
    disabled?: boolean;
    compact?: boolean;
}) {
    return (
        <div className={`style-gallery ${compact ? "compact" : ""}`}>
            {captionPresets.map((p) => (
                <button
                    type="button"
                    key={p.id}
                    className={`preset-card ${value === p.id ? "is-selected" : ""}`}
                    aria-pressed={value === p.id}
                    aria-label={`Use ${p.name}`}
                    disabled={disabled}
                    onClick={() => onChoose(p.id)}
                >
                    <span className={`preset-sample preset-${p.id}`}>
                        <span className="sample-scene" />
                        <span className="sample-words">
                            {p.id === "arabic_banner" ? (
                                <>
                                    لكل كلمة <em>حكاية</em>
                                </>
                            ) : (
                                <>
                                    Make every
                                    <br />
                                    <em>word</em> count.
                                </>
                            )}
                        </span>
                    </span>
                    <span className="preset-info">
                        <span>
                            <strong>{p.name}</strong>
                            {p.tag && (
                                <small className="preset-tag">{p.tag}</small>
                            )}
                        </span>
                        <small>{p.description}</small>
                        <span className="preset-check">
                            <Icon name="check" size={12} />
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}
