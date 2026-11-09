CREATE TABLE IF NOT EXISTS "users" ("id" integer primary key autoincrement not null, "name" varchar not null, "email" varchar not null, "email_verified_at" datetime, "password" varchar not null, "remember_token" varchar, "created_at" datetime, "updated_at" datetime);
CREATE TABLE IF NOT EXISTS "projects" ("id" integer primary key autoincrement not null, "user_id" integer not null, "name" varchar not null, "type" varchar check ("type" in ('product', 'service')) not null, "category" varchar not null, "description" text not null, "language" varchar not null default 'english', "script_option" varchar check ("script_option" in ('paste', 'generate')) not null, "custom_script" text, "voiceover_option" varchar check ("voiceover_option" in ('upload', 'ai', 'none')) not null, "voiceover_file" varchar, "status" varchar check ("status" in ('pending', 'processing', 'reviewing', 'subtitle_selection', 'subtitle_generating', 'completed', 'failed')) not null default 'pending', "job_id" varchar, "final_video_path" varchar, "scenes_data" text, "created_at" datetime, "updated_at" datetime, "video_format" text, "processing_started_at" datetime, "processing_completed_at" datetime, "error_message" text, "trim_response" text, "voiceover_transcript" text, "subtitles_script" text, "voiceover_url" varchar, "last_scene_config" varchar, "selected_music" text, "edit_state" text, foreign key("user_id") references "users"("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "scenes" ("id" integer primary key autoincrement not null, "project_id" integer not null, "scene_number" integer not null, "script_text" text not null, "video_path" varchar, "thumbnail_path" varchar, "status" varchar check ("status" in ('pending', 'processing', 'completed', 'regenerating', 'failed')) not null default 'pending', "approved" tinyint(1) not null default '0', "created_at" datetime, "updated_at" datetime, "video_url" varchar, "duration_seconds" numeric, "keywords" text, "prompt" text, "gemini_duration" numeric, "trimmed_duration" numeric, "start_time" numeric, "end_time" numeric, "job_id" varchar, "type" varchar check ("type" in ('video', 'image')) not null default 'video', foreign key("project_id") references "projects"("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "edit_commands" ("id" varchar not null, "project_id" integer not null, "input_hash" varchar not null, "result" text not null, "created_at" datetime, "updated_at" datetime, foreign key("project_id") references "projects"("id") on delete cascade, primary key ("id"));
CREATE TABLE IF NOT EXISTS "edit_revisions" ("id" integer primary key autoincrement not null, "project_id" integer not null, "revision" integer not null, "document" text not null, "created_at" datetime, "updated_at" datetime, foreign key("project_id") references "projects"("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "agent_runs" ("id" varchar not null, "project_id" integer not null, "starting_revision" integer not null, "message" text not null, "status" varchar not null, "plan" text, "result" text, "error" text, "created_at" datetime, "updated_at" datetime, "snapshot" text, foreign key("project_id") references "projects"("id") on delete cascade, primary key ("id"));
CREATE TABLE IF NOT EXISTS "project_assets" ("id" varchar not null, "project_id" integer not null, "path" varchar not null, "name" varchar not null, "mime" varchar not null, "size" integer not null, "created_at" datetime, "updated_at" datetime, foreign key("project_id") references "projects"("id") on delete cascade, primary key ("id"));
CREATE TABLE IF NOT EXISTS "video_exports" ("id" varchar not null, "project_id" integer not null, "revision" integer not null, "snapshot" text not null, "status" varchar not null default 'queued', "worker_job_id" varchar, "output_url" text, "error" text, "progress" float not null default '0', "created_at" datetime, "updated_at" datetime, foreign key("project_id") references "projects"("id") on delete cascade, primary key ("id"));
CREATE TABLE IF NOT EXISTS motion_runs (
    id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    starting_revision INTEGER NOT NULL,
    brief TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    reference_binding_id TEXT,
    target_scene_id TEXT,
    status TEXT NOT NULL CHECK(status IN ('queued','working','waiting_for_browser','ready','failed','cancelled')),
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(project_id,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS motion_runs_one_active ON motion_runs(project_id)
    WHERE status IN ('queued','working','waiting_for_browser');
CREATE TABLE IF NOT EXISTS motion_steps (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES motion_runs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lane TEXT NOT NULL CHECK(lane IN ('provider','browser','local')),
    dependencies TEXT NOT NULL,
    input TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','running','done','failed','cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    lease_token TEXT,
    lease_expires INTEGER,
    started_at INTEGER,
    result_id TEXT,
    error TEXT,
    UNIQUE(run_id,name)
);
CREATE INDEX IF NOT EXISTS motion_steps_pending ON motion_steps(run_id,status,lane);
CREATE TABLE IF NOT EXISTS motion_budget_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    account_id INTEGER NOT NULL,
    lease_token TEXT NOT NULL,
    slot INTEGER NOT NULL,
    provider TEXT NOT NULL,
    tokens INTEGER NOT NULL CHECK(tokens > 0),
    created_at INTEGER NOT NULL,
    UNIQUE(step_id,lease_token,slot)
);
CREATE INDEX IF NOT EXISTS motion_budget_run ON motion_budget_reservations(run_id);
CREATE INDEX IF NOT EXISTS motion_budget_window ON motion_budget_reservations(created_at,account_id,provider);
CREATE TABLE IF NOT EXISTS motion_provider_cooldowns (
    provider TEXT PRIMARY KEY,
    available_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS motion_artifacts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES motion_runs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    digest TEXT NOT NULL,
    body BLOB NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS motion_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES motion_runs(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS motion_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES motion_runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS motion_events_cursor ON motion_events(run_id,id);
CREATE TABLE IF NOT EXISTS motion_feedback (
    run_id TEXT NOT NULL REFERENCES motion_runs(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    text TEXT NOT NULL,
    replacement_run_id TEXT REFERENCES motion_runs(id) ON DELETE SET NULL,
    PRIMARY KEY(run_id,request_id)
);
CREATE TABLE IF NOT EXISTS motion_setup (
    run_id TEXT PRIMARY KEY REFERENCES motion_runs(id) ON DELETE CASCADE,
    requirements TEXT NOT NULL,
    setup_hash TEXT NOT NULL,
    finished_hash TEXT
);
