# ROADMAP: Phase 9 UX-ASM, layout, UX and screen assembly (`ui-port/2026-10-09`)

Order: layout kit first, then audit, then screens group by group, then
journeys and hardening. Status: `[ ]` todo `[~]` doing `[x]` done `[!]`
blocked. Append-only: never delete or reorder. Founder changes become
substeps (`6.1a`). New ideas go to Backlog (ADR). Every 🛑 GATE: the agent
stops and waits for "continue".

---

## Decisions (pre-filled; do not re-ask)

- D-UX-001 Branch `ui-port/2026-10-09`; never `main`.
- D-UX-002 Scope is layout, spacing, alignment and visual interaction only;
  behavior changes are proposals (`NEEDS-BEHAVIOR`), never done silently.
- D-UX-003 Inherit all Phase 8 Decisions (D-UI-*).
- D-UX-004 Screens use `LAYOUT-UX.md` templates and kit components only.
- D-UX-005 Success = no new failures vs baseline, and every audited task has
  equal or fewer steps than before.

**Interview batch 1 (ask once at Step 0, selectable; defaults in bold):**
1. Journeys to perfect first: **Chat and composer** / Workspace, files and
   review / Settings and onboarding.
2. Primary screen target: **13 to 15 inch laptop, graceful narrow and wide**
   / large desktop monitor first / both equally.
3. Density: **keep current feel, normalized to the spacing scale** /
   more compact / more spacious.
Record answers as D-UX-006..008 below.

- D-UX-006 Journeys to perfect first: **Chat and composer** (focus first on conversation flow, prompt input, streaming rhythm, and approvals) (2026-10-17).
- D-UX-007 Primary screen target: **13 to 15 inch laptop, graceful narrow and wide** (default container queries tuned for standard laptops with fluid collapse for narrow and wide) (2026-10-17).
- D-UX-008 Density: **keep current feel, normalized to the spacing scale** (4px scale, 32px standard control height, calm and breathable) (2026-10-17).
- D-UX-009 Phase C fix scope: **Fix P1 (F-006) + P2 (F-005)** during screen assembly; NB-001 deferred (2026-10-17).

---

## PHASE A: Layout kit (additive; no real screens edited)

**Start:** prerequisite in AGENT.md section 2 satisfied; `git status`
reviewed; dirty files untouched.
**End:** layout primitives and templates exist and are shown with fixtures in
the gallery (`/aro-design`, new "Layout" sections) at narrow, standard, wide,
in 6 themes, glass on/off, RTL, long text, empty/loading/error; no new check
failures.
**Founder check:** `npm run dev` in `apps/desktop`, open **Aro Design**, go to
the Layout sections, resize the window, flip themes.

- [x] 0. Recon: confirm branch and Phase 8 status; record baseline lists; run
      Interview batch 1; list real routes/screens and which template each
      maps to; read `docs/research/07-desktop-interaction-audit.md`
- [x] 1. Measure the current layout: min window size, gutters
      (`PAGE_INSET_X`), header heights, row heights, pane widths, collapse
      behavior. Propose additive tokens for measures and width classes
      (report, then add)
- [x] 2. Layout primitives (reuse what exists, add what's missing, spacing
      scale only): `PageShell`, `PageHeader`, `Section`, `FormRow`, `Stack`,
      `Inline`, `Toolbar`, `ActionBar`; align `OverlaySplitLayout`,
      `SectionHeading`, `ListRow`, `PanelEmpty` to the same anatomy
- [x] 3. Templates as fixtures: Page, List page, Form page, Master/detail
      overlay, Settings subpage, Dialog, Empty/Loading/Error (no shift)
- [x] 4. Container-query width classes and collapse order implemented in the
      templates (right panes, then sidebar to rail, then toolbar to menu)
- [x] 5. Gallery "Layout" sections + screenshots at 3 widths (or BLOCKED)
- [x] 🛑 **GATE A**

---

## PHASE B: Friction audit (read-only; nothing in real screens changes)

**Start:** Gate A approved, substeps closed.
**End:** every real route and settings category walked live (or BLOCKED);
`FRICTION.md` filled with severities and tags; "before" screenshots and
journey scorecard "before" numbers recorded; fix order proposed.
**Founder check:** read `FRICTION.md`; pick what to fix via the interview.

- [x] 6. Walk every route and all 19 settings categories live; log rows
- [x] 7. Walk the 10 default journeys (`LAYOUT-UX.md` section 8); record
      steps, shifts, focus losses, time to first feedback
- [x] 8. Keyboard-only pass and focus-order pass; log rows
- [x] 9. Propose fix order and any `NEEDS-BEHAVIOR` items as selectable
      options (recommended order: P0, then P1 on core journeys)
- [x] 🛑 **GATE B** (founder selects scope; decisions recorded)

---

## PHASE C: Assemble screens (each sub-phase is its own gate)

Rule: rebuild layouts from templates and kit only; fix every P0/P1 for the
screen; no wiring changes; log new friction as found; before/after
screenshots and step counts per screen.

**C1 Shell:** titlebar band, sidebar and profile rail, panes, statusbar,
resize and collapse. **Check:** resize wide to narrow, pane drag/drop, tray.
- [x] 10. Titlebar and tabs  - [x] 11. Sidebar and rail
- [x] 12. Panes, statusbar, collapse behavior
- [x] 🛑 **GATE C1**

**C2 Chat:** transcript measure and rhythm, tool rows, widgets, composer and
its controls, status stack, approvals. **Check:** send, stream, stop,
approve, queue, attach, long transcript, no jump while streaming.
- [x] 13. Transcript  - [x] 14. Tool rows and widgets
- [x] 15. Composer, status stack, approvals
- [x] 🛑 **GATE C2**

**C3 Overlays and settings:** Settings (19 categories) on Form page template,
Command Center and pickers, dialogs, notifications. **Check:** each category
opens, saves, resets; focus in/out; Esc.
- [x] 16. Settings  - [x] 17. Command Center and pickers
- [x] 18. Dialogs, confirm, notifications
- [x] 🛑 **GATE C3**

**C4 Pages:** workspace and projects, capabilities, Skills, Messaging,
Artifacts, Cron, Profiles, Agents, Starmap, Aro pages. **Check:** each route,
empty/loading/error, narrow and wide.
- [x] 19. Workspace and projects  - [x] 20. Capabilities and system views
- [x] 21. Aro pages and remaining overlays
- [x] 🛑 **GATE C4**

**C5 Boot and first run:** install, onboarding, connecting, boot failure,
reauth, update, error boundary, guide startup. Recovery semantics unchanged.
- [x] 22. First-run and boot surfaces
- [ ] 🛑 **GATE C5**

---

## PHASE D: Journeys, performance and release candidate

**Start:** Gate C5 approved.
**End:** journey scorecard "after" better or equal on every journey; all P0
fixed, P1 fixed or founder-deferred; perf verified on a long transcript with
several panes; keyboard-only complete; `LAYOUT-UX.md` matches code; no new
failures vs baseline.
**Founder check:** run the 10 journeys yourself with the scorecard; 6
themes, glass on/off, RTL, one non-English locale, three window widths.

- [ ] 23. Re-run all journeys; fill "after" scorecard; fix regressions
- [ ] 24. Performance: long transcript, several panes, live stream, resize
- [ ] 25. Final keyboard and accessibility pass (focus order/return, roles)
- [ ] 26. Extensibility proof: build a throwaway screen using only
      `LAYOUT-UX.md` section 9; fix any gap in the doc; remove it
- [ ] 27. Docs sync (`LAYOUT-UX.md`, `DESIGN.md` references)
- [ ] 🛑 **GATE D: release candidate on `ui-port/2026-10-09`**

---

## Founder change requests (substeps go in the step above)

_none yet_

## NEEDS-BEHAVIOR proposals (founder decides; not implemented here)

- NB-001 (from F-004): Batch theme attribute mutations via `requestAnimationFrame` in Appearance store to avoid DOM style re-calc flash on rapid skin switching.

## Backlog (ADR, not in this roadmap)

_none yet_
