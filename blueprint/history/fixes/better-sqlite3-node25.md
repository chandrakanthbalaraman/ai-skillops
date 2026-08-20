# Fix: CLI init fails on Node 25 — better-sqlite3 native addon

**Type:** Fix  
**Branch:** `fix/better-sqlite3-node25`  
**Date:** 2026-08-19

## Problem

`packages/cli` depended on `better-sqlite3@^9.6.0`, which uses the V8 native
addon API. Node 25 ships a new ABI module version, so npm cannot download a
prebuilt `better_sqlite3.node`. Without `node-gyp`, Python, and a C++ toolchain
the CLI crashes at startup with an opaque Node internals error before printing
anything useful.

## Fix

- **Upgraded `better-sqlite3` to `^11.0.0`** (resolved 11.10.0). Starting with
  v11, the package switched to N-API (Node-API), which is ABI-stable across all
  current and future Node versions. Prebuilt binaries work on Node 20, 22, 24,
  25, and beyond without recompilation.
- **Bumped `@types/better-sqlite3` to `^7.6.12`** to match the v11 API surface.
- **Added a clear error wrapper** around `new Database()` in
  `packages/cli/src/cache/registry.ts`. On load failure, the error now reads:
  ```
  ai-skillops: SQLite native addon failed to load.
    Node v25.x  (ABI NN)
    Try: npm rebuild better-sqlite3
    Cause: <original error message>
  ```

## Files changed

| File | Change |
|---|---|
| `packages/cli/package.json` | `better-sqlite3` `^9.6.0` → `^11.0.0`; types `^7.6.12` |
| `packages/cli/src/cache/registry.ts` | Wrap `new Database()` in try/catch with actionable message |
| `package-lock.json` | Lockfile updated |

## Verify

```bash
npm test -w packages/cli   # 20/20 pass
npm run build -w packages/cli  # clean
```
