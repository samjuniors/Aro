# ADR 0003: Upstream (Hermes) sync policy
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Founder Decision D-3)
Context: Aro is a specialized fork of Hermes Agent with custom brand, UI port, and design system. Syncing upstream changes needs a clear policy to manage divergence without breaking custom surfaces.
Decision: Sync security fixes only, cherry-picked on a defined schedule. Upstream feature additions and non-security refactors will not be blindly merged.
Alternatives considered:
- Never sync (rejected: exposes fork to unpatched upstream security vulnerabilities).
- Regular full merges (rejected: high regression surface, constant merge conflicts with Aro-specific UI/brand changes).
Impact: Maintenance overhead limited to security patches; high stability for Aro custom layers.
Roadmap slot: P10.6, P15.1, P17.1.
Acceptance: Security cherry-pick process documented; no unvetted bulk upstream merges.
