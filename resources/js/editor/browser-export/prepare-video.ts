import { BlobSource, Conversion, Input, MP4, Mp4OutputFormat, Output, StreamTarget } from "mediabunny";
import { browserRenderProfile } from "./profile";

export async function prepareHighFrameRateVideo(
    source: Blob,
    entry: FileSystemFileHandle,
    maxBytes: number,
    signal: AbortSignal,
) {
    const input = new Input({
        formats: [MP4],
        source: new BlobSource(source, { maxCacheSize: 1024 * 1024 }),
    });
    let file: FileSystemWritableFileStream | undefined;
    let conversion: Conversion | undefined;
    let cancellation: Promise<void> | undefined;
    const cancel = () => {
        if (conversion) cancellation = conversion.cancel().catch(() => {});
        input.dispose();
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
        signal.throwIfAborted();
        const writer = file = await entry.createWritable();
        const output = new Output({
            format: new Mp4OutputFormat({ fastStart: false }),
            target: new StreamTarget(new WritableStream({
                write({ position, data }) {
                    signal.throwIfAborted();
                    if (position + data.byteLength > maxBytes) {
                        throw new Error("The prepared video exceeds the browser export storage limit.");
                    }
                    return writer.write({ type: "write", position, data });
                },
                close: () => writer.close(),
                abort: () => writer.abort(),
            })),
        });
        conversion = await Conversion.init({
            input,
            output,
            trim: { start: 0 },
            video: { codec: "avc", frameRate: browserRenderProfile.maxFps, bitrate: 5_000_000 },
            showWarnings: false,
        });
        signal.throwIfAborted();
        if (!conversion.isValid || conversion.discardedTracks.length) {
            throw new Error("This browser could not prepare the high-frame-rate video.");
        }
        await conversion.execute();
        signal.throwIfAborted();
        return await entry.getFile();
    } catch (error) {
        await cancellation;
        await file?.abort().catch(() => {});
        throw error;
    } finally {
        signal.removeEventListener("abort", cancel);
        input.dispose();
    }
}
