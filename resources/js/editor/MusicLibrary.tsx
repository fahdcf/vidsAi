import React, { useState, useEffect } from "react";
import { api } from "./api";
export default function MusicLibrary({
    busy,
    onChoose,
}: {
    busy: boolean;
    onChoose: (url: string) => void;
}) {
    const [categories, setCategories] = useState<string[]>([]);
    const [category, setCategory] = useState("music");
    useEffect(() => {
        api("/api/music/categories", undefined, "GET")
            .then((r) => setCategories(r.categories))
            .catch(() => {});
    }, []);
    const [query, setQuery] = useState("");
    const [tracks, setTracks] = useState<any[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    async function search(next = 1, mode = "search") {
        setLoading(true);
        setError("");
        try {
            const r = await api(
                `/api/music/${mode}?query=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&page=${next}&per_page=12`,
                undefined,
                "GET",
            );
            setTracks(r.tracks);
            setTotal(r.total || 0);
            setPage(next);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <section id="music-library" data-no-autosave>
            <h2>Music library</h2>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void search();
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
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
                <button disabled={loading}>Search tracks</button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => void search(1, "popular")}
                >
                    Popular tracks
                </button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => void search(1, "trending")}
                >
                    Featured tracks
                </button>
            </form>
            {error && (
                <p role="alert" className="error">
                    {error}
                </p>
            )}
            {tracks.map((track) => (
                <article key={track.id}>
                    <h3>{track.name}</h3>
                    <p>
                        {track.artist} · {Math.round(track.duration)} seconds
                    </p>
                    <audio controls preload="none" src={track.preview_url} />
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
            {tracks.length > 0 && (
                <div className="row">
                    <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => void search(page - 1)}
                    >
                        Previous tracks
                    </button>
                    <button
                        type="button"
                        disabled={page * 12 >= total || loading}
                        onClick={() => void search(page + 1)}
                    >
                        Next tracks
                    </button>
                </div>
            )}
        </section>
    );
}
