import { describe, it, expect } from 'vitest';
import { LockfileSchema } from './schemas.js';

describe('LockfileSchema', () => {
  it('validates a correct lockfile', () => {
    const valid = {
      lockVersion: 1,
      generated: '2026-08-18T10:00:00.000Z',
      project: {
        language: 'typescript',
        framework: 'next.js',
        runtime: null,
        buildTool: null,
        database: null,
        agents: ['claude-code'],
        architecture: null,
      },
      artifacts: [
        {
          id: 'vercel-labs.nextjs-rules',
          kind: 'rule',
          version: '1.0.0',
          source: {
            repository: 'https://github.com/vercel-labs/agent-skills',
            path: 'rules/nextjs',
            commit: 'a'.repeat(40),
          },
          integrity: 'sha256:abc123',
          safetyScore: 97,
        },
      ],
    };
    expect(LockfileSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an invalid commit sha (not 40 chars)', () => {
    const bad = {
      lockVersion: 1,
      generated: '2026-08-18T10:00:00.000Z',
      project: { language: null, framework: null, runtime: null, buildTool: null, database: null, agents: [], architecture: null },
      artifacts: [
        {
          id: 'x',
          kind: 'rule',
          version: '1.0.0',
          source: { repository: 'https://github.com/x/y', path: 'a', commit: 'short' },
          integrity: 'sha256:abc',
          safetyScore: 90,
        },
      ],
    };
    expect(() => LockfileSchema.parse(bad)).toThrow();
  });
});
