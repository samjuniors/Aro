# ROADMAP P16: Release and launch
Branch: `aro/P16-release` | Gates: 16.1, 16.2, 16.3 | Needs: P15
Goal: a signed, updatable, documented release that real people can install, with a way to hear from them.
The agent prepares and verifies; the founder performs anything involving money, legal, keys, or publishing.

## Interview batch 1
1. Name and brand. The product is a fork of Hermes Agent under MIT; upstream "Hermes" marks belong to their owners (README attribution). Confirm the public name, logo status (`docs/brand/BRAND.md`), and whether any upstream marketing claims in the README are reused. Recommended: the founder reviews with counsel; the agent only lists risks.
2. Signing: which certificates exist (Windows, Apple Developer ID) or must be obtained.
3. Channels. **A. canary, beta, stable** / B. beta and stable / C. stable.
4. Distribution and support: website, GitHub releases, issue tracker, community channel; who answers.
5. Beta size and duration; what counts as success.

## Steps
- [ ] 0. Recon and context pack.
- [ ] 1. Legal and brand inventory: licenses of code, fonts (Geist, Inter, JetBrains Mono, Cascadia Code, Monaspace, others bundled in `apps/desktop/src/fonts/`), icons, images, third-party notices, attribution in `NOTICE` and the About screen; README claims audit (each public claim backed by a test or removed). Not legal advice: list, recommend counsel.
- [ ] 2. Release engineering dry run in a throwaway fork or a private channel: build, sign (founder-provided keys), notarize where applicable, upload, update, rollback, each timed and logged. No publishing.
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
