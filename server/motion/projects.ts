import { z } from "zod";
import { normalizeDocument } from "../../shared/contracts";
import { db, insert, now, update } from "../database";
import { fail, hash } from "../security";

const formats = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] } as const;
export const motionProjectInput = z.object({
    requestId: z.uuid(),
    name: z.string().trim().min(1).max(100),
    prompt: z.string().trim().min(1).max(4000),
    format: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
    seconds: z.number().int().min(5).max(15).default(15),
    language: z.string().trim().min(1).max(40).default("english"),
    type: z.enum(["product", "service"]).default("product"),
}).strict();

export function createMotionProject(accountId: number, value: unknown) {
    const input = motionProjectInput.parse(value);
    const digest = hash(JSON.stringify(input));
    return db.transaction(() => {
        const existing = db.prepare(
            "SELECT project_id,input_hash FROM motion_create_requests WHERE account_id=? AND request_id=?",
        ).get(accountId, input.requestId) as { project_id: number; input_hash: string } | undefined;
        if (existing) {
            if (existing.input_hash !== digest) fail(409, "This creation request was already used with different settings.");
            return existing.project_id;
        }
        const timestamp = now();
        const id = Number(insert("projects", {
            user_id: accountId,
            workflow: "motion_graphics",
            name: input.name,
            type: input.type,
            category: "Motion graphics",
            description: input.prompt,
            language: input.language,
            script_option: "generate",
            voiceover_option: "none",
            video_format: JSON.stringify([input.format]),
            status: "pending",
            created_at: timestamp,
            updated_at: timestamp,
        }));
        const [width, height] = formats[input.format];
        const fps = 30;
        const document = normalizeDocument({
            version: 1,
            project_id: String(id),
            fps,
            total_frames: input.seconds * fps,
            width,
            height,
            tracks: { video: [], subtitles: [], overlays: [], audio: [], motion_graphics: [] },
            metadata: {
                workflow: "motion_graphics",
                platform: null,
                language: input.language,
                created_at: timestamp,
                last_modified: timestamp,
            },
        });
        update("projects", id, { edit_state: JSON.stringify(document) });
        db.prepare("INSERT INTO motion_create_requests VALUES (?,?,?,?)")
            .run(accountId, input.requestId, id, digest);
        return id;
    }).immediate();
}
