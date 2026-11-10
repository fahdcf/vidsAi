import assert from "node:assert/strict";
import { test } from "node:test";
import { compileMotionPlan } from "../shared/motion/compile";
import { graphAuthoring, graphComposition, motionGraphVersion } from "../shared/motion/graph";
import { graphAnimation, sampleGraphAnimation } from "../shared/motion/graph-animation";
import { partialMotionPath } from "../shared/motion/partial-path";
import { motionComponentTypes, describeMotionComponent, motionSceneCost } from "../shared/motion/registry";
import { motionSceneSchema } from "../shared/motion/schema";
import { applyOperations } from "../shared/editing-core";
import { motionBenchmark, motionReferenceTimes } from "../scripts/fixtures/motion-benchmark";

test("motion benchmark uses the reference scene order and an exact 15-second timeline", () => {
    const document = motionBenchmark(true);
    assert.equal(document.total_frames, 450);
    assert.equal(document.tracks.motion_graphics.length, 7);
    assert.equal(motionReferenceTimes.length, 24);
    assert.deepEqual(compileMotionPlan({
        title: "Benchmark", scenes: document.tracks.motion_graphics,
    }, document), document);
});

test("registered component defaults form a valid bounded scene", () => {
    for (const type of motionComponentTypes) {
        const entry = describeMotionComponent(type);
        const scene = motionSceneSchema.parse({ id: type, type, componentVersion: entry.componentVersion,
            start_frame: 0, end_frame: 60, params: entry.defaults });
        const cost = motionSceneCost(scene);
        assert.ok(cost.geometry + cost.particles + cost.vectors > 0);
    }
});

test("motion edits preserve untouched scenes and reject invalid plans", () => {
    const document = motionBenchmark(false);
    const changed = applyOperations(document, [{ tool: "set_motion_text", params: { id: "gravity", text: "HELLO" } }]);
    assert.equal(changed.revision, document.revision + 1);
    assert.deepEqual(changed.tracks.motion_graphics.slice(1), document.tracks.motion_graphics.slice(1));
    assert.throws(() => applyOperations(document, [
        { tool: "set_motion_timing", params: { id: "gravity", start_frame: 99, end_frame: 102 } },
    ]));
});

test("one graph layer cannot conceal an over-budget path", () => {
    const commands = [{ op: "M", x: 0, y: 0 }, ...Array.from({ length: 1_000 }, () => ({ op: "L", x: 1, y: 1 }))];
    const graph = { id: "graph", type: "graph", componentVersion: 1, start_frame: 0, end_frame: 90,
        params: { layers: [{ id: "path", kind: "path", color: "primary", commands }] } };
    assert.equal(motionSceneSchema.safeParse(graph).success, false);
    graph.params.layers[0].commands = commands.slice(0, 96);
    assert.equal(motionSceneSchema.safeParse(graph).success, true);
    graph.params.layers = Array.from({ length: 5 }, (_, index) => ({ id: "path-" + index, kind: "path", color: "primary", commands: commands.slice(0, 96) }));
    assert.equal(motionSceneSchema.safeParse(graph).success, false);
});

test("flat graph records compile in paint order with local transforms and group clipping", () => {
    const mask = [{ op: "M", x: -0.2, y: -0.2 }, { op: "L", x: 0.2, y: -0.2 }, { op: "L", x: 0, y: 0.2 }, { op: "Z" }];
    const text = { id: "label", kind: "text", text: "START FREE", size: 0.08, transform: { x: 0.1, y: 0 } };
    const panel = { id: "panel", kind: "rect", width: 0.3, height: 0.15, color: "primary" };
    const group = { id: "button", kind: "group", transform: { x: 0.75, y: 0.7, rotation: 5 }, mask };
    const nodes = [{ parentId: "button", order: 1, node: text }, { parentId: null, order: 0, node: group },
        { parentId: "button", order: 0, node: panel }];
    const authored = graphAuthoring.parse({ version: motionGraphVersion, nodes });
    const saved = graphComposition.parse({ layers: [{ ...group, children: [panel, text] }] });
    assert.deepEqual(authored.layers, saved.layers);
    assert.equal(saved.version, undefined);
    assert.deepEqual(graphComposition.parse(JSON.parse(JSON.stringify(authored))), authored);
    assert.equal(graphComposition.safeParse({ ...authored, version: 2 }).success, false);
    assert.equal(graphAuthoring.safeParse({ version: 2, nodes }).success, false);
    for (const invalid of [
        [...nodes, nodes[0]],
        [{ ...nodes[0], parentId: "missing" }, ...nodes.slice(1)],
        [{ ...nodes[0], parentId: "panel" }, ...nodes.slice(1)],
        [{ ...nodes[0], order: 0 }, ...nodes.slice(1)],
        [nodes[0], { ...nodes[1], parentId: "another" }, nodes[2],
            { parentId: "button", order: 3, node: { id: "another", kind: "group" } }],
        [{ parentId: null, order: 0, node: group }],
    ]) assert.equal(graphAuthoring.safeParse({ version: motionGraphVersion, nodes: invalid }).success, false);
});

test("graph intervals hold at boundaries, permit independent overlap and keep spring values bounded", () => {
    const spec = [
        { property: "x", start: 0.25, end: 0.5, from: 0, to: 1 },
        { property: "opacity", start: 0.4, end: 0.6, from: 0, to: 1, ease: "spring" },
        { property: "x", start: 0.75, end: 1, from: 1, to: 0 },
    ];
    const animation = graphAnimation.parse(spec);
    assert.deepEqual(sampleGraphAnimation(animation, 0), { x: 0, opacity: 0 });
    assert.equal(sampleGraphAnimation(animation, 0.375).x, 0.5);
    assert.deepEqual(sampleGraphAnimation(animation, 0.625), { x: 1, opacity: 1 });
    assert.deepEqual(sampleGraphAnimation(animation, 0.875), { x: 0.5, opacity: 1 });
    assert.equal(graphAnimation.safeParse([...spec, { ...spec[0], start: 0.9, end: 1 }]).success, false);
    assert.equal(graphAnimation.safeParse([{ ...spec[1], to: 1.01 }]).success, false);
    assert.deepEqual(partialMotionPath([{ op: "M", x: 0, y: 0 }, { op: "Q", cx: 0.5, cy: 1, x: 1, y: 0 }], 0.5),
        [{ op: "M", x: 0, y: 0 }, { op: "Q", cx: 0.25, cy: 0.5, x: 0.5, y: 0.5 }]);
});
