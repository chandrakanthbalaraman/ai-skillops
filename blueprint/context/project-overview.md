# ai-skillops - Project Overview

> Governed CLI + registry + admin UI that discovers, safety-scans, and
> lockfile-pins AI agent skills for Claude Code, Cursor, Codex, and Copilot.

> **Generated file. Don't hand-edit.** Re-run `/overview` when
> `blueprint/project-plan.md` or `blueprint/build-plan.md` changes. Detailed
> task steps live in `docs/superpowers/plans/2026-08-18-ai-skillops-roadmap.md`.

## Problem

Developers hunt AI skills and rules across GitHub and skills.sh, paste unvetted
shell-bearing content into agent configs, get no stack-aware recommendations, and
have no lockfile or pinned reproducibility. ai-skillops turns community sources
into a scanned, scored, installable registry with operator review.

## Users

- **Developers** - CLI installs (`npx ai-skillops`) with stack-aware
  recommendations, lockfile pinning, and offline SQLite cache
- **Registry operators** - invite-only admin UI to review, approve, block, and
  monitor repos/artifacts

Target stacks: TypeScript/Node.js, Next.js, React, Java/Spring Boot, Python.
Agents: Claude Code, Cursor, Codex, Copilot.

## Features

In build-plan order. Items 1-11 are done in-repo. Headline remaining for v1:
**Ship v1** (item 12).

1. **Turborepo monorepo + shared types** - Shared ESM packages and Zod domain
   types (done)
2. **Supabase schema + registry client** - PostgreSQL registry and thin
   Supabase client (done)
3. **skills.sh seed scraper** - Leaderboard scrape for repository seeding (done)
4. **GitHub artifact detector** - Classify and fetch skill/rule/context/command/
   workflow files (done)
5. **Static safety scanner** - Flag destructive shell, curl|bash, credentials,
   prompt injection, external URLs, git push (done)
6. **Scoring + scanner runner + Actions** - Score, write scans, schedule
   `scanner.yml` (done)
7. **CLI scaffold + stack detector + cache** - Bin package, stack detection,
   SQLite cache, lockfile I/O (done)
8. **CLI init, search, install** - Interactive init, search, pinned install
   (done)
9. **CLI list, audit, update, why, sync** - Maintenance commands (done)
10. **Admin scaffold + auth + dashboard** - Next.js 14, Supabase Auth, dashboard
    (done)
11. **Admin repositories, artifacts, review, analytics** - Remaining ops pages
    (done)
12. **Ship v1** - Deploy admin to Vercel, publish CLI to npm, Actions secrets,
    seed scanner, end-to-end smoke test
13. **Post-MVP** - Packs, public web, webhooks, broader discovery

## Data model

Shapes locked by `supabase/migrations/0001_initial.sql` and
`@ai-skillops/shared`. Later ship/ops work depends on these.

### Repository

- `id` (uuid PK)
- `github_owner` / `github_repo` / `github_url` (text; url unique)
- `status` (`pending` | `scanning` | `active` | `archived`)
- `source` (`skills_sh` | `manual` | `github_discovery`)
- `skills_sh_installs` (bigint)
- `last_scanned_at` (timestamptz?), `added_at` (timestamptz)
- has many **Artifact**, **Scan**

### Artifact

- `id` (uuid PK), `repo_id` (uuid FK → Repository)
- `kind` (`skill` | `rule` | `context` | `command` | `workflow` | `pack`)
- `name` / `path` / `version` (unique on `repo_id`+`path`)
- `status` (`pending_review` | `approved` | `blocked`)
- `safety_score` / `quality_score` / `popularity_score` / `combined_score` (0-100)
- `last_updated_at` (timestamptz)
- has one **Classification**; has many **SafetyFinding**, **InstallEvent**

### Scan

- `id` (uuid PK), `repo_id` (uuid FK → Repository)
- `commit_sha` (text)
- `started_at` / `completed_at` (timestamptz)
- `status` (`running` | `completed` | `failed`)
- `artifacts_found` / `findings_count` (int)
- has many **SafetyFinding**

### SafetyFinding

- `id` (uuid PK)
- `scan_id` (FK → Scan), `artifact_id` (FK → Artifact)
- `severity` (`critical` | `high` | `medium` | `low`)
- `kind` (`destructive-shell` | `curl-pipe-bash` | `credential-access` |
  `prompt-injection` | `external-url` | `git-push`)
- `file` / `line` / `evidence`

### Classification

- `id` (uuid PK), `artifact_id` (FK → Artifact)
- `languages` / `frameworks` / `runtimes` / `build_tools` / `databases` /
  `architectures` / `agents` (text[])
- `framework_versions` (jsonb)

### InstallEvent

- `id` (uuid PK), `artifact_id` (FK → Artifact)
- `stack_fingerprint` (text) - anonymous; no user/project id
- `cli_version` (text), `installed_at` (timestamptz)

### Lockfile (CLI local, not in Supabase)

- `lockVersion` (number), `generated` (ISO string)
- `project` (**StackProfile**: language, framework, runtime, buildTool,
  database, agents[], architecture)
- `artifacts[]` - id, kind, version, source `{ repository, path, commit }`,
  integrity, safetyScore

### Registry cache (CLI local)

- SQLite at `~/.ai-skillops/cache/registry.db`

## Tech stack

- **Node.js >= 20 + TypeScript 5 strict + ESM** - all packages
- **Turborepo + npm workspaces** - monorepo (`packageManager` required)
- **@ai-skillops/shared** - domain types + Zod
- **@ai-skillops/registry-client** - Supabase access
- **@ai-skillops/scanner** - skills.sh + GitHub scan pipeline
- **packages/cli (`ai-skillops`)** - npm CLI
- **Supabase** - PostgreSQL registry, REST, invite-only Auth
- **@octokit/rest + cheerio** - GitHub trees and skills.sh HTML
- **Commander.js + better-sqlite3** - CLI commands and local cache
- **Next.js 14 App Router + Tailwind** - admin UI
- **Vitest** - unit tests (`npm test` is a gate)
- **Vercel + npm + GitHub Actions** - admin host, CLI publish, scanner cron

## Monetization

Not in v1. Open distribution until after ship.

## UI/UX

**CLI-first:** interactive `init`, clear terminal output, offline cache with
stale warning, `ai-skillops.lock.yaml` in git.

**Admin** (invite-only, minimal ops UI):

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
| Admin | Vercel (`apps/admin`; `vercel.json` present) |
| CLI | `npm publish` from `packages/cli` as `ai-skillops` |
| Scanner | `.github/workflows/scanner.yml` (daily + dispatch) |
| DB | Supabase; apply `supabase/migrations/` |

**Env (names):** root `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`; admin
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`.

**Root commands:** `npm run build`, `npm test`, `npm run dev`, `npm run lint`.

> TODO: production admin domain and health-check path not named.
> TODO: confirm remote Supabase already has `0001_initial.sql` applied.

## Open questions

- Item **12** bundles deploy, publish, secrets, seed, and smoke - `/feature`
  may split into 12a-12d.
- Item **13** still a post-MVP bucket; split when prioritized.
- Monetization intentionally deferred.
- No contradictions between project-plan and build-plan on stack, data, or v1
  feature set.
