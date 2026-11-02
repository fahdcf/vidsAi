import React, { useEffect, useLayoutEffect, useRef } from "react";
import type { Document, Operation } from "@vidsai/contracts";
import Icon from "./Icon";
import { operationSummary } from "./operationSummary";
export default function AssistantPanel({
    open,
    overlay,
    wide,
    onClose,
    onExpand,
    chat,
    message,
    onMessage,
    onSend,
    plan,
    onApply,
    onDiscard,
    onResume,
    canResume,
    busy,
    planning,
    applying,
    error,
    document: doc,
}: {
    open: boolean;
    overlay: boolean;
    wide: boolean;
    onClose: () => void;
    onExpand: () => void;
    chat: { role: string; text: string }[];
    message: string;
    onMessage: (text: string) => void;
    onSend: () => void;
    plan: any;
    onApply: () => void;
    onDiscard: () => void;
    onResume: () => void;
    canResume: boolean;
    busy: boolean;
    planning: boolean;
    applying: boolean;
    error: string;
    document: Document;
}) {
    const panel = useRef<HTMLElement>(null),
        conversation = useRef<HTMLDivElement>(null),
        input = useRef<HTMLTextAreaElement>(null);
    const hasPlan = Boolean(plan?.plan?.operations?.length);
    useLayoutEffect(() => {
        const log = conversation.current;
        if (log) log.scrollTop = log.scrollHeight;
    }, [chat, planning, hasPlan, open]);
    useEffect(() => {
        if (!open || !overlay) return;
        const previous = window.document.activeElement as HTMLElement;
        const overflow = window.document.body.style.overflow;
        window.document.body.style.overflow = "hidden";
        (input.current || panel.current?.querySelector("button"))?.focus({
            preventScroll: true,
        });
        return () => {
            window.document.body.style.overflow = overflow;
            previous?.focus({ preventScroll: true });
        };
    }, [open, overlay]);
    function keydown(e: React.KeyboardEvent) {
        if (!overlay) return;
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        }
        if (e.key === "Tab") {
            const items = Array.from(
                panel.current?.querySelectorAll<HTMLElement>(
                    "button:not(:disabled),textarea:not(:disabled),a[href]",
                ) || [],
            ).filter((el) => el.getClientRects().length);
            const first = items[0],
                last = items.at(-1);
            if (e.shiftKey && window.document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            } else if (!e.shiftKey && window.document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
    }
    return (
        <>
            {open && overlay && (
                <div
                    className="assistant-backdrop"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            <section
                ref={panel}
                className={`panel assistant assistant-panel ${hasPlan ? "has-proposal" : ""} ${overlay ? "assistant-overlay" : ""}`}
                hidden={!open}
                role={overlay ? "dialog" : undefined}
                aria-modal={overlay ? true : undefined}
                aria-label="Editing assistant"
                onKeyDown={keydown}
            >
                <header className="assistant-header">
                    <span className="assistant-avatar">
                        <Icon name="sparkles" size={20} />
                    </span>
                    <div>
                        <h2>Editing assistant</h2>
                        <p>
                            <span className="live-dot" />
                            {planning
                                ? "Preparing your edits…"
                                : applying
                                  ? "Applying changes…"
                                  : hasPlan
                                    ? "Ready for your approval"
                                    : "Let’s shape your story"}
                        </p>
                    </div>
                    <div className="assistant-window-actions">
                        {!overlay && (
                            <button
                                className="icon-button"
                                aria-label={
                                    wide ? "Narrow chat" : "Expand chat"
                                }
                                title={wide ? "Narrow chat" : "Expand chat"}
                                onClick={onExpand}
                            >
                                <Icon
                                    name={wide ? "arrowLeft" : "arrowRight"}
                                    size={17}
                                />
                            </button>
                        )}
                        <button
                            className="icon-button"
                            aria-label="Close assistant"
                            onClick={onClose}
                        >
                            <Icon name="close" size={17} />
                        </button>
                    </div>
                </header>
                <div
                    className="assistant-conversation"
                    ref={conversation}
                    role="log"
                    aria-label="Editing conversation"
                    aria-live="polite"
                    aria-relevant="additions text"
                >
                    {!chat.length && !hasPlan && (
                        <div className="assistant-welcome">
                            <span className="assistant-welcome-icon">
                                <Icon name="sparkles" size={27} />
                            </span>
                            <h3>What would you like to change?</h3>
                            <p>
                                Tell me your idea. I’ll prepare the edits for
                                you to review.
                            </p>
                            <div className="assistant-suggestions">
                                {[
                                    {
                                        label: "Make the captions stand out",
                                        text: "Make captions bigger",
                                    },
                                    {
                                        label: "Add smooth transitions",
                                        text: "Use fade transitions",
                                    },
                                    {
                                        label: "Turn the music down",
                                        text: "Lower music volume to 20 percent",
                                    },
                                ].map((item) => (
                                    <button
                                        key={item.text}
                                        disabled={busy}
                                        onClick={() => {
                                            onMessage(item.text);
                                            input.current?.focus();
                                        }}
                                    >
                                        {item.label}
                                        <Icon name="arrowRight" size={15} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {chat.map((item, i) => (
                        <article
                            className={`conversation-message ${item.role === "You" ? "from-user" : "from-assistant"}`}
                            key={i}
                        >
                            <div className="conversation-author">
                                {item.role === "You" ? (
                                    <Icon name="user" size={14} />
                                ) : (
                                    <Icon name="sparkles" size={14} />
                                )}
                                <strong>
                                    {item.role === "You" ? "You" : "VidsAI"}
                                </strong>
                            </div>
                            <p dir="auto">{item.text}</p>
                        </article>
                    ))}
                    {planning && (
                        <div className="assistant-thinking" role="status">
                            <span />
                            <span />
                            <span />
                            Preparing a proposal…
                        </div>
                    )}
                    {canResume && !plan && (
                        <button
                            className="full-width"
                            disabled={busy}
                            onClick={onResume}
                        >
                            <Icon name="refresh" />
                            Resume previous request
                        </button>
                    )}
                </div>
                {hasPlan && (
                    <section
                        className="assistant-review"
                        aria-label="Proposed edits"
                    >
                        <div className="assistant-review-heading">
                            <div>
                                <span className="eyebrow">YOUR APPROVAL</span>
                                <h3>Review the proposed edits</h3>
                            </div>
                            <span className="count-pill">
                                {plan.plan.operations.length}
                            </span>
                        </div>
                        <ol
                            className="assistant-change-list"
                            tabIndex={0}
                            aria-label="Proposed changes"
                        >
                            {plan.plan.operations.map(
                                (op: Operation, i: number) => (
                                    <li key={i}>
                                        <span>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <p>{operationSummary(op, doc.fps)}</p>
                                    </li>
                                ),
                            )}
                        </ol>
                        <div className="assistant-approval-actions">
                            <button
                                className="primary"
                                disabled={busy}
                                onClick={onApply}
                            >
                                <Icon name="check" size={17} />
                                {applying
                                    ? "Applying…"
                                    : `Apply ${plan.plan.operations.length} ${plan.plan.operations.length === 1 ? "change" : "changes"}`}
                            </button>
                            <button
                                className="ghost"
                                disabled={busy}
                                onClick={onDiscard}
                            >
                                Discard
                            </button>
                        </div>
                    </section>
                )}
                <div className="assistant-composer">
                    {error && (
                        <p className="assistant-error" role="alert">
                            {error}
                        </p>
                    )}
                    {hasPlan ? (
                        <p className="assistant-approval-hint">
                            Apply or discard this proposal to continue the
                            conversation.
                        </p>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                onSend();
                            }}
                        >
                            <label htmlFor="assistant-request">
                                Your request
                            </label>
                            <textarea
                                ref={input}
                                id="assistant-request"
                                rows={3}
                                value={message}
                                onChange={(e) => onMessage(e.target.value)}
                                placeholder="Describe the edit you have in mind…"
                                maxLength={2000}
                                disabled={planning || applying}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" &&
                                        (e.ctrlKey || e.metaKey)
                                    ) {
                                        e.preventDefault();
                                        if (!busy && message.trim()) onSend();
                                    }
                                }}
                            />
                            <div className="assistant-composer-actions">
                                <span>
                                    {hasPlan
                                        ? "Apply or discard your proposal first."
                                        : "You review every change."}
                                </span>
                                <button
                                    className="primary"
                                    disabled={
                                        busy || !message.trim() || hasPlan
                                    }
                                    type="submit"
                                >
                                    {planning ? "Preparing…" : "Prepare edits"}
                                    <Icon name="arrowRight" size={15} />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </>
    );
}
