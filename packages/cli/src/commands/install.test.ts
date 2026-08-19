import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installArtifact } from './install.js';
import type { Artifact } from '@ai-skillops/shared';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ai-skillops-install-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const sampleArtifact: Artifact = {
  id: 'test-id-001',
  repo_id: 'repo-001',
  kind: 'skill',
  name: 'my-test-skill',
  path: 'skills/my-test-skill.md',
  version: '1.0.0',
  status: 'approved',
  safety_score: 95,
  quality_score: 88,
  popularity_score: 72,
  combined_score: 85,
  last_updated_at: '2026-08-18T10:00:00.000Z',
};

describe('installArtifact', () => {
  it('writes the artifact file to the correct path', async () => {
    const entry = await installArtifact(sampleArtifact, dir);
    const expected = join(dir, '.claude/skills/my-test-skill.md');
    const content = readFileSync(expected, 'utf-8');
    expect(content).toContain('# my-test-skill');
    expect(content).toContain('Safety score: 95');
  });

  it('returns a lockfile entry with correct fields', async () => {
    const entry = await installArtifact(sampleArtifact, dir);
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe('test-id-001');
    expect(entry!.kind).toBe('skill');
    expect(entry!.version).toBe('1.0.0');
    expect(entry!.safetyScore).toBe(95);
    expect(entry!.integrity).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('places a rule artifact under .cursor/rules/', async () => {
    const ruleArtifact: Artifact = { ...sampleArtifact, kind: 'rule', name: 'my-rule' };
    await installArtifact(ruleArtifact, dir);
    const expected = join(dir, '.cursor/rules/my-rule.md');
    const content = readFileSync(expected, 'utf-8');
    expect(content).toContain('# my-rule');
  });

  it('places a command artifact under .claude/commands/', async () => {
    const commandArtifact: Artifact = {
      ...sampleArtifact,
      kind: 'command',
      name: 'my-command',
    };
    await installArtifact(commandArtifact, dir);
    const expected = join(dir, '.claude/commands/my-command.md');
    expect(readFileSync(expected, 'utf-8')).toContain('# my-command');
  });
});
