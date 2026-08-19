import chalk from 'chalk';
import { readLockfile } from '../lockfile/index.js';
import type { LockfileEntry } from '@ai-skillops/shared';

export interface AuditIssue {
  id: string;
  issue: string;
  severity: 'warn' | 'error';
}

export function auditLockfileEntries(entries: LockfileEntry[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  for (const entry of entries) {
    if (entry.safetyScore < 50) {
      issues.push({
        id: entry.id,
        issue: `Low safety score (${entry.safetyScore}/100) — review before keeping`,
        severity: 'error',
      });
    } else if (entry.safetyScore < 80) {
      issues.push({
        id: entry.id,
        issue: `Moderate safety score (${entry.safetyScore}/100) — check for findings`,
        severity: 'warn',
      });
    }
    if (entry.source.commit === '0'.repeat(40)) {
      issues.push({
        id: entry.id,
        issue: 'Unpinned commit — re-install to get a real commit hash',
        severity: 'warn',
      });
    }
  }
  return issues;
}

export async function runAudit(cwd: string): Promise<void> {
  const lockfile = await readLockfile(cwd);
  if (!lockfile) {
    console.log(chalk.yellow('No ai-skillops.lock.yaml found. Run `ai-skillops init` first.'));
    return;
  }

  const issues = auditLockfileEntries(lockfile.artifacts);

  if (issues.length === 0) {
    console.log(chalk.green(`✓ All ${lockfile.artifacts.length} artifact(s) passed audit.`));
    return;
  }

  console.log(chalk.bold(`\nAudit found ${issues.length} issue(s):\n`));
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
    console.log(`  ${icon} ${chalk.cyan(issue.id)}: ${issue.issue}`);
  }
  if (issues.some(i => i.severity === 'error')) process.exit(1);
}
