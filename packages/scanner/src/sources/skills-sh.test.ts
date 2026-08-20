import { describe, it, expect } from 'vitest';
import { parseApiPage } from './skills-sh.js';

const mockPage = {
  data: [
    {
      slug: 'next-dev-loop',
      name: 'next-dev-loop',
      source: 'vercel/next.js',
      installs: 8700,
      installUrl: 'https://github.com/vercel/next.js',
    },
    {
      slug: 'find-skills',
      name: 'find-skills',
      source: 'vercel-labs/skills',
      installs: 24531,
      installUrl: 'https://github.com/vercel-labs/skills',
    },
  ],
  pagination: { page: 0, perPage: 500, total: 2, hasMore: false },
};

describe('parseApiPage', () => {
  it('extracts owner, repo, installs from API response', () => {
    const results = parseApiPage(mockPage);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      owner: 'vercel',
      repo: 'next.js',
      skillName: 'next-dev-loop',
      installs: 8700,
      githubUrl: 'https://github.com/vercel/next.js',
    });
    expect(results[1]).toMatchObject({
      owner: 'vercel-labs',
      repo: 'skills',
      installs: 24531,
    });
  });

  it('returns empty array for empty data', () => {
    const results = parseApiPage({ data: [], pagination: { page: 0, perPage: 500, total: 0, hasMore: false } });
    expect(results).toEqual([]);
  });

  it('skips entries with missing or invalid source', () => {
    const results = parseApiPage({
      data: [{ slug: 'bad', name: 'bad', source: '', installs: 0, installUrl: '' }],
      pagination: { page: 0, perPage: 500, total: 1, hasMore: false },
    });
    expect(results).toEqual([]);
  });
});
