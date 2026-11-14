import type { MotionDrawingContext, MotionFrame } from "./registry";
import { drawMotionFrame, type ReadyMotionAssets } from "./render";

type Point = { x: number; y: number };
export type LayoutBounds = { left: number; top: number; right: number; bottom: number };
export type MotionLayoutElement = { id: string; kind: "text" | "shape" | "image"; bounds: LayoutBounds;
    opacity: number; text?: string; fontSize?: number; font?: string; color?: string; clip?: LayoutBounds; filled?: boolean };

export function measureMotionFrame(frame: MotionFrame, assets: ReadyMotionAssets) {
    const target = frame.ctx;
    const elements: MotionLayoutElement[] = [];
    let elementId = frame.scene.id;
    let opacity = 1;
    let points: Point[] = [];
    let clipping: LayoutBounds | undefined;
    let filledRectangle = false;
    let solidCorners: Point[] | undefined;
    const savedClips: (LayoutBounds | undefined)[] = [];
    const bounds = (corners: readonly Point[]) => ({ left: Math.min(...corners.map(({ x }) => x)), top: Math.min(...corners.map(({ y }) => y)),
        right: Math.max(...corners.map(({ x }) => x)), bottom: Math.max(...corners.map(({ y }) => y)) });
    const point = (x: number, y: number) => target.getTransform().transformPoint({ x, y });
    const box = (x: number, y: number, w: number, h: number) => [point(x, y), point(x + w, y), point(x, y + h), point(x + w, y + h)];
    function record(kind: MotionLayoutElement["kind"], corners: readonly Point[], details?: Pick<MotionLayoutElement, "text" | "font" | "fontSize" | "filled">) {
        if (corners.length && elements.length < 1024 && target.globalAlpha > 0) {
            const color = typeof target.fillStyle === "string" ? target.fillStyle : undefined;
            elements.push({ id: elementId, kind, bounds: bounds(corners), opacity: target.globalAlpha * opacity, color, clip: clipping, ...details });
        }
    }
    const methods: Record<string, (...args: any[]) => unknown> = {
        save() { savedClips.push(clipping); target.save(); },
        restore() { if (savedClips.length) clipping = savedClips.pop(); target.restore(); },
        clip(path?: Path2D | CanvasFillRule, rule?: CanvasFillRule) {
            if (path instanceof Path2D) { target.clip(path, rule); return; }
            if (points.length) {
                const next = bounds(points);
                clipping = clipping ? { left: Math.max(clipping.left, next.left), top: Math.max(clipping.top, next.top),
                    right: Math.min(clipping.right, next.right), bottom: Math.min(clipping.bottom, next.bottom) } : next;
            }
            target.clip(path);
        },
        beginPath() { points = []; filledRectangle = false; solidCorners = undefined; target.beginPath(); },
        moveTo(x: number, y: number) { points.push(point(x, y)); target.moveTo(x, y); },
        lineTo(x: number, y: number) { points.push(point(x, y)); target.lineTo(x, y); },
        quadraticCurveTo(cx: number, cy: number, x: number, y: number) { points.push(point(cx, cy), point(x, y)); target.quadraticCurveTo(cx, cy, x, y); },
        bezierCurveTo(ax: number, ay: number, bx: number, by: number, x: number, y: number) {
            points.push(point(ax, ay), point(bx, by), point(x, y)); target.bezierCurveTo(ax, ay, bx, by, x, y);
        },
        rect(x: number, y: number, w: number, h: number) {
            filledRectangle = !points.length && !target.getTransform().b && !target.getTransform().c;
            points.push(...box(x, y, w, h)); target.rect(x, y, w, h);
        },
        roundRect(x: number, y: number, w: number, h: number, radius?: number) {
            filledRectangle = !points.length && !target.getTransform().b && !target.getTransform().c;
            const inset = Math.min(radius ?? 0, w / 2, h / 2);
            if (filledRectangle) solidCorners = box(x + inset, y, w - 2 * inset, h);
            points.push(...box(x, y, w, h)); target.roundRect(x, y, w, h, radius);
        },
        ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, ccw?: boolean) {
            const c = point(x, y), a = point(x + rx * Math.cos(rotation), y + rx * Math.sin(rotation));
            const b = point(x - ry * Math.sin(rotation), y + ry * Math.cos(rotation));
            const w = Math.hypot(a.x - c.x, b.x - c.x), h = Math.hypot(a.y - c.y, b.y - c.y);
            points.push({ x: c.x - w, y: c.y - h }, { x: c.x + w, y: c.y + h });
            target.ellipse(x, y, rx, ry, rotation, start, end, ccw);
        },
        arc(x: number, y: number, radius: number, start: number, end: number, ccw?: boolean) {
            points.push(...box(x - radius, y - radius, radius * 2, radius * 2)); target.arc(x, y, radius, start, end, ccw);
        },
        fill(path?: Path2D | CanvasFillRule, rule?: CanvasFillRule) {
            if (path instanceof Path2D) target.fill(path, rule);
            else {
                const filled = filledRectangle && points.length === 4;
                record("shape", filled && solidCorners ? solidCorners : points, { filled });
                target.fill(path);
            }
        },
        stroke(path?: Path2D) {
            if (path) target.stroke(path);
            else { record("shape", points); target.stroke(); }
        },
        fillRect(x: number, y: number, w: number, h: number) {
            record("shape", box(x, y, w, h), { filled: !target.getTransform().b && !target.getTransform().c });
            target.fillRect(x, y, w, h);
        },
        fillText(text: string, x: number, y: number, max?: number) {
            const m = target.measureText(text);
            const size = Number(/([\d.]+)px/.exec(target.font)?.[1] ?? 0);
            if (text.trim()) record("text", box(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent,
                m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent),
            { text, font: target.font, fontSize: size });
            target.fillText(text, x, y, max);
        },
        drawImage(image: CanvasImageSource, ...args: number[]) {
            if (args.length === 4 || args.length === 8) record("image", box(args.at(-4)!, args.at(-3)!, args.at(-2)!, args.at(-1)!));
            Reflect.apply(target.drawImage, target, [image, ...args]);
        },
    };
    const context = new Proxy(target, {
        get(canvas, key) {
            if (typeof key === "string" && Object.hasOwn(methods, key)) return methods[key];
            const value = Reflect.get(canvas, key, canvas);
            return typeof value === "function" ? value.bind(canvas) : value;
        },
        set(canvas, key, value) { return Reflect.set(canvas, key, value, canvas); },
    });
    drawMotionFrame({ ...frame, ctx: context, measureElement: (id, frameOpacity) => { elementId = id; opacity = frameOpacity; } }, { ...assets, measurePaths: true });
    return elements;
}

export function motionLayoutFrames(scene: MotionFrame["scene"]) {
    const span = scene.end_frame - scene.start_frame;
    if (span <= 48) return Array.from({ length: span }, (_, i) => i);
    const events = new Set<number>([0, span - 1, Math.round((span - 1) / 2)]);
    if (scene.transitionIn) events.add(scene.transitionIn.frames);
    if (scene.type === "graph") {
        const stack = [...scene.params.layers];
        function add(progress: number) {
            events.add(Math.round(Math.max(0, Math.min(1, progress)) ** (scene.motionRate ?? 1) * (span - 1)));
        }
        for (const node of stack) {
            for (const { at } of node.keyframes) add(at);
            for (const { start, end, ease, property } of node.animation ?? []) {
                add(start);
                add(end);
                if (ease === "spring") add(start + (end - start) * 0.2128);
                if (property === "deform") for (const phase of [0.125, 0.375, 0.625, 0.875]) add(phase);
            }
            if (node.kind === "group") stack.push(...node.children);
        }
        if (scene.params.continuity) events.add(span - scene.params.continuity.frames);
    }
    const ordered = [...events].sort((a, b) => a - b);
    return ordered.length <= 48 ? ordered : Array.from({ length: 48 }, (_, i) => ordered[Math.round(i * (ordered.length - 1) / 47)]);
}
