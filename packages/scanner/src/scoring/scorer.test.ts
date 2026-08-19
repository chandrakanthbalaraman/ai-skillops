import { describe, it, expect } from 'vitest';
import { computeSafetyScore, computeQualityScore, computeCombinedScore, computePopularityScore } from './scorer.js';

describe('computeSafetyScore', () => {
  it('returns 100 for no findings', () => {
    expect(computeSafetyScore([])).toBe(100);
  });

  it('returns 0 for any critical finding', () => {
    expect(computeSafetyScore([
      { severity: 'critical', kind: 'destructive-shell', line: 1, evidence: 'rm -rf' }
    ])).toBe(0);
  });

  it('penalizes high findings by 20 each', () => {
    expect(computeSafetyScore([
      { severity: 'high', kind: 'git-push', line: 1, evidence: 'git push --force' }
    ])).toBe(80);
  });

  it('does not go below 0', () => {
    expect(computeSafetyScore([
      { severity: 'high', kind: 'git-push', line: 1, evidence: 'x' },
      { severity: 'high', kind: 'git-push', line: 2, evidence: 'y' },
      { severity: 'high', kind: 'git-push', line: 3, evidence: 'z' },
      { severity: 'high', kind: 'git-push', line: 4, evidence: 'w' },
      { severity: 'high', kind: 'git-push', line: 5, evidence: 'v' },
      { severity: 'high', kind: 'git-push', line: 6, evidence: 'u' },
    ])).toBe(0);
  });
});

describe('computeQualityScore', () => {
  it('gives higher score for longer content', () => {
    const short = computeQualityScore('# Hi');
    const long = computeQualityScore('# Title\n\n## Overview\n\nThis is a detailed skill with examples and usage.\n\n## Usage\n\nRun the following:\n\n```\nnpx skillops init\n```');
    expect(long).toBeGreaterThan(short);
  });
});

describe('computeCombinedScore', () => {
  it('weights safety at 25%', () => {
    const score = computeCombinedScore({
      safetyScore: 0,
      qualityScore: 100,
      popularityScore: 100,
    });
    expect(score).toBeLessThan(80);
  });
});

describe('computePopularityScore', () => {
  it('returns 100 for >= 1M installs', () => {
    expect(computePopularityScore(1_000_000)).toBe(100);
  });

  it('returns 85 for >= 500K installs', () => {
    expect(computePopularityScore(500_000)).toBe(85);
  });

  it('returns 70 for >= 100K installs', () => {
    expect(computePopularityScore(100_000)).toBe(70);
  });

  it('returns 50 for >= 10K installs', () => {
    expect(computePopularityScore(10_000)).toBe(50);
  });

  it('returns 30 for >= 1K installs', () => {
    expect(computePopularityScore(1_000)).toBe(30);
  });

  it('returns 10 for low install counts', () => {
    expect(computePopularityScore(500)).toBe(10);
  });
});
