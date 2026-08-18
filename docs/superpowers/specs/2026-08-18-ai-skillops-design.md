# ai-skillops — Product Design Spec

**Date:** 2026-08-18  
**Status:** Approved  
**Author:** Chandrakanth Balaraman

---

## Overview

ai-skillops is a governed package registry and CLI for AI agent artifacts — skills, rules, contexts, commands, and workflows. It turns scattered open-source AI tooling (from GitHub, skills.sh, and community sources) into stack-aware, safety-scanned, lockfile-pinned installable packages for AI coding agents like Claude Code, Cursor, Codex, and Copilot.

**Tagline:** Discover, govern, and install AI engineering skills and workflows.

---

## Problem Statement

Developers building with AI agents today:
- Manually hunt for CLAUDE.md templates and cursor rules scattered across GitHub
- Copy-paste skills containing shell commands they have not read
- Receive no stack-specific guidance (a Spring Boot dev and a React dev need entirely different rules)
- Have no audit trail — no lockfile, no pinned versions, no reproducibility

---

## Two-Part Architecture

```
skills.sh leaderboard ──┐
GitHub repositories ─────┼──► Scanner (GitHub Actions) ──► Supabase PostgreSQL
Manual submissions ──────┘                                          │
                                                           Supabase REST API
                                                      ┌─────────────┴──────────────┐
                                               Admin UI (Next.js)         CLI (npm package)
                                                Vercel hosting             local SQLite cache
                                                                        ai-skillops.lock.yaml
                                                                                │
                                          Claude Code · Cursor · Codex · Copilot
```

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| CLI | Node.js 20 + TypeScript + Commander.js | Ships via npm, rich GitHub API libs, fast iteration |
| Scanner | Node.js 20 + TypeScript | Runs in GitHub Actions, no timeout limits |
| Registry DB | Supabase (PostgreSQL) | Managed, auto REST API, row-level security |
| Admin UI | Next.js 14 App Router + Tailwind CSS | Same stack as most target users, Supabase auth built-in |
| Admin hosting | Vercel | Free tier, zero config |
| CLI distribution | npm (`ai-skillops`) | `npx ai-skillops` or global install |
| Monorepo | Turborepo | Shared types, coordinated builds |

---

## Repository Structure

```
ai-skillops/
├── apps/
│   ├── admin/              # Next.js minimal admin web UI
│   └── web/                # Public landing page (v2)
├── packages/
│   ├── cli/                # npm package: ai-skillops
│   ├── scanner/            # GitHub scanner, runs in GitHub Actions
│   ├── shared/             # Shared TypeScript types + Zod schemas
│   └── registry-client/    # Thin Supabase API client (CLI + admin)
├── supabase/
│   ├── migrations/         # PostgreSQL schema migrations
│   └── seed/               # skills.sh initial seed data
├── .github/
│   └── workflows/
│       ├── scanner.yml     # Scheduled scanner (daily + on-demand)
│       └── ci.yml
├── package.json            # Turborepo root
└── turbo.json
```

---

## Database Schema

### repositories
Tracks source GitHub repositories.

```sql
id               uuid primary key
github_owner     text
github_repo      text
github_url       text unique
status           text  -- 'pending' | 'scanning' | 'active' | 'archived'
source           text  -- 'skills_sh' | 'manual' | 'github_discovery'
skills_sh_installs  bigint  -- popularity signal from skills.sh
last_scanned_at  timestamptz
added_at         timestamptz default now()
```

### artifacts
Individual skill/rule/command/workflow/context entries.

```sql
id               uuid primary key
repo_id          uuid references repositories
kind             text  -- 'skill'|'rule'|'context'|'command'|'workflow'|'pack'
name             text
path             text
version          text
status           text  -- 'pending_review'|'approved'|'blocked'
safety_score     int   -- 0–100
quality_score    int
popularity_score int
combined_score   int
last_updated_at  timestamptz
```

### scans
Each scanner run for a repository.

```sql
id               uuid primary key
repo_id          uuid references repositories
commit_sha       text
started_at       timestamptz
completed_at     timestamptz
status           text  -- 'running'|'completed'|'failed'
artifacts_found  int
findings_count   int
```

### safety_findings
Findings from the static scanner.

```sql
id               uuid primary key
scan_id          uuid references scans
artifact_id      uuid references artifacts
severity         text  -- 'critical'|'high'|'medium'|'low'
kind             text  -- 'destructive-shell'|'curl-pipe-bash'|'credential-access'|'prompt-injection'|'external-url'
file             text
line             int
evidence         text
```

### classifications
Technology metadata per artifact.

```sql
id               uuid primary key
artifact_id      uuid references artifacts
languages        text[]
frameworks       text[]
framework_versions jsonb
runtimes         text[]
build_tools      text[]
databases        text[]
architectures    text[]
agents           text[]
```

### install_events
Anonymous install telemetry.

```sql
id               uuid primary key
artifact_id      uuid references artifacts
stack_fingerprint text   -- SHA256(language+framework), no identifiers
cli_version      text
installed_at     timestamptz default now()
```

---

## Scanner Pipeline

Runs as a scheduled GitHub Actions workflow (daily at 02:00 UTC) and on-demand via workflow_dispatch.

```
Phase 1 — Seed (first run only)
  Scrape skills.sh leaderboard pages
  Extract: owner/repo, install counts, skill names
  Insert into repositories table (status = 'pending')

Phase 2 — Scan each active repository
  For each repository where status = 'pending' or last_scanned_at > 24h:
    1. Fetch latest commit SHA via GitHub API
    2. Skip if SHA matches last scan (no changes)
    3. Detect artifact files:
         SKILL.md, AGENTS.md, CLAUDE.md
         .claude/skills/, .claude/commands/
         .cursor/rules/
         prompts/, workflows/
    4. Run static safety scan per file:
         Flag: rm -rf, git push, curl | bash, eval, wget | sh
         Flag: .env, AWS_SECRET, ssh key references
         Flag: external URLs, shortened URLs, suspicious domains
         Flag: override-safety prompt injection patterns
    5. Extract classification metadata (languages, frameworks, agents)
    6. Compute scores (safety, quality, popularity)
    7. Write scan + artifacts + findings to Supabase
    8. Auto-approve if safetyScore >= 90 and no critical/high findings
    9. Set status = 'pending_review' otherwise

Phase 3 — Maintenance
  Archive repositories with no commits in 6 months
  Demote artifacts with combined_score < 20 after 30 days inactive
  Re-scan on any GitHub push event (via webhook, v2)
```

---

## Scoring Model

| Dimension | Weight | Inputs |
|---|---|---|
| Compatibility | 30% | Exact match to detected stack, framework versions, agent type |
| Safety | 25% | Scanner findings, severity, review status |
| Trust | 20% | Verified publisher, license, signed commits, org reputation |
| Quality | 15% | Valid manifest, docs, examples, consistent structure |
| Maintenance | 5% | Recent commits, active issue handling |
| Popularity | 5% | skills.sh installs, anonymous install events |

Default sort order: Compatibility → Safety → Trust → Quality

---

## Admin Web UI (Next.js, Vercel)

Five pages for v1. Protected by Supabase Auth (email + password, invite-only).

| Route | Purpose |
|---|---|
| `/` | Dashboard: counts of repos, artifacts, pending review, blocked |
| `/repositories` | List all repos, add manually by GitHub URL, trigger rescan, archive |
| `/artifacts` | Browse artifacts, filter by status/score/kind/stack |
| `/review` | Pending items: approve, block, override score, add notes |
| `/analytics` | Install counts, trending skills, stack breakdown from anonymous events |

---

## CLI Commands (v1)

```bash
npx ai-skillops init          # Detect stack, recommend, install interactively
npx ai-skillops search <q>    # Search the registry by keyword or stack
npx ai-skillops install <id>  # Install a specific artifact
npx ai-skillops list          # List installed artifacts in this project
npx ai-skillops audit         # Check installed artifacts for security issues / outdated versions
npx ai-skillops update        # Update all installed artifacts to latest approved versions
npx ai-skillops why <pkg>     # Explain why a package was recommended for this stack
npx ai-skillops sync          # Force-refresh the local registry cache
```

---

## Local Cache and Lockfile

On first `init`, the CLI downloads a compressed registry snapshot from Supabase and stores it at `~/.ai-skillops/cache/registry.db` (SQLite). The cache auto-refreshes every 24 hours or manually via `ai-skillops sync`. The CLI works offline against the cache with a visible warning.

### ai-skillops.lock.yaml (commit to git)

```yaml
lockVersion: 1
generated: "2026-08-18T10:00:00Z"
project:
  language: typescript
  framework: next.js
  agents: [claude-code, cursor]
artifacts:
  - id: vercel-labs.nextjs-app-router-rules
    kind: rule
    version: 1.1.0
    source:
      repository: https://github.com/vercel-labs/agent-skills
      path: rules/nextjs-app-router
      commit: 9b1c70b4b7d0
    integrity: sha256:abc123...
    safetyScore: 97
```

---

## Anonymous Analytics

Each install sends one event with no user ID, no IP address, no project name:

```json
{
  "artifact_id": "vercel-labs.nextjs-app-router-rules",
  "stack_fingerprint": "sha256(typescript+next.js)",
  "cli_version": "0.1.0",
  "installed_at": "2026-08-18T10:00:00Z"
}
```

Used only to rank popularity per stack and detect which artifacts developers actually keep.

---

## Artifact Types

| Type | Purpose | Example |
|---|---|---|
| `skill` | Reusable implementation knowledge | Spring Boot REST API conventions |
| `rule` | Always-on constraints | Java 21, no field injection |
| `context` | Durable project knowledge | Architecture doc, domain glossary |
| `command` | Explicit slash command | `/add-flyway-migration` |
| `workflow` | Multi-step process | Plan → implement → test → review |
| `pack` | Resolved bundle (v2) | Spring Boot 3 + JDK 21 + PostgreSQL pack |

---

## v1 Scope

### In scope
- CLI: `init`, `search`, `install`, `list`, `audit`, `update`, `why`, `sync`
- Supabase backend: registry DB, Supabase REST API, admin auth
- Scanner: GitHub file detection, safety flagging, scoring, GitHub Actions cron
- Seeding: skills.sh leaderboard scrape on launch
- Admin UI: 5-page Next.js app on Vercel
- Local cache: SQLite, 24h refresh, offline fallback
- Lockfile: `ai-skillops.lock.yaml`, pinned commit hashes, integrity checksums
- Target stacks: TypeScript/Node.js, Next.js, React, Java/Spring Boot, Python

### Out of scope for v1
- Pack resolution (bundles of multiple artifacts)
- User accounts or API keys
- GitHub Actions CI integration for end users
- Public marketing/landing page
- Webhook-triggered rescans
- GitHub Discovery (automated crawling beyond skills.sh seed)
