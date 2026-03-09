<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

class MigrateMysqlToSqliteCommand extends Command
{
    protected $signature = 'db:migrate-mysql-to-sqlite
        {--sqlite=database/database.sqlite : Target SQLite file path}
        {--chunk=500 : Rows per chunk}
        {--dry-run : Validate and report without writing data}';

    protected $description = 'Safely copy all data from MySQL connection to SQLite with verification report';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $chunkSize = (int) $this->option('chunk');
        $sqliteOption = (string) $this->option('sqlite');

        if ($chunkSize < 1) {
            $this->error('Chunk size must be greater than 0.');
            return self::FAILURE;
        }

        $sqlitePath = $this->resolveSqlitePath($sqliteOption);

        if (! $this->preflightMySql()) {
            return self::FAILURE;
        }

        if (! $dryRun) {
            if (! $this->prepareSqliteDatabase($sqlitePath)) {
                return self::FAILURE;
            }

            $this->info('Running migrations on SQLite target...');
            Artisan::call('migrate:fresh', [
                '--database' => 'sqlite',
                '--force' => true,
            ]);
            $this->line(trim(Artisan::output()));
        } else {
            $this->warn('Dry-run mode enabled: no schema/data changes will be made.');
        }

        [$tables, $rowCounts] = $this->collectSourceTables();

        if (empty($tables)) {
            $this->error('No MySQL tables found to migrate.');
            return self::FAILURE;
        }

        $this->table(['Table', 'Rows in MySQL'], array_map(function ($table) use ($rowCounts) {
            return [$table, $rowCounts[$table] ?? 0];
        }, $tables));

        if ($dryRun) {
            $reportPath = $this->writeReport([
                'mode' => 'dry-run',
                'sqlite_path' => $sqlitePath,
                'tables' => $rowCounts,
                'copied' => [],
            ]);

            $this->info('Dry-run completed.');
            $this->info('Report: '.$reportPath);
            return self::SUCCESS;
        }

        $copiedCounts = [];

        DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=0');
        DB::connection('sqlite')->statement('PRAGMA foreign_keys = OFF');

        try {
            foreach ($tables as $table) {
                $this->line('Copying table: '.$table);

                $columns = DB::connection('mysql')->getSchemaBuilder()->getColumnListing($table);
                $orderColumn = $this->resolveOrderColumn($columns);

                DB::connection('sqlite')->table($table)->delete();

                DB::connection('mysql')
                    ->table($table)
                    ->orderBy($orderColumn)
                    ->chunk($chunkSize, function ($rows) use ($table, &$copiedCounts) {
                        $payload = [];

                        foreach ($rows as $row) {
                            $payload[] = (array) $row;
                        }

                        if (! empty($payload)) {
                            DB::connection('sqlite')->table($table)->insert($payload);
                            $copiedCounts[$table] = ($copiedCounts[$table] ?? 0) + count($payload);
                        }
                    });
            }
        } catch (Throwable $exception) {
            DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=1');
            DB::connection('sqlite')->statement('PRAGMA foreign_keys = ON');

            $this->error('Migration failed: '.$exception->getMessage());
            return self::FAILURE;
        }

        DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=1');
        DB::connection('sqlite')->statement('PRAGMA foreign_keys = ON');

        $mismatch = [];

        foreach ($tables as $table) {
            $sourceCount = (int) DB::connection('mysql')->table($table)->count();
            $targetCount = (int) DB::connection('sqlite')->table($table)->count();

            if ($sourceCount !== $targetCount) {
                $mismatch[] = [$table, $sourceCount, $targetCount];
            }
        }

        $this->table(['Table', 'Copied rows'], array_map(function ($table) use ($copiedCounts) {
            return [$table, $copiedCounts[$table] ?? 0];
        }, $tables));

        if (! empty($mismatch)) {
            $this->error('Row count verification failed for some tables.');
            $this->table(['Table', 'MySQL rows', 'SQLite rows'], $mismatch);

            $reportPath = $this->writeReport([
                'mode' => 'full',
                'sqlite_path' => $sqlitePath,
                'tables' => $rowCounts,
                'copied' => $copiedCounts,
                'mismatch' => $mismatch,
            ]);

            $this->error('Report: '.$reportPath);
            return self::FAILURE;
        }

        $reportPath = $this->writeReport([
            'mode' => 'full',
            'sqlite_path' => $sqlitePath,
            'tables' => $rowCounts,
            'copied' => $copiedCounts,
            'mismatch' => [],
        ]);

        $this->info('MySQL to SQLite migration completed successfully with verified row counts.');
        $this->info('SQLite file: '.$sqlitePath);
        $this->info('Report: '.$reportPath);

        return self::SUCCESS;
    }

    private function resolveSqlitePath(string $sqliteOption): string
    {
        if (str_starts_with($sqliteOption, DIRECTORY_SEPARATOR) || preg_match('/^[A-Za-z]:\\\\/', $sqliteOption) === 1) {
            return $sqliteOption;
        }

        return base_path($sqliteOption);
    }

    private function preflightMySql(): bool
    {
        try {
            DB::connection('mysql')->select('SELECT 1');
            return true;
        } catch (Throwable $exception) {
            $this->error('Cannot connect to MySQL using current environment: '.$exception->getMessage());
            return false;
        }
    }

    private function prepareSqliteDatabase(string $sqlitePath): bool
    {
        $directory = dirname($sqlitePath);

        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        if (File::exists($sqlitePath)) {
            $backupDir = storage_path('app/db-backups');
            if (! File::exists($backupDir)) {
                File::makeDirectory($backupDir, 0755, true);
            }

            $backupPath = $backupDir.'/'.basename($sqlitePath).'.'.now()->format('Ymd_His').'.bak';
            File::copy($sqlitePath, $backupPath);
            $this->info('Existing SQLite backup created: '.$backupPath);
        }

        if (! File::exists($sqlitePath)) {
            File::put($sqlitePath, '');
        }

        config(['database.connections.sqlite.database' => $sqlitePath]);
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        try {
            DB::connection('sqlite')->select('SELECT 1');
            return true;
        } catch (Throwable $exception) {
            $this->error('Cannot open SQLite target: '.$exception->getMessage());
            return false;
        }
    }

    private function collectSourceTables(): array
    {
        $rawTables = DB::connection('mysql')->select('SHOW TABLES');

        $tables = [];
        foreach ($rawTables as $row) {
            $arrayRow = (array) $row;
            $tables[] = (string) reset($arrayRow);
        }

        sort($tables);

        $rowCounts = [];
        foreach ($tables as $table) {
            $rowCounts[$table] = (int) DB::connection('mysql')->table($table)->count();
        }

        return [$tables, $rowCounts];
    }

    private function resolveOrderColumn(array $columns): string
    {
        if (in_array('id', $columns, true)) {
            return 'id';
        }

        return $columns[0] ?? 'rowid';
    }

    private function writeReport(array $payload): string
    {
        $reportDir = storage_path('app/db-migration-reports');
        if (! File::exists($reportDir)) {
            File::makeDirectory($reportDir, 0755, true);
        }

        $reportPath = $reportDir.'/mysql_to_sqlite_'.now()->format('Ymd_His').'.json';
        File::put($reportPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return $reportPath;
    }
}
