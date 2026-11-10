import { createHash } from "node:crypto";
import { SaxesParser } from "saxes";
import { motionVectorAsset, type MotionVectors } from "../../shared/motion/assets";
import { vectorPath, type MotionPath } from "../../shared/motion/graph";

const number = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`;
const pathToken = new RegExp(`${number}|[MLQCZ]`, "g");
const viewToken = new RegExp(number, "g");
const reject = () => { throw new Error("Use a static SVG with a viewBox and filled absolute M, L, Q, C and Z paths."); };

function parsePath(value: string, [left, top, width, height]: number[]): MotionPath {
    if (value.length > 12_000 || value.replace(pathToken, "").replace(/[\s,]/g, "")) return reject();
    const tokens = value.match(pathToken) ?? [];
    const commands: MotionPath = [];
    let current = "";
    for (let index = 0; index < tokens.length;) {
        if (/^[MLQCZ]$/.test(tokens[index])) current = tokens[index++];
        if (commands.length >= 96 || !current) return reject();
        if (current === "Z") { commands.push({ op: "Z" }); current = ""; continue; }
        const point = () => {
            const x = Number(tokens[index++]), y = Number(tokens[index++]);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return reject();
            return { x: (x - left) / width, y: (y - top) / height };
        };
        if (current === "M" || current === "L") {
            commands.push({ op: current, ...point() });
            current = "L";
        } else if (current === "Q") {
            const control = point();
            commands.push({ op: "Q", cx: control.x, cy: control.y, ...point() });
        } else {
            const first = point(), second = point();
            commands.push({ op: "C", c1x: first.x, c1y: first.y, c2x: second.x, c2y: second.y, ...point() });
        }
    }
    return vectorPath.parse(commands);
}

export function importMotionSvg(bytes: Buffer): MotionVectors {
    if (bytes.length > 64 * 1024) return reject();
    const parser = new SaxesParser();
    let depth = 0;
    let viewBox: number[] = [];
    const shapes: MotionVectors["frames"][number]["shapes"] = [];
    parser.on("doctype", reject);
    parser.on("processinginstruction", reject);
    parser.on("cdata", reject);
    parser.on("text", (text) => { if (text.trim()) reject(); });
    parser.on("opentag", ({ name, attributes }) => {
        depth++;
        if (depth === 1 && name === "svg") {
            if (Object.keys(attributes).some((key) => !["xmlns", "viewBox", "width", "height"].includes(key)) ||
                (attributes.xmlns && attributes.xmlns !== "http://www.w3.org/2000/svg")) return reject();
            const raw = attributes.viewBox ?? "";
            viewBox = (raw.match(viewToken) ?? []).map(Number);
            if (raw.replace(viewToken, "").replace(/[\s,]/g, "") || viewBox.length !== 4 ||
                viewBox.some((value) => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) return reject();
        } else if (depth === 2 && name === "path" && viewBox.length && shapes.length < 8) {
            if (Object.keys(attributes).some((key) => !["d", "fill", "opacity", "fill-opacity"].includes(key))) return reject();
            const fill = attributes.fill ?? "#000000";
            if (!/^#[0-9a-f]{6}$/i.test(fill)) return reject();
            const opacity = Number(attributes.opacity ?? "1"), fillOpacity = Number(attributes["fill-opacity"] ?? "1");
            if (![opacity, fillOpacity].every((value) => value >= 0 && value <= 1)) return reject();
            shapes.push({ path: parsePath(attributes.d ?? "", viewBox), fill, opacity: opacity * fillOpacity });
        } else return reject();
    });
    parser.on("closetag", () => { depth--; });
    parser.write(new TextDecoder("utf-8", { fatal: true }).decode(bytes)).close();
    return motionVectorAsset.parse({ version: 1, interpolate: false, sourceSha256: createHash("sha256").update(bytes).digest("hex"),
        frames: [{ at: 0, shapes }] });
}
