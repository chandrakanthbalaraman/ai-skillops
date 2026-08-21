# ai-skillops

Governed registry + CLI + admin UI for AI agent artifacts (skills, rules,
contexts, commands, workflows).

Node.js 20+. Package manager: npm.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` (gitignored). Then copy the admin vars:

```bash
mkdir -p apps/admin
cat > apps/admin/.env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

Use the same Supabase URL/anon key as root `.env.local`. Next.js only reads
`apps/admin/.env.local`, not the repo-root file.

| File | Vars |
| --- | --- |
| `.env.local` (root) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN` |
| `apps/admin/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` |

## Scripts

Run these from the **repo root**.

| Command | What it does |
| --- | --- |
| `npm run dev` | Admin Next.js at http://localhost:3000 |
| `npm run build` | Build all workspaces (shared, registry-client, scanner, CLI, admin) |
| `npm test` | Vitest across packages |
| `npm run lint` | Lint via turbo |

Workspace-only:

```bash
npm run build -w @ai-skillops/shared
npm run build -w @ai-skillops/registry-client
npm run build -w @ai-skillops/scanner
npm run build -w @ai-skillops/cli
npm run build -w @ai-skillops/admin

npm test -w @ai-skillops/scanner
```

## Scanner

The scanner does **not** load `.env.local` by itself. `node packages/scanner/dist/index.js` without env fails with `supabaseUrl is required`.

```bash
npm run build -w @ai-skillops/shared
npm run build -w @ai-skillops/registry-client
npm run build -w @ai-skillops/scanner

set -a && source .env.local && set +a
npm run scan -w @ai-skillops/scanner
```

Equivalent:

```bash
set -a && source .env.local && set +a
node packages/scanner/dist/index.js
```

Needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GITHUB_TOKEN`. This
writes to live Supabase (repos, scans, artifacts).

## CLI (local)

```bash
npm run build -w @ai-skillops/cli
node packages/cli/dist/index.js --help
```

## Admin

```bash
npm run dev
```

Open http://localhost:3000/login. If port 3000 is already taken, Next will
move to 3001/3002. Do not suspend the dev server with Ctrl+Z; stop it with
Ctrl+C. A suspended process keeps the port and the browser looks blank.

Production-style local serve after a build:

```bash
npm run build -w @ai-skillops/admin
npm run start -w @ai-skillops/admin
```

Live deploy: https://ai-skillops-admin.vercel.app
