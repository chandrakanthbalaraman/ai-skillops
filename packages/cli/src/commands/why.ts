import chalk from 'chalk';
import { readLockfile } from '../lockfile/index.js';
import { RegistryCache } from '../cache/registry.js';

export async function runWhy(id: string, cwd: string): Promise<void> {
  const lockfile = await readLockfile(cwd);
  const entry = lockfile?.artifacts.find(a => a.id === id);
  const cache = new RegistryCache();
  const artifact = cache.getById(id);

  console.log(chalk.bold(`\nwhy ${id}\n`));
  if (entry) {
    console.log(`  Installed: yes (${entry.kind} v${entry.version})`);
    console.log(`  Safety score: ${entry.safetyScore}/100`);
    console.log(`  Pinned commit: ${entry.source.commit.slice(0, 8)}`);
  } else {
    console.log('  Not currently installed in this project.');
  }
  if (artifact) {
    console.log(`  Registry score: ${artifact.combined_score}/100`);
    console.log(`  Status: ${artifact.status}`);
  }
}
