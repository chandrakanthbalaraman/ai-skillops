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

  const all = cache.getAll();
  const choices = all.slice(0, 10).map(a => ({
    name: `${a.name}  ${chalk.dim(`Safety ${a.safety_score}`)}`,
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

  console.log(chalk.green(`\nInstalled ${lockfileEntries.length} artifact(s).`));
  console.log(chalk.dim('ai-skillops.lock.yaml written — commit this file to git.'));
}
