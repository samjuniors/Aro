# Aro Operating Handbook

> **Aro Agent & Aro Desktop Operations Manual**  
> **Audience:** Core Maintainers, Contributors, and Agentic Assistants  
> **Status:** ACTIVE (Phase 17: Operate and Evolve)  
> **Decisions Governed:** D-1 to D-24 (ADR 0003, ADR 0009, ADR 0012, ADR 0017, ADR 0018, ADR 0019, ADR 0020, ADR 0021)  

---

## 1. Operating Invariants

Every maintenance action, hotfix, feature pull request, and automated task must adhere to the core architectural invariants of the project:

1. **Zero Outbound Telemetry (ADR 0012):** Aro never collects, aggregates, or transmits user prompts, tool executions, system metrics, or crash dumps without explicit, interactive user consent.
2. **Sacred Prompt Caching:** Never mutate past session turns, swap active toolsets mid-conversation, or inject synthetic assistant turns that invalidate the model's key-value prompt cache.
3. **Strict Role Alternation:** Model conversation histories must follow alternating User / Assistant turns without consecutive same-role injections.
4. **Narrow Core Waist:** New capabilities belong at the edges (custom CLI skills, plugins, or service-gated tools via `check_fn`), never as permanent baggage in the core model schema unless universally fundamental.
5. **Session-Bound UI Capabilities:** UI capabilities (e.g., responsive webview, diff review, IDE handoff) are bound to the active session stream, never inferred from host process environment variables.
6. **Fork Safety & Upstream Boundary:** Upstream Hermes Agent changes are never merged in bulk; security patches are cherry-picked selectively per ADR 0003 and ADR 0021.

---

## 2. Release Train & Update Channels

Aro distributes updates across three dedicated release channels (ADR 0017, ADR 0019):

| Channel | Cadence | Source Branch | Stability Target | Intended Audience |
| :--- | :--- | :--- | :--- | :--- |
| **`canary`** | Automated on merge | `aro/integration` | Bleeding edge | Core developers and dogfooders |
| **`beta`** | Every 2 weeks | `aro/beta` | High | Closed beta cohort (25–50 developers) |
| **`stable`** | Monthly (1st Wed) | `aro/stable` | Production | General public / production workspaces |

### Release Promotion Workflow
1. **Canary to Beta:** Features and bugfixes merged to `aro/integration` bake in `canary` for at least 7 days before being bundled into a bi-weekly beta release candidate.
2. **Beta Soak Period:** The beta candidate runs for 14 days with the beta cohort. Triage tracking verifies:
   - Zero fatal crashes or P0 regressions.
   - Greater than 80% journey completion across the 10 core user journeys.
   - Green performance benchmarks on the 4-core 8GB baseline.
3. **Beta to Stable:** Upon founder sign-off, the validated beta is tagged as `vX.Y.Z` on `aro/stable` and published to GitHub Releases.

---

## 3. Hotfix Procedure (Step-by-Step Runbook)

*This procedure is self-contained: any maintainer or fresh AI agent can execute a hotfix using only these instructions.*

### Trigger Criteria
A hotfix is triggered immediately for **Severity P0** regressions:
- Desktop application crash on launch or persistent white-screen hang.
- Security vulnerability (isolation bypass, secret leakage).
- Data loss or SQLite session database corruption.
- Broken updater preventing subsequent updates.

**SLA:** Triage within 1 hour; hotfix packaged, verified, and released within **12 hours** (ADR 0020).

### Execution Steps

#### Step 1: Branch from the Affected Release Tag
```bash
# Example: Hotfix for v1.0.0
git fetch --tags
git checkout -b hotfix/v1.0.1 tags/v1.0.0
```

#### Step 2: Implement Minimal Surgical Fix
- Make only the changes necessary to resolve the P0 defect.
- Do NOT bundle unrelated refactors, dependency bumps, or feature additions.
- Add an explicit regression test covering the failure condition:
  - If Electron main/security: `apps/desktop/electron/*.test.ts`
  - If UI/journey: `apps/desktop/src/aro/*.test.tsx`

#### Step 3: Run Full Local Verification Matrix
```bash
# 1. Typecheck the entire desktop app and Electron layers
npm run --prefix apps/desktop typecheck

# 2. Run unit and journey tests
npm run --prefix apps/desktop test:unit

# 3. Dry-run package build to verify ASAR integrity and electron fuses
npm run --prefix apps/desktop pack
```

#### Step 4: Version Bump & Changelog Update
1. Update `version` in `apps/desktop/package.json` (e.g., `1.0.1`).
2. Add a `### Hotfix v1.0.1` section to [`docs/research/25-release-notes-and-rollback.md`](file:///e:/Projects/SamjuniorsProducts/Aro/docs/research/25-release-notes-and-rollback.md) noting the bug description, affected commit, and fix verification.

#### Step 5: Commit and Tag
```bash
git add .
git commit -m "fix(hotfix): resolve P0 launch crash on Windows (#issue)"
git tag -a v1.0.1 -m "Aro Desktop Hotfix v1.0.1"
```

#### Step 6: Trigger Automated Packaging & Sign-Off
- Push the branch and tag to GitHub:
  ```bash
  git push origin hotfix/v1.0.1 --tags
  ```
- The CI release workflow (`desktop-bundled-release.yml`) builds signed installers (MSIX, DMG, AppImage) and creates a draft release.
- Founder approves and publishes the GitHub Release.

#### Step 7: Backport to Integration
```bash
git checkout aro/integration
git cherry-pick v1.0.1
git push origin aro/integration
```

---

## 4. Triage Board, Issue Labels & SLAs

### SLA Commitments (ADR 0020)

| Severity | Definition | First Response | Hotfix / Resolution Target |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Crash loop, data loss, credential leak, broken updater | **< 2 hours** | **< 12 hours** |
| **P1 (High)** | Major feature broken, model provider auth failure, severe lag | **< 6 hours** | **< 24 hours** |
| **P2 (Medium)** | UI glitch, edge-case failure, non-blocking bug | **< 24 hours** | **Next bi-weekly beta** |
| **P3 (Low)** | Minor cosmetic defect, documentation typo, feature request | **< 48 hours** | **Next milestone cycle** |

### Label Taxonomy

| Label Category | Labels |
| :--- | :--- |
| **Severity** | `severity:p0`, `severity:p1`, `severity:p2`, `severity:p3` |
| **Status** | `status:needs-triage`, `status:reproduced`, `status:in-progress`, `status:blocked`, `status:deferred` |
| **Platform** | `os:windows`, `os:macos`, `os:linux` |
| **Subsystem** | `area:desktop-ui`, `area:backend-rpc`, `area:subagents`, `area:diff-review`, `area:cost-hud`, `area:preview`, `area:security`, `area:performance`, `area:accessibility`, `area:packaging` |
| **Type** | `type:bug`, `type:security`, `type:enhancement`, `type:docs`, `type:upstream-sync` |

---

## 5. Upstream (Hermes) Security Sync Routine (ADR 0021)

To protect Aro from known security vulnerabilities discovered in upstream Hermes Agent without incurring architectural divergence:

1. **Bi-Weekly Audit Schedule:** Every second Monday, execute the upstream scan.
2. **Automated Pre-Screening:**
   - Scan upstream git log for commits containing `SECURITY:`, `CVE-`, `fix(auth)`, `fix(sandbox)`, or `fix(redact)`.
   - Inspect upstream dependency updates for vulnerabilities flagged by OSV / GitHub Security Advisories.
3. **Founder Review:**
   - Shortlist candidate security commits.
   - Audit the patch diff against Aro's custom code (ensure no overwrite of Aro brand, electron fuses, or UI port files).
4. **Cherry-Pick & Fork-Safety Audit:**
   - Cherry-pick selected commit onto a dedicated sync branch `sync/upstream-security-YYYYMMDD`.
   - Run `node .agent/aro-program/tools/fork-safety-audit.mjs` to verify zero accidental brand or identity leaks.
   - Run full test suite and merge into `aro/integration`.

---

## 6. Deprecation & Breaking Change Policy

1. **Core JSON-RPC API Stability:** All methods exposed via `tui_gateway/` maintain backward-compatibility for at least two minor releases (`0.x` to `0.x+2`).
2. **Deprecation Warnings:** If an IPC channel, CLI flag, or configuration option is deprecated:
   - Emit a structured warning in logs and UI developer console.
   - Document the replacement path in [`docs/user/KNOWN-ISSUES.md`](file:///e:/Projects/SamjuniorsProducts/Aro/docs/user/KNOWN-ISSUES.md).
   - Retain the old behavior for a minimum of 60 days before removal.
3. **Database Migrations:** Schema migrations in `~/.aro/state.db` must be strictly additive and forward-compatible. Never drop or rename columns without a multi-phase migration adapter.

---

## 7. Documentation Governance & Staleness Audits

1. **Docs Registry:** All repository markdown files outside `website/` and `locales/` are tracked in [`.agent/aro-program/DOCS-REGISTRY.md`](file:///e:/Projects/SamjuniorsProducts/Aro/.agent/aro-program/DOCS-REGISTRY.md).
2. **90-Day Freshness Cycle:** Every document must have a `Verified` date within the last 90 days. Run the stale check:
   ```bash
   node .agent/aro-program/tools/reconcile-docs.mjs --check-stale
   ```
3. **Broken Link Guard:** The doc reconciliation tool audits relative links. Any PR that introduces broken markdown links fails doc CI.

---

## 8. How to Run This Program Again for a New Phase (Phase 18+)

When planning a major feature cycle or subsequent release, the program engine can be re-instantiated using the standardized Phase Kit:

1. **Template Definition:** Follow the structure defined in [`.agent/aro-program/PROGRAM.md`](file:///e:/Projects/SamjuniorsProducts/Aro/.agent/aro-program/PROGRAM.md).
2. **Create Phase Directory:**
   ```bash
   mkdir -p .agent/aro-program/phases/P18-<slug>/
   ```
3. **Author Phase Manifests:**
   - `ROADMAP.md`: Define Branch, Gates, Steps, and Interview Batches.
   - `START-PROMPT.md`: Standard instructions for agent resumption.
   - `SKILLS.md`: Research questions, tools, and read-maps.
4. **Register in Master Roadmap:**
   - Add the phase row to the table in [`.agent/aro-program/MASTER-ROADMAP.md`](file:///e:/Projects/SamjuniorsProducts/Aro/.agent/aro-program/MASTER-ROADMAP.md).
   - Set the `Active phase` and `Active step` markers.
5. **Interview Batch Execution:**
   - Prompt founder with multiple-choice interview options (marking recommended defaults).
   - Record accepted decisions as new ADRs in `docs/adr/` and index in `.agent/aro-program/DECISIONS.md`.
6. **Gate-Driven Delivery:** Work systematically step by step, stopping at every `🛑 GATE` to deliver a standard 6-part report (≤ 60 lines) and awaiting founder "continue".
