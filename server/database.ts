import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { root, runtime } from "./env";
const filename =
    process.env.NODE_DATABASE_PATH ||
    path.join(runtime, "node-database.sqlite");
fs.mkdirSync(path.dirname(filename), { recursive: true });
if (
    !fs.existsSync(filename) &&
    process.env.NODE_SKIP_LEGACY_IMPORT !== "1" &&
    fs.existsSync(path.join(runtime, "database.sqlite"))
) {
    const source = new Database(path.join(runtime, "database.sqlite"), {
        readonly: true,
    });
    await source.backup(filename);
    source.close();
}
export const db = new Database(filename);
db.pragma("journal_mode=WAL");
db.pragma("busy_timeout=5000");
db.pragma("foreign_keys=ON");
db.exec(fs.readFileSync(path.join(root, "server/schema.sql"), "utf8"));
db.transaction(() => {
    if (!(db.pragma("table_info(projects)") as { name: string }[]).some(({ name }) => name === "workflow")) {
        db.exec("ALTER TABLE projects ADD COLUMN workflow TEXT NOT NULL DEFAULT 'video_from_scratch' CHECK (workflow IN ('video_from_scratch','motion_graphics'))");
    }
}).immediate();
if (
    !(db.pragma("table_info(project_assets)") as any[]).some(
        (c) => c.name === "duration_seconds",
    )
)
    db.exec("ALTER TABLE project_assets ADD COLUMN duration_seconds REAL");
db.exec(`CREATE TABLE IF NOT EXISTS node_sessions(id TEXT PRIMARY KEY,user_id INTEGER,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS node_jobs(id TEXT PRIMARY KEY,project_id INTEGER NOT NULL,task TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,available INTEGER NOT NULL,lease INTEGER,error TEXT,payload TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS motion_create_requests(account_id INTEGER NOT NULL,request_id TEXT NOT NULL,project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,input_hash TEXT NOT NULL,PRIMARY KEY(account_id,request_id));
CREATE TABLE IF NOT EXISTS motion_asset_metadata(asset_id TEXT PRIMARY KEY REFERENCES project_assets(id) ON DELETE CASCADE,kind TEXT NOT NULL,sha256 TEXT NOT NULL,provenance TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS motion_drafts(id TEXT PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,expected_revision INTEGER NOT NULL,operations TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS node_jobs_due ON node_jobs(status,available);`);
db.exec(
    `CREATE TABLE IF NOT EXISTS node_password_resets(email TEXT PRIMARY KEY,token_hash TEXT NOT NULL,expires INTEGER NOT NULL);`,
);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS node_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS node_revisions_unique ON edit_revisions(project_id,revision);`);
export const now = () => new Date().toISOString();
export function insert(table: string, values: Record<string, any>) {
    const keys = Object.keys(values);
    return db
        .prepare(
            `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
        )
        .run(...Object.values(values)).lastInsertRowid;
}
export function update(table: string, id: any, values: Record<string, any>) {
    const keys = Object.keys(values);
    db.prepare(
        `UPDATE ${table} SET ${keys.map((k) => k + "=?").join(",")} WHERE id=?`,
    ).run(...Object.values(values), id);
}
export function project(id: any) {
    return db.prepare("SELECT * FROM projects WHERE id=?").get(id) as any;
}
export function scenes(id: any) {
    return db
        .prepare(
            "SELECT * FROM scenes WHERE project_id=? ORDER BY scene_number",
        )
        .all(id) as any[];
}
export function json<T = any>(value: any, fallback: T): T {
    try {
        return typeof value === "string"
            ? JSON.parse(value)
            : (value ?? fallback);
    } catch {
        return fallback;
    }
}
