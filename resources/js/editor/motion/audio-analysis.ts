import { ADTS, AudioSampleSink, BlobSource, Input, MP3, MP4, WAVE } from "mediabunny";

export type AudioCue = { seconds: number; confidence: number; source: "detected" | "manual" };

export async function analyzeMotionAudio(source: Blob, seconds: number, signal: AbortSignal) {
    if (!(seconds > 0 && seconds <= 30) || !source.size || source.size > 10 * 1024 * 1024) {
        throw new Error("Audio analysis supports up to 30 seconds from a file of 10 MiB or less.");
    }
    signal.throwIfAborted();
    const input = new Input({ source: new BlobSource(source, { maxCacheSize: 1024 * 1024 }), formats: [WAVE, MP3, MP4, ADTS] });
    const dispose = () => input.dispose();
    signal.addEventListener("abort", dispose, { once: true });
    try {
        const track = await input.getPrimaryAudioTrack();
        if (!track || !await track.canDecode()) throw new Error("Choose readable MP3, WAV, or AAC audio.");
        const rate = await track.getSampleRate();
        if (!(rate > 0 && rate <= 48000)) throw new Error("Use audio sampled at 48 kHz or less.");
        const start = await track.getFirstTimestamp();
        const binSize = 0.025;
        const buckets = new Float64Array(Math.ceil(seconds / binSize));
        const counts = new Uint32Array(buckets.length);
        let duration = 0;
        for await (const sample of new AudioSampleSink(track).samples(start, start + seconds)) {
            try {
                signal.throwIfAborted();
                const pcm = new Float32Array(sample.numberOfFrames);
                sample.copyTo(pcm, { format: "f32-planar", planeIndex: 0 });
                for (let i = 0; i < pcm.length; i++) {
                    const time = sample.timestamp - start + i / sample.sampleRate;
                    const bucket = Math.floor(time / binSize);
                    if (bucket < 0 || bucket >= buckets.length) continue;
                    buckets[bucket] += pcm[i] * pcm[i];
                    counts[bucket]++;
                }
                duration = Math.min(seconds, Math.max(duration, sample.timestamp + sample.duration - start));
            } finally {
                sample.close();
            }
        }
        if (!duration) throw new Error("The audio file contained no samples.");
        const envelope = Array.from(buckets, (sum, index) => Math.sqrt(sum / Math.max(1, counts[index])));
        const peak = Math.max(...envelope);
        const cues: AudioCue[] = [];
        if (peak > 0.002) {
            for (let index = 0; index < envelope.length - 1; index++) {
                const previous = Math.max(envelope[index - 1] ?? 0, (envelope[index - 2] ?? 0) * 0.72);
                const rise = envelope[index] - previous;
                const time = index * binSize;
                if (rise < peak * 0.17 || envelope[index] < peak * 0.23 || time >= duration) continue;
                if (cues.length && time - cues.at(-1)!.seconds < 0.2) continue;
                cues.push({ seconds: Number(time.toFixed(3)), confidence: Math.min(1, rise / peak), source: "detected" });
                if (cues.length >= 40) break;
            }
        }
        return { duration, cues };
    } finally {
        signal.removeEventListener("abort", dispose);
        dispose();
    }
}
