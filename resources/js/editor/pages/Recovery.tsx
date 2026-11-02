import React, { useState } from "react";
import Shell from "../Shell";
import { api } from "../api";
export default function Recovery() {
    const reset = window.location.pathname === "/reset-password";
    const params = new URLSearchParams(window.location.search);
    const [message, setMessage] = useState("");
    return (
        <Shell title={reset ? "Reset your password" : "Forgot your password?"}>
            <form
                className="panel create-form"
                onSubmit={async (e) => {
                    e.preventDefault();
                    const data = Object.fromEntries(
                        new FormData(e.currentTarget),
                    );
                    try {
                        const r = await api(
                            reset ? "/reset-password" : "/forgot-password",
                            {
                                ...data,
                                ...(reset
                                    ? { token: params.get("token") }
                                    : {}),
                            },
                        );
                        if (r.redirect) window.location.href = r.redirect;
                        else setMessage(r.message);
                    } catch (e) {
                        setMessage((e as Error).message);
                    }
                }}
            >
                <label>
                    Email
                    <input
                        name="email"
                        type="email"
                        required
                        defaultValue={params.get("email") || ""}
                    />
                </label>
                {reset && (
                    <label>
                        New password
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={8}
                        />
                    </label>
                )}
                <button>{reset ? "Reset password" : "Send reset link"}</button>
                <p role="status">{message}</p>
                <a href="/login">Back to sign in</a>
            </form>
        </Shell>
    );
}
