import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import type { Document } from "@vidsai/contracts";

export async function prepareBrowserAudio(editState: Document, signal: AbortSignal) {
    const tracks = [
        ...editState.tracks.audio.map((track) => ({ track, src: track.url })),
        ...editState.tracks.video
            .filter((clip) => clip.media_type === "video")
            .map((track) => ({ track, src: track.clip_url })),
    ].filter(({ track }) => track.volume > 0);
    const channelsBySource = new Map<string, number>();

    for (const { src } of tracks) {
        if (channelsBySource.has(src)) continue;
        signal.throwIfAborted();
        const input = new Input({
            formats: ALL_FORMATS,
            source: new UrlSource(src, {
                maxCacheSize: 1024 * 1024,
                parallelism: 1,
                getRetryDelay: () => null,
            }),
        });
        const dispose = () => input.dispose();
        signal.addEventListener("abort", dispose, { once: true });
        try {
            const audio = await input.getPrimaryAudioTrack();
            channelsBySource.set(src, audio ? await audio.getNumberOfChannels() : 0);
        } finally {
            signal.removeEventListener("abort", dispose);
            dispose();
        }
    }

    for (const { track, src } of tracks) {
        // The browser mixer duplicates mono at full amplitude. The server's
        // stereo conversion sends equal power to the left and right channels.
        if (channelsBySource.get(src) === 1) track.volume *= Math.SQRT1_2;
    }
}
