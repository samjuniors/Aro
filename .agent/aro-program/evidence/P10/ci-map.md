# CI Map & Required Checks Analysis (P10.7)
Date: 2026-10-19
Author: Aro Program

## 1. CI Architecture
The primary GitHub Actions pipeline is orchestrated via `.github/workflows/ci.yaml`, which runs change classification (`detect-changes`) and conditionally triggers 21 sub-workflows.

## 2. Status on Aro Fork Today

### A. Green (Can pass today on fork)
| Workflow | Scope | Status / Prerequisite |
| --- | --- | --- |
| `case-collision-check.yml` | Case sensitivity across filesystems | **Green** (zero collisions in tree) |
| `lazy-deps-guard.yml` | Lazy import boundary verification | **Green** (adheres to Hermes architecture) |
| `uv-lockfile-check.yml` | Python `uv.lock` consistency | **Green** |
| `lockfile-diff.yml` | NPM/UV lockfile drift | **Green** |
| `docker-lint.yml` | Dockerfile syntax and linting | **Green** |
| `profile-artifact-check.yml`| Profile boundary checks | **Green** |
| `tests.yml` | Python unit and integration tests | **Green** (under clean virtualenv) |
| `desktop-bundle-smoke.yml` | Electron packaging smoke test | **Green** (desktop build succeeds in 57s) |

### B. Red Today (and Root Cause Analysis)
| Workflow | Current State | Root Cause | Classification |
| --- | --- | --- | --- |
| `lint.yml` | **Red** | `apps/desktop` has 182 ESLint errors (curly brace, newline, unused import formatting rules). | **Pre-existing**: Existed on `ui-port/2026-10-09` before Phase 8-10. |
| `js-tests.yml` | **Red (near-green)** | 1211 of 1213 test files pass (10,755 tests pass). Fails on 3 tests: `voice-prefs.test.ts` (localStorage assertion) and `cron-prompt.test.ts` (`spawnSync('sh')` on Windows). | **Pre-existing & Platform**: Windows POSIX assumption and Vitest mock state. |
| `contributor-check.yml` | **Red** | Upstream NousResearch contributor agreement bot check. | **Upstream-owned**: Inapplicable to Aro independent fork. |
| `deploy-site.yml` | **Red** | Requires upstream Cloudflare Pages deployment token. | **Upstream-owned**: Target documentation site belongs to upstream. |
| `supply-chain-audit.yml` | **Red** | Requires GitHub App credentials and upstream review permissions. | **Upstream-owned**: Needs fork secret configuration. |
| `docs-site-checks.yml` | **Red** | Fails on broken relative links in documentation outside core tree. | **Pre-existing**: 150 broken relative links cataloged in P10.3. |

## 3. Proposed Minimal Required-Checks Set for Aro Fork
To ensure fast feedback, branch protection integrity, and fork isolation without false-positive blocking:

1. **`typecheck` (Desktop)**: `npm run typecheck` from `apps/desktop` must be 100% clean (0 TypeScript errors).
2. **`design-ratchet`**: `vitest run --project ui no-raw-visuals.test.ts` must pass (enforces zero raw color/spacing/radius drift).
3. **`backend-tests`**: Core Python unit test suite (`pytest tests/`).
4. **`case-collision`**: `case-collision-check.yml` to prevent case-clashing files on cross-platform checkouts.
5. **`lockfile-integrity`**: `uv-lockfile-check.yml` and `lockfile-diff.yml` to prevent unpinned dependency drift.

*Note for Founder Approval at Gate 10.2:* Full `lint` and `test:ui` will be brought to 100% green status during Phase 12 (wiring/defects) and Phase 15 (hardening).
