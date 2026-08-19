# Coding Standards

> Aligned with roadmap global constraints and the current Turborepo packages.
> Restored after Blueprint installer overwrite reset this file to Next.js/Prisma
> defaults.

## TypeScript

- Node.js >= 20 everywhere (`engines` in package.json)
- TypeScript strict mode (`"strict": true`) in all package tsconfigs
- ESM only (`"type": "module"`); root target ES2022, `module` /
  `moduleResolution` `NodeNext`
- No `any` - use `unknown` and narrow
- Prefer shared domain types and Zod schemas from `@ai-skillops/shared`
- Export explicit types for public package APIs

## Monorepo packages

- Layout: `packages/*` (shared, registry-client, scanner, cli) and `apps/admin`
- Package names: `@ai-skillops/<name>`; published CLI package name is
  `ai-skillops`
- Build with `tsc` to `dist/`; set `exports` with `import` + `types`
- Root `package.json` must declare `packageManager` (required by Turbo 2.x)
- Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`
- Detailed task checklists:
  `docs/superpowers/plans/2026-08-18-ai-skillops-roadmap.md`

## File organization

- Source under `packages/<name>/src/` or `apps/admin/app/`
- Co-locate tests as `*.test.ts` next to the module
- Supabase migrations under `supabase/migrations/`
- Scanner: `sources/`, `safety/`, `scoring/`
- Design + roadmap under `docs/superpowers/` (reference, not runtime)

## Naming

- Modules: kebab-case (`skills-sh.ts`)
- Types/interfaces: PascalCase, no `I` prefix
- Functions/variables: camelCase
- DB columns: snake_case (match Supabase)

## Data access

- Registry I/O through `@ai-skillops/registry-client` (Supabase JS)
- Use explicit `onConflict` keys that match unique constraints
- Service-role keys only in scanner / trusted server contexts
- Anonymous install events: stack fingerprint only

## Error handling

- At package boundaries, throw `Error` with a clear prefix
- Always check Supabase `error` and rethrow
- CLI: actionable stderr, non-zero exit on failure

## Testing

Vitest is the only unit test runner. `AGENTS.md` declares `npm test`, so
**tests are a gate for logic-bearing steps**.

- Test pure logic: parsers, classifiers, scorers, detectors, lockfile helpers
- Mock external I/O; do not hit live Supabase/GitHub in unit tests
- A logic step must ship a passing test in the same reviewable diff
- `npm test` must be green before approval, checkpoint, or `/complete`

## Browser verification

For `apps/admin` interactive flows, prefer real browser evidence. Do not add
Playwright mid-feature unless asked or the spec is about browser automation.

## React / Next.js (admin)

- Next.js 14 App Router, functional components, Server Components by default
- `'use client'` only when needed
- Tailwind CSS; minimal operational UI
- Supabase Auth (SSR); env via `apps/admin/.env.local`:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SITE_URL`

## CLI

- Commander.js for commands
- Stack detection from project files
- Local SQLite cache under `~/.ai-skillops/`; lockfile `ai-skillops.lock.yaml`
- Do not add a long-running `dev` script that breaks `turbo dev` (admin is the
  persistent `dev` target)

## Code quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.

- Comment the **why**, not the **what**
- No banner/header blocks or step-by-step narration of obvious code
- When in doubt, leave the comment out

## Writing

- No em dashes (U+2014) in generated content
- Use a hyphen for `term - description` separators
