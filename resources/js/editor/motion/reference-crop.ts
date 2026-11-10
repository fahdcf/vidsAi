import type { ReferenceCropBounds } from "../../../../shared/motion/browser-tools";

export function findReferenceCrop(source: CanvasImageSource): ReferenceCropBounds | undefined {
    const width = 96, height = 64;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(source, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const luminance = (x: number, y: number) => {
        const offset = (y * width + x) * 4;
        return 0.21 * data[offset] + 0.72 * data[offset + 1] + 0.07 * data[offset + 2];
    };
    let best: ReferenceCropBounds | undefined;
    let bestScore = 3;
    for (const top of [0, 0.25, 0.5]) {
        for (const left of [0, 0.25, 0.5]) {
            let edges = 0;
            for (let y = top * height + 1; y < (top + 0.5) * height; y++) {
                for (let x = left * width + 1; x < (left + 0.5) * width; x++) {
                    const center = luminance(x, y);
                    edges += Math.abs(center - luminance(x - 1, y)) + Math.abs(center - luminance(x, y - 1));
                }
            }
            const score = edges / (width * height / 4);
            if (score > bestScore) {
                best = { left, top, width: 0.5, height: 0.5 };
                bestScore = score;
            }
        }
    }
    return best;
}

export function referenceCropCanvas(width: number, height: number) {
    const scale = Math.min(1, 640 / Math.max(width, height));
    return new OffscreenCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
}
