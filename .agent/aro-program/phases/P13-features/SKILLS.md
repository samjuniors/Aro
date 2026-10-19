# SKILLS P13
Research questions: what do users of Codex Desktop, Claude Code and desktop, Cursor, and Zed do repeatedly that Aro could do better? What do their reviews and issue trackers complain about? What is Aro's real edge (the README names a learning loop, skills, session search, user modeling: verify they work before promising them)?
Tools to prefer: web research with citations, the design-system gallery (`npm run dev:design`) for fixtures, Playwright for journey tests.
Read map: `port/FEATURE_MAP.md`, `docs/research/01-competitive-analysis.md`, `docs/research/02-gap-analysis.md`, `apps/desktop/LAYOUT-UX.md`, `apps/desktop/DESIGN.md` (headings first).
Never read: whole research folder; read one note at a time.
Evidence: scoring table, spec per slice, before/after screenshots, journey results.
Attack focus: a feature that is demo-good but breaks with real data, large inputs, errors, or keyboard-only use; a feature whose promise the backend cannot keep.
Feature study: for any feature you like in another app, run `FEATURE-TEARDOWN.md` (authorization class first; REA only for class A with founder approval) before it enters the shortlist.
