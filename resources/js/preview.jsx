import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Preview page entry point.
 * Loads the Remotion Player bundle dynamically and mounts it.
 * editState is injected by the Blade template via window.__EDIT_STATE__
 */
(async () => {
    try {
        const playerBundleUrl = '/js/remotion-player/vidsai-player.mjs';
        const { VideoPreviewPlayer } = await import(playerBundleUrl);

        const mount = document.getElementById('vidsai-preview-root');
        if (!mount) {
            console.error('VidsAI Preview: mount element #vidsai-preview-root not found');
            return;
        }

        const editState = window.__EDIT_STATE__ ?? null;
        const projectId = window.__PROJECT_ID__ ?? null;
        const projectName = window.__PROJECT_NAME__ ?? 'Project';

        if (!editState) {
            mount.innerHTML = '<div style="color:#475569;padding:40px;text-align:center;font-family:Arial">No preview available - complete video generation first.</div>';
            return;
        }

        const root = createRoot(mount);
        root.render(
            <React.Fragment>
                <VideoPreviewPlayer
                    editState={editState}
                    projectId={projectId}
                    projectName={projectName}
                />
            </React.Fragment>
        );
    } catch (err) {
        console.error('VidsAI Preview: failed to load player', err);
        const mount = document.getElementById('vidsai-preview-root');
        if (mount) {
            mount.innerHTML = '<div style="color:#ef4444;padding:40px;text-align:center;font-family:Arial">Preview failed to load. Check browser console for details.</div>';
        }
    }
})();
