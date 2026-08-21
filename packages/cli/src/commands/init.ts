import { checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { detectStack } from '../detector/stack.js';
import { RegistryCache } from '../cache/registry.js';
import { writeLockfile } from '../lockfile/index.js';
import { installArtifact } from './install.js';
import type { Artifact, StackProfile } from '@ai-skillops/shared';

type ArtifactWithCls = Artifact & {
  classifications?: Array<{
    languages: string[];
    frameworks: string[];
    databases: string[];
    agents: string[];
  }>;
};

interface TechCategory {
  name: string;
  value: string;
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
  agents?: string[];
}

const TECH_CATEGORIES: TechCategory[] = [
  { name: 'React / Next.js',         value: 'react',       frameworks: ['react', 'next.js'] },
  { name: 'Vue / Nuxt',              value: 'vue',         frameworks: ['vue', 'nuxt'] },
  { name: 'Angular',                  value: 'angular',     frameworks: ['angular'] },
  { name: 'Svelte',                   value: 'svelte',      frameworks: ['svelte'] },
  { name: 'TypeScript / Node.js',    value: 'typescript',  languages: ['typescript', 'javascript'] },
  { name: 'Python',                   value: 'python',      languages: ['python'] },
  { name: 'Java / Spring Boot',      value: 'java',        languages: ['java', 'kotlin'], frameworks: ['spring-boot'] },
  { name: 'PostgreSQL / Supabase',   value: 'postgresql',  databases: ['postgresql'] },
  { name: 'MySQL',                    value: 'mysql',       databases: ['mysql'] },
  { name: 'MongoDB',                  value: 'mongodb',     databases: ['mongodb'] },
  { name: 'SQLite',                   value: 'sqlite',      databases: ['sqlite'] },
  { name: 'AWS',                      value: 'aws',         frameworks: ['aws'] },
  { name: 'Azure',                    value: 'azure',       frameworks: ['azure'] },
  { name: 'GCP / Firebase',          value: 'gcp',         frameworks: ['gcp', 'firebase'] },
  { name: 'Vercel',                   value: 'vercel',      frameworks: ['vercel'] },
  { name: 'Docker / Kubernetes',     value: 'docker',      frameworks: ['docker', 'kubernetes'] },
  { name: 'Terraform / IaC',         value: 'terraform',   frameworks: ['terraform'] },
  { name: 'GitHub Actions / CI-CD',  value: 'cicd',        frameworks: ['github-actions'] },
  { name: 'GitLab CI',               value: 'gitlab',      frameworks: ['gitlab'] },
  { name: 'Claude Code',             value: 'claude-code', agents: ['claude-code'] },
  { name: 'Cursor',                  value: 'cursor',      agents: ['cursor'] },
  { name: 'Copilot',                 value: 'copilot',     agents: ['copilot'] },
  { name: 'Codex',                   value: 'codex',       agents: ['codex'] },
];

const KIND_CHOICES = [
  { name: `${chalk.cyan('skill')}     — step-by-step agent workflows`,    value: 'skill',    checked: true },
  { name: `${chalk.magenta('rule')}      — coding standards and lint rules`, value: 'rule',     checked: true },
  { name: `${chalk.blue('context')}   — project knowledge for agents`,     value: 'context',  checked: true },
  { name: `${chalk.yellow('command')}   — agent slash commands`,             value: 'command',  checked: true },
  { name: `${chalk.green('workflow')}  — automation and CI pipelines`,      value: 'workflow', checked: true },
];

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

function stackToCategoryValues(stack: StackProfile): string[] {
  const pre: string[] = [];
  const fw = stack.framework?.toLowerCase() ?? '';
  const lang = stack.language?.toLowerCase() ?? '';
  const db = stack.database?.toLowerCase() ?? '';

  if (fw.includes('next') || fw.includes('react')) pre.push('react');
  if (fw.includes('vue') || fw.includes('nuxt')) pre.push('vue');
  if (fw.includes('angular')) pre.push('angular');
  if (fw.includes('svelte')) pre.push('svelte');
  if (lang === 'typescript' || lang === 'javascript') pre.push('typescript');
  if (lang === 'python') pre.push('python');
  if (lang === 'java' || lang === 'kotlin') pre.push('java');
  if (db.includes('postgres')) pre.push('postgresql');
  if (db === 'mysql') pre.push('mysql');
  if (db === 'mongodb') pre.push('mongodb');
  if (db === 'sqlite') pre.push('sqlite');
  for (const agent of stack.agents) {
    if (['claude-code', 'cursor', 'copilot', 'codex'].includes(agent)) pre.push(agent);
  }
  return pre;
}

function artifactMatchesCategories(artifact: ArtifactWithCls, cats: TechCategory[]): boolean {
  if (cats.length === 0) return true;
  const cls = artifact.classifications?.[0];
  if (!cls) return true;
  const empty =
    cls.languages.length === 0 &&
    cls.frameworks.length === 0 &&
    (cls.databases?.length ?? 0) === 0 &&
    (cls.agents?.length ?? 0) === 0;
  if (empty) return true;

  return cats.some(cat =>
    cat.languages?.some(l => cls.languages.includes(l)) ||
    cat.frameworks?.some(f => cls.frameworks.includes(f)) ||
    cat.databases?.some(d => (cls.databases ?? []).includes(d)) ||
    cat.agents?.some(a => (cls.agents ?? []).includes(a)),
  );
}

export async function runInit(cwd: string): Promise<void> {
  console.log(chalk.bold('\nai-skillops init\n'));

  const contextFiles = [
    'blueprint/project-plan.md',
    'blueprint/context/project-overview.md',
    'AGENTS.md',
    'CLAUDE.md',
  ];
  const found = (await Promise.all(contextFiles.map(async f => ({ f, ok: await fileExists(join(cwd, f)) }))))
    .filter(x => x.ok)
    .map(x => chalk.dim(x.f));
  if (found.length > 0) {
    console.log(`${chalk.dim('Reading project context from:')} ${found.join(chalk.dim(', '))}`);
  }

  const spinner = ora('Analyzing project stack...').start();
  const stack = await detectStack(cwd);

  const detected = [
    stack.language && chalk.cyan(stack.language),
    stack.framework && chalk.magenta(stack.framework),
    stack.database && chalk.yellow(`db:${stack.database}`),
    ...stack.agents.map(a => chalk.blue(a)),
  ].filter(Boolean);

  spinner.succeed(`Understood: ${detected.length > 0 ? detected.join(chalk.dim(' · ')) : chalk.dim('(generic project)')}`);
  console.log();

  // ── Step 1: Technology area selection ─────────────────────────────────────
  const preSelected = stackToCategoryValues(stack);
  console.log(chalk.dim('Select the technology areas you want skills for.\nYour project context pre-checked the ones we detected — add or remove freely.\n'));

  const selectedCategories = await checkbox<string>({
    message: 'Technology areas:',
    choices: TECH_CATEGORIES.map(cat => ({
      name: cat.name,
      value: cat.value,
      checked: preSelected.includes(cat.value),
    })),
  });
  console.log();

  // ── Step 2: Artifact kind filter ──────────────────────────────────────────
  const selectedKinds = await checkbox<string>({
    message: 'Artifact types to include:',
    choices: KIND_CHOICES,
  });
  console.log();

  // ── Step 3: Load registry and filter ─────────────────────────────────────
  const cache = new RegistryCache();
  await cache.ensureFresh();

  const activeCats = TECH_CATEGORIES.filter(c => selectedCategories.includes(c.value));
  const allArtifacts = cache.getAll() as ArtifactWithCls[];

  const candidates = allArtifacts
    .filter(a => selectedKinds.length === 0 || selectedKinds.includes(a.kind))
    .filter(a => artifactMatchesCategories(a, activeCats))
    .slice(0, 40);

  if (candidates.length === 0) {
    console.log(chalk.yellow('No artifacts found for these filters. Try broader technology areas or run `ai-skillops sync` to refresh.'));
    return;
  }

  // ── Step 4: Final artifact selection ──────────────────────────────────────
  const scoreBar = (n: number) => {
    const filled = Math.round(n / 10);
    return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(10 - filled));
  };

  const kindLabel: Record<string, string> = {
    skill:    chalk.cyan('skill    '),
    rule:     chalk.magenta('rule     '),
    context:  chalk.blue('context  '),
    command:  chalk.yellow('command  '),
    workflow: chalk.green('workflow '),
  };

  const choices = candidates.map(a => {
    const reviewBadge = a.status === 'pending_review' ? chalk.yellow(' ⚠ unreviewed') : '';
    return {
      name: `${chalk.bold(a.name.padEnd(32))} ${kindLabel[a.kind] ?? a.kind.padEnd(9)}  ${scoreBar(a.safety_score)} ${chalk.dim(String(a.safety_score))}${reviewBadge}`,
      value: a,
      checked: a.combined_score >= 80 && a.status === 'approved',
    };
  });

  console.log(chalk.dim(`Found ${candidates.length} artifact(s) for your selection. Pre-selected: safety score ≥ 80.\n`));

  const selected = await checkbox<Artifact>({
    message: 'Select artifacts to install:',
    choices,
  });

  if (selected.length === 0) {
    console.log('Nothing selected. Exiting.');
    return;
  }

  // ── Step 5: Install and write lockfile ────────────────────────────────────
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
    console.log(`  ${chalk.cyan(e.kind.padEnd(9))} ${chalk.bold(e.id.split('/').pop() ?? e.id)}`);
  }
  console.log(chalk.dim('\nai-skillops.lock.yaml written — commit this file to git.'));
}
