# ADR 0020: Operational triage SLAs by issue severity
Status: accepted
Date / Author: 2026-10-21 / Aro Program (Founder Decision D-23)
Context: A lean engineering team requires realistic, enforceable Service Level Agreements (SLAs) for community issues and defects across P0 to P3 severities.
Decision: Commit to realistic SLAs:
- P0 (Critical: crash loop, data loss, security bypass): Initial triage and hotfix within 12 hours.
- P1 (High: major feature broken, provider auth failure, severe perf drop): Triage and mitigation within 24 hours.
- P2 (Medium: minor defect, UI glitch, non-blocking bug): Triage within 48 hours; prioritized in next bi-weekly release.
- P3 (Low: enhancement, cosmetic defect, doc typo): Triage within 1 release cycle; addressed in backlog.
Alternatives considered:
- High-intensity enterprise SLA (rejected: unsustainable for a small team).
- Unbounded / best-effort triage (rejected: leads to orphaned user issues and community frustration).
Impact: Reliable response times, clear issue expectations for beta users and contributors.
Roadmap slot: P17.1, P17.2.
Acceptance: SLAs operationalized in `docs/operations.md` and GitHub issue templates.
