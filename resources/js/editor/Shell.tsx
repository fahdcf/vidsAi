import React from "react";
export default function Shell({
    children,
    title,
}: {
    children: React.ReactNode;
    title: string;
}) {
    return (
        <>
            <header className="topbar">
                <a href="/dashboard" className="brand">
                    VidsAI <span>STUDIO</span>
                </a>
                <nav>
                    <a href="/dashboard">Projects</a>
                    <a href="/create">New video</a>
                    <a href="/profile">Account</a>
                </nav>
            </header>
            <main>
                <h1>{title}</h1>
                {children}
            </main>
        </>
    );
}
