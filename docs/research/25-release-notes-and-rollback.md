# Research 25: Release Notes, Rollback Plan & 7-Day Launch Runbook

> **Phase 16: Release & Launch Readiness**  
> **Target Release:** Aro Desktop `v1.0.0-beta.1`  
> **Status:** READY FOR STAGING / GATE 16.3  
> **Decisions Referenced:** D-1 to D-21, ADR 0003, ADR 0007, ADR 0009, ADR 0012, ADR 0017, ADR 0018  

---

## 1. Executive Summary & Release Identity

Aro Desktop `v1.0.0-beta.1` is the inaugural public beta release of the Aro Agent environment—a high-performance, private, agentic desktop application pairing the Hermes core engine with a bespoke desktop design system, responsive previews, and visual agent observability.

### Release Identity
- **Product Name:** Aro Desktop (Aro Agent by samjuniors)
- **Version:** `1.0.0-beta.1`
- **Release Channel:** `beta` (with `canary` for rapid builds and `stable` reserved for post-beta general availability)
- **Target Platforms:**
  - **Windows:** 10 / 11 (x64) via NSIS installer and signed MSIX
  - **macOS:** 12.0+ Monterey through 15.0+ Sequoia (Universal / Apple Silicon arm64 & Intel x64 DMG)
  - **Linux:** Ubuntu 20.04+, Debian 11+, Fedora 36+, Arch Linux via AppImage (x64)
- **License:** MIT License (Forked from Hermes Agent under MIT; full upstream attribution preserved in `NOTICE`).

---

## 2. Release Notes: Aro v1.0.0-beta.1

### Highlights & Vertical Slices (Phase 13)

1. **Slice 1: Diff-First Visual Review & Checkpoint Rollback**
   - Inline side-by-side and unified diff viewer (`DiffView`) rendering file modifications with syntax highlighting.
   - One-click file hunk rollback and full session checkpoint restoration.
   - Visual status badges for added, modified, renamed, and deleted files.

2. **Slice 2: Ambient Cost HUD & Proactive Quota Guard**
   - Real-time token consumption HUD tracking input, output, and cached prompt tokens per session.
   - USD / local currency estimate based on provider model rate tables.
   - Soft warnings at 80% quota threshold and hard guardrails before turn submission to prevent unexpected billing.

3. **Slice 3: Parallel Subagent Work-Graph & Tasks Board**
   - Interactive dependency DAG visualizer showing parent-child agent delegations in real time.
   - Kanban-style Tasks Board (`AroTasksPage`) displaying tasks categorized as Pending, In-Progress, Blocked, and Completed.
   - Live stream tap into subagent thought transcripts and tool invocations.

4. **Slice 4: In-App Responsive Web & Dev-Server Preview**
   - Sandboxed browser pane with dedicated partition isolation.
   - Device frame emulation: Desktop (1280px), Tablet (768px), and Mobile (375px) presets with custom viewport dragging.
   - Live console log interception and quick DOM inspection.

5. **Slice 5: One-Click IDE Deep Link & Editor Handoff**
   - Protocol handler integration for VS Code (`vscode://`), Cursor (`cursor://`), Zed (`zed://`), and Windsurf.
   - Direct jump to file, line, and column when referencing agent changes.
   - Automatic workspace directory alignment.

### Hardening, Privacy & Security (Phase 15)

- **Zero Outbound Telemetry (ADR 0012):** No crash pings, analytics pings, or background metrics collection without explicit user action.
- **Electron Security Hardening:** 
  - Strict Content-Security-Policy (CSP) headers applied to all renderer contexts.
  - Runtime fuses enabled: `runAsNode: false`, `enableCookieEncryption: true`, `onlyLoadAppFromAsar: true`.
  - Main-frame IPC sender validation across all IPC channels.
- **Credential Scrubbing:** Multi-pattern regex redactors scrubbing API keys (OpenAI, Anthropic, Google AI), GitHub tokens, and SSH secrets from diagnostics, logs, and memory dumps.
- **WCAG 2.2 AA Accessibility (ADR 0015):** Complete keyboard navigation, visible focus rings, and verified color contrast (minimum 4.5:1 text, 3:1 UI boundaries) across all 6 themes (Default Dark, High Contrast Dark, Slate Dark, Light, High Contrast Light, Monokai).
- **Sub-Second Performance (ADR 0016):** Cold start verified at 984ms (<1800ms budget) and idle memory footprint at 190MB (<250MB budget) on 4-core reference hardware.

---

## 3. Rollback & Hotfix Procedure

To protect users against regressions, Aro adheres to a structured rollback and hotfix process.

### A. Desktop Updater Rollback Mechanics
1. **Atomic Staging:** New package versions stage in a separate directory (`~/.aro/updates/pending/`) and verify SHA-256 and digital signatures before swapping.
2. **Backup Preservation:** The running `app.asar` is preserved as `app.asar.bak` prior to applying updates.
3. **Boot Integrity Check:** If the newly applied version crashes during initialization or fails the fuse validation, the Electron bootstrap automatically reverts to `app.asar.bak`, marks the target release as `quarantined`, and notifies the user with diagnostic logs.
4. **Channel Downgrade:** Users can switch from `canary` or `beta` to `stable` via Settings. The updater fetches the latest version of the target channel and installs it cleanly.
5. **Data Backward-Compatibility:** The local SQLite session database (`~/.aro/state.db`) uses forward-compatible schema migrations. Downgrading within the `1.0.x` series preserves existing sessions without schema corruption.

### B. Emergency Hotfix SLA (< 12 Hours for P0)
- **P0 Criteria:** App crash on launch, persistent hang, credential leakage, or data loss.
- **Hotfix Workflow:**
  1. Founder / Release Lead cuts `hotfix/v1.0.x` directly from the release tag.
  2. Targeted minimal regression fix implemented and tested with dedicated regression test.
  3. `npm run test` and `npm run --prefix apps/desktop typecheck` executed.
  4. Packaging executed via CI with cryptographic signatures.
  5. Published as a replacement release (e.g., `v1.0.1-beta.1`) and pinned in GitHub Discussions.

---

## 4. 7-Day Launch On-Call Runbook

### On-Call Team & Responsibilities
- **Primary On-Call:** Release Lead (`samjuniors`) — Owner of hotfix approvals, signing keys, and repository releases.
- **Secondary / Support:** Agentic AI Engineering Assistant — Automated log triage, issue classification, reproduction synthesis, and documentation maintenance.

### Daily Cadence Schedule

| Time (UTC) | Action Item | Owner | Deliverable |
| :--- | :--- | :--- | :--- |
| **08:00** | Check GitHub Issues & Discussions for overnight reports | Secondary | Triage summary table posted to internal tracking |
| **09:30** | Review sanitized diagnostics from beta participants | Primary + Secondary | Root-cause analysis for any P1/P2 issues |
| **14:00** | Daily Standup / Hotfix Decision Point | Primary | Go/No-go on interim patch release |
| **18:00** | Update `docs/user/KNOWN-ISSUES.md` with newly confirmed workarounds | Secondary | Documentation commit & PR |
| **21:00** | Daily closeout & health check | Primary | Daily Beta Health Report |

### Incident Playbooks

#### Playbook 1: SmartScreen / Gatekeeper Block Surge
- **Symptom:** Windows users report "Windows protected your PC" or macOS reports "App cannot be opened".
- **Action:**
  1. Verify binary digital signature on the published artifact.
  2. Direct users to the documented workaround in [`docs/user/KNOWN-ISSUES.md`](file:///e:/Projects/SamjuniorsProducts/Aro/docs/user/KNOWN-ISSUES.md#1-windows-smartscreen-warning).
  3. Submit false-positive feedback via Microsoft Defender Security Intelligence portal with signed binary hash.

#### Playbook 2: LLM Provider Authentication / Rate Limiting
- **Symptom:** Users report repeated timeouts or `429 Too Many Requests` when executing prompts.
- **Action:**
  1. Inspect sanitized logs to determine if error originated at Aro gateway or provider endpoint.
  2. Ensure the Ambient Cost HUD soft warning is visible to users.
  3. Document provider-specific outage on GitHub Discussions pinned notice.

#### Playbook 3: Corrupted Local Session State
- **Symptom:** User experiences blank screen or crash loop on opening a specific project.
- **Action:**
  1. Advise user to launch with `--safe-mode` or temporarily rename `~/.aro/projects/<project-id>/state.db`.
  2. Instruct user to export sanitized diagnostics via `Aro > Help > Export Sanitized Diagnostics`.
  3. Patch state deserializer in `apps/desktop/src/aro/` to handle corrupted JSON gracefully.

---

## 5. Verification Checklist

- [x] v1.0.0-beta.1 release notes authored highlighting all 5 vertical slices.
- [x] Security, privacy, accessibility, and performance metrics documented.
- [x] Rollback mechanics defined for updater, binary backups, and schema compatibility.
- [x] 12-hour hotfix SLA established for P0 incidents.
- [x] 7-day on-call schedule, daily cadence, and incident playbooks established.
