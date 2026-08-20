import { checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { detectStack } from '../detector/stack.js';
import { RegistryCache } from '../cache/registry.js';
import { writeLockfile } from '../lockfile/index.js';
import { installArtifact } from './install.js';
import type { Artifact } from '@ai-skillops/shared';

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export async function runInit(cwd: string): Promise<void> {
  console.log(chalk.bold('\nai-skillops init\n'));

  // Show which context files were used to understand the project
  const contextFiles = [
    'blueprint/project-plan.md',
    'blueprint/context/project-overview.md',
    'AGENTS.md',
    'CLAUDE.md',
  ];
  const found = (await Promise.all(contextFiles.map(async f => ({ f, ok: await fileExists(join(cwd, f)) }))))
    .filter(x => x.ok)
    .map(x => chalk.dim(x.f));

  if (found.length > 0) {
    console.log(`${chalk.dim('Reading project context from:')} ${found.join(chalk.dim(', '))}`);
  }

  const spinner = ora('Analyzing project stack...').start();
  const stack = await detectStack(cwd);

  const detected = [
    stack.language && chalk.cyan(stack.language),
    stack.framework && chalk.magenta(stack.framework),
    stack.database && chalk.yellow(`db:${stack.database}`),
    ...stack.agents.map(a => chalk.blue(a)),
  ].filter(Boolean);

  spinner.succeed(`Understood: ${detected.join(chalk.dim(' · '))}`);
  console.log();

  const cache = new RegistryCache();
  await cache.ensureFresh();

  const byStack = cache.getForStack(stack);
  const candidates = (byStack.length > 0 ? byStack : cache.getAll()).slice(0, 20);

  if (candidates.length === 0) {
    console.log(chalk.yellow('No artifacts found. Run `ai-skillops sync` to refresh the registry.'));
    return;
  }

  const scoreBar = (n: number) => {
    const filled = Math.round(n / 10);
    return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(10 - filled));
  };

  const kindLabel: Record<string, string> = {
    skill: chalk.cyan('skill  '),
    rule: chalk.magenta('rule   '),
    context: chalk.blue('context'),
    command: chalk.yellow('command'),
    workflow: chalk.green('workflow'),
  };

  const choices = candidates.map(a => ({
    name: `${chalk.bold(a.name.padEnd(32))} ${kindLabel[a.kind] ?? a.kind}  ${scoreBar(a.safety_score)} ${chalk.dim(String(a.safety_score))}`,
    value: a,
    checked: a.combined_score >= 80,
  }));

  console.log(chalk.dim(`Found ${candidates.length} artifact(s) for your stack. Pre-selected: safety ≥ 80.\n`));

  const selected = await checkbox<Artifact>({
    message: 'Select artifacts to install:',
    choices,
  });

  if (selected.length === 0) {
    console.log('Nothing selected. Exiting.');
    return;
  }

  const lockfileEntries = [];
  for (const artifact of selected) {
    const entry = await installArtifact(artifact, cwd, stack);
    if (entry) lockfileEntries.push(entry);
  }

  await writeLockfile(cwd, {
    lockVersion: 1,
    generated: new Date().toISOString(),
    project: stack,
    artifacts: lockfileEntries,
  });

  console.log(chalk.green(`\n✓ Installed ${lockfileEntries.length} artifact(s):`));
  for (const e of lockfileEntries) {
    console.log(`  ${chalk.cyan(e.kind.padEnd(9))} ${chalk.bold(e.id.split('/').pop() ?? e.id)}`);
  }
  console.log(chalk.dim('\nai-skillops.lock.yaml written — commit this file to git.'));
}
