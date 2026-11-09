import { motionComponentParams, type MotionSceneType } from "../../shared/motion/schema";

export function validCopyParts(type: MotionSceneType, parts: string[]) {
    switch (type) {
        case "impact": return parts.length >= 1 && parts.length <= 3 && parts.every(Boolean) && parts.join("\n").length <= 180;
        case "kinetic_words": return parts.length >= 1 && parts.length <= 12 && parts.every((part) => part.length >= 1 && part.length <= 50);
        case "easing": return parts.length === 4 && parts.every((part, index) => part.length >= 1 && part.length <= (index === 0 ? 180 : 32));
        case "identity": return parts.length === 3 && parts[0].length > 0 && parts[0].length <= 180 && parts[1].length <= 100 && parts[2].length <= 80;
        default: return parts.length === 0;
    }
}

const comparable = (text: string) => (text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).join(" ");
const easingDefaults = motionComponentParams.easing.parse({});

export function explicitCopyParts(type: MotionSceneType, copy: string, brief: string): string[] | undefined {
    const expected = comparable(copy);
    if (!validCopyParts(type, []) && expected) {
        for (const line of brief.split(/\r?\n/)) {
            const quotes = [...line.matchAll(/“([^”]+)”|"([^"\n]+)"/g)].map((match) => (match[1] ?? match[2]).trim());
            for (let start = 0; start < quotes.length; start++) {
                for (let end = start + 1; end <= Math.min(quotes.length, start + 12); end++) {
                    const literals = quotes.slice(start, end);
                    if (comparable(literals.join(" ")) !== expected) continue;
                    const parts = type === "easing" && literals.length === 3 ? [easingDefaults.heading, ...literals]
                        : type === "identity" && literals.length < 3 ? [literals[0], literals[1] ?? "", ""] : literals;
                    if (validCopyParts(type, parts)) return parts;
                }
            }
        }
    }
    return undefined;
}

export function storyboardCopyParts(type: MotionSceneType, planned: string, title: string): string[] {
    const copy = planned || title;
    const lines = copy.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    switch (type) {
        case "impact": return validCopyParts(type, lines) ? lines : [copy];
        case "identity": {
            const parts = [lines[0], lines[1] ?? "", lines[2] ?? ""];
            return lines.length <= 3 && validCopyParts(type, parts) ? parts : [copy, "", ""];
        }
        case "kinetic_words": {
            const phrases = copy.split(/[,\n]+/).map((phrase) => phrase.trim()).filter(Boolean);
            const words = phrases.length > 1 ? phrases : copy.split(/\s+/);
            return validCopyParts(type, words) ? words : (copy.replace(/\s+/g, " ").match(/\S.{0,49}(?=\s|$)|\S{1,50}/g) ?? [title]);
        }
        case "easing": {
            const labels = copy.split(/[,\n]+/).map((label) => label.trim()).filter(Boolean);
            const parts = labels.length === 3 ? [easingDefaults.heading, ...labels] : labels;
            if (validCopyParts(type, parts)) return parts;
            const defaultLabels = comparable(copy) === comparable(easingDefaults.labels.join(" "));
            return [planned && !defaultLabels ? planned : easingDefaults.heading, ...easingDefaults.labels];
        }
        default: return [];
    }
}
