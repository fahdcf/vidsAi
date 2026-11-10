import type { MotionDrawingContext } from "./registry";
import { motionTextDirection, type TextBox } from "./text";

type Run = { text: string; family: string; weight?: number; style?: string; color: string | CanvasGradient };
type MeasuredRun = Run & { width: number };
type Line = { runs: MeasuredRun[]; width: number };

export function drawStyledMotionText(ctx: MotionDrawingContext, runs: readonly Run[], box: TextBox,
    lineHeight: number, outline?: { color: string; width: number }) {
    const tokens: { kind: "word" | "space" | "break"; runs: Run[] }[] = [];
    for (const run of runs) for (const text of run.text.match(/\r?\n|[^\S\r\n]+|\S+/gu) ?? []) {
        const kind = text.includes("\n") ? "break" : text.trim() ? "word" : "space";
        const last = tokens.at(-1);
        if (kind === "word" && last?.kind === "word") last.runs.push({ ...run, text });
        else tokens.push({ kind, runs: [{ ...run, text: kind === "space" ? " " : text }] });
    }
    const setFont = (run: Run, size: number) => { ctx.font = `${run.style ?? "normal"} ${run.weight ?? 400} ${size}px ${run.family}`; };
    const measure = (size: number) => {
        const lines: Line[] = [{ runs: [], width: 0 }];
        let space: MeasuredRun | undefined;
        for (const token of tokens) {
            let line = lines.at(-1)!;
            if (token.kind === "break") {
                lines.push({ runs: [], width: 0 });
                space = undefined;
                continue;
            }
            const measured = token.runs.map((run) => {
                setFont(run, size);
                return { ...run, width: ctx.measureText(run.text).width };
            });
            if (token.kind === "space") { space = measured[0]; continue; }
            const width = measured.reduce((sum, run) => sum + run.width, 0);
            if (line.runs.length && line.width + (space?.width ?? 0) + width > box.width) {
                line = { runs: [], width: 0 };
                lines.push(line);
            }
            if (line.runs.length && space) { line.runs.push(space); line.width += space.width; }
            line.runs.push(...measured);
            line.width += width;
            space = undefined;
        }
        return lines;
    };
    ctx.save();
    try {
        ctx.direction = motionTextDirection(runs.map(({ text }) => text).join(""));
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        let low = 0, high = box.maxSize;
        let lines: Line[] = [];
        for (let i = 0; i < 14; i++) {
            const size = (low + high) / 2;
            const candidate = measure(size);
            if (candidate.length > (box.maxLines ?? 3) || candidate.length * size * lineHeight > box.height ||
                candidate.some(({ width }) => width > box.width)) high = size;
            else { low = size; lines = candidate; }
        }
        if (low < 1) return;
        const spacing = low * lineHeight;
        const top = box.y + (box.height - lines.length * spacing) / 2;
        for (const [index, line] of lines.entries()) {
            let x = box.x + (box.align === "left" ? 0 : box.align === "right" ? box.width - line.width : (box.width - line.width) / 2);
            const y = top + (index + 0.5) * spacing;
            const ordered = ctx.direction === "rtl" ? [...line.runs].reverse() : line.runs;
            for (const run of ordered) {
                setFont(run, low);
                if (outline) {
                    ctx.strokeStyle = outline.color;
                    ctx.lineWidth = outline.width;
                    ctx.strokeText(run.text, x, y);
                }
                ctx.fillStyle = run.color;
                ctx.fillText(run.text, x, y);
                x += run.width;
            }
        }
    } finally { ctx.restore(); }
}
