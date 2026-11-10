import type { MotionDrawingContext } from "./registry";

export type TextBox = {
    x: number; y: number; width: number; height: number;
    maxSize: number; maxLines?: number; align?: "left" | "center" | "right";
    highlightLastWord?: string;
};

export function motionTextDirection(text: string): "rtl" | "ltr" {
    const firstLetter = text.match(/\p{Letter}/u)?.[0];
    return firstLetter && /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(firstLetter) ? "rtl" : "ltr";
}

function wrap(ctx: MotionDrawingContext, value: string, width: number) {
    const result: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
        const words = paragraph.trim().split(/\s+/);
        let line = "";
        for (const word of words) {
            const candidate = line ? line + " " + word : word;
            if (line && ctx.measureText(candidate).width > width) {
                result.push(line);
                line = word;
            } else line = candidate;
        }
        result.push(line);
    }
    return result;
}

export function fitMotionText(ctx: MotionDrawingContext, value: string, family: string, box: TextBox) {
    ctx.direction = motionTextDirection(value);
    const maxLines = box.maxLines ?? 3;
    const text = value.split(/\r?\n/).length > maxLines ? value.replace(/\r?\n/g, " ") : value;
    let lower = 0;
    let upper = box.maxSize;
    let lines: string[] = [];
    for (let attempt = 0; attempt < 16; attempt++) {
        const size = (lower + upper) / 2;
        ctx.font = `${size}px ${family}`;
        const fitted = wrap(ctx, text, box.width);
        if (fitted.length > maxLines || fitted.length * size * 1.17 > box.height ||
            fitted.some((line) => ctx.measureText(line).width > box.width)) {
            upper = size;
        } else {
            lower = size;
            lines = fitted;
        }
    }
    return { size: lower, lines, height: lower * 1.17 * lines.length };
}

export function drawMotionText(ctx: MotionDrawingContext, value: string, family: string, color: string | CanvasGradient, box: TextBox) {
    if (!value) return;
    ctx.save();
    try {
        const fitted = fitMotionText(ctx, value, family, box);
        if (!fitted.lines.length || fitted.size < 1) return;
        ctx.font = `${fitted.size}px ${family}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = box.align ?? "center";
        ctx.fillStyle = color;
        const x = box.x + (ctx.textAlign === "left" ? 0 : ctx.textAlign === "right" ? box.width : box.width / 2);
        const lineHeight = fitted.size * 1.17;
        for (const [index, line] of fitted.lines.entries()) {
            const y = box.y + (box.height - fitted.height) / 2 + (index + 0.5) * lineHeight;
            if (box.highlightLastWord && index === fitted.lines.length - 1 && ctx.direction === "ltr") {
                const match = /^(.*\s)(\S+)$/.exec(line);
                if (match) {
                    const width = ctx.measureText(line).width;
                    const left = ctx.textAlign === "left" ? x : ctx.textAlign === "right" ? x - width : x - width / 2;
                    ctx.textAlign = "left";
                    ctx.fillText(match[1], left, y);
                    ctx.fillStyle = box.highlightLastWord;
                    ctx.fillText(match[2], left + ctx.measureText(match[1]).width, y);
                    continue;
                }
            }
            ctx.fillText(line, x, y);
        }
    } finally {
        ctx.restore();
    }
}
