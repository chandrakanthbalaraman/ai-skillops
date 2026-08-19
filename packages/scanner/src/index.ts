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

const SUPABASE_URL = process.env['SUPABASE_URL']!;
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
const GITHUB_TOKEN = process.env['GITHUB_TOKEN']!;

async function run(): Promise<void> {
  const client = new RegistryClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log('Scraping skills.sh leaderboard...');
  const leaderboard = await scrapeLeaderboard();
  console.log(`Found ${leaderboard.length} entries`);

  for (const entry of leaderboard) {
    try {
      const repo = await client.upsertRepository({
        github_owner: entry.owner,
        github_repo: entry.repo,
        github_url: entry.githubUrl,
        status: 'scanning',
        source: 'skills_sh',
        skills_sh_installs: entry.installs,
        last_scanned_at: null,
      });

      const branch = await octokit.repos.getBranch({
        owner: entry.owner,
        repo: entry.repo,
        branch: 'main',
      }).catch((err: { status?: number }) => {
        if (err.status === 404) {
          return octokit.repos.getBranch({
            owner: entry.owner,
            repo: entry.repo,
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
        const files = await detectArtifactFiles(entry.owner, entry.repo, commitSha, GITHUB_TOKEN);
        let totalFindings = 0;

        for (const file of files) {
          const safetyResults = scanContent(file.content, file.path);
          const safetyScore = computeSafetyScore(safetyResults);
          const qualityScore = computeQualityScore(file.content);
          const popularityScore = computePopularityScore(entry.installs);
          const combinedScore = computeCombinedScore({ safetyScore, qualityScore, popularityScore });

          const artifact = await client.upsertArtifact({
            repo_id: repo.id,
            kind: file.kind,
            name: file.path.split('/').pop()?.replace(/\.(md|mdc)$/i, '') ?? file.path,
            path: file.path,
            version: '0.1.0',
            status: safetyScore >= 90 && safetyResults.length === 0 ? 'approved' : 'pending_review',
            safety_score: safetyScore,
            quality_score: qualityScore,
            popularity_score: popularityScore,
            combined_score: combinedScore,
          });

          for (const finding of safetyResults) {
            await client.insertFinding({
              scan_id: scan.id,
              artifact_id: artifact.id,
              severity: finding.severity,
              kind: finding.kind,
              file: file.path,
              line: finding.line,
              evidence: finding.evidence,
            });
            totalFindings++;
          }
        }

        await client.completeScan(scan.id, files.length, totalFindings);
        console.log(`done ${entry.owner}/${entry.repo}: ${files.length} artifacts, ${totalFindings} findings`);
      } catch (innerErr) {
        await client.completeScan(scan.id, 0, 0);
        throw innerErr;
      }
    } catch (err) {
      console.error(`fail ${entry.owner}/${entry.repo}: ${(err as Error).message}`);
    }
  }

  console.log('Scanner complete.');
}

run().catch(console.error);
