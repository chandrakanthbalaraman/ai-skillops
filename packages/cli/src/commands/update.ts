import chalk from 'chalk';
import ora from 'ora';
import { readLockfile, writeLockfile } from '../lockfile/index.js';
import { RegistryCache } from '../cache/registry.js';
import { installArtifact } from './install.js';
import type { LockfileEntry } from '@ai-skillops/shared';

export async function runUpdate(cwd: string): Promise<void> {
  const lockfile = await readLockfile(cwd);
  if (!lockfile) {
    console.log(chalk.yellow('No lockfile found. Run `ai-skillops init` first.'));
    return;
  }
  const cache = new RegistryCache();
  const spinner = ora('Checking for updates...').start();
  await cache.ensureFresh();
  spinner.stop();

  const newEntries: LockfileEntry[] = [];
  for (const entry of lockfile.artifacts) {
    const latest = cache.getById(entry.id);
    if (latest && latest.version !== entry.version) {
      console.log(chalk.cyan(`  Updating ${entry.id} ${entry.version} → ${latest.version}`));
      const newEntry = await installArtifact(latest, cwd);
      if (!newEntry) {
        console.warn(`  warn: could not update ${entry.id}, keeping existing entry`);
        newEntries.push(entry);
      } else {
        newEntries.push(newEntry);
      }
    } else {
      newEntries.push(entry);
    }
  }

  await writeLockfile(cwd, { ...lockfile, artifacts: newEntries, generated: new Date().toISOString() });
  console.log(chalk.green('\nUpdate complete.'));
}
