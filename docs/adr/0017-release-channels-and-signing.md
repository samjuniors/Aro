# ADR 0017: Release Channels and Signing Strategy
Status: accepted
Date / Author: 2026-10-21 / Aro Program Engineer & Founder
Context: Desktop application distribution requires transparent update channels and platform-compliant cryptographic signing to avoid SmartScreen and Gatekeeper warnings.
Decision:
1. Release Channels: 3 channels supported (`canary`, `beta`, `stable`).
   - `canary`: automated daily builds from `main`.
   - `beta`: validated release candidates for closed beta testers (cohort of 25-50 developers).
   - `stable`: public production releases.
2. Code Signing:
   - Local / dry-run builds use self-signed / developer signatures.
   - Production Windows builds sign via Azure Trusted Signing (ATS) configured in `electron-builder.config.cjs`.
   - Production macOS builds sign via Apple Developer ID and notarization via GitHub Secrets in CI workflows.
Alternatives considered:
- Single stable channel: Rejected because regressions cannot be caught with real users prior to public distribution.
- Unsigned releases: Rejected due to severe OS-level security warnings on clean installations.
Impact: `electron-builder.config.cjs`, CI release workflows, updater channels.
Roadmap slot: P16 Step 2.
Acceptance: Packaging dry-run produces signed/verifiable artifacts with matching update feeds.
