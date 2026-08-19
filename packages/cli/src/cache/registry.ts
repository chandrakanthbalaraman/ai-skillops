import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { RegistryClient } from '@ai-skillops/registry-client';
import type { Artifact, StackProfile } from '@ai-skillops/shared';

const CACHE_DIR = join(homedir(), '.ai-skillops', 'cache');
const CACHE_PATH = join(CACHE_DIR, 'registry.db');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class RegistryCache {
  private db: Database.Database;

  constructor(dbPath: string = CACHE_PATH) {
    mkdirSync(CACHE_DIR, { recursive: true });
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private get client(): RegistryClient {
    const url = process.env['AI_SKILLOPS_REGISTRY_URL'] ?? 'https://your-project.supabase.co';
    const key = process.env['AI_SKILLOPS_ANON_KEY'] ?? '';
    return new RegistryClient(url, key);
  }

  private isStale(): boolean {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get('synced_at') as { value: string } | undefined;
    if (!row) return true;
    return Date.now() - new Date(row.value).getTime() > CACHE_TTL_MS;
  }

  async sync(): Promise<void> {
    const client = this.client;
    const artifacts = await client.getApprovedArtifacts({
      language: null,
      framework: null,
      runtime: null,
      buildTool: null,
      database: null,
      agents: [],
      architecture: null,
    });
    const insert = this.db.prepare('INSERT OR REPLACE INTO artifacts (id, data) VALUES (?, ?)');
    const insertAll = this.db.transaction((items: Artifact[]) => {
      for (const item of items) insert.run(item.id, JSON.stringify(item));
    });
    insertAll(artifacts);
    this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
      'synced_at',
      new Date().toISOString(),
    );
  }

  async ensureFresh(): Promise<void> {
    if (this.isStale()) await this.sync();
  }

  search(query: string): Artifact[] {
    const rows = this.db
      .prepare("SELECT data FROM artifacts WHERE json_extract(data, '$.name') LIKE ?")
      .all(`%${query}%`) as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as Artifact);
  }

  getById(id: string): Artifact | null {
    const row = this.db.prepare('SELECT data FROM artifacts WHERE id = ?').get(id) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as Artifact) : null;
  }

  getAll(): Artifact[] {
    const rows = this.db
      .prepare(
        "SELECT data FROM artifacts ORDER BY json_extract(data, '$.combined_score') DESC",
      )
      .all() as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as Artifact);
  }

  getForStack(stack: StackProfile): Artifact[] {
    const all = this.getAll();
    if (!stack.language && !stack.framework) return all.slice(0, 50);
    return all.filter(a => {
      const aWithClassifications = a as Artifact & {
        classifications?: { languages: string[]; frameworks: string[] }[];
      };
      const cls = aWithClassifications.classifications?.[0];
      if (!cls) return true;
      if (stack.language && cls.languages.length > 0 && !cls.languages.includes(stack.language))
        return false;
      if (
        stack.framework &&
        cls.frameworks.length > 0 &&
        !cls.frameworks.includes(stack.framework)
      )
        return false;
      return true;
    });
  }

  close(): void {
    this.db.close();
  }
}
