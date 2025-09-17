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
        'api_key' => env('DEEPGRAM_API_KEY', '3d6ded8c284da3b52a2ac189d67157ea0c0f9f3a'),
        'fallback_api_key' => env('DEEPGRAM_FALLBACK_API_KEY', 'bbb834ee2c7055e22a947593c4d00540d0490cde'),
        'base_url' => env('DEEPGRAM_BASE_URL', 'https://api.deepgram.com/v1/listen'),
    ],

    // Optional Aeneas forced-alignment fallback via Docker
    'aeneas' => [
        'enabled' => env('AENEAS_ENABLED', true),
        // If Docker is not desired, use local Python runner
        'docker_image' => env('AENEAS_DOCKER_IMAGE', 'readbeyond/aeneas'),
        'python_path' => env('AENEAS_PYTHON_PATH', 'python'),
        'script_path' => env('AENEAS_SCRIPT_PATH', base_path('scripts/aeneas_align.py')),
        // Moroccan dialect optimization settings
        'moroccan_rhythm_profile' => env('MOROCCAN_RHYTHM_PROFILE', 'conservative'),
        'max_initial_pause' => env('MAX_INITIAL_PAUSE', 3.5),
                    'ffmpeg_path' => env('FFMPEG_PATH', base_path('storage/tools/ffmpeg/bin/ffmpeg.exe')),
            'ffprobe_path' => env('FFPROBE_PATH', base_path('storage/tools/ffmpeg/bin/ffprobe.exe')),
            // Multi-source transcription tools
            'whisper_cpp_path' => env('WHISPER_CPP_PATH', 'whisper'),
            'whisper_model_path' => env('WHISPER_MODEL_PATH', 'models/ggml-base.bin'),
            'coqui_tts_path' => env('COQUI_TTS_PATH', 'tts'),
    ],

    'video_trim' => [
        'base_url' => env('VIDEO_TRIM_BASE_URL', 'https://8d7efae734fa.ngrok-free.app'),
        'trim_endpoint' => env('VIDEO_TRIM_ENDPOINT', '/trim'),
        'status_endpoint' => env('VIDEO_TRIM_STATUS_ENDPOINT', '/status'),
    ],

    'video_render' => [
        'base_url' => env('VIDEO_RENDER_BASE_URL', 'http://localhost:5001'),
        'render_endpoint' => env('VIDEO_RENDER_ENDPOINT', '/render'),
        'status_endpoint' => env('VIDEO_RENDER_STATUS_ENDPOINT', '/status'),
    ],

    'wan_ai' => [
        'api_key' => env('WAN_AI_API_KEY'),
        'base_url' => env('WAN_AI_BASE_URL', 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'),
        'task_status_url' => env('WAN_AI_TASK_STATUS_URL', 'https://dashscope-intl.aliyuncs.com/api/v1/tasks'),
        'models' => [
            'wan2.2-t2v-plus' => [
                'name' => 'WAN 2.2 T2V Plus',
                'resolutions' => ['832*480', '480*832', '624*624', '1920*1080', '1080*1920', '1440*1440', '1632*1248', '1248*1632'],
                'default_resolution' => '1920*1080',
                'pricing' => ['480P: $0.02/second', '1080P: $0.10/second']
            ],
            'wan2.1-t2v-turbo' => [
                'name' => 'WAN 2.1 T2V Turbo',
                'resolutions' => ['832*480', '480*832', '624*624', '1280*720', '720*1280', '960*960', '1088*832', '832*1088'],
                'default_resolution' => '1280*720',
                'pricing' => ['480P: $0.036/second', '720P: $0.036/second']
            ],
            'wan2.1-t2v-plus' => [
                'name' => 'WAN 2.1 T2V Plus',
                'resolutions' => ['1280*720', '720*1280', '960*960', '1088*832', '832*1088'],
                'default_resolution' => '1280*720',
                'pricing' => ['720P: $0.10/second']
            ],
            'wan2.2-i2v-flash' => [
                'name' => 'WAN 2.2 I2V Flash',
                'resolutions' => ['832*480', '480*832', '624*624', '1280*720', '720*1280', '960*960', '1088*832', '832*1088'],
                'default_resolution' => '1280*720',
                'pricing' => ['480P: $0.015/second', '720P: $0.036/second']
            ],
            'wan2.2-i2v-plus' => [
                'name' => 'WAN 2.2 I2V Plus',
                'resolutions' => ['832*480', '480*832', '624*624', '1920*1080', '1080*1920', '1440*1440', '1632*1248', '1248*1632'],
                'default_resolution' => '1920*1080',
                'pricing' => ['480P: $0.02/second', '1080P: $0.10/second']
            ],
            'wan2.1-i2v-turbo' => [
                'name' => 'WAN 2.1 I2V Turbo',
                'resolutions' => ['832*480', '480*832', '624*624', '1280*720', '720*1280', '960*960', '1088*832', '832*1088'],
                'default_resolution' => '1280*720',
                'pricing' => ['480P: $0.036/second', '720P: $0.036/second']
            ],
            'wan2.1-i2v-plus' => [
                'name' => 'WAN 2.1 I2V Plus',
                'resolutions' => ['1280*720', '720*1280', '960*960', '1088*832', '832*1088'],
                'default_resolution' => '1280*720',
                'pricing' => ['720P: $0.10/second']
            ]
        ]
    ],

];
