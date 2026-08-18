create extension if not exists "pgcrypto";

create table repositories (
  id              uuid primary key default gen_random_uuid(),
  github_owner    text not null,
  github_repo     text not null,
  github_url      text not null unique,
  status          text not null default 'pending'
                  check (status in ('pending','scanning','active','archived')),
  source          text not null default 'manual'
                  check (source in ('skills_sh','manual','github_discovery')),
  skills_sh_installs bigint not null default 0,
  last_scanned_at timestamptz,
  added_at        timestamptz not null default now()
);

create table artifacts (
  id              uuid primary key default gen_random_uuid(),
  repo_id         uuid not null references repositories(id) on delete cascade,
  kind            text not null
                  check (kind in ('skill','rule','context','command','workflow','pack')),
  name            text not null,
  path            text not null,
  version         text not null default '0.1.0',
  status          text not null default 'pending_review'
                  check (status in ('pending_review','approved','blocked')),
  safety_score    int  not null default 0 check (safety_score between 0 and 100),
  quality_score   int  not null default 0 check (quality_score between 0 and 100),
  popularity_score int not null default 0 check (popularity_score between 0 and 100),
  combined_score  int  not null default 0 check (combined_score between 0 and 100),
  last_updated_at timestamptz not null default now()
);

create table scans (
  id              uuid primary key default gen_random_uuid(),
  repo_id         uuid not null references repositories(id) on delete cascade,
  commit_sha      text not null,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  status          text not null default 'running'
                  check (status in ('running','completed','failed')),
  artifacts_found int  not null default 0,
  findings_count  int  not null default 0
);

create table safety_findings (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references scans(id) on delete cascade,
  artifact_id uuid not null references artifacts(id) on delete cascade,
  severity    text not null check (severity in ('critical','high','medium','low')),
  kind        text not null check (kind in (
    'destructive-shell','curl-pipe-bash','credential-access',
    'prompt-injection','external-url','git-push'
  )),
  file        text not null,
  line        int  not null default 0,
  evidence    text not null
);

create table classifications (
  id                  uuid primary key default gen_random_uuid(),
  artifact_id         uuid not null references artifacts(id) on delete cascade,
  languages           text[] not null default '{}',
  frameworks          text[] not null default '{}',
  framework_versions  jsonb  not null default '{}',
  runtimes            text[] not null default '{}',
  build_tools         text[] not null default '{}',
  databases           text[] not null default '{}',
  architectures       text[] not null default '{}',
  agents              text[] not null default '{}'
);

create table install_events (
  id                uuid primary key default gen_random_uuid(),
  artifact_id       uuid not null references artifacts(id) on delete cascade,
  stack_fingerprint text not null,
  cli_version       text not null,
  installed_at      timestamptz not null default now()
);

-- Indexes for common queries
create index on artifacts(status, combined_score desc);
create index on artifacts(repo_id);
create index on install_events(artifact_id);
create index on safety_findings(artifact_id, severity);
