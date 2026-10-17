# Aro Desktop Layout and UX Contract

Companion to `DESIGN.md` (look: tokens, roles, components). This file owns
**how things are placed and how the app feels to use**: layout, spacing,
alignment, interaction, flows. Visual layer only: no wiring, state, IPC, or
behavior changes. Numbers marked *(default)* are proposals; Step 1 of the
roadmap verifies them against the real code and adds tokens additively.

## 1. Principles

1. **Zero-friction path.** The most common task takes the fewest actions; no
   dead ends; no modal where inline works; no confirmation where undo works.
2. **Predictable placement.** The same thing is in the same place on every
   screen (primary action, close, search, filters, row actions, status).
3. **Nothing moves by itself.** No layout shift on load, hover, streaming, or
   state change. Reserve space; reveal in place; never reflow neighbors.
4. **Context is sacred.** Background events update badges and caches; they
   never steal focus, scroll, selection, or the foreground view.
5. **Instant feedback.** Input to visible response in the same frame; slow
   work shows progress; failures show where they happened with a way out.
6. **Keyboard parity.** Everything reachable and operable by keyboard, with a
   visible focus ring and an order that matches the visual order.
7. **Calm density.** Tight but breathable; whitespace groups, hairlines
   separate once; no decoration that carries no information.
8. **Forgiving.** Large enough hit areas, tolerant hover paths, easy undo and
   cancel, safe defaults.

## 2. Spacing and rhythm (4px scale, Tailwind steps 1,2,3,4,6,8)

| Relationship | Step |
| --- | --- |
| icon and its label, tight inline items | 1 to 2 |
| label and its field; items in one control group | 1 to 2 |
| related rows in a list or form | 2 to 3 |
| form row to form row; card content blocks | 4 |
| group to group inside a section | 6 |
| section to section; page header to body | 6 to 8 |
| page side padding | `PAGE_INSET_X` only |

Rules: no arbitrary values; use `gap` on the parent, not margins on children;
one spacing step per relationship across the whole app; never double up
(padding plus margin) to get a gap.

## 3. Alignment

- Flush-left text edges within a block; icons align optically to the first
  text line; numbers right-aligned with `tabular-nums`.
- Controls in one row share a size and a vertical center; labels share a
  baseline with their values.
- Actions: primary action trailing (right in LTR) in dialog/footer bars,
  secondary before it, destructive visually separated; row actions trail and
  reveal in place without changing row height or text position.
- Use logical properties (`ms-*`, `ps-*`, `start/end`) so RTL mirrors.
- Truncate with ellipsis plus `OverflowTip`; never wrap a one-line row; give
  long values a max width token, not a fixed pixel width.
- Optical corrections are made once in the primitive, not at call sites.

## 4. Layout system (templates)

Build screens from these templates only. Each has fixed anatomy.

| Template | Anatomy |
| --- | --- |
| **Shell** | titlebar band, sidebar, main, optional right panes, statusbar; composer docked to chat main |
| **Page** | `PageHeader` (title, optional description, trailing actions) then body in sections; body scrolls, header stays |
| **List page** | Page + toolbar (search, filter, primary action) + list of `ListRow`; empty/loading/error in the list area |
| **Form page** | Page + `Section`s of `FormRow` (label + description on the start side, control on the end); single save/reset bar |
| **Master/detail overlay** | `OverlaySplitLayout`: nav/list left, detail right, same header anatomy both sides |
| **Settings subpage** | breadcrumb-owned header, then Form page |
| **Dialog** | title, body, footer bar (actions trailing); focus on primary or first field |
| **Empty / Loading / Error** | same box as the content they replace (no shift); one sentence, one action |

Layout primitives (exist or add additively, constrained to the spacing scale):
`PageShell`, `PageHeader`, `Section`, `FormRow`, `Stack`, `Inline`, `Toolbar`,
`ActionBar`, `ListRow` (exists), `OverlaySplitLayout` (exists),
`SectionHeading` (exists), `EmptyState`/`PanelEmpty` (exist). A screen may not
invent its own header, gutter, or footer.

Measures *(default, tokenize additively)*: chat text about 72ch; form content
about 640px max; settings nav fixed width; panes keep their min widths from
the existing layout constants. Use container queries, not viewport queries:
three width classes (narrow, standard, wide) measured from the real minimum
window size, with a defined collapse order (right panes first, then sidebar
to rail, then secondary toolbar items to a menu).

## 5. Interaction rules

**Feedback and timing** *(defaults)*
- Show a loader only after about 150ms; once shown, keep it at least 300ms
  (no flash). Use `Skeleton` only when the final layout is known, else
  `Loader`. Reserve width so buttons do not jump when they go pending.
- Disable or guard against double submit while pending; keep focus where it
  was. Optimistic updates paint first and roll back visibly.
- Toast for background outcomes; inline message for the field or row that
  failed; dialog only for blocking decisions. Errors state what happened and
  the next step, with Retry in place.
- Confirmation only for destructive or irreversible actions (via
  `ConfirmDialog`); prefer undo where the data layer already supports it
  (do not add behavior; log it as NEEDS-BEHAVIOR).

**Keyboard and focus**
- Tab order = visual order. Arrow keys move within lists, menus, tabs,
  segmented controls; Enter activates; Esc does exactly one thing.
- Opening a dialog/overlay focuses its primary or first field; closing returns
  focus to the trigger; deleting an item focuses its neighbor.
- Shortcuts shown where hover teaches them (`TipKeybindLabel`, `Kbd`);
  shortcuts never steal keys from a focused terminal/editor.

**Scroll, selection, motion**
- Preserve scroll position and selection across view switches and
  re-renders; streaming follows the bottom only if the user is at the
  bottom. No scroll jump on content arrival.
- Hover reveals never shift layout; hover paths are forgiving (no flicker
  crossing gaps).
- Motion follows `DESIGN.md` tokens: short, functional, reduced-motion safe.

**Targets and forgiveness**
- Hit area at least 24x24 CSS px; edge actions live near their edge; resize
  handles and drag targets have generous invisible hit areas.

## 6. Friction audit method (used in the roadmap)

For each screen, walk its real tasks live and record in
`.agent/aro-ux-assembly/FRICTION.md`: steps to complete (clicks plus
keystrokes), dead ends, layout shift, focus or scroll loss, flashes,
unclear labels, inconsistent placement, missing empty/loading/error state,
mouse-only paths, slow response.

Severity: **P0** blocks or loses work/context; **P1** repeated annoyance or
inconsistent placement on a core screen; **P2** polish; **P3** nit.
Tags: `LAYOUT` (fixable in the visual layer), `NEEDS-BEHAVIOR` (needs a
behavior/state change: propose, never implement without founder approval),
`BLOCKED` (cannot verify live).

## 7. Screen definition of done

- Built from section 4 templates and kit components only.
- Spacing and alignment follow sections 2 and 3 (no arbitrary values).
- Empty, loading, error, long-text, and no-data states exist and do not shift
  layout; works at narrow, standard, wide; RTL and one long-string locale.
- Keyboard-only run of every task works; focus order and focus return correct.
- No new friction: every task's step count is equal or lower than the
  recorded "before"; all P0 and P1 for the screen are fixed or deferred with
  founder approval.
- All 6 themes, glass on/off; no new test, lint, or typecheck failures vs
  baseline.

## 8. Journey scorecard (measured at gates)

Top journeys *(defaults; founder may change)*: first run and onboarding; new
chat and send; stream and stop; approve or deny; switch chat and profile;
attach a file; open settings and change one; command palette search; review a
diff; create a scheduled task. For each: steps before/after, any shift or
focus loss, time to first feedback, result (ok / issue / BLOCKED).

## 9. Adding a screen later

Pick the template; compose only kit and layout primitives; add its states;
add a fixture preview to the gallery; walk its tasks and log friction; pass
section 7; update this file only if you added a template or primitive.
