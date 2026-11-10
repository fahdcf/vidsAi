import assert from 'node:assert/strict';

export function mockMotionProviders(graphic, { analystRecognizesLiquid = true, rejectReferenceOutline = false, rejectCopywriter = false, rejectGraphEngineer = false, rejectCritic = false, rejectCriticAfterRepair = false, rejectDetailVision = false, rejectSpec = false, referenceMapping = false, referenceFollowup = false, componentCompatibility = false, graphAssets } = {}) {
    const stages = [];
    const required = ["Slide a URL field into view", "Reveal a separate call-to-action button"];
    const labels = ["Get transcript", "Try it now"];
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
                const sampleTimes = prompt.includes("readable text and layout")
                    ? [times[0], ...(referenceMapping ? [times.find((time) => time >= 6)]
                        : [times.find((time) => time >= 10.35), times.find((time) => time >= 12.5)])].filter((time) => time !== undefined)
                    : [times[0]];
                value = { observations: sampleTimes.map((time) => ({ time, copy: null, layout: "Centered shapes", confidence: 0.8 })) };
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
                value = { scenes: referenceMapping ? [{ ...observed, end: 5 }, { ...observed, title: "Product", sample: 1 }] : liquid ? [
                    { ...observed, end: 10.35 },
                    { ...observed, title: "Liquid shapes", end: 12.5, type: "liquid",
                        palette: ["#ee426e", "#e35a9d", "#f487ad", "#2353ec"], sample: 1 },
                    { ...observed, title: "Closing card", type: "identity", sample: 2 },
                ] : [observed], unresolved: [] };
                break;
            }
            case "director":
                assert.ok(artifact.reference.observations.length);
                value = { title: "Motion study", summary: "A staged motion study.", look: "reference",
                    ...(referenceMapping ? { referenceIntent: "match", timingMode: "source" } : {}),
                    scenes: graphic.map(({ id, type, start_frame, end_frame }, index) => ({ id, type, start_frame, end_frame,
                        ...(referenceMapping ? { referenceSceneIndex: index } : {}),
                        purpose: componentCompatibility ? required[index] : type === "graph" ? "Show a URL field, transcript button, and animated text rows" : "Tell the story",
                        copy: componentCompatibility ? labels[index] : type === "graph" ? "Get transcript" : "" })) };
                if (stages.filter((stage) => stage === "director").length === 1) value = null;
                break;
            case "copywriter":
                if (componentCompatibility) {
                    assert.ok(artifact.storyboard.scenes.every(({ type }) => type === "graph"));
                    value = { decision: "Kept both labels verbatim.", scenes: labels.map((copy) => ({ copy, parts: [] })) };
                    break;
                }
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
                if (referenceFollowup) {
                    const [first, second] = artifact.scenes;
                    const { start, end } = second.sourceInterval;
                    value.requests = [
                        { sceneId: first.sceneId, time: end, reason: "This request is outside the assigned scene." },
                        { sceneId: first.sceneId, time: (first.sourceInterval.start + first.sourceInterval.end) / 2,
                            bounds: { left: 0.125, top: 0.25, width: 0.625, height: 0.5 }, reason: "Read the control label." },
                        { sceneId: second.sceneId, time: start + (end - start) * 0.7, reason: "Check the later layout." },
                    ];
                }
                break;
            case "visual-designer":
                assert.equal(artifact.referenceScenes.length, graphic.length);
                assert.ok(artifact.referenceScenes.some(({ evidence }) => evidence?.observations.length));
                assert.deepEqual(artifact.referenceSpecs.map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
                assert.ok(artifact.referenceSpecs.every(({ objects, events, uncertainties }) => rejectSpec
                    ? uncertainties.length > 0 : objects.length > 0 && events.length > 0));
                if (artifact.referenceFrames.length) {
                    assert.deepEqual(artifact.referenceFrames.filter(({ followup }) => !followup).map(({ sceneId }) => sceneId), graphic.map(({ id }) => id));
                    assert.equal(artifact.referenceFrames.filter(({ followup }) => followup).length, referenceFollowup ? 2 : 0);
                    assert.equal(message.length, artifact.referenceFrames.length + 1);
                    if (rejectDetailVision) { value = null; break; }
                } else assert.ok(rejectDetailVision);
                if (componentCompatibility) assert.deepEqual(artifact.components.map(({ type }) => type), ["impact", "identity"]);
                value = { decision: "Kept the warm palette.", scenes: graphic.map(({ palette, layout, font }, index) => ({
                    palette, layout, font, unsupported: componentCompatibility ? [required[index]] : [],
                })) };
                break;
            case "motion-engineer": {
                assert.equal(typeof artifact.approvedCopy, "string");
                assert.ok(artifact.reference?.observations.length);
                assert.equal(artifact.referenceSpec.sceneId, artifact.target.id);
                assert.ok(rejectSpec ? artifact.referenceSpec.uncertainties.length : artifact.referenceSpec.objects.length);
                if (artifact.referenceFrames.length) {
                    assert.ok(artifact.referenceFrames.every(({ sceneId }) => sceneId === artifact.target.id));
                    assert.equal(message.length, artifact.referenceFrames.length + 1);
                    assert.ok(!artifact.referenceFrames[0].crop);
                    const extra = artifact.referenceFrames.find(({ followup }) => followup);
                    if (referenceFollowup) assert.equal(extra?.followup, artifact.target.id === graphic[0].id ? "Read the control label." : "Check the later layout.");
                    else assert.equal(extra, undefined);
                    const initialCrop = artifact.referenceFrames.find(({ crop, followup }) => crop && !followup);
                    if (initialCrop) assert.equal(initialCrop.crop.width, 0.5);
                    if (rejectDetailVision) { value = null; break; }
                } else assert.ok(rejectDetailVision || (rejectGraphEngineer && artifact.target.type === "graph"));
                if (artifact.target.type === "graph") {
                    const index = graphic.findIndex(({ id }) => id === artifact.target.id);
                    assert.equal(artifact.approvedCopy, componentCompatibility ? labels[index] : "Get transcript");
                    if (componentCompatibility) assert.deepEqual(artifact.requiredCapabilities, [required[index]]);
                    value = rejectGraphEngineer ? { layers: [{ kind: "group" }], decision: "Invalid scene", approximation: null }
                        : { layers: [...(componentCompatibility ? [{ kind: "rect", x: 0.5, y: 0.5, width: 0.65, height: 0.15, color: "muted", reveal: 0.1 }] : []),
                            { kind: "text", text: artifact.approvedCopy, x: 0.5, y: 0.5, size: 0.08, maxWidth: 0.8, color: "foreground", reveal: 0.1 }],
                            decision: "Built the editable layout.", approximation: null };
                    if (graphAssets && index === 1) {
                        assert.deepEqual(artifact.availableAssets.map(({ id }) => id).sort(), Object.values(graphAssets).sort());
                        const root = (order, node) => ({ parentId: null, order, node });
                        const mask = [{ op: "M", x: -0.11, y: -0.12 }, { op: "L", x: 0.11, y: -0.12 },
                            { op: "L", x: 0.11, y: 0.12 }, { op: "L", x: -0.11, y: 0.12 }, { op: "Z" }];
                        value = { decision: "Built the reference CTA with an editable mask and owned artwork.", approximation: null,
                            composition: { version: 1, nodes: [
                                root(0, { id: "media", kind: "group", transform: { x: 0.25, y: 0.3 }, mask }),
                                { parentId: "media", order: 0, node: { id: "image", kind: "image", assetId: graphAssets.image, width: 0.3, height: 0.3 } },
                                root(1, { id: "vector", kind: "vector", assetId: graphAssets.vector, width: 0.3, height: 0.3, transform: { x: 0.75, y: 0.3 } }),
                                root(2, { id: "button", kind: "widget", variant: "button", width: 0.7, height: 0.15, color: "primary", label: artifact.approvedCopy, transform: { x: 0.5, y: 0.75 } }),
                                root(3, { id: "waveform", kind: "widget", variant: "waveform", width: 0.6, height: 0.14, color: "success", transform: { x: 0.5, y: 0.56 } }),
                            ] } };
                    }
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
                        ? [{ sceneId: graphic[0].id, frame: artifact.scenes[0].samples[0].frame, priority: "polish",
                            issue: componentCompatibility ? "The URL field enters too slowly" : "Impact settles early",
                            repair: componentCompatibility ? "Speed up the entrance" : "Move impact later" }]
                        : [], unresolved: [] };
                break;
            case "repair":
                value = componentCompatibility ? { decision: "Sped up the entrance.", approximation: null, scene: { ...artifact.scene, motionRate: 1.2 } }
                    : { decision: "Moved the impact later.", approximation: null,
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
