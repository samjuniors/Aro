# ADR 0006: User Data Directory and Migration Strategy (.aro)
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Founder Decision D-6)
Context: Hermes Agent uses `~/.hermes` for configuration (`config.yaml`), credentials (`.env`), logs, and sessions. Aro requires clear independent branding while preserving user data and backwards compatibility.
Decision: Use `~/.aro` as the canonical user data directory for Aro. On first run, if `~/.aro` does not exist and `~/.hermes` is detected, perform a one-time copy migration of `config.yaml`, `.env`, and session state from `~/.hermes` into `~/.aro`. Never move or delete the original `~/.hermes` data.
Alternatives considered:
- Keep `.hermes` (rejected: fails user brand expectations and creates confusion between Hermes and Aro).
- Concurrent support (rejected: creates dual-write/split-brain state and sync race conditions).
- Move migration (rejected: destructive to users who maintain a separate Hermes installation).
Impact: Profile paths, constants (`hermes_constants.py` / `display_hermes_home`), Electron main process paths, session storage, and CLI default homes.
Roadmap slot: P11.6.
Acceptance: Tests verify clean creation of `~/.aro`, copy migration when `~/.hermes` is present, idempotency on subsequent runs, and non-destructive behavior towards `~/.hermes`.
