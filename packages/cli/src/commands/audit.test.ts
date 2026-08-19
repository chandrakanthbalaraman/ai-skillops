import { describe, it, expect } from 'vitest';
import { auditLockfileEntries } from './audit.js';
import type { LockfileEntry } from '@ai-skillops/shared';

describe('auditLockfileEntries', () => {
  it('flags entries with low safety score', () => {
    const issues = auditLockfileEntries([
      {
        id: 'test.bad-skill',
        kind: 'skill',
        version: '1.0.0',
        source: { repository: 'https://github.com/x/y', path: 'SKILL.md', commit: 'a'.repeat(40) },
        integrity: 'sha256:abc',
        safetyScore: 30,
      },
    ]);
    expect(issues).toContainEqual(
      expect.objectContaining({ id: 'test.bad-skill', issue: expect.stringContaining('safety score') })
    );
  });

  it('passes entries with high safety score', () => {
    const issues = auditLockfileEntries([
      {
        id: 'test.good-skill',
        kind: 'skill',
        version: '1.0.0',
        source: { repository: 'https://github.com/x/y', path: 'SKILL.md', commit: 'a'.repeat(40) },
        integrity: 'sha256:abc',
        safetyScore: 95,
      },
    ]);
    expect(issues).toHaveLength(0);
  });

  it('flags an entry with an unpinned commit sha', () => {
    const entries: LockfileEntry[] = [
      {
        id: 'some-artifact',
        kind: 'skill',
        version: '1.0.0',
        source: {
          repository: 'https://github.com/org/repo',
          path: 'SKILL.md',
          commit: '0'.repeat(40),
        },
        integrity: 'sha256:' + 'a'.repeat(64),
        safetyScore: 95,
      },
    ];
    const issues = auditLockfileEntries(entries);
    expect(issues.some(i => i.issue.toLowerCase().includes('unpinned'))).toBe(true);
  });
});
