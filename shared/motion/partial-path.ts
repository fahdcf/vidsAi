import { lerp } from "./draw";
import type { MotionPath } from "./graph";

type Point = { x: number; y: number };
const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export function partialMotionPath(path: MotionPath, progress: number): MotionPath {
    if (progress >= 1) return path;
    let remaining = path.filter(({ op }) => op !== "M").length * progress;
    const output: MotionPath = [];
    let current: Point = { x: 0, y: 0 }, start = current;
    for (const command of path) {
        if (command.op === "M") {
            output.push(command);
            current = start = command;
        } else if (remaining <= 0) break;
        else if (remaining >= 1) {
            output.push(command);
            current = command.op === "Z" ? start : command;
            remaining--;
        } else {
            const t = remaining;
            if (command.op === "Q") {
                const control = { x: command.cx, y: command.cy };
                const a = mix(current, control, t), b = mix(control, command, t);
                output.push({ op: "Q", cx: a.x, cy: a.y, ...mix(a, b, t) });
            } else if (command.op === "C") {
                const c1 = { x: command.c1x, y: command.c1y }, c2 = { x: command.c2x, y: command.c2y };
                const a = mix(current, c1, t), b = mix(c1, c2, t), c = mix(c2, command, t);
                const d = mix(a, b, t), e = mix(b, c, t);
                output.push({ op: "C", c1x: a.x, c1y: a.y, c2x: d.x, c2y: d.y, ...mix(d, e, t) });
            } else output.push({ op: "L", ...mix(current, command.op === "Z" ? start : command, t) });
            break;
        }
    }
    return output;
}
