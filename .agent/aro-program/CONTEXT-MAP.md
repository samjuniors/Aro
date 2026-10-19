# Context map (seed; P10 step 4 verifies and extends it)

Read the row for your task, nothing more. Paths are from `apps/desktop/` unless they start with `/`.

| Task | Read first |
| --- | --- |
| Visual rules, tokens, roles | `DESIGN.md` (sections by heading), `src/aro/tokens.css` |
| Aro-mode global styling | `src/aro/host-theme.css` (grep the selector; it is large) |
| UI primitives | `src/components/ui/` (`button.tsx`, `control.ts`, `layout.tsx`, `templates.tsx`) |
| Class merging, type and radius utilities | `src/lib/utils.ts`, `src/styles.css` (`@theme inline`) |
| Raw-visual ratchet | `src/components/ui/__tests__/no-raw-visuals.test.ts` and `.baseline.json` |
| Screens | `src/app/<area>/`, Aro pages in `src/aro/` |
| Adapters between UI and backend | `src/adapters/` |
| Electron main/preload | `electron/` |
| Backend bridge | `/aro_bridge/protocol.md`, `/aro_bridge/daemon.py` |
| Wire contract | `/port/WIRE_BASELINE.md`, `/port/DECISIONS.md` |
| Feature inventory | `/port/FEATURE_MAP.md` |
| Layout and UX rules | `LAYOUT-UX.md` |
| Packaging | `electron-builder.config.cjs`, `scripts/` |
| CI | `/.github/workflows/` (list, then open one) |
| Studying another app's feature | `.agent/aro-program/FEATURE-TEARDOWN.md` |
| Prior research | `/docs/research/README.md`, then one note |
| Decisions | `/docs/adr/`, `.agent/aro-program/DECISIONS.md` |

Never read whole: `/AGENTS.md` (grep a heading), `src/aro/host-theme.css`, `src/styles.css`,
`/port/AREA_PLAN.md`, `/locales/`, `/website/`.
