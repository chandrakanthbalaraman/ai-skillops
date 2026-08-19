import { describe, it, expect } from 'vitest';
import { auditLockfileEntries } from './audit.js';

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
});
