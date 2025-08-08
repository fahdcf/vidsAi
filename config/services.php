<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'n8n' => [
        'webhook_url' => env('N8N_WEBHOOK_URL'),
        'regenerate_url' => env('N8N_REGENERATE_URL', 'https://n8n-projects-production.up.railway.app/webhook-test/regenerate-scenes'),
        'voice_scenes_url' => env('N8N_VOICE_SCENES_URL', 'https://n8n-projects-production.up.railway.app/webhook-test/generate-scenes-from-voice'),
        'trim_scenes_url' => env('N8N_TRIM_SCENES_URL', 'https://n8n-projects-production.up.railway.app/webhook-test/trim-scenes'),
        'merge_subtitles_url' => env('N8N_MERGE_SUBTITLES_URL', 'https://n8n-projects-production.up.railway.app/webhook-test/merge-scenes-with-subtitles'),
    ],

    'freesound' => [
        'api_key' => env('FREESOUND_API_KEY'),
    ],

    // New services for workflow implementation
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY', 'AIzaSyDO6P2zGiIEhg2zhoKr1b_gMnOXH-CgL9k'),
        'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent'),
    ],

    'pexels' => [
        'api_key' => env('PEXELS_API_KEY', 'zXukdqhgYGWOiFYl5cJHEJ3s1DWMFQLc8UXolQxN73dyltqKgnmU2AD7'),
        'base_url' => env('PEXELS_BASE_URL', 'https://api.pexels.com/videos/search'),
    ],

    'deepgram' => [
        'api_key' => env('DEEPGRAM_API_KEY', 'bbb834ee2c7055e22a947593c4d00540d0490cde'),
        'base_url' => env('DEEPGRAM_BASE_URL', 'https://api.deepgram.com/v1/listen'),
    ],

    'video_trim' => [
        'base_url' => env('VIDEO_TRIM_BASE_URL', 'https://a812acd7984b.ngrok-free.app'),
        'trim_endpoint' => env('VIDEO_TRIM_ENDPOINT', '/trim'),
        'status_endpoint' => env('VIDEO_TRIM_STATUS_ENDPOINT', '/status'),
    ],

    'video_render' => [
        'base_url' => env('VIDEO_RENDER_BASE_URL', 'https://a2067b7cde75.ngrok-free.app'),
        'render_endpoint' => env('VIDEO_RENDER_ENDPOINT', '/render'),
        'status_endpoint' => env('VIDEO_RENDER_STATUS_ENDPOINT', '/status'),
    ],

];
