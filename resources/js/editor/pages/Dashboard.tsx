import React from "react";
import Shell from "../Shell";
type Project = { id: number; name: string; status: string; created_at: string };
export default function Dashboard({ projects }: { projects: Project[] }) {
    return (
        <Shell title="Your video projects">
            <div className="intro">
                <p>Create, edit and export videos with an editing assistant.</p>
                <a className="button primary" href="/create">
                    Create video
                </a>
            </div>
            <div className="project-grid">
                {projects.map((p) => (
                    <a
                        className="panel project-card"
                        key={p.id}
                        href={
                            [
                                "subtitle_selection",
                                "subtitle_generating",
                                "completed",
                            ].includes(p.status)
                                ? `/projects/${p.id}/editor`
                                : p.status === "reviewing"
                                  ? `/review/${p.id}`
                                  : `/processing/${p.id}`
                        }
                    >
                        <span className="badge">
                            {p.status.replaceAll("_", " ")}
                        </span>
                        <h2>{p.name}</h2>
                        <p>{new Date(p.created_at).toLocaleDateString()}</p>
                    </a>
                ))}
            </div>
            {!projects.length && (
                <div className="panel">
                    Your first video starts here. Create a project and upload a
                    voiceover.
                </div>
            )}
        </Shell>
    );
}
