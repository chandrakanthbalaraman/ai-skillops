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
  installUrl: string | null;
  sourceType?: string;
  isDuplicate?: boolean;
}

interface ApiPage {
  data: ApiSkill[];
  pagination: { page: number; perPage: number; total: number; hasMore: boolean };
}

interface CuratedOwnerGroup {
  owner: string;
  totalInstalls: number;
  skills: ApiSkill[];
}

interface CuratedResponse {
  data: CuratedOwnerGroup[];
}

interface SearchResponse {
  data: ApiSkill[];
}

function parseApiSkill(skill: ApiSkill): SkillsShEntry | null {
  // Only handle GitHub-backed skills — well-known sources have no repo to scan
  if (skill.isDuplicate) return null;
  const url = skill.installUrl;
  if (!url?.startsWith('https://github.com/')) return null;
  const path = url.replace('https://github.com/', '').split('?')[0]!;
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  return {
    owner: owner!,
    repo: repo!,
    skillName: skill.name ?? skill.slug,
    installs: skill.installs ?? 0,
    githubUrl: `https://github.com/${owner}/${repo}`,
  };
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env['VERCEL_OIDC_TOKEN']}`,
    'User-Agent': 'ai-skillops-scanner/0.1.0',
  };
}

async function checkOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`skills.sh ${label} ${res.status}: ${text.slice(0, 200)}`);
  }
}

// Existing: paginated all-time leaderboard
export async function scrapeLeaderboard(): Promise<SkillsShEntry[]> {
  const token = process.env['VERCEL_OIDC_TOKEN'];
  if (!token) return [];

  const entries: SkillsShEntry[] = [];
  let page = 0;

  while (true) {
    const url = `https://skills.sh/api/v1/skills?view=all-time&per_page=500&page=${page}`;
    const res = await fetch(url, { headers: authHeaders() });
    await checkOk(res, 'leaderboard');

    const body = (await res.json()) as ApiPage;
    for (const skill of body.data ?? []) {
      const entry = parseApiSkill(skill);
      if (entry) entries.push(entry);
    }

    if (!body.pagination?.hasMore) break;
    page++;
  }

  return entries;
}

// Official curated set: ~342 first-party skills from 87+ orgs (Supabase, Vercel, etc.)
// One request — no pagination.
export async function scrapeCurated(): Promise<SkillsShEntry[]> {
  const token = process.env['VERCEL_OIDC_TOKEN'];
  if (!token) return [];

  const res = await fetch('https://skills.sh/api/v1/skills/curated', { headers: authHeaders() });
  await checkOk(res, 'curated');

  const body = (await res.json()) as CuratedResponse;
  const entries: SkillsShEntry[] = [];

  for (const group of body.data ?? []) {
    for (const skill of group.skills ?? []) {
      const entry = parseApiSkill(skill);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

// Semantic search: multi-word queries use embeddings, single-word uses fuzzy.
// Pass tech-area queries to discover skills.sh doesn't surface on the leaderboard.
export async function scrapeSearch(queries: string[]): Promise<SkillsShEntry[]> {
  const token = process.env['VERCEL_OIDC_TOKEN'];
  if (!token) return [];

  const seen = new Set<string>();
  const entries: SkillsShEntry[] = [];

  for (const q of queries) {
    const url = `https://skills.sh/api/v1/skills/search?q=${encodeURIComponent(q)}&limit=200`;
    const res = await fetch(url, { headers: authHeaders() });

    // Treat search errors as soft failures — don't abort the whole run
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.log(`  skills.sh search "${q}" failed ${res.status}: ${text.slice(0, 100)}`);
      continue;
    }

    const body = (await res.json()) as SearchResponse;
    for (const skill of body.data ?? []) {
      const key = `${skill.source ?? ''}/${skill.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = parseApiSkill(skill);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

// Parses a leaderboard/search/curated API response body — kept for unit tests.
export function parseApiPage(body: unknown): SkillsShEntry[] {
  const page = body as ApiPage;
  const entries: SkillsShEntry[] = [];
  for (const skill of page.data ?? []) {
    const entry = parseApiSkill(skill);
    if (entry) entries.push(entry);
  }
  return entries;
}
