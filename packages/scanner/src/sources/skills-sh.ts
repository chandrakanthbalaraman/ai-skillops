import * as cheerio from 'cheerio';

export interface SkillsShEntry {
  owner: string;
  repo: string;
  skillName: string;
  installs: number;
  githubUrl: string;
}

export function parseInstallCount(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim().toUpperCase();
  if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1_000_000);
  if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1_000);
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

export function parseLeaderboardHtml(html: string): SkillsShEntry[] {
  const $ = cheerio.load(html);
  const entries: SkillsShEntry[] = [];
  const seen = new Set<string>();

  // Strategy 1: find explicit github.com links (most reliable)
  $('a[href*="github.com"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/github\.com\/([a-z0-9_-]+)\/([a-z0-9_.-]+)/i);
    if (!match) return;
    const [, owner, repo] = match;
    const key = `${owner}/${repo}`;
    if (seen.has(key)) return;
    seen.add(key);

    // Walk siblings / parent to find skill name and install count
    const row = $(el).closest('tr, li, [class*="row"], [class*="item"]');
    const rowText = row.text();
    const skillName = $(el).text().trim() || repo;

    // Find install count: a number optionally followed by K or M
    const countMatch = rowText.match(/(\d[\d.,]*\s*[KkMm]?)\s*installs?/i)
      ?? rowText.match(/(\d[\d.,]*\s*[KkMm])\b/)
      ?? rowText.match(/\b(\d[\d,]{2,})\b/);
    const installs = countMatch ? parseInstallCount(countMatch[1]) : 0;

    entries.push({ owner, repo, skillName, installs, githubUrl: `https://github.com/${owner}/${repo}` });
  });

  if (entries.length > 0) return entries;

  // Strategy 2: scan all text for owner/repo patterns then find nearby numbers
  const body = $('body').text();
  const repoPattern = /([a-z0-9_-]{2,}\/[a-z0-9_.-]{2,})/gi;
  let m: RegExpExecArray | null;
  while ((m = repoPattern.exec(body)) !== null) {
    const parts = m[1].split('/');
    if (parts.length !== 2) continue;
    const [owner, repo] = parts;
    if (['http', 'https', 'node_modules', 'usr', 'etc'].includes(owner)) continue;
    const key = `${owner}/${repo}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Grab up to 80 chars after the match to find an install count
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 80);
    const countMatch = after.match(/(\d[\d.,]*\s*[KkMm]?\b)/);
    const installs = countMatch ? parseInstallCount(countMatch[1]) : 0;

    entries.push({ owner, repo, skillName: repo, installs, githubUrl: `https://github.com/${owner}/${repo}` });
  }

  return entries;
}

export async function scrapeLeaderboard(): Promise<SkillsShEntry[]> {
  const response = await fetch('https://skills.sh/', {
    headers: { 'User-Agent': 'ai-skillops-scanner/0.1.0' },
  });
  if (!response.ok) throw new Error(`skills.sh returned ${response.status}`);
  const html = await response.text();
  return parseLeaderboardHtml(html);
}
