# ADR 0001: Integration branch strategy for Aro
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Founder Decision D-1)
Context: Development progressed across ui-port/2026-10-09 and ui-port/aro-patches. Subsequent phases require a single authoritative integration branch to prevent divergence.
Decision: Merge ui-port/aro-patches into ui-port/2026-10-09, and establish aro/integration as the single canonical integration branch for all subsequent phases.
Alternatives considered:
- Keep ui-port/aro-patches as the line (rejected: leaves base branch divergent and complicates history tracking).
- Merge to main now (rejected: premature before phase packaging, hardening, and verification).
Impact: Repository branch management, CI workflow targeting, clean merge history.
Roadmap slot: P10.1 (plan), P10.2 (execution).
Acceptance: Single canonical branch aro/integration containing all UI port and patch work, verified by git branch and log audits.
