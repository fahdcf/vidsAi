import { z } from "zod";
import type { Document } from "../../shared/contracts";
import { db } from "../database";
import { mediaFile } from "../jobs";
import { transcribe } from "../providers";
import type { MotionModelBudget } from "./budget";

const wordTiming = z.object({ start: z.number().min(0), end: z.number().min(0), confidence: z.number().min(0).max(1) });
export type SpeechSpan = { startFrame: number; endFrame: number; confidence: number };

export async function motionSpeechTiming(document: Document, budget: MotionModelBudget, signal: AbortSignal) {
    const track = document.tracks.audio.find(({ id }) => id === "motion-soundtrack");
    const id = track?.url.startsWith("asset:") ? track.url.slice(6) : null;
    const source = id ? db.prepare("SELECT path,mime,duration_seconds FROM project_assets WHERE id=? AND project_id=?")
        .get(id, document.project_id) as { path: string; mime: string; duration_seconds: number | null } | undefined : undefined;
    const unavailable = { spans: [] as SpeechSpan[], summary: "Speech timing was unavailable. The saved soundtrack cues are ready to use." };
    if (!track || !source?.mime.startsWith("audio/") || !source.duration_seconds ||
        source.duration_seconds > (track.end_frame - track.start_frame + 1) / document.fps) return unavailable;

    try {
        const attempt = budget.reserveModel(1, 1, "deepgram");
        try {
            const { words } = await transcribe(mediaFile(source.path, "private"), {
                mime: source.mime, signal, timeoutMs: Math.min(attempt.timeoutMs, 25_000), maxAttempts: 1,
            });
            const spans: SpeechSpan[] = [];
            for (const candidate of Array.isArray(words) ? words.slice(0, 400) : []) {
                const word = wordTiming.safeParse(candidate);
                if (!word.success || word.data.end <= word.data.start || word.data.confidence < 0.5) continue;
                const startFrame = track.start_frame + Math.floor(word.data.start * document.fps);
                const endFrame = Math.min(track.end_frame, track.start_frame + Math.ceil(word.data.end * document.fps));
                if (endFrame <= startFrame) continue;
                const previous = spans.at(-1);
                if (previous && startFrame <= previous.endFrame + Math.round(document.fps * 0.35)) {
                    previous.endFrame = Math.max(previous.endFrame, endFrame);
                    previous.confidence = Math.min(previous.confidence, word.data.confidence);
                } else if (spans.length < 24) spans.push({ startFrame, endFrame, confidence: word.data.confidence });
            }
            return spans.length ? { spans, summary: `Aligned ${spans.length} spoken phrases to the soundtrack.` } : unavailable;
        } finally { attempt.release(2); }
    } catch {
        signal.throwIfAborted();
        return unavailable;
    }
}
