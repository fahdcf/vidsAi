import { clamp } from "./draw";

export type ContourPoint = [number, number];
const cells = [
    [], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2], [0, 1]], [[0, 2]], [[3, 2]],
    [[2, 3]], [[2, 0]], [[0, 3], [1, 2]], [[2, 1]], [[1, 3]], [[1, 0]], [[0, 3]], [],
];

// Marching squares. Shared grid-edge IDs connect segments without rounding their coordinates.
export function traceContours(values: Float32Array, width: number, height: number, threshold: number) {
    const points = new Map<number, ContourPoint>();
    const neighbors = new Map<number, number[]>();
    const stride = width * height;
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const i = y * width + x;
            const a = values[i], b = values[i + 1], c = values[i + width + 1], d = values[i + width];
            const mask = Number(a > threshold) | Number(b > threshold) << 1 | Number(c > threshold) << 2 | Number(d > threshold) << 3;
            if (mask === 0 || mask === 15) continue;
            const cross = (v: number, w: number) => clamp((threshold - v) / (w - v));
            const coords: ContourPoint[] = [
                [x + cross(a, b), y], [x + 1, y + cross(b, c)],
                [x + cross(d, c), y + 1], [x, y + cross(a, d)],
            ];
            const keys = [i, stride + i + 1, i + width, stride + i];
            for (const [edge1, edge2] of cells[mask]) {
                const left = keys[edge1], right = keys[edge2];
                points.set(left, coords[edge1]);
                points.set(right, coords[edge2]);
                for (const [from, to] of [[left, right], [right, left]]) {
                    const adjacent = neighbors.get(from) ?? [];
                    adjacent.push(to);
                    neighbors.set(from, adjacent);
                }
            }
        }
    }
    const visited = new Set<number>();
    const contours: ContourPoint[][] = [];
    for (const start of neighbors.keys()) {
        if (visited.has(start)) continue;
        const contour: ContourPoint[] = [];
        let current = start;
        let previous = -1;
        for (;;) {
            visited.add(current);
            const [x, y] = points.get(current)!;
            contour.push([x / (width - 1), y / (height - 1)]);
            const next = neighbors.get(current)?.find((value) => value !== previous);
            if (next === start && contour.length >= 3) {
                contours.push(contour);
                break;
            }
            if (next === undefined || visited.has(next)) break;
            previous = current;
            current = next;
        }
    }
    return contours;
}
