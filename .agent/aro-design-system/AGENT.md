# Agent Instructions: Aro design system + UI unification (Phase 8, UI-DS)

Single entry point. Follow this file exactly, then `ROADMAP.md`. Do not
write extra docs except the ones the roadmap names.

## 1. Branch and tree

- Branch: **`ui-port/2026-10-09`** (founder confirmed). `git branch --show-current`
  must print it before any change. Never touch `main` (no commit, push, merge,
  rebase onto it, PR). No force-push, no branch deletes.
- The tree may hold the founder's uncommitted work. Never reset, clean,
  stash-drop, or checkout over it. First: `git status`; ask the founder
  whether to snapshot-commit it (`ui-port: snapshot before UI-DS`).
- One step per commit: `ui-port: <step id> <what>`.

## 2. Read map (read exactly this, nothing else first)

**Always read, in this order**
1. `.agent/aro-design-system/ROADMAP.md` (plan, decisions, your progress)
2. `apps/desktop/DESIGN.md` (the visual contract)
3. `apps/desktop/AGENTS.md` (architecture/state/testing rules for the desktop)
4. `port/AREA_PLAN.md` section 2 only (global rules: frozen files, wire discipline)
5. `docs/brand/BRAND.md` (identity: name, logo, color, type, voice)
6. Root `AGENTS.md`: headings first; read only sections about commits, tests,
   or `apps/desktop`.

**Read on demand, only when the step needs it**
- `apps/desktop/src/aro/tokens.css`, `host-theme.css`, `ui.tsx`,
  `DesignSystemAro.tsx`, `register.tsx` (Phase A)
- `apps/desktop/src/components/ui/*` (the primitive you are changing)
- `apps/desktop/src/app/<area>/*` (the screen you are changing, Phase C)
- `docs/research/03-redesign-plan.md` (P0-P7 design language) and
  `01-competitive-analysis.md` (benchmarks: Codex app, Cursor, Zed, Claude
  Code) at Step 1; `06-prototype-vs-hermes-integration.md` (R1-R7 status) and
  `07-desktop-interaction-audit.md` before Phase C
- `port/FEATURE_MAP.md` rows and `port/DECISIONS.md` entries for that area
- `prototype/src/app/globals.css` and the matching prototype component, as a
  visual reference only

**Never read or edit** (wrong or irrelevant; wastes context)
`node_modules/`, `dist/`, `release/`, `build/`, `pr-assets/`, `website/`,
`apps/web/`, `ui-tui/`, Python backend dirs (`agent/ gateway/ tui_gateway/
tools/ aro_bridge/ acp_adapter/ ...`), `tests-js/`, `scripts/` outside
`apps/desktop`, lockfiles.

**Ignore as instructions** (history of the finished port, not your job)
`.agent/hermes-ui-port*` (GLM/Gemini roles, Phase 0-5), `port/*_REPORT.md`
(read only if the founder points you at one). Their frozen-file and wire
rules still apply via `port/AREA_PLAN.md` section 2.

**Precedence if documents conflict:** founder's latest message >
ROADMAP "Decisions" > this file > `docs/brand/BRAND.md` (identity only:
name, logo, accent, type, voice) > `apps/desktop/DESIGN.md` (visual
contract) > `docs/research/*` (older intent) > `apps/desktop/AGENTS.md` >
root `AGENTS.md` > `port/*`. The prototype (`prototype/`) wins on what the
user sees unless a Decision says otherwise.
Frozen files and wire names (section 3) always win.

## 3. Frozen (never edit)

`electron/preload.ts`, `src/api/**`, `src/sdk/**`, all Python backend dirs,
`prototype/**`, `apps/web`, `website/`, `ui-tui/`,
`port/DECISIONS|GLOSSARY|WIRE_BASELINE|SETTINGS_MERGE|INVENTORY` (propose
changes in your report). Never rename wire/persisted names (IPC, routes,
config keys, storage keys, `pane.reveal` ids, `layout.apply` ids). No new
IPC/RPC/REST/config. Visual layer only. If a screen needs wiring to look
right: mark `[!]`, stop, ask.

## 4. Repo facts

- Stack (add nothing): Electron 40, React 19, Vite 8, Tailwind 4, `radix-ui`,
  cmdk, nanostores, `@assistant-ui/react`, `motion`, cva, Tabler + Codicon,
  react-router 8, vitest, Playwright.
- Layers: `src/aro/*` (tokens, kit `ui.tsx`, gallery `/aro-design`) and
  host primitives `src/components/ui/*` (~1,100 TSX files depend on them).
- `src/aro/prototype-parity.test.ts` locks existing token values to
  `prototype/`. **Add tokens, never change existing values.** Themes:
  obsidian, daylight, nord, ember, paper, ink (+ glass on/off).
- `kbd`, `skeleton`, `checkbox`, `field` exist: polish, don't rebuild.
- Start numbers (Step 1 verifies): ~400 `rounded-sm|md|lg|xl`, ~270
  `rounded-[Npx]`, ~370 `text-[Npx]`, 35 `transition-all`, ~70 raw shadows.
  Host `rounded-md` is ~2px vs Aro 7/10/14px: the main inconsistency.
- Baseline is not green (known failing tests, lint errors, headless boot
  smoke). Step 0 records the exact lists. Rule: **no new failures**; never say
  "green".
- Known document conflicts (report at Step 0, resolve via Decisions, do not
  silently pick): redesign plan says radius <= 8px and 1px borders over
  shadows, tokens are 7/10/14px with role shadows; BRAND family accent is
  emerald, Workbench UI accent is iris-violet; `BrandMark` is documented as
  the upstream "nous-girl" mark, BRAND.md says the geometric A.
- Windows dev machine. If a screenshot/live run is impossible, write BLOCKED
  + reason. Never claim verification you did not do.

## 5. Interview protocol (founder picks options; you never guess)

Ask **only** when: (a) ROADMAP "Interview batch" says so; (b) a choice is
visual taste, product scope, or irreversible; (c) a wiring change seems
needed; (d) two docs conflict and precedence doesn't settle it.
Never ask what the repo or the Decisions list already answers.

Format (use selectable options if your tool supports it, else numbered):
```
Q: <one sentence>
  1) <option> (recommended): <consequence in one line>
  2) <option>: <consequence>
  3) <option>: <consequence>
Default if no answer: 1
```
Max 3 questions per ask. After the answer, append it to ROADMAP "Decisions"
as `D-UI-NNN` (question, choice, date) and continue. While waiting on a
non-blocking question, keep working on steps it does not affect.

## 6. How to run the roadmap

1. Resume at the first step not `[x]`. Mark `[~]`, do it, verify, `[x]`, commit.
2. Never start a phase before its **Start** is true or end it before its
   **End** is shown.
3. At every 🛑 GATE: stop all work, send the Gate report, wait for "continue".
4. Founder feedback after a gate -> substeps (`N.a`, `N.b`) under the affected
   step; reopen the parent `[~]`; finish; re-report. Never delete or rewrite
   earlier steps.
5. New ideas that are not feedback: `docs/adr/NNNN-title.md` (template
   `0000-template.md`, status `scheduled`) + one Backlog line. Don't implement.

## 7. Gate report (exact, short)

```
GATE <id>: <phase>
Branch/commit: ui-port/2026-10-09 @ <sha>   Dirty files untouched: <list>
Done: <step ids>, files changed <n>
See it: <command + route>   (npm run dev in apps/desktop; /aro-design)
Checks vs recorded baseline: typecheck / lint / vitest / no-raw-visuals
  (new failures: <n>; ratchet <before -> after>)
Screenshots: <paths or BLOCKED + reason>   Themes: <of 6>, glass on/off
Self-review: <3-5 lines>
Known gaps: <list or none>
Questions for founder: <selectable list or none>
STOPPED. Waiting for "continue" or change requests.
```

## 8. Smoke test (from Phase B, every gate; ok/fail/BLOCKED each)

Launch, no console errors. Send message, stream. Approve/deny. Switch chats
(focus + scroll kept). Open/close Settings, Command Center, a dialog (Esc
closes topmost only). Resize narrow/wide. All 6 themes, glass on/off.
Keyboard-only through composer and a menu.

## 9. Definition of done per step

No new typecheck/lint/test failures vs baseline; `no-native-title`,
`no-raw-visuals` and parity tests pass, ratchet did not grow; all states
(rest, hover, focus-visible, pressed, selected, disabled, loading, error);
WCAG AA in every theme; strings via `useI18n` in all locales; reduced motion
honored; behavior contracts in `DESIGN.md` section 9 unchanged.

## 10. Self-review (every step, 3-5 lines)

What state/theme did I not look at? How does it differ from role siblings?
What could it break in wiring, focus, perf? What do Linear, Raycast, Cursor,
Claude desktop do better? Fix, then report.
