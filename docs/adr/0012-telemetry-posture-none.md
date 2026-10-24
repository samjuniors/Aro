# ADR 0012: Telemetry Posture at v1 (None / Qualitative Only)

## Context
Phase 13 (Features) defines the core v1 product scope. Competitive products (Cursor, Codex, Zed) collect telemetry, but Zed has faced substantial developer criticism for opaque data transmission and unnotified metric collection. Aro is committed to total local privacy and offline safety (Decision D-5, D-10).

## Decision
For public v1 release, Aro adopts **Option A: Zero outbound telemetry**.
1. No automated analytics, usage tracking, or crash pings are transmitted over the network without explicit per-event user action (e.g. clicking "Send diagnostics" manually).
2. Product feedback and metrics during beta are collected through qualitative developer communication, issue filings, and opt-in diagnostics bundles.
3. The offline-safe boundary is strictly maintained; launching Aro on an air-gapped machine generates zero telemetry packets.

## Consequences
- Preserves absolute user trust and enterprise/developer privacy.
- Avoids GDPR/privacy compliance complexities in v1.
- Success evaluation relies on qualitative feedback and user-reported issue velocity.
