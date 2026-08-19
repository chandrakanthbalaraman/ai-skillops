import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Artifact, StackProfile } from '@ai-skillops/shared';
import { RegistryClient } from '@ai-skillops/registry-client';

const DB_PATH = join(homedir(), '.ai-skillops', 'cache', 'registry.db');

function ensureDbDir(): void {
  mkdirSync(join(homedir(), '.ai-skillops', 'cache'), { recursive: true });
}

export class RegistryCache {
  private db: Database.Database;
  private client: RegistryClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    ensureDbDir();
    this.db = new Database(DB_PATH);
    this.client = new RegistryClient(supabaseUrl, supabaseKey);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        safety_score REAL NOT NULL DEFAULT 0,
        quality_score REAL NOT NULL DEFAULT 0,
        popularity_score REAL NOT NULL DEFAULT 0,
        combined_score REAL NOT NULL DEFAULT 0,
        last_updated_at TEXT NOT NULL,
        languages TEXT NOT NULL DEFAULT '[]',
        frameworks TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  async sync(): Promise<void> {
    const artifacts = await this.client.getApprovedArtifacts({
      language: null,
      framework: null,
      runtime: null,
      buildTool: null,
      database: null,
      agents: [],
      architecture: null,
    });

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO artifacts
        (id, repo_id, kind, name, path, version, status,
         safety_score, quality_score, popularity_score, combined_score,
         last_updated_at, languages, frameworks)
      VALUES
        (@id, @repo_id, @kind, @name, @path, @version, @status,
         @safety_score, @quality_score, @popularity_score, @combined_score,
         @last_updated_at, @languages, @frameworks)
    `);

    const syncAll = this.db.transaction((rows: Artifact[]) => {
      for (const a of rows) {
        const cls = (a as unknown as { classifications?: { languages: string[]; frameworks: string[] }[] }).classifications?.[0];
        const languages = JSON.stringify(cls?.languages ?? []);
        const frameworks = JSON.stringify(cls?.frameworks ?? []);
        insert.run({
          ...a,
          languages,
          frameworks,
        });
      }
    });

    syncAll(artifacts);

    const upsertMeta = this.db.prepare(
      `INSERT OR REPLACE INTO cache_meta (key, value) VALUES ('last_synced', ?)`,
    );
    upsertMeta.run(new Date().toISOString());
  }

  search(query: string): Artifact[] {
    const lower = `%${query.toLowerCase()}%`;
    const rows = this.db
      .prepare(
        `SELECT * FROM artifacts WHERE LOWER(name) LIKE ? ORDER BY combined_score DESC LIMIT 20`,
      )
      .all(lower);
    return rows as Artifact[];
  }

  getById(id: string): Artifact | null {
    const row = this.db.prepare(`SELECT * FROM artifacts WHERE id = ?`).get(id);
    return (row as Artifact) ?? null;
  }

  getForStack(stack: StackProfile): Artifact[] {
    if (!stack.language && !stack.framework) {
      return this.db
        .prepare(`SELECT * FROM artifacts ORDER BY combined_score DESC LIMIT 50`)
        .all() as Artifact[];
    }

    const rows = this.db
      .prepare(`SELECT * FROM artifacts ORDER BY combined_score DESC`)
      .all() as (Artifact & { languages: string; frameworks: string })[];

    return rows.filter((a) => {
      const langs: string[] = JSON.parse(a.languages);
      const fwks: string[] = JSON.parse(a.frameworks);

      if (stack.language && langs.length > 0 && !langs.includes(stack.language)) return false;
      if (stack.framework && fwks.length > 0 && !fwks.includes(stack.framework)) return false;
      return true;
    });
  }

  close(): void {
    this.db.close();
  }
}
