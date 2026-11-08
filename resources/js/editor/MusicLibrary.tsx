import React, { useState, useEffect } from "react";
import { api } from "./api";

type Track = {
    id: number;
    name: string;
    artist: string;
    duration: number;
    license: string;
    preview_url: string;
};
type TrackList = { tracks: Track[]; total: number };
type Browse = {
    mode: "search" | "popular" | "trending";
    query: string;
    category: string;
    page: number;
};
const pageSize = 12;
const resultHeadings = {
    search: "Search results",
    popular: "Popular tracks",
    trending: "Featured tracks",
};
let suggestedTracks: { expiresAt: number; request: Promise<TrackList> } | undefined;

function getSuggestions() {
    if (!suggestedTracks || suggestedTracks.expiresAt <= Date.now()) {
        const request = api<TrackList>("/api/music/popular?per_page=4", undefined, "GET");
        suggestedTracks = { expiresAt: Date.now() + 5 * 60_000, request };
        void request.catch(() => {
            if (suggestedTracks?.request === request) suggestedTracks = undefined;
        });
    }
    return suggestedTracks.request;
}

export default function MusicLibrary({
    busy,
    onChoose,
}: {
    busy: boolean;
    onChoose: (url: string) => void;
}) {
    const [categories, setCategories] = useState(["music"]);
    const [category, setCategory] = useState("music");
    const [suggestions, setSuggestions] = useState<Track[] | null>(null);
    useEffect(() => {
        let mounted = true;
        void api<{ categories: string[] }>("/api/music/categories", undefined, "GET")
            .then(({ categories }) => {
                if (mounted) setCategories(categories);
            })
            .catch(() => {});
        void getSuggestions().then(
            ({ tracks }) => {
                if (mounted) setSuggestions(tracks.filter((track) => track.preview_url));
            },
            () => {
                if (mounted) setSuggestions([]);
            },
        );
        return () => {
            mounted = false;
        };
    }, []);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<(TrackList & { browse: Browse }) | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const tracks = results?.tracks ?? suggestions;

    function browseFirstPage(mode: Browse["mode"]) {
        void search({ mode, query: query.trim(), category, page: 1 });
    }

    async function search(browse: Browse) {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
            query: browse.query,
            category: browse.category,
            page: String(browse.page),
            per_page: String(pageSize),
        });
        try {
            const list = await api<TrackList>(
                `/api/music/${browse.mode}?${params}`,
                undefined,
                "GET",
            );
            setResults({ ...list, browse });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <section id="music-library" aria-label="Music library" data-no-autosave>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    browseFirstPage("search");
                }}
            >
                <label>
                    Music category
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Search music
                    <input
                        placeholder="e.g. ambient piano"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
                <button disabled={loading}>Search tracks</button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => browseFirstPage("popular")}
                >
                    Popular tracks
                </button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => browseFirstPage("trending")}
                >
                    Featured tracks
                </button>
            </form>
            {error && (
                <p role="alert" className="error">
                    {error}
                </p>
            )}
            <h3 className="music-results-title">
                {results ? resultHeadings[results.browse.mode] : "Suggested tracks"}
            </h3>
            {loading || tracks === null ? (
                <p role="status" className="muted">Loading {loading ? "tracks" : "suggestions"}…</p>
            ) : tracks.length === 0 && (
                <p role="status" className="muted">
                    {results ? "No tracks found. Try another search." : "No suggestions available. Search for music or try Popular tracks."}
                </p>
            )}
            {tracks?.map((track) => (
                <article key={track.id}>
                    <h3>{track.name}</h3>
                    <p>
                        {track.artist} · {Math.round(track.duration)} seconds
                    </p>
                    <audio
                        controls
                        preload="none"
                        src={track.preview_url}
                        aria-label={`Preview ${track.name}`}
                    />
                    <p>
                        <a
                            href={track.license}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Track licence
                        </a>
                    </p>
                    <button
                        disabled={busy}
                        type="button"
                        onClick={() => onChoose(track.preview_url)}
                    >
                        Use this track
                    </button>
                </article>
            ))}
            {results && (results.browse.page > 1 || results.total > pageSize) && (
                <div className="row">
                    <button
                        type="button"
                        disabled={results.browse.page <= 1 || loading}
                        onClick={() => void search({ ...results.browse, page: results.browse.page - 1 })}
                    >
                        Previous tracks
                    </button>
                    <button
                        type="button"
                        disabled={results.browse.page * pageSize >= results.total || loading}
                        onClick={() => void search({ ...results.browse, page: results.browse.page + 1 })}
                    >
                        Next tracks
                    </button>
                </div>
            )}
        </section>
    );
}
