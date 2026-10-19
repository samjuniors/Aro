# ADR 0007: Desktop Application Auto-Update Architecture (v1)
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Founder Decision D-7)
Context: Desktop users require seamless, reliable updates for stability and security without manual installer downloads, while power users require opt-out capabilities.
Decision: Support automated background update downloads and restart-to-apply on the stable channel with an explicit opt-out toggle in user settings.
Alternatives considered:
- Manual download only (rejected: slow patch adoption and security fix latency).
- Forced updates without opt-out (rejected: intrusive to active long-running agent workflows).
Impact: Electron updater integration (`electron-updater`), update notification UI, settings toggle, release artifact metadata.
Roadmap slot: P11.9 (architecture), P16.1 (implementation & distribution).
Acceptance: Settings UI includes toggle; update check, download, and signature verification sequence designed and tested.
