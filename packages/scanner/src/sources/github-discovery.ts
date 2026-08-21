import { Octokit } from '@octokit/rest';

export interface DiscoveredRepo {
  owner: string;
  repo: string;
  githubUrl: string;
  matchedKeyword: string;
}

// Skill file patterns to search for on GitHub
const SKILL_FILES = ['AGENTS.md', 'CLAUDE.md', 'SKILL.md'];

// GitHub topics used by skill/rule/context authors to self-label their repos.
// Topic search is ~10x faster than code search and targets intentional publishers.
const TOPIC_QUERIES = [
  'topic:claude-code',
  'topic:cursor-rules',
  'topic:ai-skill',
  'topic:claude-skill',
  'topic:agents-md',
  'topic:copilot-instructions',
  'topic:ai-agents',
  'topic:claude-code-skills',
];

export async function searchReposByTopics(
  octokit: Octokit,
  limitPerQuery = 30,
): Promise<DiscoveredRepo[]> {
  const seen = new Set<string>();
  const results: DiscoveredRepo[] = [];

  for (const q of TOPIC_QUERIES) {
    try {
      const res = await octokit.rest.search.repos({
        q,
        sort: 'stars',
        order: 'desc',
        per_page: limitPerQuery,
      });

      for (const item of res.data.items) {
        const owner = item.owner?.login;
        const repo = item.name;
        if (!owner) continue;
        const key = `${owner}/${repo}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          owner,
          repo,
          githubUrl: `https://github.com/${owner}/${repo}`,
          matchedKeyword: q,
        });
      }
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e.status === 403) {
        console.log(`  Rate limited — pausing 60s...`);
        await sleep(60_000);
      } else {
        console.log(`  Topic search failed for "${q}": ${e.message ?? String(err)}`);
      }
    }
    await sleep(2_000);
  }

  return results;
}

// Keyword sets for each tech category
const DISCOVERY_QUERIES: Array<{ keyword: string; techHint: string }> = [
  { keyword: 'java spring-boot',       techHint: 'java'        },
  { keyword: 'java springboot',        techHint: 'java'        },
  { keyword: 'java microservice',      techHint: 'java'        },
  { keyword: 'kotlin spring',          techHint: 'kotlin'      },
  { keyword: 'python fastapi',         techHint: 'python'      },
  { keyword: 'python django',          techHint: 'python'      },
  { keyword: 'python flask',           techHint: 'python'      },
  { keyword: 'terraform aws',          techHint: 'terraform'   },
  { keyword: 'docker kubernetes',      techHint: 'docker'      },
  { keyword: 'github actions workflow', techHint: 'cicd'       },
  { keyword: 'aws lambda',             techHint: 'aws'         },
  { keyword: 'azure functions',        techHint: 'azure'       },
  { keyword: 'react nextjs',           techHint: 'react'       },
  { keyword: 'vue nuxt',               techHint: 'vue'         },
  { keyword: 'angular typescript',     techHint: 'angular'     },
  { keyword: 'rust cargo',             techHint: 'rust'        },
  { keyword: 'golang go',              techHint: 'go'          },
];

// Pause between GitHub search requests to respect rate limits (30 req/min authenticated)
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function discoverReposFromGitHub(
  octokit: Octokit,
  limitPerQuery = 10,
): Promise<DiscoveredRepo[]> {
  const seen = new Set<string>();
  const results: DiscoveredRepo[] = [];

  for (const { keyword, techHint } of DISCOVERY_QUERIES) {
    for (const filename of SKILL_FILES) {
      const q = `filename:${filename} ${keyword} in:file`;
      try {
        const res = await octokit.rest.search.code({
          q,
          per_page: limitPerQuery,
        });

        for (const item of res.data.items) {
          const owner = item.repository.owner.login;
          const repo = item.repository.name;
          const key = `${owner}/${repo}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            owner,
            repo,
            githubUrl: `https://github.com/${owner}/${repo}`,
            matchedKeyword: `${keyword} (${filename})`,
          });
        }
      } catch (err) {
        // 422 = query too complex, 403 = rate limit — log and continue
        const e = err as { status?: number; message?: string };
        if (e.status === 403) {
          console.log(`  Rate limited — pausing 60s before continuing...`);
          await sleep(60_000);
        } else {
          console.log(`  Search failed for "${q}": ${e.message ?? String(err)}`);
        }
      }

      // 2s between requests to stay well under 30/min
      await sleep(2_000);
    }
  }

  return results;
}

// Convenience: discover only for specific tech areas
export async function discoverReposForTech(
  octokit: Octokit,
  techHints: string[],
  limitPerQuery = 10,
): Promise<DiscoveredRepo[]> {
  const queries = DISCOVERY_QUERIES.filter(q => techHints.includes(q.techHint));
  const seen = new Set<string>();
  const results: DiscoveredRepo[]= [];

  for (const { keyword, techHint } of queries) {
    for (const filename of SKILL_FILES) {
      const q = `filename:${filename} ${keyword} in:file`;
      try {
        const res = await octokit.rest.search.code({
          q,
          per_page: limitPerQuery,
        });

        for (const item of res.data.items) {
          const owner = item.repository.owner.login;
          const repo = item.repository.name;
          const key = `${owner}/${repo}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            owner,
            repo,
            githubUrl: `https://github.com/${owner}/${repo}`,
            matchedKeyword: `${techHint}: ${keyword} (${filename})`,
          });
        }
      } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status === 403) {
          console.log(`  Rate limited — pausing 60s...`);
          await sleep(60_000);
        } else {
          console.log(`  Search failed for "${q}": ${e.message ?? String(err)}`);
        }
      }
      await sleep(2_000);
    }
  }

  return results;
}
