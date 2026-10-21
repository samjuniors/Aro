# ADR 0018: Closed Beta Cohort and Support Strategy
Status: accepted
Date / Author: 2026-10-21 / Aro Program Engineer & Founder
Context: Before opening Aro to unrestricted public release, a structured closed beta is required to surface real-world edge cases on diverse hardware and developer setups.
Decision:
1. Beta Size & Duration: 25 to 50 active software engineers running Aro Desktop over a 2-week closed testing window.
2. Success Criteria: Zero fatal crash regressions, zero data corruption incidents, and >= 80% task completion success rate across the 10 default user journeys.
3. Distribution: Artifacts distributed via GitHub Releases (tagged release candidate assets).
4. Support Channels: GitHub Issues (bug reports and diagnostics bundles) and GitHub Discussions (feedback, UX friction, and questions).
Alternatives considered:
- Immediate public launch: High risk of unmonitored edge case failures harming reputation.
- Dedicated Discord/Slack community for beta: Higher maintenance overhead at v1; GitHub Discussions keeps bug reports and discussions unified in one repo.
Impact: Beta onboarding docs, feedback triage board, release qualification.
Roadmap slot: P16 Step 4.
Acceptance: 2-week beta report closed with all P0/P1 issues resolved or documented.
