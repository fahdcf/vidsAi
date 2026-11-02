import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { app } from "./app";
import { db, project, scenes } from "./database";
import { document, renderSnapshot } from "./document";
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
        form.append(
            "voiceover_file",
            new Blob(["RIFFxxxxWAVEdata"], { type: "audio/wav" }),
            "test.wav",
        );
        const created = await owner.call("/create", form);
        assert.equal(created.status, 201);
        const id = ((await created.json()) as any).project_id;
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
        const snapshot = renderSnapshot(document(project(id)), project(id));
        assert.ok(snapshot.tracks.audio[0].url.includes("signature="));
        const url = new URL(snapshot.tracks.audio[0].url);
        assert.equal(
            (await fetch(base + url.pathname + url.search)).status,
            200,
        );
        assert.equal(
            (
                await fetch(
                    base +
                        url.pathname +
                        url.search.replace("signature=", "signature=bad"),
                )
            ).status,
            401,
        );
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
        try {
            globalThis.fetch = async (url, options) =>
                String(url).includes(":5212/agent/plan")
                    ? new Response(
                          JSON.stringify({
                              operations: [
                                  {
                                      tool: "set_format",
                                      params: { width: 640, height: 360 },
                                  },
                              ],
                              reply: "Prepared",
                              source: "test-model",
                          }),
                      )
                    : originalFetch(url, options);
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
            assert.equal(
                (
                    await owner.call(`/projects/${id}/agent-runs`, {
                        runId: run,
                        message: "Resize",
                    })
                ).status,
                200,
            );
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
        const exported = await owner.call(`/projects/${id}/export`, {
            requestId,
        });
        assert.equal(exported.status, 202);
        assert.equal(
            (
                (await (
                    await owner.call(`/projects/${id}/export`, { requestId })
                ).json()) as any
            ).export_id,
            requestId,
        );
        assert.equal(
            (await other.call(`/projects/${id}/exports/${requestId}`)).status,
            404,
        );
        assert.equal(
            (
                await owner.call(
                    `/projects/${id}/exports/${requestId}`,
                    undefined,
                    "DELETE",
                )
            ).status,
            200,
        );
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
