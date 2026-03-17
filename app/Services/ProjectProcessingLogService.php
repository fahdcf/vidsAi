<?php

namespace App\Services;

class ProjectProcessingLogService
{
    private const MAX_LIMIT = 400;

    public static function write(
        int $projectId,
        string $message,
        array $context = [],
        string $source = 'system',
        string $level = 'info'
    ): void {
        try {
            if ($level === 'info') {
                $level = self::inferLevel($message, $context);
            }

            $logDir = storage_path('logs/projects');
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0755, true);
            }

            $nowMs = (int) round(microtime(true) * 1000);
            $entry = [
                'ts' => now()->toISOString(),
                'ts_ms' => $nowMs,
                'project_id' => $projectId,
                'source' => $source,
                'level' => $level,
                'message' => $message,
                'context' => $context,
            ];

            $path = self::getLogPath($projectId);
            file_put_contents($path, json_encode($entry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $e) {
            // Never break processing due to logging failures.
        }
    }

    public static function readSince(int $projectId, int $sinceMs = 0, int $limit = 120): array
    {
        $path = self::getLogPath($projectId);
        if (!file_exists($path)) {
            return [
                'entries' => [],
                'next_since' => $sinceMs,
            ];
        }

        $limit = max(1, min($limit, self::MAX_LIMIT));
        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $entries = [];
        $nextSince = $sinceMs;

        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if (!is_array($decoded)) {
                continue;
            }

            $tsMs = (int) ($decoded['ts_ms'] ?? 0);
            if ($tsMs < $sinceMs) {
                continue;
            }

            $entries[] = [
                'ts' => $decoded['ts'] ?? null,
                'ts_ms' => $tsMs,
                'source' => $decoded['source'] ?? 'system',
                'level' => $decoded['level'] ?? 'info',
                'message' => $decoded['message'] ?? '',
                'context' => $decoded['context'] ?? [],
            ];

            if ($tsMs > $nextSince) {
                $nextSince = $tsMs;
            }
        }

        if (count($entries) > $limit) {
            $entries = array_slice($entries, -$limit);
            $last = end($entries);
            if (is_array($last)) {
                $nextSince = (int) ($last['ts_ms'] ?? $nextSince);
            }
        }

        return [
            'entries' => $entries,
            'next_since' => $nextSince,
        ];
    }

    public static function getLogPath(int $projectId): string
    {
        return storage_path('logs/projects/project-' . $projectId . '.log');
    }

    private static function inferLevel(string $message, array $context): string
    {
        $normalized = strtolower($message);

        if (
            str_contains($normalized, 'failed') ||
            str_contains($normalized, 'error') ||
            str_contains($normalized, 'exception') ||
            str_contains($normalized, 'quota') ||
            str_contains($normalized, '429') ||
            str_contains($message, '❌') ||
            isset($context['error']) ||
            isset($context['error_message']) ||
            isset($context['response_excerpt'])
        ) {
            return 'error';
        }

        if (
            str_contains($normalized, 'warning') ||
            str_contains($normalized, 'retry') ||
            str_contains($normalized, 'fallback') ||
            str_contains($message, '⚠️')
        ) {
            return 'warn';
        }

        if (
            str_contains($normalized, 'success') ||
            str_contains($normalized, 'completed') ||
            str_contains($normalized, 'ready') ||
            str_contains($normalized, 'done') ||
            str_contains($message, '✅')
        ) {
            return 'success';
        }

        return 'info';
    }
}
