import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistryClient } from './client.js';

// Mock the Supabase module
vi.mock('@supabase/supabase-js', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockOnConflict = vi.fn().mockReturnThis();
  const mockContains = vi.fn().mockReturnThis();
  const mockIlike = vi.fn().mockReturnThis();

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    upsert: mockUpsert,
    update: mockUpdate,
  }));

  mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    ilike: mockIlike,
    contains: mockContains,
  });

  mockEq.mockReturnValue({
    order: mockOrder,
    limit: mockLimit,
    contains: mockContains,
    ilike: mockIlike,
  });

  mockOrder.mockReturnValue({
    limit: mockLimit,
    single: mockSingle,
    contains: mockContains,
    ilike: mockIlike,
  });

  mockLimit.mockReturnValue({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    contains: mockContains,
    ilike: mockIlike,
  });

  mockContains.mockReturnValue({
    order: mockOrder,
    limit: mockLimit,
    contains: mockContains,
  });

  mockIlike.mockReturnValue({
    order: mockOrder,
    limit: mockLimit,
  });

  mockUpsert.mockReturnValue({
    select: () => ({
      single: async () => ({ data: { id: 'test-id' }, error: null }),
    }),
  });

  mockInsert.mockReturnValue({
    select: () => ({
      single: async () => ({ data: { id: 'scan-id' }, error: null }),
    }),
  });

  mockUpdate.mockReturnValue({
    eq: async () => ({ error: null }),
  });

  mockSingle.mockResolvedValue({
    data: { id: 'test-id' },
    error: null,
  });

  mockMaybeSingle.mockResolvedValue({
    data: { id: 'test-id', name: 'test-artifact' },
    error: null,
  });

  return {
    createClient: () => ({
      from: mockFrom,
    }),
  };
});

describe('RegistryClient', () => {
  let client: RegistryClient;

  beforeEach(() => {
    client = new RegistryClient('https://test.supabase.co', 'anon-key');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('instantiates without throwing', () => {
    expect(client).toBeInstanceOf(RegistryClient);
  });

  it('upsertRepository returns data with id', async () => {
    const result = await client.upsertRepository({
      github_owner: 'vercel-labs',
      github_repo: 'agent-skills',
      github_url: 'https://github.com/vercel-labs/agent-skills',
      status: 'pending',
      source: 'skills_sh',
      skills_sh_installs: 3000000,
      last_scanned_at: null,
    });
    expect(result.id).toBe('test-id');
  });
});
