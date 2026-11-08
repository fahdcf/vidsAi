import React from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Editor from "./pages/Editor";
import {
    Processing,
    Review,
    Subtitles,
    Final,
    Auth,
    Profile,
} from "./pages/Workflow";
import Recovery from "./pages/Recovery";
import Public from "./pages/Public";
import "./editor.css";
const pages: any = {
    Dashboard,
    Create,
    Editor,
    Processing,
    Review,
    Subtitles,
    Final,
    Profile,
};
async function boot() {
    const session = await (
        await fetch("/api/session", { credentials: "same-origin" })
    ).json();
    document
        .querySelector('meta[name="csrf-token"]')!
        .setAttribute("content", session.csrf);
    const pathname = window.location.pathname;
    if (pathname === "/" || pathname === "/pricing") {
        createRoot(document.getElementById("app")!).render(
            <Public pricing={pathname === "/pricing"} />,
        );
        return;
    }
    if (["/forgot-password", "/reset-password"].includes(pathname)) {
        createRoot(document.getElementById("app")!).render(<Recovery />);
        return;
    }
    if (["/login", "/register"].includes(pathname)) {
        createRoot(document.getElementById("app")!).render(
            <Auth register={pathname === "/register"} />,
        );
        return;
    }
    if (!session.user) {
        window.location.href = "/login";
        return;
    }
    const response = await fetch(
        "/api/page?path=" +
            encodeURIComponent(pathname === "/" ? "/dashboard" : pathname),
        { credentials: "same-origin" },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Page unavailable");
    const Component = pages[data.page];
    if (!Component) throw new Error("Unknown page");
    createRoot(document.getElementById("app")!).render(
        <Component key={pathname} {...data.props} accountId={String(session.user.id)} />,
    );
}
void boot().catch((e) => {
    document.getElementById("app")!.textContent = (e as Error).message;
});
