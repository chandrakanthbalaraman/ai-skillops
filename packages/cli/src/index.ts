#!/usr/bin/env node
import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { runInit } from './commands/init.js';
import { runSearch } from './commands/search.js';
import { runInstall } from './commands/install.js';

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

program.parse(process.argv);
