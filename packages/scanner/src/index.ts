import { Octokit } from '@octokit/rest';
import { scrapeLeaderboard } from './sources/skills-sh.js';
import { detectArtifactFiles } from './sources/github.js';
import { scanContent } from './safety/scanner.js';
import {
  computeSafetyScore,
  computeQualityScore,
  computePopularityScore,
  computeCombinedScore,
} from './scoring/scorer.js';
import { RegistryClient } from '@ai-skillops/registry-client';
import type { Repository, SafetyFinding } from '@ai-skillops/shared';

const SUPABASE_URL = process.env['SUPABASE_URL']!;
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
const GITHUB_TOKEN = process.env['GITHUB_TOKEN']!;

// Tune via env vars without code changes
const BATCH_SIZE = parseInt(process.env['SCANNER_BATCH_SIZE'] ?? '20');
const RESCAN_HOURS = parseInt(process.env['SCANNER_RESCAN_HOURS'] ?? '24');
const CONCURRENCY = parseInt(process.env['SCANNER_CONCURRENCY'] ?? '3');

// Simple concurrency limiter -- no extra dependencies needed
async function runConcurrent<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

function deriveArtifactName(filePath: string, repoName: string): string {
  const parts = filePath.split('/');
  const filename = parts[parts.length - 1];
  const basename = filename.replace(/\.(md|mdc)$/i, '');

  // .claude/skills/my-skill/SKILL.md → "my-skill"
  // .agents/skills/my-skill/SKILL.md → "my-skill"
  if (/^SKILL$/i.test(basename) && parts.length > 1) {
    return parts[parts.length - 2];
  }

  // Root-level meta-files (AGENTS.md, CLAUDE.md, SKILL.md at root) → repo name
  // These are the "one skill per repo" pattern common in skills.sh
  if (parts.length === 1 && /^(AGENTS|CLAUDE|SKILL|CURSOR|GEMINI)$/i.test(basename)) {
    return repoName;
  }

  return basename;
}

async function scanRepo(
  client: RegistryClient,
  octokit: Octokit,
  repo: Repository,
): Promise<void> {
  await client.updateRepository(repo.id, { status: 'scanning' });

  const branch = await octokit.repos
    .getBranch({ owner: repo.github_owner, repo: repo.github_repo, branch: 'main' })
    .catch((err: { status?: number }) => {
      if (err.status === 404) {
        return octokit.repos.getBranch({
          owner: repo.github_owner,
          repo: repo.github_repo,
          branch: 'master',
        });
      }
      throw err;
    });

  const commitSha = branch.data.commit.sha;

  const scan = await client.insertScan({
    repo_id: repo.id,
    commit_sha: commitSha,
    completed_at: null,
    status: 'running',
    artifacts_found: 0,
    findings_count: 0,
  });

  try {
    const files = await detectArtifactFiles(
      repo.github_owner,
      repo.github_repo,
      commitSha,
      GITHUB_TOKEN,
    );

    const pendingFindings: Omit<SafetyFinding, 'id'>[] = [];

    for (const file of files) {
      const safetyResults = scanContent(file.content, file.path);
      const safetyScore = computeSafetyScore(safetyResults);
      const qualityScore = computeQualityScore(file.content);
      const popularityScore = computePopularityScore(repo.skills_sh_installs);
      const combinedScore = computeCombinedScore({ safetyScore, qualityScore, popularityScore });

      // Preserve human moderation status on re-scan
      const existingArtifact = await client.getArtifactByRepoAndPath(repo.id, file.path);
      const status = existingArtifact?.status ??
        (safetyScore >= 90 && safetyResults.length === 0 ? 'approved' : 'pending_review');

      const artifact = await client.upsertArtifact({
        repo_id: repo.id,
        kind: file.kind,
        name: deriveArtifactName(file.path, repo.github_repo),
        path: file.path,
        version: '0.1.0',
        status,
        safety_score: safetyScore,
        quality_score: qualityScore,
        popularity_score: popularityScore,
        combined_score: combinedScore,
      });

      // Collect findings for batch insert instead of one-by-one
      for (const finding of safetyResults) {
        pendingFindings.push({
          scan_id: scan.id,
          artifact_id: artifact.id,
          severity: finding.severity,
          kind: finding.kind,
          file: file.path,
          line: finding.line,
          evidence: finding.evidence,
        });
      }

      // Write stack classification
      const content = file.content.toLowerCase();
      const languages: string[] = [];
      const frameworks: string[] = [];
      const databases: string[] = [];
      const agents: string[] = [];

      if (file.path.startsWith('.claude/')) agents.push('claude-code');
      if (file.path.startsWith('.cursor/')) agents.push('cursor');
      if (file.path.startsWith('.github/') || content.includes('copilot')) agents.push('copilot');

      // Languages
      if (content.includes('typescript') || content.includes(' tsx') || content.includes('.tsx')) languages.push('typescript');
      if (content.includes('javascript') || content.includes(' jsx') || content.includes('.jsx')) languages.push('javascript');
      if (content.includes('python') || content.includes('pip ') || content.includes('fastapi') || content.includes('django') || content.includes('flask')) languages.push('python');
      if (content.includes('java') || content.includes('spring') || content.includes('maven') || content.includes('gradle')) languages.push('java');
      if (content.includes('kotlin')) languages.push('kotlin');

      // Frameworks
      if (content.includes('next.js') || content.includes('nextjs') || content.includes('next dev')) frameworks.push('next.js');
      else if (content.includes('react')) frameworks.push('react');
      if (content.includes('angular') || content.includes('@angular')) frameworks.push('angular');
      if (content.includes('vue')) frameworks.push('vue');
      if (content.includes('fastapi')) frameworks.push('fastapi');
      else if (content.includes('flask')) frameworks.push('flask');
      else if (content.includes('django')) frameworks.push('django');
      if (content.includes('spring boot') || content.includes('spring-boot') || content.includes('springboot')) frameworks.push('spring-boot');
      else if (content.includes('spring')) frameworks.push('spring');

      // Databases
      if (content.includes('postgres') || content.includes('postgresql')) databases.push('postgresql');
      if (content.includes('mysql')) databases.push('mysql');
      if (content.includes('oracle') || content.includes('pl/sql')) databases.push('oracle');
      if (content.includes('mongodb') || content.includes('mongoose')) databases.push('mongodb');
      if (content.includes('sqlite')) databases.push('sqlite');
      if (content.includes('sql') && databases.length === 0) databases.push('sql');

      await client.upsertClassification({
        artifact_id: artifact.id,
        languages,
        frameworks,
        framework_versions: {},
        runtimes: [],
        build_tools: [],
        databases,
        architectures: [],
        agents,
      });
    }

    // Batch insert all findings in one DB round-trip
    await client.insertFindings(pendingFindings);

    await client.completeScan(scan.id, files.length, pendingFindings.length);
    await client.updateRepository(repo.id, {
      status: 'active',
      last_scanned_at: new Date().toISOString(),
    });
  } catch (err) {
    // Mark scan failed and reset repo so next batch retries it
    await client.failScan(scan.id);
    await client.updateRepository(repo.id, { status: 'pending' });
    throw err;
  }
}

async function run(): Promise<void> {
  const client = new RegistryClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // ── Phase 1: Seed ────────────────────────────────────────────────────────
  // Fast upsert of leaderboard metadata — no GitHub API calls.
  // Requires VERCEL_OIDC_TOKEN; skipped gracefully when not set so the
  // scanner can run on GitHub Actions with only GITHUB_TOKEN + SUPABASE_*.
  const hasToken = !!process.env['VERCEL_OIDC_TOKEN'];
  console.log(
    hasToken
      ? 'Phase 1: seeding repositories from skills.sh…'
      : 'Phase 1: skipped (no VERCEL_OIDC_TOKEN — set it to sync install counts)',
  );
  const leaderboard = hasToken ? await scrapeLeaderboard() : [];
  console.log(hasToken ? `  ${leaderboard.length} repos on leaderboard` : '');

  const allRepos = await client.getAllRepositories();
  const byUrl = new Map(allRepos.map(r => [r.github_url, r]));

  let seedNew = 0;
  let seedUpdate = 0;
  for (const entry of leaderboard) {
    const existing = byUrl.get(entry.githubUrl);
    if (existing) {
      await client.updateRepositoryInstalls(existing.id, entry.installs);
      seedUpdate++;
    } else {
      await client.upsertRepository({
        github_owner: entry.owner,
        github_repo: entry.repo,
        github_url: entry.githubUrl,
        status: 'pending',
        source: 'skills_sh',
        skills_sh_installs: entry.installs,
        last_scanned_at: null,
      });
      seedNew++;
    }
  }
  console.log(`  seeded: ${seedNew} new, ${seedUpdate} install-count refreshes`);

  // ── Phase 2: Scan ─────────────────────────────────────────────────────────
  // Pick the BATCH_SIZE repos with the oldest last_scanned_at (nulls first),
  // skipping any scanned within RESCAN_HOURS. Process CONCURRENCY at a time.
  console.log(`\nPhase 2: scanning (batch=${BATCH_SIZE}, concurrency=${CONCURRENCY}, rescan_after=${RESCAN_HOURS}h)…`);
  const toScan = await client.getStalestRepositories(BATCH_SIZE, RESCAN_HOURS);
  console.log(`  ${toScan.length} repos need scanning`);

  if (toScan.length === 0) {
    console.log('All repos are up to date.');
    return;
  }

  let done = 0;
  let failed = 0;

  await runConcurrent(toScan, CONCURRENCY, async (repo) => {
    const label = `${repo.github_owner}/${repo.github_repo}`;
    try {
      await scanRepo(client, octokit, repo);
      done++;
      console.log(`  [${done + failed}/${toScan.length}] ✓ ${label}`);
    } catch (err) {
      failed++;
      console.error(`  [${done + failed}/${toScan.length}] ✗ ${label}: ${(err as Error).message}`);
    }
  });

  console.log(`\nScanner complete. ✓ ${done} scanned, ✗ ${failed} failed`);
  if (failed > 0) {
    console.log('  Failed repos are reset to "pending" and will be retried next run.');
  }
}

// Only auto-run when executed directly (not when imported)
const isMain = import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
  run().catch(console.error);
}

export { run };
