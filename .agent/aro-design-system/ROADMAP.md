# ROADMAP: Phase 8 UI-DS (branch `ui-port`)

Order: design system first,
then screens, then the whole app hardened.
Status: `[ ]` todo `[~]` doing `[x]` done `[!]` blocked.
Append-only: never delete or reorder. Founder changes become substeps
(`3.1a`) under the step they affect. New ideas go to Backlog (ADR).
Every 🛑 GATE: agent stops and waits for "continue".

---

## Decisions (pre-filled; do not re-ask)

- D-UI-001 Branch is `ui-port/2026-10-09` (founder confirmed).
- D-UI-002 Host primitives (`src/components/ui/*`) stay the one public API
  for screens; `src/aro/ui.tsx` follows the same roles. (default)
- D-UI-003 The gallery is the existing `/aro-design` route; no new route.
- D-UI-004 Tokens are add-only (prototype parity test must stay green).
- D-UI-005 Every component works in all 6 themes + glass on/off.
- D-UI-006 Success = no new failures vs the recorded baseline.

- D-UI-007 Default look: dark-first, prototype-faithful, Zed/Linear
  restraint; primary theme to perfect first is **obsidian**; accent follows
  the current Workbench (iris), brand emerald stays for logo/CLI. (default)

**Interview batch 1 (ask once at Step 0, selectable; defaults in bold):**
1. Radius and elevation language: **keep code tokens (7/10/14px, role
   shadows)** / flatten per redesign plan (radius <= 8px, 1px borders over
   shadows) / custom.
2. Visual direction: **polish for consistency only, keep the prototype look**
   / denser Linear-Raycast feel / warmer softer feel.
3. `/aro-design` in production builds: **dev-only (hidden in prod)** / keep
   visible.
Record answers as D-UI-008..010 below.

- D-UI-008 Radius and elevation language: **keep code tokens (7/10/14px, role shadows)** (2026-10-17).
- D-UI-009 Visual direction: **polish for consistency only, keep the prototype look** (2026-10-17).
- D-UI-010 `/aro-design` in production builds: **dev-only (hidden in prod)** (2026-10-17).

(Later decisions appended here.)

## PHASE A: Design system (additive; no screen/primitive edits)

**Start:** on `ui-port/2026-10-09`, `git status` reviewed, dirty files untouched.
**End:** new tokens + gap components exist; `/aro-design` shows the full kit
(Aro kit AND host primitives under Aro roles) in all 6 themes, glass on/off,
RTL, reduced motion; ratchet test in place; no new check failures.
**Founder check:** `npm run dev` in `apps/desktop`, open **Aro Design** in the
sidebar (`/aro-design`), switch themes, look at every section.

- [x] 0. Recon: confirm branch; run Interview batch 1; record baseline (typecheck, lint, vitest
      failing lists, boot smoke); list the 21 fixed routes + 19 settings
      categories; list the document conflicts named in AGENT.md section 4
      and propose a resolution for each; explain how Aro themes reach the host app
      (`host-theme.css`, `src/themes`); confirm two-kit default (AGENT.md)
- [x] 1. Audit: distinct radius/shadow/color/spacing/type counts by file;
      value-to-role map (in the report, not DESIGN.md); hex-scan
      exclusions start at `src/themes/**`, `*.test.*`, `src/lib/mcp-brands.tsx`,
      `src/app/right-sidebar/terminal/selection.ts`, gallery swatches
      (`design-allow`); confirm by counting
- [x] 2. `src/components/ui/__tests__/no-raw-visuals.test.ts` + baseline
      JSON (ratchet: counts only shrink; `design-allow:` lines ignored)
- [x] 3. Tokens (additive only; parity test must stay green): add
      `--aro-text-*`, `--aro-status-*`; reuse existing `--aro-dur/ease`; add
      a `prefers-reduced-motion` block
  - [x] 3.1 Contrast table, every role pair, all 6 themes
- [x] 4. Components on the contract, host primitives first: `Button`,
      `Input`, `Textarea`, `Select`, `DropdownMenu`, `Popover`, `Tooltip`,
      `Dialog`, `ConfirmDialog`, `Tabs`, `SegmentedControl`, `Switch`,
      `Checkbox`, `Badge`, `ListRow`, `Loader`, `EmptyState`, `ErrorState`,
      `LogView`, `Skeleton`, `Kbd`, `FieldMessage` (new), `CardStack`/toast
      look. Built beside the current ones; existing props unchanged
- [x] 5. Extend `/aro-design`: sections for each component x variant x size x
      state, theme switcher (6), glass toggle, RTL, reduced motion;
      fixtures only (no stores/backend)
  - [x] 5.1 Screenshots per section (or BLOCKED with reason)
- [x] 🛑 **GATE A**

---

## PHASE B: Apply the kit to the real primitives

**Start:** Gate A approved, substeps closed.
**End:** host primitives (`button`, `control`, `menu`, `badge`, `dialog`,
`select`, `tabs`, `tooltip`, `OverlayView`, `widget-shell`,
`status-stack.css`, `src/aro/ui.tsx`) use the roles; public props unchanged;
`rounded-md|lg|sm|xl` resolve to role radii in these files; baseline lowered;
app behaves as before.
**Founder check:** run the app; buttons, inputs, menus, dialogs look
consistent on 6 existing screens; smoke test.

- [x] 6. One primitive per commit, baseline lowered each commit
- [x] 7. Smoke test + before/after screenshots of 6 existing screens
- [x] 🛑 **GATE B**

---

## PHASE C: Screens (each sub-phase is a gate)

Rule: screens use kit components only; layout/visual changes only; no wiring.
Each screen is opened live and checked in empty/loading/error states (Phase
7B left routes and all 19 settings categories unverified).
Map each item to `port/AREA_PLAN.md` areas; list routes from Step 0.

**C1 Shell (A1):** titlebar/tabs, sidebar + profile rail, panes chrome,
statusbar, window glass. **Check:** resize, glass, tray, drag/drop, focus.
- [x] 8. Titlebar/tabs  - [x] 9. Sidebar/rail  - [x] 10. Panes/statusbar
- [x] 🛑 **GATE C1**

**C2 Chat (A2, A3):** transcript, tool rows/cards, inline widgets, composer,
model controls, status stack, approvals/toasts. **Check:** send, stream,
approve/deny, queue, attach, dictation, pop-out composer, long transcript.
- [x] 11. Transcript  - [x] 12. Tool rows/widgets
- [x] 13. Composer, model menu, status stack, CardStack
- [x] 🛑 **GATE C2**

**C3 Overlays (A11, shared):** Settings (19 categories), Command Center,
cmdk pickers, model/session pickers, dialogs, notifications. **Check:** each
settings category opens, saves, resets; Esc behavior.
- [~] 14. Settings  - [ ] 15. Command Center + pickers
- [ ] 16. Dialogs/confirm/notifications
- [ ] 🛑 **GATE C3**

**C4 Pages (A4-A8, A10):** workspace panel, projects/git, capabilities,
Skills/Messaging/Artifacts/Cron/Profiles/Agents/Starmap, Aro pages
(Transcript, Review, Tasks, Rules, Agents, Doctor, Bridge). **Check:** each
route opened; empty/loading/error states.
- [ ] 17. Workspace/projects  - [ ] 18. Capabilities + system views
- [ ] 19. Aro pages + remaining overlays
- [ ] 🛑 **GATE C4**

**C5 Boot/onboarding/update/error:** install, onboarding, connecting, boot
failure, reauth, update, error boundary, guide startup. Recovery semantics
unchanged. **Check:** force each state.
- [ ] 20. Boot surfaces
- [ ] 🛑 **GATE C5**

---

## PHASE D: Hardening and release candidate

**Start:** Gate C5 approved.
**End:** ratchet at 0 (or `design-allow` only); theme radius reset landed;
`/aro-design` not in prod nav unless founder wants it; long-transcript perf
verified; a11y pass; `DESIGN.md` matches code; no new failures vs baseline;
`port/FEATURE_MAP` untouched except evidence rows you exercised.
**Founder check:** full walkthrough, 6 themes, glass on/off, RTL, one
non-English locale.

- [ ] 21. Theme radius reset (`--radius-*: initial`) + straggler fixes
- [ ] 22. Perf (long transcript, several panes, live stream)
- [ ] 23. A11y (keyboard-only, contrast, roles, reduced motion)
- [ ] 24. Prod build check + `DESIGN.md` sync
- [ ] 25. Extensibility proof: add one throwaway component using only
      `.agent/aro-design-system/EXTENDING.md` (gallery section, test, ratchet
      stays clean), fix any gap in EXTENDING.md, then remove the throwaway
- [ ] 🛑 **GATE D: release candidate on `ui-port`**

---

## Founder change requests (substeps go in the step above)

_none yet_

## Backlog (ADR, not in this roadmap)

_none yet_
