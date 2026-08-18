import { Octokit } from '@octokit/rest';
import type { ArtifactKind } from '@ai-skillops/shared';

export interface DetectedFile {
  path: string;
  content: string;
  kind: ArtifactKind;
}

export const ARTIFACT_PATTERNS: Array<{ pattern: RegExp; kind: ArtifactKind }> = [
  { pattern: /^SKILL\.md$/i, kind: 'skill' },
  { pattern: /^AGENTS\.md$/i, kind: 'skill' },
  { pattern: /^\.claude\/skills\//i, kind: 'skill' },
  { pattern: /^\.claude\/commands\//i, kind: 'command' },
  { pattern: /^\.cursor\/rules\//i, kind: 'rule' },
  { pattern: /^CLAUDE\.md$/i, kind: 'context' },
  { pattern: /^prompts\//i, kind: 'skill' },
  { pattern: /^workflows\//i, kind: 'workflow' },
];

export function classifyPath(filePath: string): ArtifactKind | null {
  for (const { pattern, kind } of ARTIFACT_PATTERNS) {
    if (pattern.test(filePath)) return kind;
  }
  return null;
}

export async function detectArtifactFiles(
  owner: string,
  repo: string,
  commitSha: string,
  token: string
): Promise<DetectedFile[]> {
  const octokit = new Octokit({ auth: token });
  const results: DetectedFile[] = [];

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: '1',
  });

  const candidates = (tree.tree ?? []).filter(
    (item) => item.type === 'blob' && item.path && classifyPath(item.path) !== null
  );

  await Promise.all(
    candidates.map(async (item) => {
      if (!item.path || !item.sha) return;
      const kind = classifyPath(item.path)!;
      const { data: blob } = await octokit.git.getBlob({
        owner,
        repo,
        file_sha: item.sha,
      });
      const content = Buffer.from(blob.content, 'base64').toString('utf-8');
      results.push({ path: item.path, content, kind });
    })
  );

  return results;
}
