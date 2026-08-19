import chalk from 'chalk';
import ora from 'ora';
import { RegistryCache } from '../cache/registry.js';

export async function runSync(): Promise<void> {
  const spinner = ora('Syncing registry cache...').start();
  const cache = new RegistryCache();
  await cache.sync();
  spinner.succeed(chalk.green('Registry cache updated.'));
}
