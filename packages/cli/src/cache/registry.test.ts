import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Artifact } from '@ai-skillops/shared';

// ------- in-memory SQLite stand-in -------
// better-sqlite3 native bindings cannot compile on Node ≥ 25 (C++ ABI change).
// We mock the module with a pure-JS in-memory store that exercises the same
// RegistryCache logic without the native module.

type Row = { id: string; data: string };
type MetaRow = { key: string; value: string };

let artifactRows: Row[] = [];
let metaRows: MetaRow[] = [];

function makeDb() {
  const queryFn = (sql: string) => ({
    get: (...args: unknown[]): unknown => {
      if (sql.includes('FROM meta')) {
        const key = args[0] as string;
        return metaRows.find(r => r.key === key);
      }
      if (sql.includes('FROM artifacts WHERE id')) {
        const id = args[0] as string;
        return artifactRows.find(r => r.id === id);
      }
      return undefined;
    },
    all: (...args: unknown[]): unknown[] => {
      if (sql.includes("$.name') LIKE ?")) {
        const pattern = (args[0] as string).replace(/%/g, '').toLowerCase();
        return artifactRows.filter(r => {
          const a = JSON.parse(r.data) as Artifact;
          return a.name.toLowerCase().includes(pattern);
        });
      }
      if (sql.includes('ORDER BY json_extract')) {
        return [...artifactRows].sort((a, b) => {
          const sa = (JSON.parse(a.data) as Artifact).combined_score;
          const sb = (JSON.parse(b.data) as Artifact).combined_score;
          return sb - sa;
        });
      }
      return artifactRows;
    },
    run: (...args: unknown[]): void => {
      if (sql.includes('INTO meta')) {
        const key = args[0] as string;
        const value = args[1] as string;
        const idx = metaRows.findIndex(r => r.key === key);
        if (idx >= 0) metaRows[idx] = { key, value };
        else metaRows.push({ key, value });
      }
      if (sql.includes('INTO artifacts')) {
        const id = args[0] as string;
        const data = args[1] as string;
        const idx = artifactRows.findIndex(r => r.id === id);
        if (idx >= 0) artifactRows[idx] = { id, data };
        else artifactRows.push({ id, data });
      }
    },
  });

  return {
    exec: vi.fn(),
    prepare: vi.fn().mockImplementation((sql: string) => queryFn(sql)),
    transaction: vi.fn().mockImplementation((fn: (rows: Artifact[]) => void) => fn),
    close: vi.fn(),
  };
}

vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockImplementation(() => makeDb()),
}));

// Import AFTER the mock is registered
const { RegistryCache } = await import('./registry.js');

const sampleArtifact: Artifact = {
  id: 'artifact-001',
  repo_id: 'repo-001',
  kind: 'skill',
  name: 'typescript-helper',
  path: 'skills/typescript-helper.md',
  version: '1.0.0',
  status: 'approved',
  safety_score: 90,
  quality_score: 85,
  popularity_score: 70,
  combined_score: 82,
  last_updated_at: '2026-08-18T10:00:00.000Z',
};

let dir: string;

beforeEach(() => {
  artifactRows = [];
  metaRows = [];
  dir = mkdtempSync(join(tmpdir(), 'ai-skillops-cache-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seed(artifact: Artifact): void {
  artifactRows.push({ id: artifact.id, data: JSON.stringify(artifact) });
}

describe('RegistryCache', () => {
  it('returns empty array when no artifacts are cached', () => {
    const cache = new RegistryCache(join(dir, 'test.db'));
    expect(cache.search('typescript')).toEqual([]);
    expect(cache.getAll()).toEqual([]);
  });

  it('searches artifacts by name', () => {
    seed(sampleArtifact);
    const cache = new RegistryCache(join(dir, 'test.db'));
    const results = cache.search('typescript');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('artifact-001');
  });

  it('returns empty array when query does not match', () => {
    seed(sampleArtifact);
    const cache = new RegistryCache(join(dir, 'test.db'));
    expect(cache.search('nonexistent')).toHaveLength(0);
  });

  it('getById returns the artifact', () => {
    seed(sampleArtifact);
    const cache = new RegistryCache(join(dir, 'test.db'));
    const found = cache.getById('artifact-001');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('typescript-helper');
  });

  it('getById returns null for unknown id', () => {
    const cache = new RegistryCache(join(dir, 'test.db'));
    expect(cache.getById('does-not-exist')).toBeNull();
  });

  it('getAll returns artifacts ordered by combined_score DESC', () => {
    seed(sampleArtifact);
    const second: Artifact = { ...sampleArtifact, id: 'artifact-002', name: 'react-helper', combined_score: 90 };
    seed(second);
    const cache = new RegistryCache(join(dir, 'test.db'));
    const all = cache.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('artifact-002');
  });

  it('ensureFresh skips sync when cache has a recent synced_at', async () => {
    // Seed a fresh synced_at so isStale() returns false
    metaRows.push({ key: 'synced_at', value: new Date().toISOString() });
    seed(sampleArtifact);
    const cache = new RegistryCache(join(dir, 'test.db'));
    // Should NOT call sync() — no network needed
    await expect(cache.ensureFresh()).resolves.toBeUndefined();
    // Data still accessible
    expect(cache.getAll()).toHaveLength(1);
  });
});
