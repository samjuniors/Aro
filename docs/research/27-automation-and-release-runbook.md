# Research 27: Automation, CI Required Checks & Release Workflow Runbook

> **Phase 17: Operate and Evolve**  
> **Status:** APPROVED & OPERATIONAL  
> **Decisions Governed:** D-22 (Release Train), D-23 (Triage SLA), D-24 (Upstream Sync)  

---

## 1. Required CI Checks Matrix

Every Pull Request targeting `aro/integration`, `aro/beta`, or `aro/stable` must pass the following required automated checks before merge:

| Workflow / Check Name | Scope / Target | Passing Criteria | Timeout |
| :--- | :--- | :--- | :--- |
| **`desktop-typecheck`** | `apps/desktop` (renderer, main, e2e) | Zero TypeScript compiler diagnostics (`tsc --noEmit`) | 5 min |
| **`desktop-unit-tests`** | `apps/desktop/src/aro/` | 100% test pass on accessibility, state, and visual diff suites | 10 min |
| **`security-fuses-audit`** | `apps/desktop/electron/` | ASAR integrity check, electron fuses validation, sandbox assertions | 5 min |
| **`wcag-accessibility-audit`**| `apps/desktop` (10 journeys) | 100% pass on `accessibility-journeys.test.tsx` (WCAG 2.2 AA) | 10 min |
| **`fork-safety-guard`** | Root repository | Zero unauthorized upstream overwrites or brand regressions | 3 min |
| **`docs-staleness-check`** | Documentation tree | All docs verified < 90 days (`reconcile-docs.mjs --check-stale`) | 2 min |

---

## 2. Release Workflow Runbook (Canary, Beta, Stable)

### A. Canary Pipeline (Automated on Merge)
- **Trigger:** Any merge to `aro/integration`.
- **Workflow:** `.github/workflows/canary-release.yml`
- **Output:** Builds `Aro-canary.exe`, `Aro-canary.dmg`, and `Aro-canary.AppImage`.
- **Feed:** Updates `canary.yml` feed in GitHub Releases.
- **Verification:**
  ```bash
  # Local canary packaging test
  npm run --prefix apps/desktop pack
  ```

### B. Beta Release Train (Bi-Weekly)
- **Trigger:** Scheduled every alternate Wednesday at 14:00 UTC or manual trigger.
- **Pre-flight Audit:**
  ```bash
  # 1. Verify clean tree and typecheck
  git checkout aro/beta
  git merge --ff-only aro/integration
  npm run --prefix apps/desktop typecheck

  # 2. Verify stale documentation status
  node .agent/aro-program/tools/reconcile-docs.mjs --check-stale

  # 3. Dry-run package test
  npm run --prefix apps/desktop pack
  ```
- **Tagging & Publishing:**
  ```bash
  git tag -a v1.0.0-beta.2 -m "Aro Desktop Beta Release 2"
  git push origin v1.0.0-beta.2
  ```
- **Workflow:** `.github/workflows/desktop-bundled-release.yml` packages signed MSIX (ATS cert), signed/notarized DMG (Apple ID), and AppImage.
- **Notification:** Update posted to GitHub Discussions closed beta category.

### C. Stable Release Promotion (Monthly)
- **Trigger:** First Wednesday of the month.
- **Pre-requisites:**
  - 14 days of soak on the preceding beta.
  - Zero P0 or P1 open issues.
  - Signed-off Go/No-Go checklist.
- **Tagging:**
  ```bash
  git checkout aro/stable
  git merge --ff-only v1.0.0-beta.2
  git tag -a v1.0.0 -m "Aro Desktop Stable General Availability"
  git push origin v1.0.0
  ```

---

## 3. Dependency Update & Security Audit Policy

### 1. Dependabot / Renovate Review Cadence
- **Weekly Schedule:** Every Monday at 10:00 UTC.
- **Auto-merge Criteria:** Dev-dependencies (TypeScript, lint tools, formatting) that pass full CI may auto-merge to `aro/integration`.
- **Runtime Dependency Rules:** Any update to Electron, SQLite, React, or IPC bridges requires explicit manual review, ASAR integrity verification, and local launch smoke test.

### 2. Supply Chain & Vulnerability Scanning
- **Scanner:** `osv-scanner` and `supply-chain-audit.yml`.
- **Zero Criticals Policy:** Any dependency with a known CVE rated High or Critical blocks release builds.
- **Surgical Remediations:** Lockfile updates must use targeted package updates (`npm update <pkg>`), preserving lockfile stability.

---

## 4. Documentation Freshness Automation

The documentation reconciliation tool enforce the 90-day verification policy:
```bash
# Audit staleness
node .agent/aro-program/tools/reconcile-docs.mjs --check-stale --stale-days 90
```
- Integrated into CI `docs-site-checks.yml`.
- If any document exceeds the 90-day threshold, maintainers are notified via an automated GitHub Issue.
