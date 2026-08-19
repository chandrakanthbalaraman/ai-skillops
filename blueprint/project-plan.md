# Project Plan

> Restored from the v1 implementation roadmap
> (`docs/superpowers/plans/2026-08-18-ai-skillops-roadmap.md`) and approved
> design (`docs/superpowers/specs/2026-08-18-ai-skillops-design.md`). Those docs
> remain the detailed execution source; this file is the Blueprint summary.
>
> **Why this was reset:** Running `npx create-ai-blueprint@latest` with
> "Overwrite matching Blueprint files? y" replaced `blueprint/`, `AGENTS.md`,
> and related files with fresh templates. Product code was not deleted; only
> the planning overlay was. Prefer answering **N** on overwrite unless you
> intend to wipe Blueprint content.

## 1. Problem - What problem are we solving?

Developers using AI coding agents:

- Hunt for `CLAUDE.md`, Cursor rules, and skills scattered across GitHub and
  skills.sh
- Copy-paste artifacts that may contain unread shell commands
- Get no stack-specific guidance (Spring Boot vs React need different rules)
- Have no audit trail: no lockfile, pinned versions, or reproducibility

**Goal (roadmap):** Build ai-skillops v1 - a governed CLI + registry + admin UI
that discovers, safety-scans, and installs AI agent skills into developer
projects.

**Tagline:** Discover, govern, and install AI engineering skills and workflows.

## 2. Users - Who is this for?

- Developers who use Claude Code, Cursor, Codex, or Copilot and want governed,
  stack-aware, lockfile-pinned installs
- Registry operators who review, approve, block, and monitor artifacts via the
  admin UI

Target stacks for recommendations: TypeScript/Node.js, Next.js, React,
Java/Spring Boot, Python.

## 3. Features - What does the MVP need?

v1 scope follows roadmap Phases 1-4 (Tasks 1-12):

**Foundation (Phase 1)** - Turborepo, shared types/Zod, Supabase schema,
`RegistryClient`, env template

**Scanner (Phase 2)** - skills.sh seed, GitHub file detector, static safety
scanner, scorer, runner, GitHub Actions `scanner.yml`

**CLI (Phase 3)** - `npx ai-skillops`: stack detector, SQLite cache,
`ai-skillops.lock.yaml`, commands `init`, `search`, `install`, `list`,
`audit`, `update`, `why`, `sync`

**Admin (Phase 4)** - Next.js 14 App Router on Vercel, Supabase Auth,
dashboard / repositories / artifacts / review / analytics; deploy + npm publish

**Out of scope for v1:** pack resolution, end-user accounts/API keys, public
landing page, webhook rescans, GitHub discovery beyond skills.sh seed.

## 4. Data - What are we storing?

Supabase PostgreSQL (`supabase/migrations/0001_initial.sql`):

| Table | Purpose |
|---|---|
| `repositories` | GitHub sources, status, skills.sh install counts |
| `artifacts` | skill/rule/context/command/workflow/pack + scores |
| `scans` | Per-repo scan runs |
| `safety_findings` | Static scanner findings |
| `classifications` | Languages, frameworks, agents, etc. |
| `install_events` | Anonymous install telemetry (stack fingerprint only) |

CLI local: `~/.ai-skillops/cache/registry.db` and project
`ai-skillops.lock.yaml`.

## 5. Tech - What stack are we using?

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 20, TypeScript 5 strict, ESM |
| Monorepo | Turborepo + npm workspaces (`packageManager` in root package.json) |
| Packages | `shared`, `registry-client`, `scanner`, `cli` |
| App | `apps/admin` Next.js 14 App Router + Tailwind |
| DB / Auth | Supabase PostgreSQL + Auth + REST |
| Scanner | `@octokit/rest`, cheerio; GitHub Actions |
| CLI | Commander.js, better-sqlite3, chalk, inquirer/prompts, ora, yaml |
| Tests | Vitest |
| Hosting | Admin on Vercel; CLI on npm; scanner on Actions |

Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`).

## 6. Monetize - How will this make money?

Not specified in the v1 roadmap. Treat v1 as product build / open distribution.
Monetization deferred until after ship.

## 7. UI/UX - How should this look and feel?

- **CLI-first:** interactive `init`, clear terminal UX, offline cache with
  stale warning, lockfile in git
- **Admin:** minimal ops UI (five pages), invite-only auth
- **Public web:** out of scope for v1

## 8. Deployment - Where and how will this ship?

| Piece | How |
|---|---|
| Admin | Vercel (`apps/admin`, `vercel.json` present); env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` |
| CLI | `npm publish` from `packages/cli` as `ai-skillops` |
| Scanner | `.github/workflows/scanner.yml`; secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN` |
| DB | Supabase; apply `supabase/migrations/` |

Root commands: `npm run build`, `npm test`, `npm run dev`, `npm run lint`.
