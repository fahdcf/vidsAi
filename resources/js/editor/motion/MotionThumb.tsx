import { useEffect, useRef } from "react";
import { drawMotionFrame } from "../../../../shared/motion/render";
import { prepareMotionSceneAssets } from "../../../../shared/motion/browser-assets";
import type { MotionScene } from "./MotionSceneControls";

export default function MotionThumb({ scene, projectId, width, height, fps }: {
    scene: MotionScene; projectId: string; width: number; height: number; fps: number;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const scale = Math.min(1, 320 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    useEffect(() => {
        const target = canvas.current;
        if (!target) return;
        delete target.dataset.motionThumbnail;
        const abort = new AbortController();
        const render = () => {
            observer.disconnect();
            const context = target.getContext("2d");
            if (!context) return;
            const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(15_000)]);
            void prepareMotionSceneAssets(scene, projectId, signal).then((assets) => {
                try {
                    signal.throwIfAborted();
                    const frame = Math.floor((scene.end_frame - scene.start_frame - 1) * 0.66);
                    drawMotionFrame({ ctx: context, scene, frame, fps, width: w, height: h }, assets);
                    target.dataset.motionThumbnail = scene.id;
                } finally {
                    assets.release();
                }
            }).catch(() => {});
        };
        const observer = new IntersectionObserver((entries) => {
            if (entries.some(({ isIntersecting }) => isIntersecting)) render();
        }, { rootMargin: "160px" });
        observer.observe(target);
        return () => { observer.disconnect(); abort.abort(); };
    }, [scene, projectId, fps, w, h]);
    return <span className="media-thumb" aria-hidden="true"><canvas ref={canvas} width={w} height={h} /></span>;
}
