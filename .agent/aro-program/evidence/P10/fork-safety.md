# Fork-Safety Audit Report (P10.6)
Date: 2026-10-19
Author: Aro Program
Workflows Audited: 51

## 1. Summary of Classifications
- **KEEP**: 33 workflows (safe local/PR validation: lint, tests, bundle smoke, typecheck)
- **DISABLE**: 7 workflows (deploy/release/upstream publishing actions)
- **NEEDS-SECRET**: 11 workflows (require fork secrets or credentials)

## 2. Upstream Secrets & Endpoints Inventory
- **Upstream Organization References**: `NousResearch/hermes-agent`, `nousresearch`
- **Upstream Domains / Endpoints**: `hermesagent.com`, `nousresearch.com`, Cloudflare R2 bucket storage
- **Referenced Secrets across Workflows**:
  - `APPLE_API_ISSUER`
  - `APPLE_API_KEY_ID`
  - `APPLE_API_KEY_P8`
  - `APP_PRIVATE_KEY`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_ACCOUNT_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CSC_KEY_PASSWORD`
  - `CSC_LINK`
  - `DOCKERHUB_TOKEN`
  - `DOCKERHUB_USERNAME`
  - `GITHUB_TOKEN`
  - `LIVE_ANTHROPIC_API_KEY`
  - `LIVE_GEMINI_API_KEY`
  - `LIVE_NOUS_API_KEY`
  - `LIVE_OPENAI_API_KEY`
  - `LIVE_OPENROUTER_API_KEY`
  - `LIVE_XAI_API_KEY`
  - `MS_STORE_CLIENT_ID`
  - `MS_STORE_CLIENT_SECRET`
  - `MS_STORE_SELLER_ID`
  - `MS_STORE_TENANT_ID`
  - `TERMUX_APT_GPG_KEY`
  - `TERMUX_APT_GPG_PASSPHRASE`
  - `VERCEL_DEPLOY_HOOK`

## 3. Workflow Classification Matrix

| Workflow | Classification | Secrets | Notes |
| --- | --- | --- | --- |
| `.github/workflows/archive-inputs.yml` | **NEEDS-SECRET** | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Requires secrets: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY |
| `.github/workflows/bootstrap-installer-build.yml` | **NEEDS-SECRET** | `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY_P8`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` | Requires secrets: CSC_LINK, CSC_KEY_PASSWORD, APPLE_API_KEY_P8, APPLE_API_KEY_ID, APPLE_API_ISSUER |
| `.github/workflows/bootstrap-installer.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/canary-release.yml` | **DISABLE** | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Publishes release/docker/site artifacts to upstream registries or requires upstream credentials |
| `.github/workflows/case-collision-check.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/ci-review-comment.yml` | **NEEDS-SECRET** | `GITHUB_TOKEN` | Requires secrets: GITHUB_TOKEN |
| `.github/workflows/ci.yaml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/contributor-check.yml` | **DISABLE** | - | Checks upstream Nous contributor agreements/attribution |
| `.github/workflows/deploy-site.yml` | **DISABLE** | `VERCEL_DEPLOY_HOOK`, `APP_PRIVATE_KEY` | Publishes release/docker/site artifacts to upstream registries or requires upstream credentials |
| `.github/workflows/desktop-bundle-smoke.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/desktop-bundled-release.yml` | **DISABLE** | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY_P8`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `TERMUX_APT_GPG_KEY`, `TERMUX_APT_GPG_PASSPHRASE`, `MS_STORE_TENANT_ID`, `MS_STORE_SELLER_ID`, `MS_STORE_CLIENT_ID`, `MS_STORE_CLIENT_SECRET` | Publishes release/docker/site artifacts to upstream registries or requires upstream credentials |
| `.github/workflows/docker-lint.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/docker.yml` | **DISABLE** | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Publishes release/docker/site artifacts to upstream registries or requires upstream credentials |
| `.github/workflows/docs-site-checks.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/e2e-desktop-core.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/e2e-desktop-update.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/e2e-desktop.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/history-check.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/icons-freshness-check.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/infographic-check.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/install-e2e-macos-run.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/install-e2e-red.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/install-e2e-run.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/install-e2e-windows-run.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/install-e2e.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/js-autofix.yml` | **NEEDS-SECRET** | `GITHUB_TOKEN`, `APP_PRIVATE_KEY` | Requires secrets: GITHUB_TOKEN, APP_PRIVATE_KEY |
| `.github/workflows/js-tests.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/label-rerun.yml` | **NEEDS-SECRET** | `GITHUB_TOKEN` | Requires secrets: GITHUB_TOKEN |
| `.github/workflows/lazy-deps-guard.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/lint.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/live-providers.yml` | **NEEDS-SECRET** | `LIVE_OPENROUTER_API_KEY`, `LIVE_ANTHROPIC_API_KEY`, `LIVE_NOUS_API_KEY`, `LIVE_OPENAI_API_KEY`, `LIVE_GEMINI_API_KEY`, `LIVE_XAI_API_KEY` | Requires secrets: LIVE_OPENROUTER_API_KEY, LIVE_ANTHROPIC_API_KEY, LIVE_NOUS_API_KEY, LIVE_OPENAI_API_KEY, LIVE_GEMINI_API_KEY, LIVE_XAI_API_KEY |
| `.github/workflows/lockfile-diff.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/nix.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/osv-scanner.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/plugin-catalog-ci.yml` | **NEEDS-SECRET** | - | Requires review or customized configuration for Aro fork |
| `.github/workflows/pm-bundle.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/profile-artifact-check.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/rust-tests.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/sandbox-image.yml` | **NEEDS-SECRET** | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Requires secrets: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN |
| `.github/workflows/skills-index-freshness.yml` | **NEEDS-SECRET** | `APP_PRIVATE_KEY` | Requires review or customized configuration for Aro fork |
| `.github/workflows/skills-index.yml` | **NEEDS-SECRET** | `APP_PRIVATE_KEY` | Requires review or customized configuration for Aro fork |
| `.github/workflows/stable-release-publication.yml` | **DISABLE** | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `MS_STORE_TENANT_ID`, `MS_STORE_CLIENT_ID`, `MS_STORE_CLIENT_SECRET` | Publishes release/docker/site artifacts to upstream registries or requires upstream credentials |
| `.github/workflows/stable-release.yml` | **DISABLE** | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Publishes release/docker/site artifacts to upstream registries or requires upstream credentials |
| `.github/workflows/supply-chain-audit.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/termux-verify.yml` | **NEEDS-SECRET** | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Requires secrets: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY |
| `.github/workflows/tests-os.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/tests.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/uv-lockfile-check.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/windows-bundle-sdk.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/windows-install-update-e2e.yml` | **KEEP** | - | Pure CI verification |
| `.github/workflows/windows-venv-e2e.yml` | **KEEP** | - | Pure CI verification |

## 4. Release, Update, & Telemetry Scripts Audit
- `scripts/release.py`, `scripts/releases/*`: Targets upstream R2 storage and GitHub releases. **DISABLE** for automatic runs; customize for Aro in P16.
- `scripts/deploy-site` / `.github/workflows/deploy-site.yml`: Deploys upstream documentation site. **DISABLE**.
- `scripts/observability/*` (telemetry & trace probes): Telemetry must remain strictly opt-in per Aro project charter (ADR 0005, PROGRAM.md §3).
- `apps/desktop/scripts/sign-*.mjs`, `scripts/stage-msixbundle.mjs`: Windows/macOS code-signing scripts. **NEEDS-SECRET** (Aro signing certificates in P16).
