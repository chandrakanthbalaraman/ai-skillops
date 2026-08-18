import { describe, it, expect } from 'vitest';
import { parseLeaderboardHtml } from './skills-sh.js';

describe('parseLeaderboardHtml', () => {
  it('extracts entries from leaderboard HTML', () => {
    const html = `
      <main>
        <div>find-skills</div>
        <div>vercel-labs/skills</div>
        <div>3.0M</div>
      </main>
    `;
    const results = parseLeaderboardHtml(html);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for empty HTML', () => {
    const results = parseLeaderboardHtml('<main></main>');
    expect(results).toEqual([]);
  });
});
