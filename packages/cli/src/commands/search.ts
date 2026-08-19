import chalk from 'chalk';
import { RegistryCache } from '../cache/registry.js';

export async function runSearch(query: string): Promise<void> {
  const cache = new RegistryCache();
  await cache.ensureFresh();
  const results = cache.search(query);

  if (results.length === 0) {
    console.log(`No artifacts found for "${query}"`);
    return;
  }

  console.log(chalk.bold(`\nSearch results for "${query}":\n`));
  for (const a of results) {
    console.log(
      `  ${chalk.cyan(a.id)}\n` +
        `  ${a.name}  ${chalk.dim(`[${a.kind}]`)}  Safety ${a.safety_score}  Score ${a.combined_score}\n`,
    );
  }
}
