import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ["react", "react-dom", "remotion", "@remotion/player", "zod"],
        alias: {
            "@vidsai/contracts": path.resolve(
                import.meta.dirname,
                "./shared/contracts/index.ts",
            ),
            "@vidsai/editing-core": path.resolve(
                import.meta.dirname,
                "./shared/editing-core/index.ts",
            ),
            "@vidsai/compositions": path.resolve(
                import.meta.dirname,
                "./shared/compositions/index.ts",
            ),
        },
    },
    server: {
        proxy: Object.fromEntries(
            [
                "/api",
                "/login",
                "/register",
                "/logout",
                "/profile",
                "/password",
                "/forgot-password",
                "/reset-password",
                "/projects",
                "/motion-runs",
                "/scenes",
                "/create",
                "/review",
                "/processing",
                "/subtitle-styles",
            ].map((p) => [
                "^" + p + "(?:/|$|\\?)",
                {
                    target:
                        process.env.NODE_APP_ORIGIN || "http://127.0.0.1:8100",
                    bypass: (req) =>
                        req.headers.accept?.includes("text/html")
                            ? "/index.html"
                            : undefined,
                },
            ]),
        ),
    },
    build: { outDir: "dist" },
});
