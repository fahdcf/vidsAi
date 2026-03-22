<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Agent\IntentClassifier;
use App\Services\Agent\ToolRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AgentController extends Controller
{
    public function __construct(
        private ToolRegistry $toolRegistry,
        private IntentClassifier $intentClassifier,
    ) {}

    /**
     * Show the editor page.
     * Accessible from subtitle_selection status onward.
     * Rendering is NOT required - it is just the Export action.
     */
    public function editor(Project $project)
    {
        // Editor is accessible once scenes are confirmed
        // subtitle_selection = scenes confirmed, not yet rendered
        // subtitle_generating = rendering in progress
        // completed = render done, video ready
        $accessibleStatuses = [
            'subtitle_selection',
            'subtitle_generating',
            'completed',
        ];

        if (!in_array($project->status, $accessibleStatuses, true)) {
            return redirect()
                ->route('projects.review', $project)
                ->with('info', 'Please confirm your scenes first.');
        }

        // Build edit_state if it doesn't exist yet
        // (projects confirmed before EditStateBuilder was added)
        if (empty($project->edit_state)) {
            try {
                $editState = (new \App\Services\EditStateBuilder())->build($project);
                $project->update(['edit_state' => $editState]);
            } catch (\Exception $e) {
                Log::warning('[AgentController] Could not build edit_state: ' . $e->getMessage());
            }
        }

        // Inject selected_music into edit_state if not already there
        if (!empty($project->edit_state) && !empty($project->selected_music)) {
            $editState = $project->edit_state;
            $audioTracks = $editState['tracks']['audio'] ?? [];

            $hasMusicTrack = !empty(array_filter(
                $audioTracks,
                fn($t) => ($t['type'] ?? '') === 'music'
            ));

            if (!$hasMusicTrack) {
                $selectedMusic = $project->selected_music;
                if (is_string($selectedMusic)) {
                    $selectedMusic = json_decode($selectedMusic, true);
                }

                $musicUrl = null;
                if (!empty($selectedMusic)) {
                    if (isset($selectedMusic[0])) {
                        $musicUrl = $selectedMusic[0]['url']
                            ?? $selectedMusic[0]['preview_hq_mp3']
                            ?? $selectedMusic[0]['preview_lq_mp3']
                            ?? null;
                    } elseif (isset($selectedMusic['url'])) {
                        $musicUrl = $selectedMusic['url']
                            ?? $selectedMusic['preview_hq_mp3']
                            ?? $selectedMusic['preview_lq_mp3']
                            ?? null;
                    }
                }

                if ($musicUrl) {
                    $totalFrames = $editState['total_frames'] ?? 300;
                    $editState['tracks']['audio'][] = [
                        'id' => 'music',
                        'url' => $musicUrl,
                        'type' => 'music',
                        'start_frame' => 0,
                        'end_frame' => $totalFrames,
                        'volume' => 0.3,
                        'fade_in_frames' => 15,
                        'fade_out_frames' => 15,
                    ];
                    $editState['version'] = ($editState['version'] ?? 1) + 1;
                    $project->update(['edit_state' => $editState]);

                    Log::info('[AgentController] Injected selected_music into edit_state', [
                        'project_id' => $project->id,
                        'music_url' => $musicUrl,
                    ]);
                }
            }
        }

        return view('projects.editor', compact('project'));
    }

    /**
     * Save music selection from subtitle styles page.
     * Called when user clicks "Open Editor" so music persists
     * without requiring a full render trigger.
     *
     * POST /projects/{project}/save-music
     * Body: { "music_url": "...", "music_volume": 0.3, "music_name": "..." }
     */
    public function saveMusic(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $request->validate([
            'music_url' => 'nullable|string',
            'music_volume' => 'nullable|numeric|min:0|max:1',
            'music_name' => 'nullable|string|max:200',
        ]);

        $musicUrl = $request->input('music_url');
        $musicVolume = (float) ($request->input('music_volume', 0.3));
        $musicName = $request->input('music_name', '');

        if ($musicUrl) {
            $project->update([
                'selected_music' => [
                    ['url' => $musicUrl, 'volume' => $musicVolume, 'name' => $musicName]
                ],
            ]);

            // Also inject into edit_state immediately
            if (!empty($project->fresh()->edit_state)) {
                $editState = $project->fresh()->edit_state;
                $audioTracks = $editState['tracks']['audio'] ?? [];

                // Remove existing music track
                $editState['tracks']['audio'] = array_values(array_filter(
                    $audioTracks,
                    fn($t) => ($t['type'] ?? '') !== 'music'
                ));

                // Add new music track
                $editState['tracks']['audio'][] = [
                    'id' => 'music',
                    'url' => $musicUrl,
                    'type' => 'music',
                    'start_frame' => 0,
                    'end_frame' => $editState['total_frames'] ?? 300,
                    'volume' => $musicVolume,
                    'fade_in_frames' => 15,
                    'fade_out_frames' => 15,
                ];

                $editState['version'] = ($editState['version'] ?? 1) + 1;
                $editState['metadata']['last_modified'] = now()->toISOString();

                $project->update(['edit_state' => $editState]);

                Log::info('[AgentController] Music saved and injected into edit_state', [
                    'project_id' => $project->id,
                    'music_url' => $musicUrl,
                    'music_name' => $musicName,
                ]);
            }
        } else {
            // No music selected — clear it
            $project->update(['selected_music' => null]);
        }

        return response()->json([
            'success' => true,
            'editor_url' => route('projects.editor', $project),
            'music_saved' => (bool) $musicUrl,
        ]);
    }

    /**
     * Handle a chat message.
     * POST /projects/{project}/chat
     * Body: { "message": "make subtitles bigger" }
     */
    public function chat(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $request->validate([
            'message' => 'required|string|max:500',
            'order' => 'sometimes|array',
        ]);

        $editState = $project->fresh()->edit_state;

        if (empty($editState)) {
            return response()->json([
                'success' => false,
                'agent_reply' => 'No edit state found. Please complete scene generation first.',
            ], 422);
        }

        // Handle direct reorder from drag/drop (bypasses AI classification)
        if ($request->input('message') === '__reorder__') {
            $order = $request->input('order', []);
            if (!empty($order)) {
                try {
                    $updated = $this->toolRegistry->execute('reorder_scenes', ['order' => $order], $editState);
                    $project->update(['edit_state' => $updated]);
                    return response()->json(['success' => true, 'edit_state' => $updated]);
                } catch (\Exception $e) {
                    return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
                }
            }
        }

        // Classify intent
        $intent = $this->intentClassifier->classify(
            trim($request->input('message')),
            $editState
        );

        // No tool matched - return informational reply only
        if (empty($intent['tool'])) {
            return response()->json([
                'success' => true,
                'edit_state' => null,
                'agent_reply' => $intent['agent_reply'] ?? 'I\'m not sure how to help with that.',
                'tool_used' => null,
            ]);
        }

        // Execute tool
        try {
            $updated = $this->toolRegistry->execute(
                $intent['tool'],
                $intent['params'] ?? [],
                $editState
            );

            $project->update(['edit_state' => $updated]);

            Log::info('[AgentController] Tool executed', [
                'project_id' => $project->id,
                'tool' => $intent['tool'],
                'version' => $updated['version'] ?? null,
            ]);

            return response()->json([
                'success' => true,
                'edit_state' => $updated,
                'agent_reply' => $intent['agent_reply'] ?? 'Done.',
                'tool_used' => $intent['tool'],
                'params_used' => $intent['params'] ?? [],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'agent_reply' => 'I couldn\'t make that change: ' . $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('[AgentController] Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'agent_reply' => 'Something went wrong. Please try again.',
            ], 500);
        }
    }

    /**
     * Get current edit_state.
     * GET /projects/{project}/edit-state
     */
    public function getEditState(Project $project)
    {
        $this->authorize('view', $project);

        return response()->json([
            'edit_state' => $project->edit_state,
            'version' => $project->edit_state['version'] ?? 0,
            'status' => $project->status,
        ]);
    }

    /**
     * Trigger final render - this is the Export action.
     * Only available when edit_state exists.
     * POST /projects/{project}/export
     */
    public function export(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        if (empty($project->edit_state)) {
            return response()->json([
                'success' => false,
                'message' => 'No edit state to render.',
            ], 422);
        }

        if ($project->status === 'subtitle_generating') {
            return response()->json([
                'success' => false,
                'message' => 'A render is already in progress.',
            ], 422);
        }

        // Redirect to subtitle generation which triggers the render
        // This reuses the existing render pipeline
        return response()->json([
            'success' => true,
            'message' => 'Export started. You will be notified when complete.',
            'redirect_url' => route('projects.processing', $project),
        ]);
    }
}
