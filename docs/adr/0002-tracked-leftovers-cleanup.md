# ADR 0002: Tracked leftovers cleanup and documentation governance
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Founder Decision D-2)
Context: Repo root contains duplicate report copies, applied patch directories (aro-patches/), a binary zip (aro-ui-ds-kit.zip), and completed program start prompts.
Decision: Remove or relocate tracked leftover files per DOCS-GOVERNANCE.md after verifying git history and file content equivalence.
Alternatives considered:
- Archive everything under docs/archive/ (rejected: retains binary bloat and duplicate files in the tree).
- Leave in place (rejected: clutters root workspace and causes ambiguity on active documentation).
Impact: Cleaner repository tree, reduced clone size, elimination of conflicting duplicate reports.
Roadmap slot: P10.2, P10.3.
Acceptance: Root cleaned per DOCS-GOVERNANCE.md; no duplicate reports remain; verified in DOCS-REGISTRY.md.
