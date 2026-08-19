#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { detectStack } from './detector/stack.js';
import { readLockfile, writeLockfile } from './lockfile/index.js';

const program = new Command();

program
  .name('ai-skillops')
  .description('Discover and install AI agent skills for your project')
  .version('0.1.0');

program
  .command('init')
  .description('Detect the project stack and initialize ai-skillops.lock.yaml')
  .action(async () => {
    const cwd = process.cwd();
    console.log(chalk.blue('Detecting project stack...'));

    const stack = await detectStack(cwd);

    console.log(chalk.green('Stack detected:'));
    console.log(`  Language:   ${stack.language ?? 'unknown'}`);
    console.log(`  Framework:  ${stack.framework ?? 'unknown'}`);
    console.log(`  Build tool: ${stack.buildTool ?? 'unknown'}`);
    if (stack.agents.length > 0) {
      console.log(`  Agents:     ${stack.agents.join(', ')}`);
    }

    const existing = await readLockfile(cwd);
    if (existing) {
      console.log(chalk.yellow('ai-skillops.lock.yaml already exists — skipping write.'));
      return;
    }

    const lockfile = {
      lockVersion: 1 as const,
      generated: new Date().toISOString(),
      project: stack,
      artifacts: [],
    };

    await writeLockfile(cwd, lockfile);
    console.log(chalk.green('Created ai-skillops.lock.yaml'));
  });

program
  .command('status')
  .description('Show the current lockfile status')
  .action(async () => {
    const cwd = process.cwd();
    const lockfile = await readLockfile(cwd);
    if (!lockfile) {
      console.log(chalk.yellow('No ai-skillops.lock.yaml found. Run `ai-skillops init` first.'));
      return;
    }

    console.log(chalk.green('ai-skillops.lock.yaml'));
    console.log(`  Generated:  ${lockfile.generated}`);
    console.log(`  Language:   ${lockfile.project.language ?? 'unknown'}`);
    console.log(`  Framework:  ${lockfile.project.framework ?? 'unknown'}`);
    console.log(`  Artifacts:  ${lockfile.artifacts.length}`);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
