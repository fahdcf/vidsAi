// These helpers run inside QuickJS alongside the base drawing commands. They have no host bindings.
export const motionSdkHelpers = {
    typeOn: {
        signature: "typeOn(text: string, progress: number): string",
        implementation: "(text, t) => { const letters = Array.from(text); return letters.slice(0, Math.floor(letters.length * clamp(t))).join(''); }",
    },
    mask: {
        signature: "mask(command: MotionCommand, points: readonly MotionPoint[]): MotionCommand",
        implementation: "(command, points) => ({ ...command, mask: points })",
    },
    gradient: {
        signature: "gradient(command: Exclude<MotionCommand, { kind: 'asset' }>, paint: MotionGradient): MotionCommand",
        implementation: "(command, paint) => ({ ...command, gradient: paint })",
    },
    spring: {
        signature: "spring(progress: number): number",
        implementation: "(t) => { const x = clamp(t); return x === 1 ? 1 : Math.min(1.15, 1 - Math.exp(-8 * x) * Math.cos(12 * x)); }",
    },
    cubic: {
        signature: "cubic(a: number, b: number, c: number, d: number, progress: number): number",
        implementation: "(a, b, c, d, t) => { const u = clamp(t), v = 1 - u; return v*v*v*a + 3*v*v*u*b + 3*v*u*u*c + u*u*u*d; }",
    },
    particles: {
        signature: "particles(id: string, count: number, x: number, y: number, progress: number, color: string): MotionCommand[]",
        implementation: `(id, count, x, y, t, color) => Array.from({ length: Math.min(24, Math.max(0, Math.floor(count))) }, (_, i) => {
            const angle = i * 2.3999632, distance = clamp(t) * (0.07 + (i % 5) * 0.035);
            return rect(id + '-' + i, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0.015, 0.015, color);
        })`,
    },
    waveform: {
        signature: "waveform(id: string, count: number, x: number, y: number, progress: number, color: string): MotionCommand[]",
        implementation: `(id, count, x, y, t, color) => {
            const bars = Math.min(24, Math.max(2, Math.floor(count)));
            return Array.from({ length: bars }, (_, i) => rect(id + '-' + i, x + 0.45 * (i / (bars - 1) - 0.5), y,
                0.02, 0.025 + 0.1 * Math.abs(Math.sin(1.37 * i + 19 * clamp(t))), color));
        }`,
    },
    chart: {
        signature: "chart(id: string, values: readonly number[], x: number, y: number, color: string): MotionCommand[]",
        implementation: `(id, values, x, y, color) => values.slice(0, 12).map((value, i) => {
            const height = 0.005 + 0.22 * clamp(value);
            return rect(id + '-' + i, x + 0.045 * i, y - height * 0.5, 0.05, height, color);
        })`,
    },
    button: {
        signature: "button(id: string, label: string, x: number, y: number, width: number, background: string, foreground: string): MotionCommand[]",
        implementation: `(id, label, x, y, width, background, foreground) => [rect(id + '-box', x, y, width, 0.15, background),
            text(id + '-label', label, x, y, 0.07, width * 0.75, foreground)]`,
    },
} as const;
