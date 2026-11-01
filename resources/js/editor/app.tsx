import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Editor from "./pages/Editor";
import "./editor.css";
const pages = { Dashboard, Create, Editor };
void createInertiaApp({
    resolve: (name) => pages[name as keyof typeof pages],
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
