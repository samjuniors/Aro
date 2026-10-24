# ADR 0015: Accessibility Target (WCAG 2.2 AA on 10 Default Journeys)
Status: accepted
Date / Author: 2026-10-21 / Aro Program Engineer & Founder
Context: Desktop AI agents must be accessible to developers with varying motor, visual, and cognitive needs. A clear compliance standard is necessary for automated audits and manual verification.
Decision: Public v1 commits to WCAG 2.2 AA compliance across the 10 default user journeys (onboarding, chat, composer, tool inspection, settings, projects, subagent board, diff review, cost HUD, browser preview). Requires visible focus rings, full keyboard navigability, semantic screen reader tree labels, color contrast >= 4.5:1 (normal text) and >= 3:1 (large text/controls), and reduced-motion parity.
Alternatives considered:
- B. WCAG AAA on core flows: Rejected as too restrictive on contrast and layout for modern developer dark themes at v1.
- C. Best effort: Rejected as insufficient for a public release and developer trust.
Impact: Component primitives, keyboard listeners, aria labels, and contrast audits across all 6 core themes.
Roadmap slot: P15 Step 4.
Acceptance: axe-core automated clean scan, keyboard-only journey verification, and reduced-motion test coverage.
