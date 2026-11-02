import React from "react";
import Icon from "./Icon";
export default function Shell({
    children,
    title,
    description,
    actions,
}: {
    children: React.ReactNode;
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) {
    const path = window.location.pathname;
    const projectId =
        path.match(
            /\/(?:review|subtitle-styles|processing|final)\/(\d+)/,
        )?.[1] || path.match(/\/projects\/(\d+)/)?.[1];
    const publicPage = [
        "/",
        "/pricing",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
    ].includes(path);
    const studio = Boolean(projectId);
    const step = path.startsWith("/review")
        ? 1
        : path.startsWith("/subtitle-styles")
          ? 2
          : path.startsWith("/projects") || path.startsWith("/final")
            ? 3
            : 0;
    const links = [
        { href: "/dashboard", name: "Projects", icon: "grid" },
        { href: "/create", name: "New video", icon: "plus" },
        { href: "/profile", name: "Account", icon: "user" },
    ];
    return (
        <div
            className={`app-shell ${studio ? "studio-shell" : ""} ${publicPage ? "public-shell" : ""}`}
        >
            <a href="#main-content" className="skip-link">
                Skip to content
            </a>
            <header className="topbar">
                <a href={publicPage ? "/" : "/dashboard"} className="brand">
                    <span className="brand-symbol">
                        <Icon name="film" size={19} />
                    </span>
                    vids<span className="brand-ai">ai</span>
                    <span className="brand-label">STUDIO</span>
                </a>
                <div className="topbar-context">
                    {studio ? (
                        <>
                            <a href="/dashboard">Workspace</a>
                            <span>/</span>
                            <span>{title}</span>
                        </>
                    ) : (
                        <span>Make something worth watching.</span>
                    )}
                </div>
                <nav aria-label="Main navigation">
                    {publicPage ? (
                        <>
                            <a href="/pricing">Pricing</a>
                            <a className="button small" href="/login">
                                Sign in
                            </a>
                        </>
                    ) : (
                        <>
                            <a className="topbar-projects" href="/dashboard">
                                <Icon name="grid" />
                                Projects
                            </a>
                            <a
                                className="avatar"
                                href="/profile"
                                aria-label="Your account"
                            >
                                <Icon name="user" />
                            </a>
                        </>
                    )}
                </nav>
            </header>
            {!studio && !publicPage && (
                <aside className="sidebar">
                    <span className="nav-label">WORKSPACE</span>
                    <nav aria-label="Workspace">
                        {links.map((l) => (
                            <a
                                key={l.href}
                                href={l.href}
                                aria-current={
                                    path === l.href ? "page" : undefined
                                }
                            >
                                <Icon name={l.icon} />
                                {l.name}
                                {l.href === "/create" && (
                                    <span className="nav-plus">+</span>
                                )}
                            </a>
                        ))}
                    </nav>
                    <div className="sidebar-note">
                        <Icon name="sparkles" />
                        <strong>
                            A little idea.
                            <br />A lot of possibility.
                        </strong>
                        <p>Bring your next story to life.</p>
                        <a href="/create">
                            Create a video <Icon name="arrowRight" size={14} />
                        </a>
                    </div>
                </aside>
            )}
            <main id="main-content" className={studio ? "studio-main" : ""}>
                {studio && (
                    <nav
                        className="workflow-steps"
                        aria-label="Video creation progress"
                    >
                        {[
                            "Create",
                            "Review scenes",
                            "Style video",
                            "Edit & export",
                        ].map((name, i) => {
                            const url =
                                i === 0
                                    ? "/create"
                                    : i === 1
                                      ? `/review/${projectId}`
                                      : i === 2
                                        ? `/subtitle-styles/${projectId}`
                                        : `/projects/${projectId}/editor`;
                            return (
                                <React.Fragment key={name}>
                                    {i > 0 && (
                                        <span
                                            className={`step-line ${i <= step ? "complete" : ""}`}
                                        />
                                    )}
                                    <a
                                        href={i > step ? undefined : url}
                                        aria-disabled={i > step || undefined}
                                        aria-current={
                                            i === step ? "step" : undefined
                                        }
                                        className={`workflow-step ${i === step ? "current" : i < step ? "complete" : ""}`}
                                    >
                                        <span>
                                            {i < step ? (
                                                <Icon name="check" size={12} />
                                            ) : (
                                                i + 1
                                            )}
                                        </span>
                                        <b>{name}</b>
                                    </a>
                                </React.Fragment>
                            );
                        })}
                    </nav>
                )}
                <div className="page-heading">
                    <div>
                        <div className="eyebrow">
                            {studio
                                ? "YOUR VIDEO WORKSPACE"
                                : path === "/dashboard"
                                  ? "YOUR CREATIVE WORKSPACE"
                                  : path === "/create"
                                    ? "FROM IDEA TO VIDEO"
                                    : "VIDSAI STUDIO"}
                        </div>
                        <h1>{title}</h1>
                        {description && <p>{description}</p>}
                    </div>
                    {actions && <div className="page-actions">{actions}</div>}
                </div>
                {children}
            </main>
        </div>
    );
}
