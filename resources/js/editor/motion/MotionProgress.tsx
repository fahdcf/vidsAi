import React, { useEffect, useState } from "react";
import Icon from "../Icon";
import type { MotionRunView } from "./chat-api";

export function motionStageName(name: string) {
    switch (name.split(":")[0]) {
        case "reference_capture": return "Browser reference sampling";
        case "reference_analysis": return "Reference analyst";
        case "trace": return "Browser shape tracing";
        case "director": return "Motion director";
        case "copy": return "Copywriter";
        case "design": return "Visual designer";
        case "engineer": return "Motion engineer";
        case "assemble": return "Timeline assembly";
        case "preview": return "Browser preview render";
        case "critique": return "Visual critic";
        case "repair": return "Scene repair";
        case "revise": return "Focused scene revision";
        case "publish": return "Save the draft";
        default: return "Motion stage";
    }
}

const statusText = {
    queued: "Queued", working: "Working", waiting_for_browser: "Waiting for the browser",
    ready: "Draft ready", failed: "Needs attention", cancelled: "Stopped",
};

export default function MotionProgress({ run, browserError }: { run: MotionRunView; browserError: string }) {
    const [now, setNow] = useState(Date.now());
    const current = run.stages.filter(({ status }) => status === "running");
    const running = current.length > 0;
    useEffect(() => {
        if (!running) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [running]);
    return <section className="panel motion-progress" aria-label="Workflow progress">
        <div className="motion-progress-head">
            <div><h2>Workflow</h2><p className="muted">{run.counts.complete} of {run.counts.total} planned steps complete</p></div>
            <span className={`status-pill ${run.status === "ready" ? "ready" : ""}`} role="status">{statusText[run.status]}</span>
        </div>
        {current.length > 0 && <ul className="motion-current-stages" aria-label="Current stages">
            {current.map(({ name, startedAt, activity }) => <li key={name}>
                <Icon name="sparkles" size={15} />
                <span>{motionStageName(name)}</span>
                {activity?.mode === "deep" && ["requesting", "responding"].includes(activity.state) &&
                    <span className="motion-thinking">Thinking · {activity.model.replaceAll("_", " ")}</span>}
                {startedAt && <span className="muted">{Math.max(0, Math.floor((now - startedAt) / 1000))}s</span>}
            </li>)}
        </ul>}
        {run.status === "waiting_for_browser" && <p className="muted">Keep this project open while your browser samples or renders frames.</p>}
        {browserError && <p className="notice warning" role="alert">{browserError}</p>}
        {run.stages.length > 0 && <details>
            <summary>All planned steps</summary>
            <ol>{run.stages.map(({ name, status, error }) => <li key={name}>
                {motionStageName(name)} <span className="muted">· {status}</span>{error && <p>{error}</p>}
            </li>)}</ol>
        </details>}
    </section>;
}
