import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomInt } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [corpus, runDirectory, baselineDirectory] = process.argv.slice(2);
if (!corpus || !runDirectory) throw new Error("Supply the reference corpus, run directory and optional matching baseline directory.");
const protocol = await readFile(new URL("../docs/MOTION_HELD_OUT_EVALUATION.json", import.meta.url));
const { cases, protocol: rubric } = JSON.parse(protocol);
const results = JSON.parse(await readFile(path.join(runDirectory, "results.json")));
const digest = (data) => createHash("sha256").update(data).digest("hex");
assert.equal(results.protocolSha256, digest(protocol), "The evaluation protocol changed.");
const { ffmpeg: tool } = JSON.parse(await readFile(new URL("../motion-toolchain.json", import.meta.url)));
const ffmpeg = process.env.MOTION_FFMPEG || path.resolve(import.meta.dirname, "../../runtime", tool.runtimePath);
const reviewDir = path.join(runDirectory, baselineDirectory ? "blind-review" : "review");
await mkdir(reviewDir);
const key = [];
for (const run of results.attempts) {
    if (!run.export) continue;
    const entry = cases.find(({ id }) => id === run.case);
    assert.ok(entry);
    const label = `${entry.id}-${run.attempt}`;
    const reference = path.resolve(corpus, `${entry.id}.mp4`);
    const generated = path.resolve(runDirectory, `${label}.mp4`);
    assert.equal(digest(await readFile(reference)), entry.sha256);
    assert.equal(digest(await readFile(generated)), run.export.sha256);
    const candidates = [{ kind: "vidsai", file: generated }];
    if (baselineDirectory) {
        const baseline = path.resolve(baselineDirectory, `${entry.id}.mp4`);
        const provenance = JSON.parse(await readFile(path.resolve(baselineDirectory, `${entry.id}.json`)));
        assert.equal(provenance.referenceSha256, entry.sha256, `Baseline reference mismatch for ${entry.id}.`);
        assert.equal(provenance.briefSha256, digest(entry.brief), `Baseline brief mismatch for ${entry.id}.`);
        assert.equal(provenance.outputSha256, digest(await readFile(baseline)), `Baseline output mismatch for ${entry.id}.`);
        candidates.push({ kind: "baseline", file: baseline, provenance });
        if (randomInt(2)) candidates.reverse();
    }
    const directory = path.join(reviewDir, label);
    await mkdir(directory);
    const media = [{ name: "source", file: reference }, ...candidates.map((item, index) =>
        ({ name: `candidate-${index + 1}`, file: item.file }))];
    for (const { name, file } of media) {
        await copyFile(file, path.join(directory, `${name}.mp4`));
        for (const [index, { seconds }] of entry.landmarks.entries()) {
            const sample = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-ss", String(seconds), "-i", file,
                "-frames:v", "1", "-threads", "1", path.join(directory, `${name}-frame-${index + 1}.png`)],
            { encoding: "utf8", windowsHide: true, timeout: 15_000 });
            assert.equal(sample.status, 0, sample.stderr);
        }
    }
    await writeFile(path.join(directory, "review.json"), JSON.stringify({
        brief: entry.brief, mustRead: entry.mustRead, landmarks: entry.landmarks, acceptance: rubric,
        reviewer: null, candidates: media.slice(1).map(({ name }) => ({ name,
            scores: Object.fromEntries(rubric.criteria.map((criterion) => [criterion, null])),
            evidence: [], editabilityEvidence: null, overallDecision: null })),
    }, null, 2));
    key.push({ label, order: candidates.map(({ kind, provenance }, index) => ({ name: `candidate-${index + 1}`, kind, provenance })) });
}
if (baselineDirectory && key.length) await writeFile(path.join(runDirectory, "review-key.json"), JSON.stringify(key, null, 2), { flag: "wx" });
console.log(JSON.stringify({ directory: reviewDir, comparableAttempts: key.length, totalAttempts: results.attempts.length }));
