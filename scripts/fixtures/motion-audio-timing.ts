import { AudioBufferSource, BufferTarget, Output, WavOutputFormat } from "mediabunny";
import { analyzeMotionAudio } from "../../resources/js/editor/motion/audio-analysis";

export async function analyzeStereoRhythmFixture() {
    const sampleRate = 8000;
    const samples = new AudioBuffer({ length: sampleRate * 4, numberOfChannels: 2, sampleRate });
    const right = samples.getChannelData(1);
    for (let i = 0; i < right.length; i++) {
        const time = i / sampleRate;
        if (time >= 0.5 && time < 3.5 && time % 0.5 < 0.075) right[i] = 0.7 * Math.sin(time * 440 * Math.PI * 2);
    }
    const target = new BufferTarget();
    const output = new Output({ format: new WavOutputFormat(), target });
    const audio = new AudioBufferSource({ codec: "pcm-s16" });
    output.addAudioTrack(audio);
    await output.start();
    await audio.add(samples);
    await output.finalize();
    if (!target.buffer) throw new Error("The stereo fixture did not encode.");
    return analyzeMotionAudio(new Blob([target.buffer]), 4, AbortSignal.timeout(10000));
}
