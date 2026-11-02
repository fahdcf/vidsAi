import fs from "node:fs";
import path from "node:path";
import { root } from "./env";
import { request } from "./providers";
export const wanModels = JSON.parse(
    fs.readFileSync(path.join(root, "server/wan-models.json"), "utf8"),
);
export function wanPayload(input: {
    model: string;
    resolution: string;
    prompt: string;
    image_url?: string;
}) {
    const model = wanModels[input.model];
    if (!model || !model.resolutions.includes(input.resolution))
        throw new Error("Unsupported WAN model or resolution");
    const image = input.model.includes("-i2v-");
    if (image && (!input.image_url || !input.image_url.startsWith("https://")))
        throw new Error(
            "Image-to-video requires a publicly reachable HTTPS image",
        );
    return {
        model: input.model,
        input: {
            prompt: input.prompt,
            negative_prompt:
                "text, logo, distortion, glitch, low quality, blurry",
            ...(image ? { img_url: input.image_url } : {}),
        },
        parameters: {
            size: input.resolution,
            prompt_extend: true,
            watermark: false,
        },
    };
}
export async function submitWan(input: Parameters<typeof wanPayload>[0]) {
    if (!process.env.WAN_AI_API_KEY)
        throw new Error("WAN AI is not configured");
    const response = await request(
        process.env.WAN_AI_BASE_URL ||
            "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.WAN_AI_API_KEY}`,
                "X-DashScope-Async": "enable",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(wanPayload(input)),
        },
    );
    const data = (await response.json()) as any;
    if (!data.output?.task_id) throw new Error("WAN did not return a task ID");
    return data.output.task_id as string;
}
export async function pollWan(task: string) {
    const response = await request(
        (process.env.WAN_AI_TASK_STATUS_URL ||
            "https://dashscope-intl.aliyuncs.com/api/v1/tasks") +
            "/" +
            encodeURIComponent(task),
        { headers: { Authorization: `Bearer ${process.env.WAN_AI_API_KEY}` } },
    );
    const data = (await response.json()) as any;
    if (data.output?.task_status === "FAILED")
        throw new Error("WAN generation failed");
    return data.output;
}
