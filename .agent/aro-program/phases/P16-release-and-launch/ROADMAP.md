# ROADMAP P16: Release and launch
Branch: `aro/P16-release` | Gates: 16.1, 16.2, 16.3 | Needs: P15
Goal: a signed, updatable, documented release that real people can install, with a way to hear from them.
The agent prepares and verifies; the founder performs anything involving money, legal, keys, or publishing.

## Interview batch 1 (Decisions recorded 2026-10-21)
1. Name and brand: "Aro" (Aro Desktop / Aro Agent by samjuniors) with MIT attribution to Nous Research in NOTICE (Decision D-17, `NOTICE`).
2. Signing: Developer / test certs for dry-runs; production ATS (Windows) and Apple Developer ID (macOS) via CI secrets (ADR 0017, Decision D-18).
3. Channels: **A. 3 channels: canary, beta, stable** (ADR 0017, Decision D-19).
4. Distribution and support: GitHub Releases feed + GitHub Issues & Discussions for support (ADR 0018, Decision D-20).
5. Beta cohort: 25-50 users, 2-week closed beta, success = 0 fatal crashers & >=80% journey completion (ADR 0018, Decision D-21).

## Steps
- [x] 0. Recon and context pack.
- [x] 1. Legal and brand inventory: code MIT license, SIL OFL 1.1 font licenses, icon licenses, root `NOTICE` attribution, About dialog attribution added, and README claims audit documented in `docs/research/23-legal-brand-inventory.md`.
- [x] 2. Release engineering dry run: `npm run pack` completed in 46s; `Aro.exe` produced with ASAR integrity, electron fuses applied, native deps packaged, and rollback backup preserved.
- [ ] 🛑 **GATE 16.1** dry run evidence, legal/brand list with founder decisions.
- [ ] 3. Docs and site: install guide, first-run guide, privacy policy and terms drafts from the P15 privacy map, known-issues page, support instructions.
- [ ] 4. Beta: invite flow, feedback form, triage board, daily review; fix or defer in writing.
- [ ] 🛑 **GATE 16.2** beta report: counts, top issues, decisions.
- [ ] 5. Go/no-go checklist = the "public-ready" list in `MASTER-ROADMAP.md`, each item with evidence links.
- [ ] 6. Release notes, rollback plan, on-call (who and how) for the first 7 days.
- [ ] 🛑 **GATE 16.3** go/no-go. The founder decides; the agent does not publish.

## Exit criteria
Every "public-ready" item has evidence or a written waiver by the founder.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
