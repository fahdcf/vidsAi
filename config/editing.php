<?php

return ['react_editor' => env('REACT_EDITOR', false), 'worker_url' => env('EDITING_WORKER_URL', env('VIDEO_RENDER_BASE_URL', 'http://127.0.0.1:5101')), 'agent_url'=>env('AGENT_WORKER_URL','http://127.0.0.1:5102'), 'worker_token' => env('WORKER_TOKEN'), 'render_deadline_seconds' => (int) env('RENDER_DEADLINE_SECONDS', 7200)];
