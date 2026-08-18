import { describe, it, expect } from 'vitest';
import { classifyPath } from './github.js';
import type { ArtifactKind } from '@ai-skillops/shared';

describe('classifyPath', () => {
  it('classifies SKILL.md as skill', () => {
    expect(classifyPath('SKILL.md')).toBe<ArtifactKind>('skill');
  });

  it('classifies .claude/commands/ as command', () => {
    expect(classifyPath('.claude/commands/deploy.md')).toBe<ArtifactKind>('command');
  });

  it('classifies .cursor/rules/ as rule', () => {
    expect(classifyPath('.cursor/rules/typescript.mdc')).toBe<ArtifactKind>('rule');
  });

  it('classifies CLAUDE.md as context', () => {
    expect(classifyPath('CLAUDE.md')).toBe<ArtifactKind>('context');
  });

  it('classifies workflows/ as workflow', () => {
    expect(classifyPath('workflows/release.md')).toBe<ArtifactKind>('workflow');
  });

  it('returns null for unrecognized paths', () => {
    expect(classifyPath('src/main.ts')).toBeNull();
  });
});
