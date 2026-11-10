import assert from 'node:assert/strict';

export function mockMotionProviders(graphic, { analystRecognizesLiquid = true, rejectReferenceOutline = false, rejectCopywriter = false, rejectGraphEngineer = false, rejectCritic = false, rejectCriticAfterRepair = false, rejectDetailVision = false, rejectSpec = false } = {}) {
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
                const times = JSON.parse(prompt.match(/seconds: (\[.*?\])/)[1]);
                assert.ok(message.length > 1);
                value = { observations: [{ time: times[0], copy: null, layout: "Centered shapes", confidence: 0.8 }] };
                break;
            }
            case "reference-analyst": {
                assert.ok(artifact.observations.length > 0);
                if (rejectReferenceOutline) {
                    return new Response(`data: ${JSON.stringify(choices({ reasoning_content: reasoning }, "length"))}\n\ndata: [DONE]\n\n`);
                }
                const observed = { title: "Intro", type: "impact", end: null, sample: 0,
                    palette: ["#ee6633"], motion: null, approximation: null };
                const { start, end } = artifact.interval;
                const liquid = analystRecognizesLiquid && graphic.some(({ type }) => type === "liquid") && start < 10.35 && end > 12.5;
                value = { scenes: liquid ? [
                    { ...observed, end: 10.35 },
                    { ...observed, title: "Liquid shapes", end: 12.5, type: "liquid",
                        palette: ["#ee426e", "#e35a9d", "#f487ad", "#2353ec"] },
                    { ...observed, title: "Closing card", type: "identity" },
                ] : [observed], unresolved: [] };
                break;
            }
            case "director":
                assert.ok(artifact.reference.observations.length);
                value = { title: "Motion study", summary: "A staged motion study.", look: "reference",
                    scenes: graphic.map(({ id, type, start_frame, end_frame }) => ({ id, type, start_frame, end_frame,
                        purpose: type === "graph" ? "Show a URL field, transcript button, and animated text rows" : "Tell the story",
                        copy: type === "graph" ? "Get transcript" : "" })) };
                if (stages.filter((stage) => stage === "director").length === 1) value = null;
                break;
            case "copywriter":
                if (rejectCopywriter) { value = null; break; }
                value = { decision: "Kept the opening and closing copy.", scenes: graphic.map(({ type, params }) => {
                    const parts = type === "impact" ? params.headline.split("\n") : type === "kinetic_words" ? params.words
                        : type === "easing" ? [params.heading, ...params.labels] : type === "identity" ? [params.title, params.detail, params.tag] : [];
                    return { copy: parts.join(" "), parts };
                }) };
                break;
            case "reference-spec":
                assert.ok(message.length > 1 && artifact.contactSheetTiles.length);
                if (rejectSpec) { value = null; break; }
                value = { scenes: artifact.scenes.map(({ sceneId, evidence, sourceInterval }) => {
                    const first = evidence[0];
                    const next = evidence.find(({ time }) => time !== first?.time);
                    return { sceneId, objects: first ? [{ id: "primary-shape", label: "Visible shape",
                        bounds: { left: 0.25, top: 0.25, width: 0.5, height: 0.5 }, alignment: "center", layer: 1,
                        colorRole: "accent", color: "#ee6633", text: null, persistentKey: null, confidence: 0.8, evidenceIds: [first.id] }] : [],
                        events: sourceInterval && first && next ? [{ kind: "hold", objectId: "primary-shape", description: "Shape holds",
                            confidence: 0.8, evidenceIds: [first.id, next.id] }] : [], uncertainties: [] };
                }) };
                break;
            case "visual-designer":
                assert.equal(artifact.referenceScenes.length, graphic.length);
                assert.ok(artifact.referenceScenes.some(({ evidence }) => evidence?.observations.length));
                assert.deepEqual(artifact.referenceSpecs.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
                if (artifact.referenceFrames.length) {
                    assert.deepEqual(artifact.referenceFrames.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
                    assert.equal(message.length, graphic.length + 1);
                    if (rejectDetailVision) { value = null; break; }
                } else assert.ok(rejectDetailVision);
                value = { decision: "Kept the warm palette.", scenes: graphic.map(({ palette, layout, font }) => ({ palette, layout, font })) };
                break;
            case "motion-engineer": {
                assert.equal(typeof artifact.approvedCopy, "string");
                assert.ok(artifact.reference?.observations.length);
                assert.equal(artifact.referenceSpec.sceneId, artifact.target.id);
                if (artifact.referenceFrames.length) {
                    assert.ok(artifact.referenceFrames.every(({ sceneId }) => sceneId === artifact.target.id));
                    assert.equal(message.length, artifact.referenceFrames.length + 1);
                    assert.ok(!artifact.referenceFrames[0].crop);
                    if (artifact.referenceFrames.length === 2) assert.equal(artifact.referenceFrames[1].crop.width, 0.5);
                    if (rejectDetailVision) { value = null; break; }
                } else assert.ok(rejectDetailVision || (rejectGraphEngineer && artifact.target.type === "graph"));
                if (artifact.target.type === "graph") {
                    assert.equal(artifact.approvedCopy, "Get transcript");
                    value = rejectGraphEngineer ? { layers: [{ kind: "group" }], decision: "Invalid scene", approximation: null }
                        : { layers: [{ kind: "text", text: artifact.approvedCopy, x: 0.5, y: 0.5, size: 0.08,
                            maxWidth: 0.8, color: "foreground", reveal: 0.1 }], decision: "Built the editable layout.", approximation: null };
                    break;
                }
                const { params, finish, seed, motionRate, transitionIn } = graphic.find(({ id }) => id === artifact.target.id);
                value = { decision: "Built the planned scene.", approximation: null, scene: { params, finish, seed, motionRate, transitionIn } };
                break;
            }
            case "visual-critic":
                assert.equal(typeof message, "string");
                assert.ok(artifact.scenes.some(({ samples }) => samples.length));
                if (rejectCritic || (rejectCriticAfterRepair && stages.includes("repair"))) { value = null; break; }
                value = { decision: "Reviewed the browser frames.", scores: { readability: 5, hierarchy: 4, palette: 5, motion: 4, pacing: 4, brief: 5 },
                    issues: stages.filter((stage) => stage === "visual-critic").length === 1
                        ? [{ sceneId: graphic[0].id, frame: artifact.scenes[0].samples[0].frame, priority: "polish", issue: "Impact settles early", repair: "Move impact later" }]
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
