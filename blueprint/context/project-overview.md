# ai-skillops - Project Overview

> Governed CLI + registry + admin UI that discovers, safety-scans, and
> lockfile-pins AI agent skills for Claude Code, Cursor, Codex, and Copilot.

> **Generated file. Don't hand-edit.** Re-run `/overview` when
> `blueprint/project-plan.md` or `blueprint/build-plan.md` changes. Detailed
> task steps live in `docs/superpowers/plans/2026-08-18-ai-skillops-roadmap.md`.
>
> Restored after Blueprint installer overwrite wiped the previous overview.

## Problem

Developers hunt AI skills and rules across GitHub and skills.sh, paste unvetted
shell-bearing content into agent configs, get no stack-aware recommendations, and
have no lockfile or pinned reproducibility. ai-skillops turns community sources
into a scanned, scored, installable registry with operator review.

## Users

- **Developers** - install and update governed artifacts via `npx ai-skillops`
- **Registry operators** - invite-only admin UI to review and monitor artifacts

Recommendation targets: TypeScript/Node.js, Next.js, React, Java/Spring Boot,
Python. Agents: Claude Code, Cursor, Codex, Copilot.

## Features

MVP in build-plan order. Items 1-11 are implemented in the repo. Next open item
is **12. Ship v1**.

1. **Turborepo monorepo + shared types** - done
2. **Supabase schema + registry client** - done
3. **skills.sh seed scraper** - done
4. **GitHub artifact detector** - done
5. **Static safety scanner** - done
6. **Scoring + scanner runner + Actions** - done
7. **CLI scaffold + stack detector + cache** - done
8. **CLI init, search, install** - done
9. **CLI list, audit, update, why, sync** - done
10. **Admin scaffold + auth + dashboard** - done
11. **Admin repositories, artifacts, review, analytics** - done
12. **Ship v1** - Deploy admin, publish CLI, Actions secrets, seed + smoke test
13. **Post-MVP** - Packs, public web, webhooks, broader discovery

## Data model

Shapes locked by `supabase/migrations/0001_initial.sql` and
`@ai-skillops/shared`.

### Repository

- `id` (uuid PK)
- `github_owner` / `github_repo` / `github_url` (unique)
- `status` (`pending` | `scanning` | `active` | `archived`)
- `source` (`skills_sh` | `manual` | `github_discovery`)
- `skills_sh_installs` (bigint), `last_scanned_at`, `added_at`
- has many **Artifact**, **Scan**

### Artifact

- `id` (uuid PK), `repo_id` (FK)
- `kind` (`skill` | `rule` | `context` | `command` | `workflow` | `pack`)
- `name` / `path` / `version` (unique on `repo_id`+`path`)
- `status` (`pending_review` | `approved` | `blocked`)
- scores: `safety_score`, `quality_score`, `popularity_score`, `combined_score`
- has one **Classification**; has many **SafetyFinding**, **InstallEvent**

### Scan

- `id`, `repo_id`, `commit_sha`, `started_at`, `completed_at`
- `status` (`running` | `completed` | `failed`)
- `artifacts_found`, `findings_count`

### SafetyFinding

- `scan_id`, `artifact_id`, `severity`, `kind`, `file`, `line`, `evidence`
- kinds: `destructive-shell`, `curl-pipe-bash`, `credential-access`,
  `prompt-injection`, `external-url`, `git-push`

### Classification

- `artifact_id`, language/framework/runtime/agent arrays, `framework_versions`

### InstallEvent

- `artifact_id`, `stack_fingerprint`, `cli_version`, `installed_at`

### Lockfile (CLI local)

- `lockVersion`, `generated`, `project` (StackProfile), `artifacts[]` with
  source commit + integrity + safetyScore

## Tech stack

- Node.js >= 20, TypeScript 5 strict, ESM, Turborepo, npm
- Packages: shared, registry-client, scanner, cli
- App: apps/admin (Next.js 14 + Tailwind + Supabase Auth)
- Vitest; Vercel + npm + GitHub Actions

## Monetization

Not in v1. Deferred until after ship.

## UI/UX

CLI-first. Admin routes: `/`, `/login`, `/repositories`, `/artifacts`,
`/review`, `/analytics`. Public landing is post-MVP.

## Deployment

| Piece | Target |
|---|---|
| Admin | Vercel (`apps/admin/vercel.json` present) |
| CLI | npm publish `ai-skillops` (not yet published as Task 12) |
| Scanner | `.github/workflows/scanner.yml` |
| DB | Supabase |

Env: root `SUPABASE_*` + `GITHUB_TOKEN`; admin `NEXT_PUBLIC_SUPABASE_*` +
`NEXT_PUBLIC_SITE_URL`.

## Open questions

- Confirm remote Supabase has `0001_initial.sql` applied
- Confirm production admin domain / health path
- Item 12 remaining: live Vercel deploy, npm publish, Actions secrets, smoke test
- Item 13 still a post-MVP bucket - split when prioritized
