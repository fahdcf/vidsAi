import React from "react";
import Shell from "../Shell";
export default function Public({ pricing = false }: { pricing?: boolean }) {
    return (
        <Shell
            title={
                pricing ? "Choose your plan" : "Create video ads with VidsAI"
            }
        >
            {pricing ? (
                <div className="project-grid">
                    {[
                        ["Free", "$0", "1 video per month"],
                        ["Basic", "$29", "3 videos per month"],
                        ["Pro", "$99", "10 videos per month"],
                    ].map(([name, price, limit]) => (
                        <section className="panel" key={name}>
                            <h2>{name}</h2>
                            <h3>{price}</h3>
                            <p>{limit}</p>
                            <a className="button primary" href="/register">
                                Get started
                            </a>
                        </section>
                    ))}
                </div>
            ) : (
                <section className="panel">
                    <h2>Turn your script and voiceover into a video</h2>
                    <p>
                        Generate scenes, choose footage, style captions, add
                        music and edit with an assistant before exporting your
                        video.
                    </p>
                    <a className="button primary" href="/create">
                        Create a video
                    </a>
                    <a className="button" href="/login">
                        Sign in
                    </a>
                    <a className="button" href="/pricing">
                        View plans
                    </a>
                </section>
            )}
        </Shell>
    );
}
