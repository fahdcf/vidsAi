<?php

$registry = json_decode(file_get_contents(base_path('nvidia/models.json')), true, 512, JSON_THROW_ON_ERROR);
$models = [];
foreach ($registry['models'] as $alias => $model) {
    $models[$model['catalogId']] = [
        'key' => env($model['credentialEnv']) ?: env('NVIDIA_API_KEY'),
        'model' => $model['apiModel'],
    ];
}
return [
    'enabled' => env('NVIDIA_PROVIDER_ENABLED', false),
    'endpoint' => env('NVIDIA_CHAT_ENDPOINT', 'https://integrate.api.nvidia.com/v1/chat/completions'),
    'timeout' => 35,
    'writing_models' => array_values(array_filter(array_map('trim', explode(',',
        env('NVIDIA_ROUTE_WRITING_PRIMARY', '').','.env('NVIDIA_ROUTE_WRITING_FALLBACKS', ''))))),
    'models' => $models,
];
