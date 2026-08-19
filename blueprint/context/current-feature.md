# Feature: Vercel admin deploy

**From build-plan:** feature 12a  
**Type:** Feature  
**Status:** in progress

## Goal

Deploy the existing Next.js admin app to Vercel with the correct public Supabase
env vars, and prove that the live site serves `/login` and redirects unauthenticated
users there. This is the first Ship v1 slice; npm publish and scanner seed come
later (12b–12d).

## In scope

- Confirm `apps/admin` production build succeeds in the monorepo
- Confirm `apps/admin/vercel.json` is suitable for the workspace layout
- Deploy (or link) the admin app to Vercel
- Set Vercel project env: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (deployment URL)
- Smoke the live URL: `/login` loads; `/` redirects to `/login` when logged out
- Record the live admin URL in a short note for 12b–12d (no secrets)

## Out of scope

- npm publish of the CLI (12b)
- GitHub Actions secrets or running the scanner (12c)
- Full CLI E2E smoke or `v0.1.0` tag (12d)
- Public marketing site / custom domain DNS (optional later; domain not required
  for this slice)
- Changing admin product UI or auth flows
- Committing real secrets to git (`.env.example` stays placeholders only)

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - Prove admin production build** - From repo root, run the admin
  production build path that Vercel will use (shared + registry-client + admin,
  matching `vercel.json`). Fix only build-blocking issues if any. *Done when:*
  build exits 0 and `.next` (or turbo/workspace build output) is produced for
  admin without errors.
- [x] **Step 2 - Harden deploy config if needed** - Review `apps/admin/vercel.json`
  against the monorepo; adjust only if the Step 1 command or Vercel docs require
  it (install/root directory notes). *Done when:* config matches a successful
  local build command, and any change is reviewed as a small diff.
- [ ] **Step 3 - Deploy to Vercel** - Link/create the Vercel project for
  `apps/admin` (CLI or dashboard) and deploy to production. User must be logged
  into Vercel. *Done when:* deploy succeeds and a public HTTPS URL is returned.
- [ ] **Step 4 - Set Vercel env and redeploy if needed** - Configure
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `NEXT_PUBLIC_SITE_URL` (the live URL from Step 3) in the Vercel project. Pull
  values from local `apps/admin/.env.local` / root secrets with user confirmation;
  never print full secrets in chat. Redeploy if env was added after the first
  deploy. *Done when:* Vercel dashboard shows the three vars set for Production,
  and a deploy that includes them is live.
- [ ] **Step 5 - Live smoke** - Hit the live `/login` and `/` URLs. *Done when:*
  `/login` returns 200 (login UI visible); unauthenticated `/` redirects to
  `/login`; no middleware crash about missing Supabase URL/key. Write the live
  base URL into `blueprint/context/current-feature.md` Notes (URL only).

## Files / areas

- `apps/admin/vercel.json` (only if Step 2 requires a change)
- Possibly root or admin build config if Step 1 surfaces a monorepo build gap
- No schema or CLI package changes
- Live env lives only in Vercel dashboard / local gitignored `.env.local`

## Data / contracts

- None new. Admin continues to use existing Supabase Auth + registry tables.
- Load-bearing env names (already in overview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL`

## Testing

- No new unit-test logic expected; this is ops/integration.
- Gate: `npm run build` (or the workspace build used in Step 1) must pass before
  deploy. Run `npm test` if any Step 1/2 code fix adds logic; otherwise build
  evidence + live HTTP checks suffice.
- Manual: live `/login` 200, `/` → `/login` when logged out.

## Notes for the AI

- Branch: `feature/vercel-admin-deploy`.
- Do not invent a custom domain; default `*.vercel.app` is enough for 12a.
- Do not commit `.env.local` or paste service-role / PAT values into the repo.
- Prefer Vercel CLI (`vercel`) when available; stop and ask if auth is missing.
- If deploy fails on monorepo path, fix `vercel.json` / root directory settings
  before changing app code.
- After Step 5, leave 12b–12d unchecked; `/complete` only closes 12a.
