import * as cheerio from 'cheerio';

export interface SkillsShEntry {
  owner: string;
  repo: string;
  skillName: string;
  installs: number;
  githubUrl: string;
}

function parseInstallCount(raw: string): number {
  const cleaned = raw.replace(/,/g, '').toUpperCase();
  if (cleaned.endsWith('M')) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith('K')) return parseFloat(cleaned) * 1_000;
  return parseInt(cleaned, 10) || 0;
}

export function parseLeaderboardHtml(html: string): SkillsShEntry[] {
  const $ = cheerio.load(html);
  const entries: SkillsShEntry[] = [];

  // Skills.sh lists entries as: skill-name | owner/repo | install-count
  // Pattern: text nodes near each other in the leaderboard list
  $('main').find('*').each((_i, el) => {
    const text = $(el).text().trim();
    // Match "owner/repo" pattern
    const repoMatch = text.match(/^([a-z0-9_-]+)\/([a-z0-9_.-]+)$/i);
    if (repoMatch) {
      const owner = repoMatch[1];
      const repo = repoMatch[2];
      const prev = $(el).prev().text().trim();
      const next = $(el).next().text().trim();
      const installsRaw = next || '';
      entries.push({
        owner,
        repo,
        skillName: prev || repo,
        installs: parseInstallCount(installsRaw),
        githubUrl: `https://github.com/${owner}/${repo}`,
      });
    }
  });

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
