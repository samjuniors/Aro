# ADR 0009: Desktop Application Updater Design — Channels, Signature Verification, and Rollback
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Step P11.9, Founder Decision D-9)

## Context
Per Decision D-7 (ADR 0007), Aro Desktop v1 employs an automated background update download model with a user opt-out toggle on the stable channel. Because desktop software runs locally with deep access to user sessions, credentials, and local LLM/gateway backends, the update pipeline must satisfy strict security, channel separation, and resiliency guarantees. Shipping and release execution belong to Phase 16; this ADR establishes the architectural design and contract.

## Decision

### 1. Release Channels
Aro defines two official distribution channels:
- **`stable` (default):** Production builds promoted after passing the clean-machine test matrix and gate audits. Automatic background download with notification and restart-to-apply.
- **`beta` (opt-in):** Pre-release validation builds for external testers and community feedback. Configurable in `Settings → About / Updates` and persisted in `~/.aro/config.yaml` (`updates.channel: "beta"`).

An internal channel (`nightly`/`canary`) is reserved for CI smoke runs and developer preview builds without public auto-promotion.

### 2. Cryptographic Signature Verification
To prevent tampering, supply chain attacks, and CDN compromise, every update payload must pass cryptographic verification before staging or execution:
- **Signed Manifests:** Every release feed includes SHA-512 hashes and ECDSA signatures over manifest entries (`latest.yml`, `latest-mac.yml`, or `*.appinstaller`).
- **Windows (MSIX / Executable):** Authenticode code signing with an EV or Azure Trusted Signing certificate. MSIX packages are cryptographically validated by the Windows OS Appx package manager prior to deployment.
- **macOS (DMG / Zip):** Apple Developer ID code signing with hardened runtime and Apple Notarization (`spctl` / Gatekeeper validation). The auto-updater validates notarization tickets before mounting or swapping bundles.
- **Linux (AppImage):** Binary SHA-512 digest verification matching signed release metadata.
- **Fail-Closed Execution:** The Electron main process refuses to execute or stage any update whose signature or hash fails verification, emitting an error log and alerting the user.

### 3. Atomic Staging and Rollback Architecture
To protect against corrupted downloads, aborted writes, and crashing updates:
- **Staging Isolation:** Updates are downloaded into a temporary, quarantined staging directory (`~/.aro/updates/staging/<target-version>/`) and verified while the active application continues running uninterrupted.
- **Pre-Update State Backup:** Immediately prior to applying an update, the application takes an atomic snapshot of critical user configurations and state databases to `~/.aro/backups/pre-update-<source-version>/`.
- **Post-Update Watchdog & Health Check:** Upon relaunch with the new version, a startup watchdog monitors backend health (`/api/health` 200 and successful gateway handshake within 45 seconds).
- **Automated Rollback:** If the new version crashes repeatedly on boot (crash loop / exit code > 0 / watchdog timeout), the updater:
  1. Aborts execution of the new binary.
  2. Restores the previously operational application binary.
  3. Reverts configuration to the pre-update snapshot if migrations were partially applied.
  4. Launches the stable binary and displays a human-readable recovery overlay with an option to submit diagnostics.

## Alternatives Considered
- **Direct in-place file replacement:** Rejected due to high vulnerability to partial writes, power loss during update, and locked file errors on Windows.
- **Unsigned downloads over HTTPS:** Rejected because HTTPS transport security alone does not protect against CDN key leaks, DNS poisoning, or repository compromise.
- **No automated rollback:** Rejected because a bad release would strand non-technical users in a dead boot loop requiring manual reinstallation.

## Impact & Implementation Schedule
- Architecture accepted here in Phase 11 (Step 9 / Gate 11.3).
- No shipping code or distribution endpoints deployed in P11.
- Implementation and pipeline wiring scheduled for Phase 16 (Release and Launch, Step 16.1).
