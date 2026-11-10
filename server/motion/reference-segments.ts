import type { ReferenceAnalysis } from "../../shared/motion/reference";
import { referenceClock, referenceFrameAt, referenceTimeAt } from "../../shared/motion/time-map";
import type { MotionStoryboard } from "./agents";

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

type Target = MotionStoryboard["scenes"][number];
type OutputClock = Parameters<typeof referenceClock>[1];

export function sceneReferenceEvidence(reference: ReferenceAnalysis, target: Target, output: OutputClock) {
    if (target.referenceSceneIndex === null) return null;
    const { interval, scenes, observations } = reference;
    const copy = normalizedCopy(target.copy);
    const byCopy = copy ? scenes.filter((scene) => normalizedCopy(scene.copy) && sameCopy(normalizedCopy(scene.copy), copy)) : [];
    const midpoint = interval ? referenceTimeAt((target.start_frame + target.end_frame) / 2, referenceClock(interval, output)) : 0;
    const scene = target.referenceSceneIndex !== undefined ? scenes[target.referenceSceneIndex]
        : byCopy.length === 1 ? byCopy[0] : scenes.find(({ timing }) => !timing || (midpoint >= timing.start && midpoint < timing.end));
    if (!scene) return null;
    const times = new Set(scene.evidence.map(({ time }) => time));
    return { sourceSceneIndex: scenes.indexOf(scene), title: scene.title, timing: scene.timing, palette: scene.palette, landmarks: scene.motionLandmarks,
        observations: observations.filter(({ time }) => times.has(time) &&
            (!scene.timing || (time >= scene.timing.start && time <= scene.timing.end))) };
}

export function mapStoryboardToReference(storyboard: MotionStoryboard, reference: ReferenceAnalysis, output: OutputClock): MotionStoryboard {
    const referenceIntent = storyboard.referenceIntent ?? (storyboard.look === "reference" ? "match" : "inspired");
    const scenes = storyboard.scenes.map((scene) => ({ ...scene,
        referenceSceneIndex: sceneReferenceEvidence(reference, scene, output)?.sourceSceneIndex ?? null,
    }));
    const custom: MotionStoryboard = { ...storyboard, referenceIntent, timingMode: "custom", scenes };
    const { interval } = reference;
    if (!interval || referenceIntent !== "match" || storyboard.timingMode === "custom" || scenes.length !== reference.scenes.length ||
        !scenes.every(({ referenceSceneIndex }, index) => referenceSceneIndex === index)) return custom;

    const clock = referenceClock(interval, output);
    const ends = reference.scenes.map(({ timing }, index) => index === scenes.length - 1 ? output.total_frames
        : referenceFrameAt(timing!.end, clock, output.total_frames));
    if (ends.some((end, index) => end <= (ends[index - 1] ?? 0))) return custom;
    return { ...custom, timingMode: "source", scenes: scenes.map((scene, index) => ({
        ...scene, start_frame: ends[index - 1] ?? 0, end_frame: ends[index],
    })) };
}
