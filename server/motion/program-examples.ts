import { motionSdkHelpers } from "../../shared/motion/scene-sdk";
import { motionProgramVersion, motionSdkModule } from "../../shared/motion/scene-program";

const rectPath = `[{ op: "M", x: -0.09, y: -0.09 }, { op: "L", x: 0.09, y: -0.09 }, { op: "L", x: 0.09, y: 0.09 }, { op: "L", x: -0.09, y: 0.09 }, { op: "Z" }]`;
const gradient = `{ x0: -0.1, y0: 0, x1: 0.1, y1: 0, stops: [{ at: 0, color: "#ff5566" }, { at: 1, color: "#5577ff" }] }`;

export const motionProgramExamples = [
    { id: "text-layout", helper: "text", body: `return [sdk.text("label", "MOTION", 0.5, 0.5, 0.1, 0.8, "#ffee99")];`,
        broken: ["0.1, 0.8", "0.1, 0"], failure: "A zero-width text box is rejected.", repair: "Give the text a positive width.", expected: "Centered light headline.", commands: 1 },
    { id: "type-reveal", helper: "typeOn", body: `return [sdk.text("label", sdk.typeOn("FRAME", 0.6), 0.5, 0.5, 0.1, 0.8, "#ffee99")];`,
        broken: ['"FRAME", 0.6', '"F".repeat(400), 1'], failure: "Text above 180 characters is rejected.", repair: "Keep the full source copy within the text limit.", expected: "The visible prefix reads FRA.", commands: 1 },
    { id: "vector-path", helper: "path", body: `return [sdk.path("shape", ${rectPath}, 0.5, 0.5, "#ff5566")];`,
        broken: ['op: "M"', 'op: "L"'], failure: "A path without an opening move is rejected.", repair: "Start the contour with M.", expected: "Filled red square.", commands: 1 },
    { id: "mask", helper: "mask", body: `return [sdk.mask(sdk.rect("clip", 0.5, 0.5, 0.5, 0.5, "#ff5566"), ${rectPath})];`,
        broken: ['op: "M"', 'op: "L"'], failure: "The clipping contour needs a move command.", repair: "Start the mask with M.", expected: "The square mask trims the red rectangle.", commands: 1 },
    { id: "gradient", helper: "gradient", body: `return [sdk.gradient(sdk.rect("panel", 0.5, 0.5, 0.3, 0.2, "#ff5566"), ${gradient})];`,
        broken: ["at: 1", "at: 0"], failure: "Duplicate stop positions are rejected.", repair: "Put distinct stops in ascending order.", expected: "A panel blends from red to blue.", commands: 1 },
    { id: "spring", helper: "spring", body: `return [sdk.rect("spring", 0.25 + 0.25 * sdk.spring(input.frame / input.fps), 0.5, 0.2, 0.2, "#ff5566")];`,
        broken: ["input.frame / input.fps", '"half"'], failure: "The compiler requires numeric progress.", repair: "Use elapsed frames divided by a numeric duration.", expected: "A red tile eases right with a small overshoot.", commands: 1 },
    { id: "curve", helper: "cubic", body: `return [sdk.rect("curve", sdk.cubic(0.2, 0.3, 0.7, 0.8, input.frame / input.fps), 0.5, 0.2, 0.2, "#ff5566")];`,
        broken: ["0.2, 0.3, 0.7, 0.8", "0.2, 0.3, 7, 8"], failure: "Large control values push a tile outside the coordinate range.", repair: "Use normalized control values.", expected: "A red tile follows the cubic position curve.", commands: 1 },
    { id: "particles", helper: "particles", body: `return sdk.particles("burst", 8, 0.5, 0.5, 0.6, "#ffee99");`,
        broken: ["return sdk.particles", "return [...sdk.particles"], failure: "An incomplete command array fails to compile.", repair: "Return the helper's complete command array.", expected: "Eight deterministic light particles.", commands: 8 },
    { id: "waveform", helper: "waveform", body: `return sdk.waveform("wave", 9, 0.5, 0.5, 0.6, "#33ee88");`,
        broken: ['"#33ee88"', '"lime"'], failure: "Named colors are outside the output contract.", repair: "Use a six-digit RGB hex color.", expected: "Nine varying green bars without audio input.", commands: 9 },
    { id: "chart", helper: "chart", body: `return sdk.chart("chart", [0.2, 0.55, 0.9], 0.4, 0.6, "#5577ff");`,
        broken: ["0.55", '"medium"'], failure: "Chart data must be numeric.", repair: "Supply normalized numeric values.", expected: "Three ascending blue bars.", commands: 3 },
    { id: "ui-button", helper: "button", body: `return sdk.button("cta", "Start free", 0.5, 0.5, 0.4, "#ff5566", "#101010");`,
        broken: ["0.5, 0.5, 0.4", "0.5, 0.5, 3"], failure: "A button wider than the output bounds is rejected.", repair: "Use a bounded normalized width.", expected: "A red CTA with a centered dark label.", commands: 2 },
] as const;

export function motionExampleSource(body: string) {
    return `import type { MotionFrameInput, MotionSceneSdk } from "${motionSdkModule}";\n` +
        `export function frame(input: MotionFrameInput, sdk: MotionSceneSdk) {\n    ${body}\n}`;
}

export function motionProgramAuthoringGuide() {
    return {
        version: motionProgramVersion, module: motionSdkModule,
        prompt: "Write one pure frame function. Use editable graph layers for ordinary layouts and keyframes. Use a TypeScript module for procedural commands. All coordinates are normalized, drawing order follows the returned array, and every command needs a stable unique ID. Read properties from input.properties and use only declared asset handles.",
        helpers: Object.values(motionSdkHelpers).map(({ signature }) => signature),
        examples: motionProgramExamples.map(({ id, helper, body, failure, repair, expected, broken: [from, to] }) => ({
            id, helper, expected, source: motionExampleSource(body), failure, failingSource: motionExampleSource(body.replace(from, to)), repair,
        })),
    };
}
