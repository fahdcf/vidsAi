<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class EditingWorker
{
    public function request(string $method, string $path, array $data = []): array
    {
        foreach ($data['command']['operations'] ?? [] as $i => $op) {
            if (($op['params'] ?? null) === []) {
                $data['command']['operations'][$i]['params'] = (object) [];
            }
        }
        $url = preg_match('#^/(render|status|downloads)#', $path) ? config('editing.worker_url') : config('editing.agent_url', config('editing.worker_url'));
        $response = Http::withToken((string) config('editing.worker_token'))->timeout(65)->acceptJson()->send($method, rtrim($url, '/').$path, ['json' => $data]);
        if (! $response->successful()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['worker' => $response->json('error') ?? 'Editing service unavailable.']);
        }

        return $response->json();
    }
}
