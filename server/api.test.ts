import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app } from "./app";
import { db, project, scenes } from "./database";
import { document } from "./document";
test("Node account, CSRF, ownership, private media and editing contracts", async () => {
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const address = server.address() as any;
    const base = `http://127.0.0.1:${address.port}`;
    const client = () => ({
        cookie: "",
        csrf: "",
        async call(url: string, body?: any, method = body ? "POST" : "GET") {
            const response = await fetch(base + url, {
                method,
                headers: {
                    ...(this.cookie ? { Cookie: this.cookie } : {}),
                    ...(body instanceof FormData
                        ? {}
                        : { "Content-Type": "application/json" }),
                    "X-CSRF-TOKEN": this.csrf,
                },
                body:
                    body === undefined
                        ? undefined
                        : body instanceof FormData
                          ? body
                          : JSON.stringify(body),
            });
            const cookie = response.headers.get("set-cookie");
            if (cookie) this.cookie = cookie.split(";")[0];
            return response;
        },
        async bootstrap() {
            const response = await this.call("/api/session");
            this.csrf = ((await response.json()) as any).csrf;
        },
    });
    const owner = client(),
        other = client();
    let ownerId: number | undefined, otherId: number | undefined;
    const password = "Node-test-" + crypto.randomUUID();
    let ownerPassword = password;
    try {
        await owner.bootstrap();
        assert.equal(
            (
                await fetch(base + "/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                })
            ).status,
            419,
        );
        const email = `node-${crypto.randomUUID()}@example.test`;
        assert.equal(
            (
                await owner.call("/register", {
                    name: "Node contract test",
                    email,
                    password,
                })
            ).status,
            200,
        );
        await owner.bootstrap();
        ownerId = ((await (await owner.call("/api/session")).json()) as any)
            .user.id;
        assert.equal(
            (await owner.call("/login", { email, password: "wrong-password" }))
                .status,
            422,
        );
        await other.bootstrap();
        assert.equal(
            (
                await other.call("/register", {
                    name: "Other account",
                    email: `node-${crypto.randomUUID()}@example.test`,
                    password,
                })
            ).status,
            200,
        );
        await other.bootstrap();
        otherId = ((await (await other.call("/api/session")).json()) as any)
            .user.id;
        const form = new FormData();
        for (const [k, v] of Object.entries({
            name: "Contract project",
            type: "product",
            category: "Test",
            description: "Hello world",
            language: "english",
            script_option: "paste",
            custom_script: "Hello world",
            voiceover_option: "upload",
            "video_format[0]": "16:9",
        }))
            form.append(k, v);
        const wav = Buffer.alloc(44 + 16000 * 4);
        wav.write("RIFF", 0);
        wav.writeUInt32LE(wav.length - 8, 4);
        wav.write("WAVEfmt ", 8);
        wav.writeUInt32LE(16, 16);
        wav.writeUInt16LE(1, 20);
        wav.writeUInt16LE(1, 22);
        wav.writeUInt32LE(16000, 24);
        wav.writeUInt32LE(32000, 28);
        wav.writeUInt16LE(2, 32);
        wav.writeUInt16LE(16, 34);
        wav.write("data", 36);
        wav.writeUInt32LE(wav.length - 44, 40);
        form.append("request_id", crypto.randomUUID());
        form.append(
            "voiceover_file",
            new Blob([new Uint8Array(wav)], { type: "audio/wav" }),
            "test.wav",
        );
        const created = await owner.call("/create", form);
        assert.equal(created.status, 201);
        const id = ((await created.json()) as any).project_id;
        const duplicate = await owner.call("/create", form);
        assert.equal(duplicate.status, 201);
        assert.equal((await duplicate.json() as any).project_id, id);
        assert.equal(db.prepare("SELECT COUNT(*) FROM node_jobs WHERE project_id=? AND task='generate'").pluck().get(id), 1);
        db.prepare("UPDATE node_jobs SET status='failed' WHERE project_id=? AND task='generate'").run(id);
        db.prepare("UPDATE projects SET status='failed' WHERE id=?").run(id);
        const generationRetry = await owner.call(`/projects/${id}/retry`, {});
        assert.equal(generationRetry.status, 200);
        assert.equal((await generationRetry.json() as any).redirect, `/processing/${id}`);
        assert.equal(db.prepare(
            "SELECT task FROM node_jobs WHERE project_id=? ORDER BY rowid DESC LIMIT 1",
        ).pluck().get(id), "generate");
        assert.equal(
            (await other.call(`/projects/${id}/edit-state`)).status,
            404,
        );
        assert.equal(
            (await other.call(`/projects/${id}/voiceover`)).status,
            404,
        );
        assert.equal(
            (await owner.call(`/projects/${id}/voiceover`)).status,
            200,
        );
        db.prepare(
            "INSERT INTO scenes(project_id,scene_number,script_text,video_url,duration_seconds,gemini_duration,start_time,end_time,type) VALUES(?,?,?,?,?,?,?,?,?)",
        ).run(
            id,
            1,
            "Hello world",
            "https://videos.pexels.com/test.mp4",
            10,
            2,
            0,
            2,
            "video",
        );
        const scene = scenes(id)[0];
        assert.equal(
            (
                await owner.call(`/review/${id}/confirm`, {
                    scenes: [
                        {
                            scene_id: scene.id,
                            video_url: scene.video_url,
                            start_time: 1,
                            end_time: 3,
                        },
                    ],
                })
            ).status,
            200,
        );
        let d = (
            (await (
                await owner.call(`/projects/${id}/edit-state`)
            ).json()) as any
        ).edit_state;
        assert.equal(d.tracks.video[0].trim_in, 30);
        const reconfirmed = await owner.call(`/review/${id}/confirm`, {
            scenes: [{
                scene_id: scene.id,
                video_url: scene.video_url,
                start_time: 1.5,
                end_time: 2,
            }],
        });
        assert.equal(reconfirmed.status, 200);
        const reopened = await owner.call(`/projects/${id}/edit-state`);
        assert.equal(reopened.status, 200);
        const reviewed = (await reopened.json() as any).edit_state;
        assert.deepEqual(reviewed.tracks.subtitles, d.tracks.subtitles);
        assert.deepEqual(reviewed.tracks.audio, d.tracks.audio);
        assert.equal(reviewed.tracks.video[0].trim_in, 45);
        assert.equal(reviewed.tracks.video[0].trim_out, 60);
        assert.equal(reviewed.total_frames, d.total_frames);
        d = reviewed;
        const command = {
            commandId: crypto.randomUUID(),
            expectedRevision: d.revision,
            operations: [
                { tool: "set_format", params: { width: 640, height: 360 } },
            ],
        };
        const saved = await owner.call(`/projects/${id}/commands`, command);
        assert.equal(saved.status, 200);
        const result = (await saved.json()) as any;
        assert.equal(
            (await owner.call(`/projects/${id}/commands`, command)).status,
            200,
        );
        assert.equal(
            (
                await owner.call(`/projects/${id}/commands`, {
                    ...command,
                    commandId: crypto.randomUUID(),
                })
            ).status,
            409,
        );
        assert.equal(result.edit_state.width, 640);
        assert.equal(
            (
                await owner.call(`/projects/${id}/restore-revision`, {
                    commandId: crypto.randomUUID(),
                    expectedRevision: result.revision,
                    restoreRevision: d.revision,
                })
            ).status,
            200,
        );
        const voiceoverPath = '/projects/' + id + '/voiceover';
        assert.equal((await owner.call(voiceoverPath)).status, 200);
        assert.equal((await other.call(voiceoverPath)).status, 404);
        assert.equal((await fetch(base + voiceoverPath)).status, 401);
        const invalidMedia = new FormData();
        invalidMedia.append(
            "file",
            new Blob(["not a video"], { type: "video/mp4" }),
            "invalid.mp4",
        );
        assert.equal(
            (await owner.call(`/projects/${id}/assets`, invalidMedia)).status,
            422,
        );
        const picture = new FormData();
        picture.append(
            "file",
            new Blob(
                [
                    new Uint8Array(
                        Buffer.from(
                            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
                            "base64",
                        ),
                    ),
                ],
                { type: "image/png" },
            ),
            "image.png",
        );
        const uploaded = await owner.call(`/projects/${id}/assets`, picture);
        assert.equal(uploaded.status, 200);
        const asset = (await uploaded.json()) as any;
        const assetPath = new URL(asset.url).pathname;
        assert.equal((await owner.call(assetPath)).status, 200);
        assert.equal((await other.call(assetPath)).status, 404);
        assert.equal(
            (
                await owner.call(`/review/${id}/confirm`, {
                    scenes: [
                        {
                            scene_id: scene.id,
                            video_url: asset.url,
                            start_time: 0,
                            end_time: 2,
                        },
                    ],
                })
            ).status,
            200,
        );
        d = document(project(id));
        assert.equal(d.tracks.video[0].clip_url, asset.url);
        assert.equal(d.tracks.video[0].media_type, "image");
        const stockFetch = globalThis.fetch;
        const stockKey = process.env.PEXELS_API_KEY;
        process.env.PEXELS_API_KEY = "test-stock-key";
        try {
            globalThis.fetch = async (url, options) =>
                String(url).includes("api.pexels.com/videos/search")
                    ? new Response(
                          JSON.stringify({
                              videos: [123, 456].map((id) => ({
                                  id,
                                  duration: 12,
                                  image: `https://images.pexels.com/videos/${id}/image.jpeg`,
                                  video_files: [
                                      {
                                          file_type: "video/mp4",
                                          height: 720,
                                          link: `https://videos.pexels.com/video-files/${id}/${id}.mp4`,
                                      },
                                  ],
                              })),
                          }),
                      )
                    : stockFetch(url, options);
            assert.equal(
                (
                    await owner.call(`/scenes/${scene.id}/regenerate-proxy`, {
                        keywords: ["bottle"],
                    })
                ).status,
                200,
            );
            assert.equal(
                scenes(id)[0].type,
                "video",
                "Regenerating a replacement image restores video playback",
            );
            assert.equal(scenes(id)[0].approved, 0);
            assert.ok(scenes(id)[0].thumbnail_path.includes("/123/"));
            assert.equal(
                (
                    await owner.call(`/scenes/${scene.id}/regenerate-proxy`, {
                        keywords: ["bottle"],
                    })
                ).status,
                200,
            );
            assert.ok(
                scenes(id)[0].video_url.includes("/456/"),
                "Find another clip excludes the current Pexels result",
            );
            d = document(project(id));
        } finally {
            globalThis.fetch = stockFetch;
            if (stockKey === undefined) delete process.env.PEXELS_API_KEY;
            else process.env.PEXELS_API_KEY = stockKey;
        }
        assert.equal(
            (
                await owner.call(`/projects/${id}/commands`, {
                    commandId: crypto.randomUUID(),
                    expectedRevision: d.revision,
                    operations: [{ tool: "invented_tool", params: {} }],
                })
            ).status,
            422,
        );
        const originalFetch = globalThis.fetch;
        const providerEnv = {
            NVIDIA_PROVIDER_ENABLED: "false",
            OPENROUTER_API_KEY: "test-key",
            OPENROUTER_BASE_URL: "https://planner.example.invalid/v1",
            OPENROUTER_MODELS: "test-model",
        };
        const savedProviderEnv = Object.entries(providerEnv).map(([key]) => [key, process.env[key]] as const);
        let planningCalls = 0;
        Object.assign(process.env, providerEnv);
        try {
            globalThis.fetch = async (url, options) => {
                if (String(url) !== "https://planner.example.invalid/v1/chat/completions") {
                    return originalFetch(url, options);
                }
                planningCalls++;
                await new Promise((resolve) => setTimeout(resolve, 100));
                return Response.json({
                    choices: [{ message: { content: JSON.stringify({
                        operations: [{ tool: "set_format", params: { width: 640, height: 360 } }],
                        reply: "Prepared",
                    }) } }],
                });
            };
            const cancelled = crypto.randomUUID();
            assert.equal(
                (
                    await owner.call(`/projects/${id}/agent-runs`, {
                        runId: cancelled,
                        message: "Make square",
                    })
                ).status,
                200,
            );
            assert.equal(
                (await other.call(`/projects/${id}/agent-runs/${cancelled}`))
                    .status,
                404,
            );
            assert.equal(
                (
                    await owner.call(
                        `/projects/${id}/agent-runs/${cancelled}`,
                        undefined,
                        "DELETE",
                    )
                ).status,
                200,
            );
            assert.equal(
                (
                    await owner.call(
                        `/projects/${id}/agent-runs/${cancelled}/execute`,
                        {},
                    )
                ).status,
                409,
            );
            const run = crypto.randomUUID();
            const proposals = await Promise.all(
                [1, 2].map(() => owner.call('/projects/' + id + '/agent-runs', {
                    runId: run,
                    message: "Resize",
                })),
            );
            assert.deepEqual(proposals.map((response) => response.status), [200, 200]);
            assert.equal(planningCalls, 2, "The cancelled run and repeated run each plan once");
            const executed = await owner.call(
                `/projects/${id}/agent-runs/${run}/execute`,
                {},
            );
            assert.equal(executed.status, 200);
            assert.equal(
                (
                    await owner.call(
                        `/projects/${id}/agent-runs/${run}/execute`,
                        {},
                    )
                ).status,
                200,
            );
            assert.equal(
                (
                    await owner.call(
                        `/projects/${id}/agent-runs/${run}`,
                        undefined,
                        "DELETE",
                    )
                ).status,
                409,
            );
        } finally {
            globalThis.fetch = originalFetch;
            for (const [key, value] of savedProviderEnv) {
                if (value === undefined) delete process.env[key];
                else process.env[key] = value;
            }
        }
        const beforeDuration = document(project(id));
        db.prepare("UPDATE projects SET voiceover_transcript=? WHERE id=?").run(
            JSON.stringify([{ word: "narration", start: 0, end: 20 }]),
            id,
        );
        assert.equal(
            document(project(id)).total_frames,
            beforeDuration.total_frames,
            "reading an existing document preserves its saved duration",
        );
        const shortened = await owner.call(`/projects/${id}/commands`, {
            commandId: crypto.randomUUID(),
            expectedRevision: beforeDuration.revision,
            operations: [
                {
                    tool: "set_duration",
                    params: { total_frames: 30, preserve_narration: false },
                },
            ],
        });
        assert.equal(shortened.status, 200);
        assert.equal(
            (
                (await (
                    await owner.call(`/projects/${id}/edit-state`)
                ).json()) as any
            ).edit_state.total_frames,
            30,
            "explicit shortening survives a subsequent read",
        );
        const requestId = crypto.randomUUID();
        const exported = await owner.call(`/projects/${id}/export`, { requestId });
        assert.equal(exported.status, 410);
        assert.equal(db.prepare("SELECT COUNT(*) FROM video_exports WHERE project_id=?").pluck().get(id), 0);
        assert.equal(db.prepare("SELECT COUNT(*) FROM node_jobs WHERE project_id=? AND task='render'").pluck().get(id), 0);
        const historicalWorkerId = crypto.randomUUID();
        const historicalDir = path.join(process.env.NODE_MEDIA_ROOT!, "historical");
        process.env.NODE_LEGACY_RENDER_OUTPUT_DIR = historicalDir;
        fs.mkdirSync(historicalDir, {recursive:true});
        fs.writeFileSync(path.join(historicalDir, historicalWorkerId + ".mp4"), "historical bytes");
        const historical = document(project(id));
        db.prepare("INSERT INTO video_exports(id,project_id,revision,snapshot,status,worker_job_id) VALUES(?,?,?,?,?,?)")
            .run(requestId, id, historical.revision, JSON.stringify(historical), "done", historicalWorkerId);
        const downloadPath = `/projects/${id}/exports/${requestId}/download`;
        assert.equal((await other.call(downloadPath)).status, 404);
        const oldFile = await owner.call(downloadPath);
        assert.equal(oldFile.status, 200);
        assert.equal(await oldFile.text(), "historical bytes");
        db.prepare("UPDATE video_exports SET status='failed' WHERE id=?").run(requestId);
        db.prepare("UPDATE projects SET status='failed' WHERE id=?").run(id);
        const beforeRetry = scenes(id);
        const retried = await owner.call(`/projects/${id}/retry`, {});
        assert.equal(retried.status, 200);
        assert.deepEqual(await retried.json(), { success: true, redirect: `/projects/${id}/editor` });
        assert.equal(db.prepare("SELECT COUNT(*) FROM video_exports WHERE project_id=?").pluck().get(id), 1);
        assert.deepEqual(scenes(id), beforeRetry);
        assert.equal(
            (
                await owner.call(
                    "/profile",
                    { name: "Updated account", email },
                    "PATCH",
                )
            ).status,
            200,
        );
        assert.equal(
            (
                await owner.call(
                    "/password",
                    {
                        current_password: "wrong",
                        password: "replacement-password",
                    },
                    "PUT",
                )
            ).status,
            422,
        );
        const replacement = "Changed-" + crypto.randomUUID();
        assert.equal(
            (
                await owner.call(
                    "/password",
                    { current_password: password, password: replacement },
                    "PUT",
                )
            ).status,
            200,
        );
        ownerPassword = replacement;
        assert.equal(
            (await owner.call("/login", { email, password: replacement }))
                .status,
            200,
        );
        await owner.bootstrap();
    } finally {
        if (ownerId)
            await owner.call("/profile", { password: ownerPassword }, "DELETE");
        if (otherId) await other.call("/profile", { password }, "DELETE");
        await new Promise<void>((resolve, reject) =>
            server.close((e) => (e ? reject(e) : resolve())),
        );
    }
});
