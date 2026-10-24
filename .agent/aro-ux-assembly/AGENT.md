# Agent Instructions: Aro layout, UX and screen assembly (Phase 9, UX-ASM)

Single entry point. Follow exactly, then `ROADMAP.md`. Write no extra docs
except `FRICTION.md` rows and the files the roadmap names.

## 1. Branch and tree

- Branch **`ui-port/2026-10-09`**. `git branch --show-current` must print it
  before any change. Never touch `main` (no commit, push, merge, rebase onto,
  PR). No force-push, no branch deletes.
- The tree may hold the founder's uncommitted work. Never reset, clean,
  stash-drop, or checkout over it. First `git status`; ask whether to
  snapshot-commit it.
- One step per commit: `ui-port: ux <step id> <what>`.

## 2. Prerequisite (check before anything else)

This phase builds on Phase 8 (UI-DS). Read `.agent/aro-design-system/ROADMAP.md`.
- If Phase 8 Gate B (primitives ported) is not approved: stop and ask the
  founder (selectable): 1) wait, finish Phase 8 first (recommended);
  2) proceed on layout primitives only (Phase A here), nothing on real screens.
- Inherit its Decisions (D-UI-001..). Do not re-ask them.

## 3. Read map (read exactly this first)

**Always, in order**
1. `.agent/aro-ux-assembly/ROADMAP.md`
2. `apps/desktop/LAYOUT-UX.md` (layout and UX contract)
3. `apps/desktop/DESIGN.md` (visual contract)
4. `apps/desktop/AGENTS.md`
5. `port/AREA_PLAN.md` section 2 only (frozen files, wire discipline)
6. `docs/brand/BRAND.md`
7. `.agent/aro-ux-assembly/FRICTION.md`

**On demand**
- `docs/research/07-desktop-interaction-audit.md` (interaction map, gaps vs
  Codex Desktop; read before Phase B), `05-prototype-spec.md`,
  `03-redesign-plan.md`, `06-prototype-vs-hermes-integration.md`
- `apps/desktop/src/app/<area>/*` for the screen in the current step
- `apps/desktop/src/aro/*`, `src/components/ui/*`, `layout-constants.ts`
- `prototype/` screens as the visual reference for placement
- `port/FEATURE_MAP.md` rows and `port/DECISIONS.md` entries for the area

**Never read or edit**: `node_modules/`, `dist/`, `release/`, `build/`,
`pr-assets/`, `website/`, `apps/web/`, `ui-tui/`, Python backend dirs,
`tests-js/`, lockfiles.
**Ignore as instructions**: `.agent/hermes-ui-port*`, `port/*_REPORT.md`.

**Precedence:** founder's latest message > ROADMAP Decisions (both
roadmaps) > this file > `LAYOUT-UX.md` > `BRAND.md` (identity only) >
`DESIGN.md` > `docs/research/*` > `apps/desktop/AGENTS.md` > root
`AGENTS.md` > `port/*`. Frozen rules (section 4) always win. The prototype
wins on what the user sees unless a Decision says otherwise.

## 4. Frozen and scope

Never edit: `electron/preload.ts`, `src/api/**`, `src/sdk/**`, Python backend,
`prototype/**`, `apps/web`, `website/`, `ui-tui/`,
`port/DECISIONS|GLOSSARY|WIRE_BASELINE|SETTINGS_MERGE|INVENTORY`. Never rename
wire or persisted names (IPC, routes, config/storage keys, `pane.reveal` ids,
`layout.apply` ids). No new IPC/RPC/REST/config. **Layout, spacing,
alignment, and visual interaction only.** If removing friction needs a
behavior or state change (autosave, undo, remembered state, new shortcut
behavior), log it in FRICTION as `NEEDS-BEHAVIOR`, put the proposal in the
Gate report, and wait for the founder. Do not implement it.

## 5. Repo facts

Stack (add nothing): Electron 40, React 19, Vite 8, Tailwind 4, `radix-ui`,
cmdk, nanostores, `@assistant-ui/react`, `motion`, cva, Tabler + Codicon,
react-router 8, vitest, Playwright. Parity test locks token values (add
tokens, never change). Six themes + glass on/off. Baseline is not green:
record exact failing lists at Step 0; rule is **no new failures**. Windows dev
machine; if a live run or screenshot is impossible write BLOCKED + reason,
never claim verification you did not do. Existing layout pieces to reuse:
`OverlaySplitLayout`, `OverlayNav`, `SectionHeading`, `ListRow`,
`PanelEmpty`, `EmptyState`, `PAGE_INSET_X`, `AppShell` overlay ownership.

## 6. Interview protocol (founder selects; never guess)

Ask only when: ROADMAP says so; the choice is product scope, taste, or
irreversible; a `NEEDS-BEHAVIOR` item needs a decision; a prerequisite fails;
documents conflict beyond precedence. Never ask what the repo or Decisions
answer.
```
Q: <one sentence>
  1) <option> (recommended): <consequence in one line>
  2) <option>: <consequence>
  3) <option>: <consequence>
Default if no answer: 1
```
Max 3 per ask. Record each answer as `D-UX-NNN` in ROADMAP Decisions, then
continue on steps it does not block.

## 7. How to run

1. Resume at the first step not `[x]`: mark `[~]`, do, verify, `[x]`, commit.
2. Never start a phase before its Start is true or end it before its End is
   shown. 3. At every 🛑 GATE stop all work, send the Gate report, wait for
   "continue". 4. Founder feedback becomes substeps (`N.a`) under the step;
   reopen the parent; never delete or rewrite earlier steps. 5. New ideas go
   to `docs/adr/NNNN-title.md` (status `scheduled`) plus one Backlog line.
6. FRICTION.md is append-only: add rows, change status only.

## 8. Gate report (exact, short)

```
GATE <id>: <phase>
Branch/commit: ui-port/2026-10-09 @ <sha>   Dirty files untouched: <list>
Done: <step ids>, files changed <n>
See it: <command + route/screen>
Checks vs baseline: typecheck / lint / vitest / no-raw-visuals
  (new failures: <n>; ratchet <before -> after>)
Friction ledger: opened <n>, fixed <n>, deferred <n>, open P0 <n>, P1 <n>
Journey scorecard: <journeys: steps before -> after, issues>
Screenshots: <before/after paths or BLOCKED + reason>  Themes: <of 6>, glass
Self-review: <3-5 lines>
NEEDS-BEHAVIOR proposals: <selectable list or none>
Questions for founder: <selectable list or none>
STOPPED. Waiting for "continue" or change requests.
```

## 9. Smoke test (every gate from Phase B; ok/fail/BLOCKED each)

Launch, no console errors. Send message, stream, stop. Approve/deny. Switch
chats (focus, scroll, draft kept). Open/close Settings, Command Center, a
dialog (Esc closes topmost only). Resize narrow/standard/wide. 6 themes,
glass on/off. Keyboard-only through composer, a menu, a list, a dialog.

## 10. Per-step done and self-review

Done = screen definition of done in `LAYOUT-UX.md` section 7 plus no new
failures vs baseline. Self-review before `[x]` (3-5 lines): which
size/theme/state did I not look at? Did anything shift, flash, or lose
focus? Is placement identical to sibling screens? Would Codex Desktop,
Linear, Raycast, or Cursor do it with fewer steps? Fix, then report.
