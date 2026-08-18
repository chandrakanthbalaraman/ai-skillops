import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Repository,
  Artifact,
  Scan,
  SafetyFinding,
  Classification,
  InstallEvent,
  StackProfile,
} from '@ai-skillops/shared';

export class RegistryClient {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getRepositories(): Promise<Repository[]> {
    const { data, error } = await this.supabase
      .from('repositories')
      .select('*')
      .eq('status', 'active')
      .order('skills_sh_installs', { ascending: false });
    if (error) throw new Error(`getRepositories failed: ${error.message}`);
    return data as Repository[];
  }

  async upsertRepository(
    repo: Omit<Repository, 'id' | 'added_at'>
  ): Promise<Repository> {
    const { data, error } = await this.supabase
      .from('repositories')
      .upsert(repo, { onConflict: 'github_url' })
      .select()
      .single();
    if (error) throw new Error(`upsertRepository failed: ${error.message}`);
    return data as Repository;
  }

  async upsertArtifact(
    artifact: Omit<Artifact, 'id' | 'last_updated_at'>
  ): Promise<Artifact> {
    const { data, error } = await this.supabase
      .from('artifacts')
      .upsert({ ...artifact, last_updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(`upsertArtifact failed: ${error.message}`);
    return data as Artifact;
  }

  async insertScan(scan: Omit<Scan, 'id' | 'started_at'>): Promise<Scan> {
    const { data, error } = await this.supabase
      .from('scans')
      .insert({ ...scan, started_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(`insertScan failed: ${error.message}`);
    return data as Scan;
  }

  async completeScan(
    scanId: string,
    artifactsFound: number,
    findingsCount: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        artifacts_found: artifactsFound,
        findings_count: findingsCount,
      })
      .eq('id', scanId);
    if (error) throw new Error(`completeScan failed: ${error.message}`);
  }

  async insertFinding(finding: Omit<SafetyFinding, 'id'>): Promise<void> {
    const { error } = await this.supabase.from('safety_findings').insert(finding);
    if (error) throw new Error(`insertFinding failed: ${error.message}`);
  }

  async insertInstallEvent(
    event: Omit<InstallEvent, 'id' | 'installed_at'>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('install_events')
      .insert({ ...event, installed_at: new Date().toISOString() });
    if (error) throw new Error(`insertInstallEvent failed: ${error.message}`);
  }

  async getApprovedArtifacts(stack: StackProfile): Promise<Artifact[]> {
    let query = this.supabase
      .from('artifacts')
      .select('*, classifications(*)')
      .eq('status', 'approved')
      .order('combined_score', { ascending: false })
      .limit(50);

    if (stack.language) {
      query = query.contains('classifications.languages', [stack.language]);
    }
    if (stack.framework) {
      query = query.contains('classifications.frameworks', [stack.framework]);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getApprovedArtifacts failed: ${error.message}`);
    return (data ?? []) as Artifact[];
  }

  async getArtifactById(id: string): Promise<Artifact | null> {
    const { data, error } = await this.supabase
      .from('artifacts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`getArtifactById failed: ${error.message}`);
    return data as Artifact | null;
  }

  async searchArtifacts(query: string): Promise<Artifact[]> {
    const { data, error } = await this.supabase
      .from('artifacts')
      .select('*')
      .eq('status', 'approved')
      .ilike('name', `%${query}%`)
      .order('combined_score', { ascending: false })
      .limit(20);
    if (error) throw new Error(`searchArtifacts failed: ${error.message}`);
    return (data ?? []) as Artifact[];
  }
}
