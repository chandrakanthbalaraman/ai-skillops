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
      .upsert(
        { ...artifact, last_updated_at: new Date().toISOString() },
        { onConflict: 'repo_id,path' }
      )
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
    const { data, error } = await this.supabase
      .from('artifacts')
      .select('*, classifications(*)')
      .eq('status', 'approved')
      .order('combined_score', { ascending: false })
      .limit(50);

    if (error) throw new Error(`getApprovedArtifacts failed: ${error.message}`);

    const all = (data ?? []) as (Artifact & { classifications: Classification[] })[];

    return all.filter(a => {
      if (!a.classifications?.length) return true; // no classification data: include
      const c = a.classifications[0];
      if (stack.language && c.languages.length > 0 && !c.languages.includes(stack.language)) return false;
      if (stack.framework && c.frameworks.length > 0 && !c.frameworks.includes(stack.framework)) return false;
      return true;
    });
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

  async getArtifactByRepoAndPath(repoId: string, path: string): Promise<Artifact | null> {
    const { data, error } = await this.supabase
      .from('artifacts')
      .select()
      .eq('repo_id', repoId)
      .eq('path', path)
      .single();
    if (error?.code === 'PGRST116') return null; // not found
    if (error) throw new Error(`getArtifactByRepoAndPath failed: ${error.message}`);
    return data as Artifact;
  }

  async updateRepository(
    id: string,
    updates: Partial<Omit<Repository, 'id' | 'added_at'>>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('repositories')
      .update(updates)
      .eq('id', id);
    if (error) throw new Error(`updateRepository failed: ${error.message}`);
  }

  async upsertClassification(classification: Omit<Classification, 'id'>): Promise<void> {
    const { error } = await this.supabase
      .from('classifications')
      .upsert(classification, { onConflict: 'artifact_id' })
      .select();
    if (error) throw new Error(`upsertClassification failed: ${error.message}`);
  }
}
