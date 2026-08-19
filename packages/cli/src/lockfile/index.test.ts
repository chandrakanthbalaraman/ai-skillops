import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLockfile, writeLockfile } from './index.js';
import type { Lockfile } from '@ai-skillops/shared';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ai-skillops-lock-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const sampleLockfile: Lockfile = {
  lockVersion: 1,
  generated: '2026-08-18T10:00:00.000Z',
  project: {
    language: 'typescript',
    framework: 'next.js',
    runtime: null,
    buildTool: 'npm',
    database: null,
    agents: ['claude-code'],
    architecture: null,
  },
  artifacts: [],
};

describe('lockfile', () => {
  it('returns null when no lockfile exists', async () => {
    const result = await readLockfile(dir);
    expect(result).toBeNull();
  });

  it('round-trips a lockfile correctly', async () => {
    await writeLockfile(dir, sampleLockfile);
    const read = await readLockfile(dir);
    expect(read).toEqual(sampleLockfile);
  });
});
