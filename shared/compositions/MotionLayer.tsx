import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, useDelayRender, useRemotionEnvironment } from "remotion";
import { drawMotionFrame } from "../motion/render";
import { prepareMotionSceneAssets } from "../motion/browser-assets";
import type { MotionAssetFiles } from "../motion/assets";
import type { MotionScene } from "../motion/schema";

type Props = {
    scene: MotionScene;
    projectId: string;
    width: number;
    height: number;
    left: number;
    top: number;
    fps: number;
    scale: number;
    preloaded?: MotionAssetFiles;
};

export function MotionLayer({ scene, projectId, width, height, left, top, fps, scale, preloaded }: Props) {
    const frame = useCurrentFrame();
    const { isClientSideRendering } = useRemotionEnvironment();
    const { delayRender, continueRender, cancelRender } = useDelayRender();
    const canvas = useRef<HTMLCanvasElement>(null);
    const ready = useRef<Awaited<ReturnType<typeof prepareMotionSceneAssets>> | null>(null);
    const last = useRef(frame);
    const [failure, setFailure] = useState<string>();
    const pixelWidth = Math.max(1, Math.round(width * scale));
    const pixelHeight = Math.max(1, Math.round(height * scale));

    function draw() {
        const target = canvas.current;
        const ctx = target?.getContext("2d");
        if (!target || !ctx || !ready.current) return;
        drawMotionFrame({ ctx, scene, frame: last.current, fps, width: pixelWidth, height: pixelHeight }, ready.current);
        target.dataset.motionFrame = String(last.current);
    }

    useLayoutEffect(() => {
        const abort = new AbortController();
        setFailure(undefined);
        const handle = isClientSideRendering ? delayRender(`Preparing motion scene ${scene.id}`) : null;
        let waiting = handle;
        function releaseHandle() {
            if (waiting !== null) continueRender(waiting);
            waiting = null;
        }
        void prepareMotionSceneAssets(scene, projectId, AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]), preloaded)
            .then((assets) => {
                if (abort.signal.aborted) {
                    assets.release();
                    return;
                }
                ready.current = assets;
                draw();
                releaseHandle();
            }).catch((error: unknown) => {
                if (abort.signal.aborted) return;
                if (isClientSideRendering) cancelRender(error instanceof Error ? error : new Error("Motion preparation failed."));
                else setFailure(error instanceof Error ? error.message : "Motion preparation failed.");
                releaseHandle();
            });
        return () => {
            abort.abort();
            ready.current?.release();
            ready.current = null;
            releaseHandle();
        };
    }, [scene, projectId, preloaded, pixelWidth, pixelHeight, fps, isClientSideRendering]);

    useLayoutEffect(() => {
        last.current = frame;
        draw();
    }, [frame, scene, fps, pixelWidth, pixelHeight]);

    return (
        <>
            <canvas ref={canvas} width={pixelWidth} height={pixelHeight}
                style={{ position: "absolute", width, height, left, top, zIndex: 300 + scene.layer }} />
            {failure && <p role="alert" style={{ position: "absolute", zIndex: 400, color: "#fff", padding: 16 }}>{failure}</p>}
        </>
    );
}
