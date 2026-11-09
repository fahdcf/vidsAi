import assert from 'node:assert/strict';

export function mockMotionProviders(graphic) {
    const stages = [];
    const reasoning = "INTERNAL_MOCK_REASONING";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        if (String(input) !== "https://integrate.api.nvidia.com/v1/chat/completions") return originalFetch(input, init);
        const request = JSON.parse(init.body);
        const instruction = request.messages[0].content;
        const message = request.messages[1].content;
        const prompt = Array.isArray(message) ? message[0].text : message;
        const role = instruction.match(/^You are the VidsAI (.+?) specialist\./)?.[1] ?? "observe";
        stages.push(role);
        const artifact = role === "observe" ? null : JSON.parse(prompt).context.input;
        const choices = (delta, finish_reason = null) => ({ choices: [{ delta, finish_reason }] });
        let value;
        switch (role) {
            case "observe": {
                const times = JSON.parse(prompt.match(/at (\[.*?\]) seconds/)[1]);
                assert.ok(message.length > 1);
                value = { observations: [{ time: times[0], copy: null, layout: "Centered shapes", confidence: 0.8 }] };
                break;
            }
            case "reference-analyst":
                assert.ok(message.length > 1);
                value = { scenes: [{ title: "Intro", timing: artifact.interval, timingSource: "estimated", copy: null,
                    palette: ["#ee6633"], shapes: [], motionLandmarks: [], easing: null, transition: null,
                    evidence: [{ time: artifact.measured.timestamps[0], confidence: 0.8 }], supportedType: "impact",
                    approximation: null, confidence: 0.8 }], unresolved: [] };
                break;
            case "director":
                assert.ok(artifact.reference.observations.length);
                value = { title: "Motion study", summary: "A staged motion study.", look: "reference",
                    scenes: graphic.map(({ id, type, start_frame, end_frame }) => ({ id, type, start_frame, end_frame, purpose: "Tell the story", copy: "" })) };
                if (stages.filter((stage) => stage === "director").length === 1) value = null;
                break;
            case "copywriter":
                value = { decision: "Kept the opening and closing copy.", scenes: graphic.map((scene) =>
                    ({ id: scene.id, copy: scene.params.headline ?? scene.params.title ?? scene.params.heading ?? scene.params.words?.join(" ") ?? "" })) };
                break;
            case "visual-designer":
                value = { decision: "Kept the warm palette.", scenes: graphic.map(({ id, palette, layout, font }) => ({ id, palette, layout, font })) };
                break;
            case "motion-engineer":
                value = { decision: "Built the planned scene.", approximation: null, scene: graphic.find(({ id }) => id === artifact.target.id) };
                assert.equal(typeof artifact.approvedCopy, "string");
                break;
            case "visual-critic":
                assert.ok(message.length > 1 && artifact.frames.length >= graphic.length * 2);
                value = { decision: "Reviewed the browser frames.", scores: { readability: 5, hierarchy: 4, palette: 5, motion: 4, pacing: 4, brief: 5 },
                    issues: stages.filter((stage) => stage === "visual-critic").length === 1
                        ? [{ sceneId: graphic[0].id, frame: artifact.frames[0], priority: "polish", issue: "Impact settles early", repair: "Move impact later" }]
                        : [], unresolved: [] };
                break;
            case "repair":
                value = { decision: "Moved the impact later.", approximation: null,
                    scene: { ...artifact.scene, params: { ...artifact.scene.params, impactAt: 0.42 } } };
                break;
            default: throw new Error("Unexpected model role " + role);
        }
        const packets = [
            choices({ reasoning_content: reasoning }),
            choices({ content: value === null ? "{broken" : JSON.stringify(value) }, "stop"),
            { usage: { total_tokens: 600 } },
        ];
        return new Response(packets.map((packet) => "data: " + JSON.stringify(packet) + "\n\n").join("") + "data: [DONE]\n\n");
    };
    return { stages, reasoning, restore: () => { globalThis.fetch = originalFetch; } };
}
