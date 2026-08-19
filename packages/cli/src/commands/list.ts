import chalk from 'chalk';
import { readLockfile } from '../lockfile/index.js';

export async function runList(cwd: string): Promise<void> {
  const lockfile = await readLockfile(cwd);
  if (!lockfile || lockfile.artifacts.length === 0) {
    console.log('No artifacts installed. Run `ai-skillops init`.');
    return;
  }
  console.log(chalk.bold(`\n${lockfile.artifacts.length} artifact(s) installed:\n`));
  for (const a of lockfile.artifacts) {
    console.log(
      `  ${chalk.cyan(a.id)}  ${chalk.dim(`[${a.kind}] v${a.version} safety:${a.safetyScore}`)}`,
    );
  }
}
