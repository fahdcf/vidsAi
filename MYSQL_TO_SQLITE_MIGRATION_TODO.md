# MySQL to SQLite Safe Migration TODO

- [x] Detect SQLite migration blockers in existing migrations.
- [x] Patch MySQL-only migrations to avoid SQLite syntax failures.
- [x] Add an executable command to migrate data safely with row-count verification.
- [x] Run command in dry-run mode to verify source connectivity and table inventory.
- [x] Execute full MySQL -> SQLite migration.
- [x] Switch `.env` to SQLite and clear Laravel caches.
- [x] Run smoke checks (`php artisan migrate:status`, `php artisan about`).
- [ ] Keep MySQL unchanged as rollback source until SQLite is validated.

## Commands

```powershell
php artisan db:migrate-mysql-to-sqlite --dry-run
php artisan db:migrate-mysql-to-sqlite
```

## Cutover

```dotenv
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
```

```powershell
php artisan config:clear
php artisan cache:clear
```
