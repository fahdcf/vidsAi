import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";
import { fail } from "./security";
export async function mediaDuration(filename: string, mime: string) {
    if (mime.startsWith("image/")) return null;
    const input = new Input({ source: new FilePathSource(filename), formats: ALL_FORMATS });
    try {
        const track = mime.startsWith("video/")
            ? await input.getPrimaryVideoTrack()
            : await input.getPrimaryAudioTrack();
        if (!track) throw new Error("Missing media track");
        const duration = await track.computeDuration({ metadataOnly: true });
        if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid duration");
        return duration;
    } catch {
        fail(
            422,
            "The uploaded media could not be read. Choose a valid video or audio file.",
        );
    } finally {
        input.dispose();
    }
}
