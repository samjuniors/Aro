# ADR 0013: Public v1 Feature Scope and Shortlist (5 Slices)

## Context
Phase 13 establishes the feature scope for public v1. To prevent feature sprawl and maintain high polish, Phase 13 mandates a hard ceiling of at most 5 vertical feature slices, each shipped with an end-to-end spec, design fixture, feature flag, journey tests, and docs.

## Decision
Approved the shortlist of 5 vertical feature slices evaluated in `docs/research/13-v1-features-selection.md`:
1. **Slice 1 (13.S1): Diff-First Visual Review & Checkpoint Rollback (`aro-review`)** — Multi-file diff viewer with per-hunk acceptance, annotations, and checkpoint rollback.
2. **Slice 2 (13.S2): Ambient Token / Cost HUD & Proactive Quota Guard** — Live token/cost tracker in statusbar and composer with soft-threshold warning alerts.
3. **Slice 3 (13.S3): Parallel Tasks Board & Plan Orchestrator (`aro-tasks`)** — Visual Kanban project board with draggable columns and task dispatch into agent turns.
4. **Slice 4 (13.S4): In-App Responsive Web & Dev-Server Preview (`browser-preview`)** — Right-rail embedded web preview with loopback dev-server detection and responsive frame modes.
5. **Slice 5 (13.S5): One-Click IDE Deep Link & Editor Handoff (`editors`)** — Instant jump into Cursor, VS Code, or Zed with exact file and line targeting.

Rule Studio (F-6) and Semantic Codebase Indexing (F-7) are officially deferred to post-v1.

## Consequences
- Every v1 feature is built behind an isolated feature flag and verified against the 10 reference user journeys.
- Focus is concentrated on high-impact developer workflows (review, cost, parallelism, preview, and handoff).
