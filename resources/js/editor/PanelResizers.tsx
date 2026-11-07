import React, { useEffect, useRef } from "react";

const axes = ["chat", "tools", "timeline"] as const;
type Axis = (typeof axes)[number];

export default function PanelResizers() {
    const anchor = useRef<HTMLDivElement>(null);
    const drag = useRef<{ axis: Axis; start: number; value: number } | null>(null);
    const workspace = () => anchor.current!.parentElement!;
    const value = (axis: Axis) =>
        parseFloat(getComputedStyle(workspace()).getPropertyValue(`--${axis}-size`));

    function set(axis: Axis, size: number) {
        const el = workspace();
        const bounds = el.getBoundingClientRect();
        let otherPanelSize = 0;
        if (axis === "chat" && el.classList.contains("tools-open"))
            otherPanelSize = value("tools");
        if (axis === "tools" && el.classList.contains("assistant-open"))
            otherPanelSize = value("chat");
        const minimum = axis === "timeline" ? 140 : 240;
        const maximum = axis === "timeline"
            ? bounds.height - 210
            : bounds.width - otherPanelSize - 260;
        let property = `--${axis}-size`;
        if (axis === "chat")
            property = el.classList.contains("chat-wide")
                ? "--chat-wide-size"
                : "--chat-default-size";
        el.style.setProperty(property, `${Math.max(minimum, Math.min(maximum, size))}px`);
    }

    function reset(axis: Axis) {
        if (axis === "timeline") {
            set(axis, workspace().clientHeight * 0.32);
        } else if (axis === "chat") {
            set(axis, workspace().classList.contains("chat-wide") ? 400 : 310);
        } else {
            set(axis, 300);
        }
    }

    useEffect(() => {
        const el = workspace();
        el.style.setProperty(
            "--timeline-size",
            `${Math.min(300, Math.max(200, el.clientHeight * 0.32))}px`,
        );
        const observer = new ResizeObserver(() => {
            for (const axis of axes) {
                if (anchor.current?.querySelector(`.resize-${axis}`)?.getClientRects().length)
                    set(axis, value(axis));
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={anchor} className="panel-resizers">
            {axes.map((axis) => (
                <div
                    key={axis}
                    className={`panel-divider resize-${axis}`}
                    role="separator"
                    aria-label={`Resize ${axis}`}
                    aria-orientation={axis === "timeline" ? "horizontal" : "vertical"}
                    tabIndex={0}
                    title="Drag to resize. Arrow keys adjust. Double-click resets."
                    onDoubleClick={() => reset(axis)}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        drag.current = {
                            axis,
                            start: axis === "timeline" ? event.clientY : event.clientX,
                            value: value(axis),
                        };
                    }}
                    onPointerMove={(event) => {
                        const active = drag.current;
                        if (active?.axis !== axis) return;
                        const position = axis === "timeline" ? event.clientY : event.clientX;
                        const delta = position - active.start;
                        set(axis, active.value + (axis === "chat" ? delta : -delta));
                    }}
                    onPointerUp={() => { drag.current = null; }}
                    onPointerCancel={() => { drag.current = null; }}
                    onKeyDown={(event) => {
                        const increase = axis === "timeline" ? "ArrowUp"
                            : axis === "chat" ? "ArrowRight" : "ArrowLeft";
                        const decrease = axis === "timeline" ? "ArrowDown"
                            : axis === "chat" ? "ArrowLeft" : "ArrowRight";
                        if (event.key !== increase && event.key !== decrease) return;
                        event.preventDefault();
                        set(axis, value(axis) + (event.key === increase ? 20 : -20));
                    }}
                >
                    <span />
                </div>
            ))}
        </div>
    );
}
