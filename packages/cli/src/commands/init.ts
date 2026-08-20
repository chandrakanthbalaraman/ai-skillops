import { checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { detectStack } from '../detector/stack.js';
import { RegistryCache } from '../cache/registry.js';
import { writeLockfile } from '../lockfile/index.js';
import { installArtifact } from './install.js';
import type { Artifact } from '@ai-skillops/shared';

export async function runInit(cwd: string): Promise<void> {
  console.log(chalk.bold('\nai-skillops init\n'));

  const spinner = ora('Detecting project stack...').start();
  const stack = await detectStack(cwd);
  spinner.succeed(
    `Detected: ${[stack.language, stack.framework, ...stack.agents].filter(Boolean).join(' · ')}`,
  );

  const cache = new RegistryCache();
  await cache.ensureFresh();

  const byStack = cache.getForStack(stack);
  const candidates = (byStack.length > 0 ? byStack : cache.getAll()).slice(0, 20);

  const scoreBar = (n: number) => {
    const filled = Math.round(n / 10);
    return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(10 - filled));
  };

  const kindLabel: Record<string, string> = {
    skill: chalk.cyan('skill'),
    rule: chalk.magenta('rule'),
    context: chalk.blue('context'),
    command: chalk.yellow('command'),
    workflow: chalk.green('workflow'),
  };

  const choices = candidates.map(a => ({
    name: `${chalk.bold(a.name.padEnd(30))} ${kindLabel[a.kind] ?? a.kind}  ${scoreBar(a.safety_score)} ${chalk.dim(String(a.safety_score))}`,
    value: a,
    checked: a.combined_score >= 80,
  }));

  if (choices.length === 0) {
    console.log(
      chalk.yellow('No artifacts found. Run `ai-skillops sync` to refresh the registry.'),
    );
    return;
  }

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
    console.log(`  ${chalk.cyan(e.kind)}  ${chalk.bold(e.id.split('/').pop() ?? e.id)}`);
  }
  console.log(chalk.dim('\nai-skillops.lock.yaml written — commit this file to git.'));
}
