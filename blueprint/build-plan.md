# Build Plan

> Checklist mirrored from roadmap Tasks 1-12 in
> `docs/superpowers/plans/2026-08-18-ai-skillops-roadmap.md`. Checked items
> match what already exists in the repo (git history + tree). Do not renumber
> completed features.
>
> **Reset note:** A Blueprint installer overwrite wiped this file back to the
> template. Restored here from the roadmap + current codebase.

Source of truth for implementation steps: the roadmap. Source of truth for
Blueprint progress tracking: this file.

## Phase 1 - Monorepo Foundation

- [x] 1. **Turborepo monorepo + shared types** - Root turbo/npm workspaces,
  `@ai-skillops/shared` types and Zod schemas with Vitest (roadmap Task 1)
- [x] 2. **Supabase schema + registry client** - `0001_initial.sql`, env
  template, `@ai-skillops/registry-client` (roadmap Task 2)
- [x] 3. **skills.sh seed scraper** - Leaderboard scrape and install-count
  parsing in `@ai-skillops/scanner` (roadmap Task 3)

## Phase 2 - Scanner

- [x] 4. **GitHub artifact detector** - Classify and fetch artifact files via
  Octokit (roadmap Task 4)
- [x] 5. **Static safety scanner** - Flag destructive shell, curl|bash,
  credentials, prompt injection, and related findings (roadmap Task 5)
- [x] 6. **Scoring + scanner runner + Actions** - Score artifacts, write scans
  to Supabase, `.github/workflows/scanner.yml` (roadmap Task 6)

## Phase 3 - CLI

- [x] 7. **CLI scaffold + stack detector + cache** - `packages/cli` bin,
  stack detection, SQLite registry cache, lockfile read/write (roadmap Task 7)
- [x] 8. **CLI init, search, install** - Interactive init, registry search,
  install with lockfile pins (roadmap Task 8)
- [x] 9. **CLI list, audit, update, why, sync** - Maintenance commands
  (roadmap Task 9)

## Phase 4 - Admin Web UI

- [x] 10. **Admin scaffold + auth + dashboard** - Next.js 14 app, Supabase
  Auth, login, nav, dashboard (roadmap Task 10)
- [x] 11. **Admin repositories, artifacts, review, analytics** - Ops pages
  (roadmap Task 11)
- [ ] 12. **Ship v1** - Deploy admin, publish CLI, Actions secrets, seed,
  end-to-end smoke (roadmap Task 12)
  - [x] 12a. **Vercel admin deploy** - Deploy `apps/admin` to Vercel with
    `NEXT_PUBLIC_*` env and confirm login on the live URL
  - [ ] 12b. **Publish CLI to npm** - Build and publish `ai-skillops`, smoke
    `--version` / `--help` via `npx`
  - [ ] 12c. **Scanner secrets + seed** - Set Actions secrets, run
    `scanner.yml`, confirm Supabase tables populate
  - [ ] 12d. **E2E smoke + tag** - Full CLI loop in a throwaway project, then
    `v0.1.0` tag

## Post-MVP (not in v1 roadmap)

- [ ] 13. **Packs, public web, webhooks, discovery** - Pack resolution, landing
  page, webhook rescans, GitHub discovery beyond skills.sh seed
