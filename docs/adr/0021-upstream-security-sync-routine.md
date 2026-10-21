# ADR 0021: Upstream (Hermes) security sync routine
Status: accepted
Date / Author: 2026-10-21 / Aro Program (Founder Decision D-24)
Context: In accordance with Decision D-3 (ADR 0003), Aro cherry-picks security patches from upstream Hermes Agent rather than performing broad upstream merges. A concrete operational routine is required.
Decision:
1. Automated Agent Pre-Screening: An automated script/agent inspects upstream commits bi-weekly, filtering for security advisories, CVE references, and fixes in core network/sandbox boundaries.
2. Founder Review: The founder reviews the shortlisted patch diffs for fork-safety and regression impact.
3. Cherry-Pick: Approved commits are cherry-picked cleanly onto `hotfix/` or the integration branch with explicit provenance commit messages.
Alternatives considered:
- Fully automated merges of upstream security commits (rejected: risk of silently overwriting Aro custom UI and security fuses).
- Manual ad-hoc inspections (rejected: prone to missing upstream security advisories).
Impact: Keeps Aro secure against upstream vulnerabilities while maintaining strict fork isolation.
Roadmap slot: P17.1, P17.2.
Acceptance: Documented in `docs/operations.md` and automated sync audit script.
