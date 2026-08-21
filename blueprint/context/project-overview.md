# ai-skillops - Project Overview

> Governed CLI + registry + admin UI that discovers, safety-scans, and
> lockfile-pins AI agent skills for Claude Code, Cursor, Codex, and Copilot.

> **Generated file. Don't hand-edit.** Re-run `/overview` when
> `blueprint/project-plan.md` or `blueprint/build-plan.md` changes. Detailed
> task steps live in `docs/superpowers/plans/2026-08-18-ai-skillops-roadmap.md`.

## Problem

Developers hunt `CLAUDE.md`, Cursor rules, and skills across GitHub and
skills.sh, paste unvetted shell-bearing content into agent configs, get no
stack-aware recommendations, and have no lockfile or pinned reproducibility.
ai-skillops turns those community sources into a scanned, scored, installable
registry with operator review.

## Users

- **Developers** - `npx ai-skillops` installs with stack-aware recommendations,
  lockfile pinning, and an offline SQLite cache
- **Registry operators** - invite-only admin UI to review, approve, block, and
  monitor repos/artifacts

Target stacks: TypeScript/Node.js, Next.js, React, Java/Spring Boot, Python.
Agents: Claude Code, Cursor, Codex, Copilot.

No end-user accounts or API keys in v1 (operators only).

## Features

In build-plan order. Items 1–11 and **12a** are done in-repo. Headline remaining
for v1: **publish the CLI** (12b), then scanner seed (12c) and e2e smoke + tag
(12d).

1. **Turborepo monorepo + shared types** - ESM workspaces and Zod domain types (done)
2. **Supabase schema + registry client** - PostgreSQL registry and thin client (done)
3. **skills.sh seed scraper** - Leaderboard scrape and install-count parsing (done)
4. **GitHub artifact detector** - Classify and fetch skill/rule/context/command/workflow files (done)
5. **Static safety scanner** - Flag destructive shell, curl|bash, credentials, prompt injection, external URLs, git push (done)
6. **Scoring + scanner runner + Actions** - Score artifacts, write scans, schedule `scanner.yml` (done)
7. **CLI scaffold + stack detector + cache** - Bin package, stack detection, SQLite cache, lockfile I/O (done)
8. **CLI init, search, install** - Interactive init, registry search, pinned install (done)
9. **CLI list, audit, update, why, sync** - Maintenance commands (done)
10. **Admin scaffold + auth + dashboard** - Next.js 14, Supabase Auth, dashboard (done)
11. **Admin repositories, artifacts, review, analytics** - Ops pages (done)
12. **Ship v1** - Remaining release gate (parent still open until 12b–12d land)
    - **12a. Vercel admin deploy** - Live admin with `NEXT_PUBLIC_*` env and login (done)
    - **12b. Publish CLI to npm** - Build and publish `ai-skillops`; smoke `--version` / `--help` via `npx`
    - **12c. Scanner secrets + seed** - Actions secrets, run `scanner.yml`, confirm Supabase tables populate
    - **12d. E2E smoke + tag** - Full CLI loop in a throwaway project, then `v0.1.0` tag
13. **Post-MVP** - Pack resolution, public landing, webhook rescans, GitHub discovery beyond skills.sh seed

**v1 out of scope:** pack resolution, end-user accounts/API keys, public landing
page, webhook rescans, GitHub discovery beyond the skills.sh seed.

## Data model

Shapes locked by `supabase/migrations/0001_initial.sql` and
`@ai-skillops/shared`. Later ship/ops work depends on these. Enum values
`artifact.kind = pack` and `repository.source = github_discovery` exist in the
schema but are unused until post-MVP.

### Repository

- `id` (uuid PK)
- `github_owner` / `github_repo` / `github_url` (text; url unique)
- `status` (`pending` | `scanning` | `active` | `archived`)
- `source` (`skills_sh` | `manual` | `github_discovery`)
- `skills_sh_installs` (bigint, default 0)
- `last_scanned_at` (timestamptz?), `added_at` (timestamptz)
- has many **Artifact**, **Scan**

### Artifact

- `id` (uuid PK), `repo_id` (uuid FK → Repository, cascade)
- `kind` (`skill` | `rule` | `context` | `command` | `workflow` | `pack`)
- `name` / `path` / `version` (unique on `repo_id` + `path`)
- `status` (`pending_review` | `approved` | `blocked`)
- `safety_score` / `quality_score` / `popularity_score` / `combined_score` (int 0–100)
- `last_updated_at` (timestamptz)
- has one **Classification**; has many **SafetyFinding**, **InstallEvent**

### Scan

- `id` (uuid PK), `repo_id` (uuid FK → Repository, cascade)
- `commit_sha` (text)
- `started_at` / `completed_at` (timestamptz)
- `status` (`running` | `completed` | `failed`)
- `artifacts_found` / `findings_count` (int)
- has many **SafetyFinding**

### SafetyFinding

- `id` (uuid PK)
- `scan_id` (FK → Scan), `artifact_id` (FK → Artifact), both cascade
- `severity` (`critical` | `high` | `medium` | `low`)
- `kind` (`destructive-shell` | `curl-pipe-bash` | `credential-access` |
  `prompt-injection` | `external-url` | `git-push`)
- `file` (text), `line` (int), `evidence` (text)

### Classification

- `id` (uuid PK), `artifact_id` (FK → Artifact, cascade)
- `languages` / `frameworks` / `runtimes` / `build_tools` / `databases` /
  `architectures` / `agents` (text[])
- `framework_versions` (jsonb object)

### InstallEvent

- `id` (uuid PK), `artifact_id` (FK → Artifact, cascade)
- `stack_fingerprint` (text) - anonymous; no user or project id
- `cli_version` (text), `installed_at` (timestamptz)

### Lockfile (CLI local, not in Supabase)

Project file `ai-skillops.lock.yaml`:

- `lockVersion` (number), `generated` (ISO string)
- `project` (**StackProfile**: language, framework, runtime, buildTool,
  database, agents[], architecture)
- `artifacts[]` - id, kind, version, source `{ repository, path, commit }`,
  integrity, safetyScore

### Registry cache (CLI local)

SQLite at `~/.ai-skillops/cache/registry.db`.

## Tech stack

- **Node.js >= 20 + TypeScript 5 strict + ESM** - all packages
- **Turborepo + npm workspaces** - monorepo (`packageManager` in root package.json)
- **@ai-skillops/shared** - domain types + Zod
- **@ai-skillops/registry-client** - Supabase access
- **@ai-skillops/scanner** - skills.sh scrape + GitHub scan pipeline
- **packages/cli (`ai-skillops`)** - npm CLI (Commander.js, better-sqlite3, chalk, prompts, ora, yaml)
- **Supabase** - PostgreSQL registry, REST, invite-only Auth
- **@octokit/rest + cheerio** - GitHub trees and skills.sh HTML
- **Next.js 14 App Router + Tailwind** - admin UI (`apps/admin`)
- **Vitest** - unit tests (`npm test` is a gate)
- **Vercel + npm + GitHub Actions** - admin host, CLI publish, scanner cron
- **Conventional Commits** - `feat:`, `fix:`, `chore:`, `test:`

## Monetization

Not in v1. Open distribution until after ship.

## UI/UX

**CLI-first:** interactive `init`, clear terminal output, offline cache with
stale warning, `ai-skillops.lock.yaml` committed in git.

CLI commands: `init`, `search`, `install`, `list`, `audit`, `update`, `why`,
`sync`.

**Admin** (invite-only, five ops pages + login):

| Route | Purpose |
|---|---|
| `/` | Dashboard counts |
| `/login` | Supabase Auth |
| `/repositories` | List/add/archive repos, trigger rescan |
| `/artifacts` | Browse/filter by status, score, kind, stack |
| `/review` | Approve, block, override score, notes |
| `/analytics` | Install counts, trending, stack breakdown |

Public landing is post-MVP / out of v1.

## Deployment

| Piece | Target |
|---|---|
| Admin | Vercel (`apps/admin`; `vercel.json` present). 12a done. |
| CLI | `npm publish` from `packages/cli` as `ai-skillops` (12b) |
| Scanner | `.github/workflows/scanner.yml` — daily 02:00 UTC + `workflow_dispatch` (12c) |
| DB | Supabase; apply `supabase/migrations/` |

**Vercel (`apps/admin/vercel.json`):** `installCommand` / `buildCommand` run from
repo root against workspaces; `outputDirectory` `.next`; framework `nextjs`.

**Env (names):** root `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`; admin
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`. Scanner job uses `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`.

**Root commands:** `npm run build`, `npm test`, `npm run dev`, `npm run lint`.
Optional: `npm run scan -w @ai-skillops/scanner` after build.

> TODO: production admin domain and health-check path not named in the plans.
> TODO: confirm remote Supabase already has `0001_initial.sql` applied.

## Open questions

- Item **13** is still a post-MVP bucket (packs, landing, webhooks, discovery);
  split when prioritized.
- Monetization intentionally deferred.
- Schema already has `pack` kind and `github_discovery` source; both stay unused
  until item 13.
- No contradictions between project-plan and build-plan on stack, data, or v1
  feature set.
