export interface SkillsShEntry {
  owner: string;
  repo: string;
  skillName: string;
  installs: number;
  githubUrl: string;
}

interface ApiSkill {
  slug: string;
  name: string;
  source: string;
  installs: number;
  installUrl: string;
}

interface ApiPage {
  data: ApiSkill[];
  pagination: { page: number; perPage: number; total: number; hasMore: boolean };
}

export function parseApiPage(body: unknown): SkillsShEntry[] {
  const page = body as ApiPage;
  const entries: SkillsShEntry[] = [];
  for (const skill of page.data ?? []) {
    const parts = skill.source?.split('/');
    if (!parts || parts.length < 2) continue;
    const [owner, repo] = parts;
    if (!owner || !repo) continue;
    entries.push({
      owner,
      repo,
      skillName: skill.name ?? skill.slug,
      installs: skill.installs ?? 0,
      githubUrl: skill.installUrl ?? `https://github.com/${owner}/${repo}`,
    });
  }
  return entries;
}

export async function scrapeLeaderboard(): Promise<SkillsShEntry[]> {
  const token = process.env['VERCEL_OIDC_TOKEN'];
  if (!token) return [];

  const entries: SkillsShEntry[] = [];
  let page = 0;

  while (true) {
    const url = `https://skills.sh/api/v1/skills?view=all-time&per_page=500&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'ai-skillops-scanner/0.1.0',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`skills.sh API ${res.status}: ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as ApiPage;
    entries.push(...parseApiPage(body));

    if (!body.pagination?.hasMore) break;
    page++;
  }

  return entries;
}
