export type ArtifactKind =
  | 'skill'
  | 'rule'
  | 'context'
  | 'command'
  | 'workflow'
  | 'pack';

export type ArtifactStatus = 'pending_review' | 'approved' | 'blocked';

export type ScanStatus = 'running' | 'completed' | 'failed';

export type RepositoryStatus = 'pending' | 'scanning' | 'active' | 'archived';

export type RepositorySource = 'skills_sh' | 'manual' | 'github_discovery';

export type SafetyFindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type SafetyFindingKind =
  | 'destructive-shell'
  | 'curl-pipe-bash'
  | 'credential-access'
  | 'prompt-injection'
  | 'external-url'
  | 'git-push';

export interface Repository {
  id: string;
  github_owner: string;
  github_repo: string;
  github_url: string;
  status: RepositoryStatus;
  source: RepositorySource;
  skills_sh_installs: number;
  last_scanned_at: string | null;
  added_at: string;
}

export interface Artifact {
  id: string;
  repo_id: string;
  kind: ArtifactKind;
  name: string;
  path: string;
  version: string;
  status: ArtifactStatus;
  safety_score: number;
  quality_score: number;
  popularity_score: number;
  combined_score: number;
  last_updated_at: string;
}

export interface Scan {
  id: string;
  repo_id: string;
  commit_sha: string;
  started_at: string;
  completed_at: string | null;
  status: ScanStatus;
  artifacts_found: number;
  findings_count: number;
}

export interface SafetyFinding {
  id: string;
  scan_id: string;
  artifact_id: string;
  severity: SafetyFindingSeverity;
  kind: SafetyFindingKind;
  file: string;
  line: number;
  evidence: string;
}

export interface Classification {
  id: string;
  artifact_id: string;
  languages: string[];
  frameworks: string[];
  framework_versions: Record<string, string>;
  runtimes: string[];
  build_tools: string[];
  databases: string[];
  architectures: string[];
  agents: string[];
}

export interface InstallEvent {
  id: string;
  artifact_id: string;
  stack_fingerprint: string;
  cli_version: string;
  installed_at: string;
}

export interface StackProfile {
  language: string | null;
  framework: string | null;
  runtime: string | null;
  buildTool: string | null;
  database: string | null;
  agents: string[];
  architecture: string | null;
}

export interface LockfileEntry {
  id: string;
  kind: ArtifactKind;
  version: string;
  source: {
    repository: string;
    path: string;
    commit: string;
  };
  integrity: string;
  safetyScore: number;
}

export interface Lockfile {
  lockVersion: number;
  generated: string;
  project: StackProfile;
  artifacts: LockfileEntry[];
}
