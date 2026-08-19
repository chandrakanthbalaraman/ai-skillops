#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { runInit } from './commands/init.js';
import { runSearch } from './commands/search.js';
import { runInstall } from './commands/install.js';
import { runList } from './commands/list.js';
import { runAudit } from './commands/audit.js';
import { runUpdate } from './commands/update.js';
import { runWhy } from './commands/why.js';
import { runSync } from './commands/sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
) as { version: string };

program
  .name('ai-skillops')
  .version(pkg.version)
  .description('Discover, govern, and install AI engineering skills and workflows');

program
  .command('init')
  .description('Detect stack and install recommended artifacts interactively')
  .action(async () => {
    await runInit(process.cwd());
  });

program
  .command('search <query>')
  .description('Search the registry by keyword')
  .action(async (query: string) => {
    await runSearch(query);
  });

program
  .command('install <id>')
  .description('Install a specific artifact by id')
  .action(async (id: string) => {
    await runInstall(id, process.cwd());
  });

program
  .command('list')
  .description('List installed artifacts in this project')
  .action(async () => {
    await runList(process.cwd());
  });

program
  .command('audit')
  .description('Check installed artifacts for security issues')
  .action(async () => {
    await runAudit(process.cwd());
  });

program
  .command('update')
  .description('Update all installed artifacts to latest approved versions')
  .action(async () => {
    await runUpdate(process.cwd());
  });

program
  .command('why <id>')
  .description('Explain why an artifact was recommended or installed')
  .action(async (id: string) => {
    await runWhy(id, process.cwd());
  });

program
  .command('sync')
  .description('Force-refresh the local registry cache')
  .action(async () => {
    await runSync();
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red('Error:'), (err as Error).message ?? err);
  process.exit(1);
});
