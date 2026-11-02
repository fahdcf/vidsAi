import React from "react";
import Shell from "../Shell";
import Icon from "../Icon";
export default function Public({ pricing = false }: { pricing?: boolean }) {
    return (
        <Shell
            title={
                pricing
                    ? "A plan for your next big idea."
                    : "Create video ads with VidsAI"
            }
            description={
                pricing
                    ? "Start creating. Find your rhythm. Make it yours."
                    : undefined
            }
        >
            {pricing ? (
                <div className="pricing-grid">
                    {[
                        ["Free", "$0", "1 video per month"],
                        ["Basic", "$29", "3 videos per month"],
                        ["Pro", "$99", "10 videos per month"],
                    ].map(([name, price, limit], i) => (
                        <section
                            className={`panel pricing-card ${i === 1 ? "recommended" : ""}`}
                            key={name}
                        >
                            <span className="eyebrow">
                                {i === 1
                                    ? "ROOM TO CREATE"
                                    : i === 0
                                      ? "A LITTLE START"
                                      : "BIGGER STORIES"}
                            </span>
                            <h2>{name}</h2>
                            <div className="price">
                                {price}
                                <small>/ month</small>
                            </div>
                            <p>{limit}</p>
                            <ul>
                                {[
                                    "Voiceover-led storytelling",
                                    "Scene review and editing",
                                    "Caption styles and music",
                                    "MP4 export",
                                ].map((s) => (
                                    <li key={s}>
                                        <Icon name="check" size={14} />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                            <a
                                className={`button ${i === 1 ? "primary" : ""}`}
                                href="/register"
                            >
                                Get started
                                <Icon name="arrowRight" />
                            </a>
                        </section>
                    ))}
                </div>
            ) : (
                <>
                    <section className="landing-hero">
                        <div>
                            <span className="eyebrow">
                                <span className="live-dot" />
                                YOUR IDEAS DESERVE TO BE SEEN
                            </span>
                            <h1>
                                A little idea.
                                <br />A <em>great video.</em>
                            </h1>
                            <p>
                                Turn your voice and your vision into a video.
                                Find the right scenes, give every word a style,
                                and make the final cut your own.
                            </p>
                            <div className="hero-actions">
                                <a className="button primary" href="/create">
                                    Create a video
                                    <Icon name="arrowRight" />
                                </a>
                                <a className="button ghost" href="/login">
                                    Open your workspace
                                </a>
                            </div>
                            <div className="hero-note">
                                <Icon name="check" size={13} />
                                Your story. Your footage. Your final say.
                            </div>
                        </div>
                        <div className="hero-art" aria-hidden="true">
                            <div className="hero-art-header">
                                <span>
                                    <span className="live-dot" />
                                    YOUR STORY, IN MOTION
                                </span>
                                <span>00:06</span>
                            </div>
                            <div className="hero-art-video">
                                <div className="hero-orbit" />
                                <span>
                                    MAKE EVERY
                                    <br />
                                    <em>WORD COUNT.</em>
                                </span>
                            </div>
                            <div className="hero-art-timeline">
                                <span>01</span>
                                <span>02</span>
                                <span>03</span>
                            </div>
                            <div className="hero-art-caption">
                                A voiceover. A vision. A video.
                            </div>
                            <div className="hero-art-tag">
                                <Icon name="sparkles" size={15} />A little help.
                                A lot of you.
                            </div>
                        </div>
                    </section>
                    <section className="landing-steps">
                        {[
                            {
                                n: "01",
                                icon: "user",
                                title: "Start with your voice",
                                text: "Bring your narration and script. We’ll help you turn your words into a visual story.",
                            },
                            {
                                n: "02",
                                icon: "film",
                                title: "Shape every scene",
                                text: "Find footage that fits. Trim the moment, change a shot, or bring in your own.",
                            },
                            {
                                n: "03",
                                icon: "sparkles",
                                title: "Make the final cut yours",
                                text: "Choose captions and music. Refine the details with your editing assistant, then share.",
                            },
                        ].map((s) => (
                            <article key={s.n}>
                                <div>
                                    <Icon name={s.icon} size={23} />
                                    <span>{s.n}</span>
                                </div>
                                <h2>{s.title}</h2>
                                <p>{s.text}</p>
                            </article>
                        ))}
                    </section>
                    <footer className="landing-footer">
                        <a href="/pricing">
                            Explore the plans
                            <Icon name="arrowRight" size={14} />
                        </a>
                        <span>Made for stories with something to say.</span>
                    </footer>
                </>
            )}
        </Shell>
    );
}
