import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import chalk from 'chalk';
import type { Artifact, LockfileEntry, StackProfile } from '@ai-skillops/shared';
import { RegistryClient } from '@ai-skillops/registry-client';

function artifactInstallPath(artifact: Artifact, cwd: string): string {
  const base: Record<string, string> = {
    skill: '.claude/skills',
    rule: '.cursor/rules',
    context: '.claude',
    command: '.claude/commands',
    workflow: '.claude/skills/workflows',
    pack: '.claude/skills',
  };
  return join(cwd, base[artifact.kind] ?? '.claude/skills', `${artifact.name}.md`);
}

export async function installArtifact(
  artifact: Artifact,
  cwd: string,
  stack?: StackProfile,
): Promise<LockfileEntry | null> {
  try {
    const destPath = artifactInstallPath(artifact, cwd);
    await mkdir(dirname(destPath), { recursive: true });

    // v1: write a header stub. Content fetching from GitHub source added in v2.
    const content = `# ${artifact.name}\n\n> Installed by ai-skillops v0.1.0\n> Safety score: ${artifact.safety_score}\n`;
    await writeFile(destPath, content, 'utf-8');

    const integrity = `sha256:${createHash('sha256').update(content).digest('hex')}`;

    // Record anonymous install event for popularity scoring
    const url = process.env['AI_SKILLOPS_REGISTRY_URL'];
    const key = process.env['AI_SKILLOPS_ANON_KEY'];
    if (url && key) {
      const client = new RegistryClient(url, key);
      const fingerprint = createHash('sha256')
        .update(`${stack?.language ?? 'unknown'}+${stack?.framework ?? 'unknown'}`)
        .digest('hex');
      await client
        .insertInstallEvent({
          artifact_id: artifact.id,
          stack_fingerprint: fingerprint,
          cli_version: '0.1.0',
        })
        .catch(() => {
          // non-fatal — analytics failure must not block install
        });
    }

    console.log(
      chalk.green(`  ✓ ${artifact.name}`) + chalk.dim(` → ${destPath.replace(cwd, '.')}`),
    );

    return {
      id: artifact.id,
      kind: artifact.kind,
      version: artifact.version,
      source: {
        repository: `https://github.com/placeholder/${artifact.repo_id}`,
        path: artifact.path,
        commit: '0'.repeat(40),
      },
      integrity,
      safetyScore: artifact.safety_score,
    };
  } catch (err) {
    console.error(chalk.red(`  ✗ ${artifact.name}: ${(err as Error).message}`));
    return null;
  }
}

export async function runInstall(id: string, cwd: string): Promise<void> {
  const url = process.env['AI_SKILLOPS_REGISTRY_URL'] ?? '';
  const key = process.env['AI_SKILLOPS_ANON_KEY'] ?? '';
  const client = new RegistryClient(url, key);
  const artifact = await client.getArtifactById(id);
  if (!artifact) {
    console.error(`Artifact not found: ${id}`);
    process.exit(1);
  }
  await installArtifact(artifact, cwd);
}
