# ADR 0014: Launch Languages Scope (English Only at v1)
Status: accepted
Date / Author: 2026-10-21 / Aro Program Engineer & Founder
Context: Aro repository contains multiple legacy locale files (e.g. Urdu, Arabic, Spanish, etc.), but shipping a locale in public release commits to 100% translation completeness, RTL layout fidelity, and continuous linguistic maintenance across all product iterations.
Decision: Public v1 will launch in English (en-US) only. Existing locale translation files will remain in source tree or inactive pack status until comprehensive translation auditing and dedicated language QA passes can be scheduled in post-v1 cycles.
Alternatives considered:
- B. English plus locales passing a completeness check: Rejected due to partial coverage and maintenance burden across rapid UI updates.
- C. Ship all locales: Rejected due to incomplete translations and unverified RTL clipping risks.
Impact: Focuses i18n review on eliminating hardcoded strings and verifying formatting primitives without blocking release on translation QA.
Roadmap slot: P15 Step 5.
Acceptance: String extraction verification and en-US linguistic consistency across all views.
