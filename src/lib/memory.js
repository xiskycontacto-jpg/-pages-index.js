import { neon } from "@neondatabase/serverless";

let client;
function sql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new Error("Falta POSTGRES_URL o DATABASE_URL");
  return client || (client = neon(url));
}
export async function ensureMemory() {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS nexora_memory (
    id BIGSERIAL PRIMARY KEY, scope TEXT NOT NULL DEFAULT 'agency',
    agent TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`CREATE INDEX IF NOT EXISTS nexora_memory_created_idx ON nexora_memory(created_at DESC)`;
  return db;
}
export async function readMemory(agent, limit = 8) {
  const db = await ensureMemory();
  const rows = await db`SELECT agent,kind,content,metadata,created_at FROM nexora_memory
    WHERE scope='agency' ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.reverse();
}
export async function writeMemory(agent, kind, content, metadata = {}) {
  const db = await ensureMemory();
  await db`INSERT INTO nexora_memory(scope,agent,kind,content,metadata)
    VALUES('agency',${agent},${kind},${content},${JSON.stringify(metadata)}::jsonb)`;
  return true;
}
