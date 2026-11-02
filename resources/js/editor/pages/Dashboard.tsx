import React, { useState } from "react";
import Shell from "../Shell";
import Icon from "../Icon";
import MediaThumb from "../MediaThumb";
const inProgress = ["pending", "processing", "subtitle_generating"];
const statusNames: Record<string, string> = {
    pending: "Queued",
    processing: "Building scenes",
    reviewing: "Review scenes",
    subtitle_selection: "Ready to edit",
    subtitle_generating: "Exporting",
    completed: "Ready",
    failed: "Needs attention",
};
export default function Dashboard({ projects }: { projects: any[] }) {
    const [filter, setFilter] = useState("All projects"),
        [search, setSearch] = useState(""),
        [limit, setLimit] = useState(9);
    const filtered = projects.filter(
        (p) =>
            (filter === "All projects" ||
                (filter === "In progress" && inProgress.includes(p.status)) ||
                (filter === "Ready" && p.status === "completed") ||
                (filter === "Drafts" &&
                    ["reviewing", "subtitle_selection", "failed"].includes(
                        p.status,
                    ))) &&
            p.name.toLowerCase().includes(search.toLowerCase()),
    );
    return (
        <Shell
            title="Your video projects"
            description="A home for your ideas, works in progress, and next great video."
            actions={
                <a className="button primary" href="/create">
                    <Icon name="plus" />
                    Create video
                </a>
            }
        >
            <section className="dashboard-intro">
                <div>
                    <span className="eyebrow">
                        START WITH A LITTLE INSPIRATION
                    </span>
                    <h2>Your next story starts here.</h2>
                    <p>
                        A voiceover, a few ideas, and a video that feels like
                        you.
                    </p>
                </div>
                <div className="project-stats">
                    <span>
                        <strong>{projects.length}</strong> projects
                    </span>
                    <span>
                        <strong>
                            {
                                projects.filter((p) => p.status === "completed")
                                    .length
                            }
                        </strong>{" "}
                        ready to share
                    </span>
                </div>
            </section>
            <div className="dashboard-tools">
                <nav className="filter-tabs" aria-label="Filter projects">
                    {["All projects", "In progress", "Ready", "Drafts"].map(
                        (f) => (
                            <button
                                key={f}
                                aria-pressed={filter === f}
                                onClick={() => {
                                    setFilter(f);
                                    setLimit(9);
                                }}
                            >
                                {f}
                            </button>
                        ),
                    )}
                </nav>
                <label className="project-search">
                    <Icon name="search" size={16} />
                    <input
                        type="search"
                        aria-label="Search projects"
                        placeholder="Search your projects"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setLimit(9);
                        }}
                    />
                </label>
            </div>
            <div className="project-grid">
                {filtered.slice(0, limit).map((p) => {
                    const href = [
                        "subtitle_selection",
                        "subtitle_generating",
                        "completed",
                    ].includes(p.status)
                        ? `/projects/${p.id}/editor`
                        : p.status === "reviewing"
                          ? `/review/${p.id}`
                          : `/processing/${p.id}`;
                    return (
                        <a className="project-card" key={p.id} href={href}>
                            <div className="project-cover">
                                <MediaThumb
                                    url={p.thumbnail_url}
                                    type={p.media_type}
                                    label="Your next story"
                                />
                                <span
                                    className={`status-pill ${p.status === "completed" ? "ready" : p.status === "failed" ? "failed" : inProgress.includes(p.status) ? "progress" : ""}`}
                                >
                                    <span className="live-dot" />
                                    {statusNames[p.status] || p.status}
                                </span>
                                <span className="project-open">
                                    <Icon name="arrowRight" size={15} />
                                </span>
                            </div>
                            <div className="project-card-content">
                                <h2>{p.name}</h2>
                                <p>
                                    <span>
                                        {p.category || "Video project"}
                                        {p.duration
                                            ? " · " +
                                              Number(p.duration).toFixed(1) +
                                              "s"
                                            : ""}
                                    </span>
                                    <span>
                                        {new Date(
                                            p.created_at,
                                        ).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </span>
                                </p>
                            </div>
                        </a>
                    );
                })}
            </div>
            {!filtered.length && (
                <div className="empty-state">
                    <Icon name={search ? "search" : "film"} />
                    <h2>
                        {projects.length
                            ? "No matching projects"
                            : "Make room for your first story."}
                    </h2>
                    <p>
                        {projects.length
                            ? "Try another search or choose a different filter."
                            : "Bring a script and a voiceover. We’ll help you turn them into something worth watching."}
                    </p>
                    <a className="button primary" href="/create">
                        <Icon name="plus" />
                        Create a video
                    </a>
                </div>
            )}
            {filtered.length > limit && (
                <div className="load-more">
                    <button onClick={() => setLimit((v) => v + 9)}>
                        Show more projects
                    </button>
                </div>
            )}
        </Shell>
    );
}
