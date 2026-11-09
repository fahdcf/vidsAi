import React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoMerger } from "@vidsai/compositions";
import type { Document } from "@vidsai/contracts";

export default function MotionPreview({ draft, playerRef, label = "Draft preview", initialFrame }: {
    draft: Document; playerRef?: React.Ref<PlayerRef>; label?: string; initialFrame?: number;
}) {
    const maxWidth = Math.min(720, Math.round(420 * draft.width / draft.height));
    return <section className="panel motion-preview" aria-label={label}>
        <header><h2>{label}</h2><span className="muted">{(draft.total_frames / draft.fps).toFixed(1)}s</span></header>
        <Player ref={playerRef} component={VideoMerger}
            inputProps={{ editState: draft, motionScale: Math.min(1, 720 / Math.max(draft.width, draft.height)) }}
            durationInFrames={draft.total_frames} compositionWidth={draft.width} compositionHeight={draft.height}
            fps={draft.fps} initialFrame={initialFrame} controls style={{ width: "100%", maxWidth, aspectRatio: `${draft.width}/${draft.height}` }} />
    </section>;
}
