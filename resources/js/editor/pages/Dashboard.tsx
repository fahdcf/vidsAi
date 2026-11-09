import React, { useState } from "react";
import Shell from "../Shell";
import Icon from "../Icon";
import MediaThumb from "../MediaThumb";
import MotionThumb from "../motion/MotionThumb";
import type { MotionScene } from "../motion/MotionSceneControls";
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
const motionStatusNames: Record<string, string> = {
    queued: "Queued", working: "Making a draft", waiting_for_browser: "Waiting for browser",
    ready: "Ready", failed: "Needs attention", cancelled: "Stopped",
};
type MotionCover = { scene: MotionScene | null; width: number; height: number; fps: number };
export default function Dashboard({ projects }: { projects: any[] }) {
    const [filter, setFilter] = useState("All projects"),
        [search, setSearch] = useState(""),
        [limit, setLimit] = useState(9);
    const effectiveStatus = (p: any) => {
        if (p.workflow !== "motion_graphics") return p.status;
        if (p.motion_review_pending) return "reviewing";
        if (["queued", "working", "waiting_for_browser"].includes(p.motion_status)) return "processing";
        if (["failed", "cancelled"].includes(p.motion_status)) return "failed";
        return p.status;
    };
    const filtered = projects.filter(
        (p) =>
            (filter === "All projects" ||
                (filter === "In progress" && inProgress.includes(effectiveStatus(p))) ||
                (filter === "Ready" && effectiveStatus(p) === "completed") ||
                (filter === "Drafts" &&
                    ["reviewing", "subtitle_selection", "failed"].includes(
                        effectiveStatus(p),
                    ))) &&
            p.name.toLowerCase().includes(search.toLowerCase()),
    );
    return (
        <Shell
            title="Your workspace"
            description="Pick up where you left off, or start something new."
            actions={
                <a className="button primary" href="/create">
                    <Icon name="plus" />
                    Create video
                </a>
            }
        >
            <section className="dashboard-intro">
                <img className="dashboard-art" src="/studio/story-glass.webp" alt="" width={1536} height={1024} />
                <div className="dashboard-intro-copy">
                    <span className="eyebrow">
                        MADE FOR YOUR NEXT IDEA
                    </span>
                    <h2>Make a story.<br /><em>Make it yours.</em></h2>
                    <p>
                        Turn your narration into a video worth watching.
                    </p>
                    <a className="button primary" href="/create"><Icon name="plus" /> New project</a>
                </div>
                <div className="project-stats">
                    <span>
                        <strong>{projects.length}</strong> projects
                    </span>
                    <span>
                        <strong>
                            {
                                projects.filter((p) => effectiveStatus(p) === "completed")
                                    .length
                            }
                        </strong>{" "}
                        ready to share
                    </span>
                </div>
            </section>
            <div className="section-bar dashboard-project-heading">
                <h2>Your projects</h2>
                <span className="muted small-text">{projects.length} in your workspace</span>
            </div>
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
                    const motion = p.workflow === "motion_graphics";
                    const status = effectiveStatus(p);
                    const cover = p.motion_cover ? JSON.parse(p.motion_cover) as MotionCover : null;
                    const href = motion
                        ? `/projects/${p.id}/${status === "completed" ? "editor" : "motion"}`
                        : [
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
                                {cover?.scene ? <MotionThumb scene={cover.scene} projectId={String(p.id)}
                                    width={cover.width} height={cover.height} fps={cover.fps} /> : <MediaThumb
                                    url={p.thumbnail_url}
                                    type={p.media_type}
                                    label="Your next story"
                                />}
                                <span
                                    className={`status-pill ${status === "completed" ? "ready" : status === "failed" ? "failed" : inProgress.includes(status) ? "progress" : ""}`}
                                >
                                    <span className="live-dot" />
                                    {p.motion_review_pending ? "Revision ready" : motion && p.motion_status
                                        ? motionStatusNames[p.motion_status] : statusNames[status] || status}
                                </span>
                                <span className="project-open">
                                    <Icon name="arrowRight" size={15} />
                                </span>
                            </div>
                            <div className="project-card-content">
                                <h2>{p.name}</h2>
                                <p>
                                    <span>
                                        {motion ? <span className="motion-workflow-badge">Motion graphics</span> : p.category || "Video project"}
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
