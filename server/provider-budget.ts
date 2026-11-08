import { db } from "./database";
import { fail } from "./security";

const dayMs = 24 * 60 * 60 * 1000;
const budgets = {
    generate: { account: 5, total: 100 },
    plan: { account: 30, total: 300 },
    stock: { account: 30, total: 300 },
    music: { account: 60, total: 600 },
    video: { account: 2, total: 20 },
} as const;
type ProviderOperation = keyof typeof budgets;

db.exec(`
    CREATE TABLE IF NOT EXISTS node_provider_requests (
        account_id INTEGER NOT NULL,
        operation TEXT NOT NULL,
        request_key TEXT NOT NULL,
        created INTEGER NOT NULL,
        PRIMARY KEY(account_id,operation,request_key)
    );
    CREATE INDEX IF NOT EXISTS node_provider_requests_window ON node_provider_requests(operation,created,account_id);
    CREATE TABLE IF NOT EXISTS node_create_requests (
        account_id INTEGER NOT NULL,
        request_key TEXT NOT NULL,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        PRIMARY KEY(account_id,request_key)
    );
`);

export function reserveProviderRequest(accountId: number, operation: ProviderOperation, requestKey: string) {
    const limit = budgets[operation];
    const now = Date.now();
    db.transaction(() => {
        db.prepare("DELETE FROM node_provider_requests WHERE created<?").run(now - dayMs);
        if (db.prepare("SELECT 1 FROM node_provider_requests WHERE account_id=? AND operation=? AND request_key=?")
            .get(accountId, operation, requestKey)) return;
        const counts = db.prepare(`
            SELECT COUNT(*) AS total, COALESCE(SUM(account_id=?),0) AS account
            FROM node_provider_requests WHERE operation=?
        `).get(accountId, operation) as { total: number; account: number };
        if (counts.account >= limit.account || counts.total >= limit.total) {
            fail(429, "This AI feature has reached its daily usage limit. Try again later.");
        }
        db.prepare("INSERT INTO node_provider_requests VALUES (?,?,?,?)")
            .run(accountId, operation, requestKey, now);
    }).immediate();
}
