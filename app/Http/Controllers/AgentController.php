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

        return view('projects.editor', compact('project'));
    }

    /**
     * Handle a chat message.
     * POST /projects/{project}/chat
     * Body: { "message": "make subtitles bigger" }
     */
    public function chat(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $request->validate(['message' => 'required|string|max:500']);

        $editState = $project->fresh()->edit_state;

        if (empty($editState)) {
            return response()->json([
                'success' => false,
                'agent_reply' => 'No edit state found. Please complete scene generation first.',
            ], 422);
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
