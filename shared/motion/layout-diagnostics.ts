import type { LayoutBounds, MotionLayoutElement } from "./layout-measure";

export type LayoutFinding = { id: string; code: "off_canvas" | "clipped_text" | "occluded_text" | "low_contrast" | "missing_text" | "missing_asset"; detail: string };
const area = ({ left, top, right, bottom }: LayoutBounds) => Math.max(0, right - left) * Math.max(0, bottom - top);
const overlap = (a: LayoutBounds, b: LayoutBounds) => area({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });

function luminance(color: string | undefined) {
    if (!color || !/^#[a-f0-9]{6}$/i.test(color)) return undefined;
    const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function diagnoseMotionLayout(elements: readonly MotionLayoutElement[], width: number, height: number,
    options: { settled: boolean; requiredText?: readonly string[]; missingAssets?: readonly string[] }) {
    const findings: LayoutFinding[] = [];
    for (const id of options.missingAssets ?? []) findings.push({ id, code: "missing_asset", detail: "The linked asset could not load." });
    if (!options.settled) return findings;
    const canvas = { left: 0, top: 0, right: width, bottom: height };
    const opaque = elements.map((element, index) => ({ element, index })).filter(({ element }) =>
        element.kind === "shape" && element.filled && element.opacity >= 0.98 && luminance(element.color) !== undefined);
    elements.forEach((item, index) => {
        const boxArea = area(item.bounds);
        if (item.opacity < 0.8 || boxArea < 2) return;
        if (!item.clip && overlap(item.bounds, canvas) < boxArea * 0.85) {
            findings.push({ id: item.id, code: "off_canvas", detail: "The visible layer extends beyond the canvas." });
        }
        if (item.kind !== "text") return;
        if (item.clip && overlap(item.bounds, item.clip) < boxArea * 0.9) {
            findings.push({ id: item.id, code: "clipped_text", detail: "A clip cuts into the measured text bounds." });
        }
        const covers = opaque.filter(({ element }) => !element.clip && overlap(item.bounds, element.bounds) >= boxArea * 0.95);
        if (covers.some(({ index: paintIndex }) => paintIndex > index)) {
            findings.push({ id: item.id, code: "occluded_text", detail: "An opaque rectangle covers this text." });
            return;
        }
        const foreground = luminance(item.color), background = luminance(covers.filter(({ index: paintIndex }) => paintIndex < index).at(-1)?.element.color);
        if (foreground !== undefined && background !== undefined && (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05) < 3) {
            findings.push({ id: item.id, code: "low_contrast", detail: "Text contrast is below 3:1 on the measured solid background." });
        }
    });
    const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLocaleLowerCase();
    const visible = normalize(elements.filter(({ kind, opacity }) => kind === "text" && opacity >= 0.8).map(({ text }) => text).join(" "));
    for (const required of options.requiredText ?? []) {
        if (!visible.includes(normalize(required))) findings.push({ id: "scene", code: "missing_text", detail: `Expected text was absent: ${required}`.slice(0, 230) });
    }
    return findings.filter((item, index) => findings.findIndex(({ id, code }) => id === item.id && code === item.code) === index).slice(0, 8);
}
