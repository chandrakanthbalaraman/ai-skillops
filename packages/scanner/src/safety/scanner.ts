import type { SafetyFindingSeverity, SafetyFindingKind } from '@ai-skillops/shared';

export interface SafetyResult {
  severity: SafetyFindingSeverity;
  kind: SafetyFindingKind;
  line: number;
  evidence: string;
}

interface ScanRule {
  pattern: RegExp;
  kind: SafetyFindingKind;
  severity: SafetyFindingSeverity;
}

const RULES: ScanRule[] = [
  {
    pattern: /\brm\s+-rf?\s+[^\s]/i,
    kind: 'destructive-shell',
    severity: 'critical',
  },
  {
    pattern: /curl\s+[^\s]+\s*\|\s*(ba)?sh/i,
    kind: 'curl-pipe-bash',
    severity: 'critical',
  },
  {
    pattern: /wget\s+[^\s]+\s*\|\s*(ba)?sh/i,
    kind: 'curl-pipe-bash',
    severity: 'critical',
  },
  {
    pattern: /git\s+push\s+(--force|-f)\b/i,
    kind: 'git-push',
    severity: 'high',
  },
  {
    pattern: /(\.env|AWS_SECRET|AWS_ACCESS_KEY|PRIVATE_KEY|id_rsa)\b/,
    kind: 'credential-access',
    severity: 'high',
  },
  {
    pattern: /ignore\s+all\s+previous\s+instructions?/i,
    kind: 'prompt-injection',
    severity: 'critical',
  },
  {
    pattern: /disable\s+(safety|constraints|restrictions)/i,
    kind: 'prompt-injection',
    severity: 'critical',
  },
  {
    pattern: /eval\s*\(/,
    kind: 'destructive-shell',
    severity: 'high',
  },
];

export function scanContent(content: string, _filePath: string): SafetyResult[] {
  const findings: SafetyResult[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          severity: rule.severity,
          kind: rule.kind,
          line: index + 1,
          evidence: line.trim().slice(0, 200),
        });
      }
    }
  });

  return findings;
}
