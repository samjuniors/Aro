# ADR 0019: Release cadence and channel promotion
Status: accepted
Date / Author: 2026-10-21 / Aro Program (Founder Decision D-22)
Context: Post-v1 operations require a predictable, sustainable release cadence across the three update channels (canary, beta, stable) without developer burnout.
Decision: Bi-weekly release train for the beta channel; monthly release train for the stable channel; canary builds automatically on mainline CI merges.
Alternatives considered:
- Weekly train across all channels (rejected: unsustainable testing burden and update fatigue for stable users).
- Ad-hoc / milestone-only releases (rejected: unpredictable update delivery and batching regressions).
Impact: Predictable release rhythm; two weeks of real-world beta soak time before promotion to stable.
Roadmap slot: P17.1, P17.2.
Acceptance: Documented in `docs/operations.md` and release workflow runbooks.
