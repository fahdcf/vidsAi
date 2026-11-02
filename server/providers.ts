import fs from "node:fs";
import path from "node:path";
import { root } from "./env";
const catalog = JSON.parse(
    fs.readFileSync(path.join(root, "nvidia/models.json"), "utf8"),
);
export async function request(
    url: string,
    init: RequestInit = {},
    timeout = 35000,
) {
    const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok)
        throw new Error(`Provider request failed (HTTP ${response.status})`);
    return response;
}
export async function modelCandidates(route: string) {
    return [
        process.env[`NVIDIA_ROUTE_${route}_PRIMARY`],
        ...(process.env[`NVIDIA_ROUTE_${route}_FALLBACKS`] || "").split(","),
    ]
        .filter(Boolean)
        .map((id) =>
            Object.values(catalog.models).find((m: any) => m.catalogId === id),
        )
        .filter(Boolean) as any[];
}
export async function modelJson(
    route: string,
    prompt: string,
    validate: (value: any) => void,
) {
    for (const model of await modelCandidates(route)) {
        const key =
            process.env[model.credentialEnv] || process.env.NVIDIA_API_KEY;
        if (!key) continue;
        try {
            const response = await request(
                process.env.NVIDIA_CHAT_ENDPOINT ||
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: model.apiModel,
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0,
                        max_tokens: 4000,
                        stream: false,
                        ...(model.catalogId.startsWith("nvidia/nemotron-")
                            ? {
                                  chat_template_kwargs: {
                                      enable_thinking: false,
                                  },
                              }
                            : {}),
                    }),
                },
            );
            const data = (await response.json()) as any;
            const text = data.choices?.[0]?.message?.content || "";
            const value = JSON.parse(
                text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""),
            );
            validate(value);
            return value;
        } catch {
            /* Invalid output advances to the next compatible model. */
        }
    }
    throw new Error("All configured language models failed. Please retry.");
}
export async function transcribe(filename: string) {
    for (const key of [
        process.env.DEEPGRAM_API_KEY,
        process.env.DEEPGRAM_FALLBACK_API_KEY,
    ].filter(Boolean)) {
        try {
            const response = await request(
                (process.env.DEEPGRAM_BASE_URL ||
                    "https://api.deepgram.com/v1/listen") +
                    "?smart_format=true&punctuate=true&detect_language=true",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Token ${key}`,
                        "Content-Type": filename.endsWith(".wav")
                            ? "audio/wav"
                            : "audio/mpeg",
                    },
                    body: fs.readFileSync(filename),
                },
                120000,
            );
            const data = (await response.json()) as any;
            const alternative = data.results?.channels?.[0]?.alternatives?.[0];
            if (alternative?.words?.length)
                return {
                    text: alternative.transcript,
                    words: alternative.words,
                };
        } catch {
            /* Try the separately configured backup key. */
        }
    }
    throw new Error(
        "No usable speech transcription. Check the recording and Deepgram configuration.",
    );
}
export async function stock(query: string, exclude: number[] = []) {
    const key = process.env.PEXELS_API_KEY;
    if (!key) throw new Error("Pexels is not configured");
    const url = new URL(
        process.env.PEXELS_BASE_URL || "https://api.pexels.com/videos/search",
    );
    url.search = new URLSearchParams({
        query,
        per_page: "15",
        orientation: "landscape",
    }).toString();
    const data = (await (
        await request(url.href, { headers: { Authorization: key } })
    ).json()) as any;
    const v =
        (data.videos || []).find((v: any) => !exclude.includes(v.id)) ||
        data.videos?.[0];
    if (!v) throw new Error("No stock video matched this scene");
    const files = v.video_files.filter((f: any) => f.file_type === "video/mp4");
    const file =
        files.find((f: any) => f.height === 720) ||
        files.find((f: any) => f.height === 1080) ||
        files[0];
    if (!file) throw new Error("No usable stock file");
    return { id: v.id, url: file.link, duration: v.duration };
}
export async function music(query: string, page = 1, limit = 12) {
    const key = process.env.FREESOUND_API_KEY;
    if (!key) throw new Error("FreeSound is not configured");
    const url = new URL("https://freesound.org/apiv2/search/text/");
    url.search = new URLSearchParams({
        query: query || "background music instrumental",
        page: String(page),
        page_size: String(Math.min(50, limit)),
        fields: "id,name,username,duration,previews,license",
        sort: "downloads_desc",
    }).toString();
    const data = (await (
        await request(url.href, { headers: { Authorization: `Token ${key}` } })
    ).json()) as any;
    return {
        success: true,
        total: data.count,
        tracks: data.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            artist: r.username,
            duration: r.duration,
            license: r.license,
            preview_url:
                r.previews["preview-hq-mp3"] || r.previews["preview-lq-mp3"],
        })),
    };
}
