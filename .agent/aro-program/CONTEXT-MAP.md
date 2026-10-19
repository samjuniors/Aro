# Context map (verified & extended in P10 step 4)

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
| Shared client SDK / contracts | `/apps/shared/src/index.ts`, `/apps/shared/src/types/` |
| Backend bridge | `/aro_bridge/protocol.md`, `/aro_bridge/daemon.py` |
| Wire contract | `/port/WIRE_BASELINE.md`, `/port/DECISIONS.md` |
| Feature inventory | `/port/FEATURE_MAP.md` |
| Layout and UX rules | `LAYOUT-UX.md` |
| Packaging & builds | `electron-builder.config.cjs`, `scripts/` |
| CI workflows | `/.github/workflows/` (list, then open one) |
| Studying another app's feature | `.agent/aro-program/FEATURE-TEARDOWN.md` |
| Prior research | `/docs/research/README.md`, then one note |
| Decisions | `/docs/adr/`, `.agent/aro-program/DECISIONS.md` |
| Docs governance & registry | `.agent/aro-program/DOCS-GOVERNANCE.md`, `.agent/aro-program/DOCS-REGISTRY.md` |
| Brand & color palette specs | `/docs/brand/BRAND.md`, `/docs/brand/PALETTE.md` |
| TUI / RPC Gateway | `/tui_gateway/server.py`, `/tui_gateway/methods_*.py`, `/tui_gateway/AGENTS.md` |
| Backend Core & Turn loop | `/agent/` (`turn_*.py`, `conversation_loop.py`, `/agent/AGENTS.md`), `/run_agent.py` |
| Tool orchestration & builtins | `/tools/` (`registry.py`, `/tools/AGENTS.md`), `/model_tools.py` |
| Gateway platforms & messaging | `/gateway/` (`run.py`, `/gateway/platforms/`, `/gateway/AGENTS.md`) |
| CLI commands & configuration | `/cli.py`, `/hermes_cli/` (`/hermes_cli/AGENTS.md`) |
| State & session persistence | `/hermes_state.py`, `/hermes_state_*.py` |
| Plugins & memory extensions | `/plugins/` (`/plugins/AGENTS.md`) |
| Cron & background scheduler | `/cron/` (`jobs.py`, `scheduler.py`, `/cron/AGENTS.md`) |

Never read whole: `/AGENTS.md` (grep a heading), `src/aro/host-theme.css`, `src/styles.css`,
`/port/AREA_PLAN.md`, `/locales/`, `/website/`.
