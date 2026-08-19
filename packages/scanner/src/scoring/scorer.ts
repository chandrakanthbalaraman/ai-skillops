import type { SafetyResult } from '../safety/scanner.js';

export function computeSafetyScore(findings: SafetyResult[]): number {
  if (findings.some(f => f.severity === 'critical')) return 0;
  const penalty = findings.reduce((acc, f) => {
    if (f.severity === 'high') return acc + 20;
    if (f.severity === 'medium') return acc + 8;
    if (f.severity === 'low') return acc + 2;
    return acc;
  }, 0);
  return Math.max(0, 100 - penalty);
}

export function computeQualityScore(content: string): number {
  let score = 0;
  if (content.includes('#')) score += 20;              // has headers
  if (content.includes('```')) score += 20;            // has code examples
  if (content.length > 500) score += 20;               // substantial content
  if (content.length > 1500) score += 20;              // detailed content
  if (/##\s+usage/i.test(content)) score += 10;        // has usage section
  if (/##\s+(example|overview)/i.test(content)) score += 10; // has overview
  return Math.min(100, score);
}

export function computeCombinedScore(input: {
  safetyScore: number;
  qualityScore: number;
  popularityScore: number;
}): number {
  return Math.round(
    input.safetyScore * 0.25 +
    input.qualityScore * 0.35 +
    input.popularityScore * 0.40
  );
}

export function computePopularityScore(skillsShInstalls: number): number {
  if (skillsShInstalls >= 1_000_000) return 100;
  if (skillsShInstalls >= 500_000) return 85;
  if (skillsShInstalls >= 100_000) return 70;
  if (skillsShInstalls >= 10_000) return 50;
  if (skillsShInstalls >= 1_000) return 30;
  return 10;
}
