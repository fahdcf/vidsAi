import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, useDelayRender, useRemotionEnvironment } from "remotion";
import { drawMotionFrame } from "../motion/render";
import { prepareMotionSceneAssets } from "../motion/browser-assets";
import type { MotionAssetFiles } from "../motion/assets";
import type { MotionAudioAnalysis, MotionScene } from "../motion/schema";
import { soundtrackLevelAt } from "../motion/time-map";
import type { TimelineAudioItem } from "../timeline";

type Props = {
    scene: MotionScene;
    nextScene?: Extract<MotionScene, { type: "graph" }>;
    projectId: string;
    width: number;
    height: number;
    left: number;
    top: number;
    fps: number;
    scale: number;
    preloaded?: MotionAssetFiles;
    soundtrack?: TimelineAudioItem;
    audioAnalysis?: MotionAudioAnalysis;
};

export function MotionLayer({ scene, nextScene, projectId, width, height, left, top, fps, scale, preloaded, soundtrack, audioAnalysis }: Props) {
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
        const audioLevel = soundtrackLevelAt(scene.start_frame + last.current, fps, audioAnalysis, soundtrack);
        drawMotionFrame({ ctx, scene, nextScene, frame: last.current, fps, width: pixelWidth, height: pixelHeight, audioLevel }, ready.current);
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
    }, [frame, scene, nextScene, fps, pixelWidth, pixelHeight, soundtrack, audioAnalysis]);

    useLayoutEffect(() => {
        const target = canvas.current;
        if (!target) return;
        const lost = (event: Event) => {
            event.preventDefault();
            const message = "The browser graphics context was lost while drawing this scene.";
            if (isClientSideRendering) cancelRender(new Error(message));
            else setFailure(message);
        };
        const restored = () => {
            setFailure(undefined);
            draw();
        };
        target.addEventListener("contextlost", lost);
        target.addEventListener("contextrestored", restored);
        return () => {
            target.removeEventListener("contextlost", lost);
            target.removeEventListener("contextrestored", restored);
        };
    }, [scene, nextScene, fps, pixelWidth, pixelHeight, isClientSideRendering, cancelRender]);

    return (
        <>
            <canvas ref={canvas} width={pixelWidth} height={pixelHeight}
                style={{ position: "absolute", width, height, left, top, zIndex: 300 + scene.layer }} />
            {failure && <p role="alert" style={{ position: "absolute", zIndex: 400, color: "#fff", padding: 16 }}>{failure}</p>}
        </>
    );
}
