import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { root, runtime } from "./env";
export async function alignScript(
    audio: string,
    script: string,
    language: string,
) {
    const folder = path.join(runtime, "node-alignments", crypto.randomUUID());
    fs.mkdirSync(folder, { recursive: true });
    const text = path.join(folder, "script.txt");
    const output = path.join(folder, "alignment.json");
    fs.writeFileSync(text, script);
    await promisify(execFile)(
        process.env.AENEAS_PYTHON_PATH || "python",
        [
            path.join(root, "scripts/aeneas_align.py"),
            "--audio",
            audio,
            "--text",
            text,
            "--lang",
            ["arabic", "moroccan"].includes(language) ? "ara" : "eng",
            "--out",
            output,
        ],
        { timeout: 120000, windowsHide: true, env: process.env },
    );
    const data = JSON.parse(fs.readFileSync(output, "utf8"));
    const words: any[] = [];
    for (const fragment of data.fragments || []) {
        const text = fragment.lines.join(" ");
        const tokens = text.split(/\s+/).filter(Boolean);
        const duration =
            (Number(fragment.end) - Number(fragment.begin)) / tokens.length;
        tokens.forEach((word: string, i: number) =>
            words.push({
                word,
                start: Number(fragment.begin) + i * duration,
                end: Number(fragment.begin) + (i + 1) * duration,
                confidence: 0,
            }),
        );
    }
    if (!words.length)
        throw new Error(
            "Local narration alignment did not return usable timing",
        );
    return { text: script, words, approximate: true };
}
