import type { ReferenceAnalysis } from "../../shared/motion/reference";

type Observation = ReferenceAnalysis["observations"][number];
const normalizedCopy = (copy: string | null) => (copy ?? "").normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();

function sameCopy(first: string, second: string) {
    return first === second || Boolean(first && second &&
        (first.startsWith(second + " ") || second.startsWith(first + " ")));
}

export function observedSceneBoundaries(observations: readonly Observation[]) {
    const runs: { copy: string; first: number; last: number }[] = [];
    for (const observation of [...observations].sort((a, b) => a.time - b.time)) {
        const copy = normalizedCopy(observation.copy);
        if (observation.confidence < (copy ? 0.55 : 0.45)) continue;
        const previous = runs.at(-1);
        if (previous && observation.time - previous.last <= 1.5 && sameCopy(previous.copy, copy)) {
            previous.last = observation.time;
            if (copy.length > previous.copy.length) previous.copy = copy;
        } else runs.push({ copy, first: observation.time, last: observation.time });
    }

    const stable = runs.filter(({ first, last }) => last - first >= 0.25);
    return stable.flatMap((next, index) => {
        const previous = stable[index - 1];
        if (!previous || sameCopy(previous.copy, next.copy) || next.first - previous.last > 1.5) return [];
        return [(previous.last + next.first) / 2];
    });
}

export function sceneReferenceEvidence(reference: ReferenceAnalysis, target: { copy: string; start_frame: number; end_frame: number }, totalFrames: number) {
    const { interval, scenes, observations } = reference;
    const copy = normalizedCopy(target.copy);
    const byCopy = copy ? scenes.filter((scene) => normalizedCopy(scene.copy) && sameCopy(normalizedCopy(scene.copy), copy)) : [];
    const midpoint = interval ? interval.start + (interval.end - interval.start) *
        ((target.start_frame + target.end_frame) / 2 / totalFrames) : 0;
    const scene = byCopy.length === 1 ? byCopy[0] : scenes.find(({ timing }) => !timing ||
        (midpoint >= timing.start && midpoint < timing.end));
    if (!scene) return null;
    const times = new Set(scene.evidence.map(({ time }) => time));
    return { title: scene.title, timing: scene.timing, palette: scene.palette, landmarks: scene.motionLandmarks,
        observations: observations.filter(({ time }) => times.has(time)) };
}
