# Aro Desktop Design System

Contract for the Electron desktop app (`apps/desktop`). Read this before adding
a component, overlay, or style. Read [`AGENTS.md`](./AGENTS.md) for
architecture, state, resolver, transport and testing rules; this file owns the
visual and interaction contract only.

**Rule of thumb: one source per concern, tokens over literals, flat over
boxed, motion follows state.** If you reach for a raw color, a one-off shadow,
a bespoke button, or a hardcoded `px-*` on a control, stop: a primitive exists.

Repo reality (checked against the repo): `src/aro/tokens.css` already has `--aro-radius-*`, `--aro-shadow-panel|menu|composer`, `--aro-focus-ring`, `--aro-dur-*` and `--aro-ease-*`, six themes (obsidian, daylight, nord, ember, paper, ink) and a parity test against `prototype/`; **never change an existing token value, only add**. `kbd.tsx`, `skeleton.tsx`, `checkbox.tsx`, `field.tsx` and `/aro-design` (`DesignSystemAro.tsx`) already exist: polish, do not rebuild. Where this file says "new" for something that exists, treat it as "polish onto this contract".

Status of this document: v2 (consolidated). It replaces the previous
`DESIGN.md`. Where v2 and the code disagree, fix whichever is wrong, in the
same change, rather than forking a one-off at the call site.

---

## 0. How this document is maintained

- **Principles** (section 2) are durable.
- **Named contracts** (tokens, variants, primitives; sections 3 to 9) are the
  API of the design system. Changing a primitive, token or variant means
  updating its entry here **in the same change**. A stale name is a bug.
- **Founder or product additions mid-phase** never edit this file directly.
  They go into `docs/adr/NNNN-title.md` (template in section 16). The ADR is
  scheduled, then implemented in its own change, then folded into this file.
  Work in progress follows the roadmap in section 15 and does not deviate.
- **Token values live in `src/aro/tokens.css` and are authoritative.** Numbers
  in this file marked *(default)* are the shipped starting values. Changing a
  number changes it everywhere; that is the intended way to restyle the app.

---

## 1. Look and feel

Aro is a **calm, dense, keyboard-first workbench for talking to agents**, dark-first (see `docs/brand/BRAND.md`: zinc near-black, family accent emerald, Workbench accent iris, Inter / Space Grotesk, JetBrains Mono as a first-class voice). The
conversation is the product; chrome should recede.

| Quality | Meaning in practice |
| --- | --- |
| **Calm** | Low contrast chrome, one accent, no decorative gradients, no sparkle icons. Color is reserved for state and the single primary action per view. |
| **Flat** | Structure from whitespace and one hairline. Elevation only for things that float. |
| **Precise** | Everything on a 4px grid, one radius per role, optical alignment of icons to the first text line. |
| **Fast** | Feedback in the current frame. Motion is short, functional, and never delays state. |
| **Quiet confidence** | Neutral surfaces, tight type, tabular numbers, no shouting (bold used sparingly). |
| **Keyboard-first** | Every action reachable by keyboard; focus always visible; shortcuts shown where hover teaches them. |

### Benchmarks: what we take, what we fix

| Product | Take | Avoid / improve |
| --- | --- | --- |
| **Linear** | Density, crisp 1px hairlines, instant hover, command palette as primary navigation, subtle status color | Dense does not mean cramped: keep 32px default control height and 4px steps. Avoid low-contrast disabled text that fails AA. |
| **Raycast** | Menu and list feel: single-line rows, keyboard hints right-aligned, strong selected row, tiny exit animation | Their heavy glow and gradients; we stay flat. |
| **OpenAI Codex app** | The category reference: diff-first review, parallel task threads, native feel | Cloud-verbose, heavy footprint; we stay light and local-first |
| **Cursor / Zed** | Dev-tool flat panes, glass sidebar, panes that read as working context, diff-friendly mono | Panels that all look identical; we differentiate Pane vs Surface vs Menu by role. |
| **Arc** | Friendly rounded controls, tasteful sidebar translucency | Playful color overload and pill everything; pills only for dots, avatars, counts, switch thumbs. |
| **Claude / ChatGPT desktop** | Transcript typography, readable measure, calm composer | Cluttered composer toolbars; we use `FanMenu` for rarely touched toggles. |
| **Notion / Things** | Empty states with one clear action, generous whitespace | Heavy iconography in lists. |

Every new component is compared against the closest benchmark in the PR
description (one sentence: "matches X on Y, deliberately differs on Z").

---

## 2. Principles

1. **Flat, not boxed.** No card-in-card, no divider borders inside a panel.
   Group with whitespace and at most one hairline.
2. **Borderless elevation for floating layers.** Floating panels use the role
   shadow plus the layer hairline, not framed boxes.
3. **One primitive per concern.** One `Button`, one `SearchField`, one
   `Loader`, one `ErrorState`. Migrate onto them; do not fork.
4. **Tokens, not literals.** Reference CSS vars. Never raw hex, rgba, px
   radii, shadows, z-indexes or arbitrary spacing in components.
5. **Style lives in the primitive.** Variants and sizes own padding, radius,
   color, chrome. Call sites pass `variant` / `size`, never `className`
   overrides that re-specify them.
6. **Intent before automation.** Surface useful actions and previews; never
   open panes, move focus, or navigate because a background event happened.
7. **Immediate feedback.** Direct manipulation paints first; persistence
   reconciles after and rolls back visibly on failure.
8. **Motion follows state, never delays it.** Selection, drag, cancel and
   pressed feedback paint in the current frame.
9. **Accessible by construction.** Contrast, focus, roles, reduced motion and
   hit areas are properties of primitives, not of call sites.
10. **Scalable by role.** A surface has exactly one role; the role decides
    radius, elevation and hairline.

---

## 3. Tokens

All tokens live in `src/aro/tokens.css` (Aro-owned, `--aro-*`) and
`src/aro/host-theme.css` (theme bridge). Legacy `nous` / `Hermes` names
(`shadow-nous`, `--stroke-nous`) are upstream; do not rename them
opportunistically, add new tokens as `--aro-*` and point legacy ones at them.

### 3.1 Radius (by role)

| Token | Default | Role |
| --- | --- | --- |
| `--aro-radius-control` | 7px | Control |
| `--aro-radius-panel` | 10px | Surface, Pane, Menu |
| `--aro-radius-overlay` | 14px | Overlay |

Tailwind classes after the theme reset: `rounded-control`, `rounded-panel`,
`rounded-overlay`. Never `rounded-sm|md|lg|xl|2xl` or `rounded-[Npx]`
(`--radius-scalar: 0.2` makes them 2 to 5px, a different shape language).
`rounded-full` only for dots, avatars, count badges, switch thumbs.

**Concentric rule:** inner radius = outer radius minus padding between them,
never below `--aro-radius-control`. Never put a larger radius inside a smaller
one.

### 3.2 Elevation

| Token | Role | Notes |
| --- | --- | --- |
| none | Control, Surface | Flat. |
| `--aro-shadow-panel` | Pane | Soft, wide, low opacity. |
| `--aro-shadow-composer` | Composer | Pane shadow plus slightly stronger lift. |
| `--aro-shadow-menu` | Menu | Tight contact shadow plus short ambient. |
| `shadow-nous` | Overlay | Downward-weighted, layered contact to ambient falloff. |

No `shadow-[…]`, no raw `shadow-sm|md|lg|xl`. Menus and `Button floating`
migrate to `--aro-shadow-menu` (this supersedes any `shadow-md` mention).

### 3.3 Hairlines

| Token | Use |
| --- | --- |
| `--ui-stroke-tertiary` | Default in-pane divider and every bordered Surface (tables, fences, callouts, attachments, widgets) |
| `--stroke-nous` | Every floating layer (Menu, Overlay), pairs with the role shadow |
| `--ui-stroke-primary…quaternary` | Strength ladder, descending; primary/secondary are for emphasis states only, not default chrome |

One hairline per layer. Menus migrate off `--ui-stroke-secondary`.
`outline` controls use a 1px **inset ring** in `--ui-stroke-tertiary`.

### 3.4 Color roles

Components reference roles, never theme colors directly.

| Role token | Use |
| --- | --- |
| `--ui-text-primary / -secondary / -tertiary` | Text hierarchy. Tertiary is metadata only and must still meet 4.5:1 on its surface. |
| `--ui-bg-quaternary` | Soft control fill (secondary button) |
| `--ui-widget-surface-background` | Inline chat widgets |
| `--chrome-action-hover` | Hover fill for quiet controls |
| `--theme-primary`, `--ui-accent` | Brand and the one primary action |
| `--aro-focus-ring` | Focus ring (the only focus style) |
| `--aro-status-success / -warn / -danger / -info` *(new)* | Status foreground. Tinted fills are `color-mix(in oklab, var(--aro-status-x) 12%, transparent)`, never a separate raw color. |

Rules:
- Destructive red is reserved for explicit failures and destructive actions.
  Neutral notices for missing reads or ambiguous exit codes.
- One accent. A view shows at most one `default` (primary) button.
- Contrast: text 4.5:1, large text and UI boundaries 3:1, in all six Aro themes and
  glass on and off. Disabled state is exempt but must remain legible (at least
  3:1 for labels) and must not rely on opacity alone.
- Never hardcode `border-gray-*`, `bg-white`, `text-black`. Sanctioned
  literals: `BrandMark` tiles only.

### 3.5 Spacing

4px scale, Tailwind steps `1, 2, 3, 4, 6, 8` (4 to 32px). No arbitrary
`p|m|gap|space-*-[…]`. Control padding comes from `Button` / `controlVariants`
sizes only. Page gutters from `PAGE_INSET_X` / `PAGE_INSET_NEG_X`.

### 3.6 Typography

Use the existing scale; no `text-[Npx]`. Weights: regular, medium, semibold
only. Add the following named steps as `--aro-text-*` tokens *(new, default
values)*:

| Token | Size / line height | Use |
| --- | --- | --- |
| `--aro-text-xs` | 11 / 16 | Badges, kbd, micro metadata |
| `--aro-text-sm` | 12 / 16 | Secondary text, tips, table cells |
| `--aro-text-md` | 13 / 20 | Default UI text |
| `--aro-text-lg` | 15 / 22 | Section headings, dialog titles |
| `--aro-text-xl` | 18 / 26 | Page headings |
| `--aro-text-mono` | 12 / 18 | Logs, code, paths |

Numbers that change (counts, timers, diffs) use `tabular-nums`. Chat text size
is governed by *Chat typography* (section 10) and the UI Scale zoom; do not
multiply global tokens or nest CSS zoom.

### 3.7 Motion (reuse the existing `--aro-dur-*` / `--aro-ease-*`; the values below are the intended scale, verify against `tokens.css` and add only what is missing, plus a `prefers-reduced-motion` block)

| Token | Default | Use |
| --- | --- | --- |
| `--aro-dur-instant` | 0ms | State that must not animate (selection, pressed) |
| `--aro-dur-fast` | 100ms | Hover, focus, control state |
| `--aro-dur-base` | 160ms | Menus, popovers, tooltips (enter), tab switch |
| `--aro-dur-slow` | 240ms | Dialogs, drawers, card promotion |
| `--aro-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--aro-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter / settle |
| `--aro-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |

Rules:
- Animate only `opacity`, `transform`, `background-color`, `color`,
  `box-shadow`, `filter` with **named properties**. Never `transition-all`.
- Enter is longer than exit (exit is `--aro-dur-fast`).
- Tooltips: 200ms open delay, 300ms warm window, no entrance animation, 100ms
  exit.
- Stagger only choreographed surfaces (onboarding); the outer fade is delayed
  so it does not swallow inner motion.
- Respect `prefers-reduced-motion`: anything beyond an opacity fade becomes
  instant, and no empty clearance is retained.
- No backdrop-filter repaints during movement. Remove animation before
  masking a performance problem.
- Hot interactions (drag, resize, streaming scroll) use transform/opacity only
  and coalesce pointer work per frame.

### 3.8 Z ladder

Use only the ladder in `styles.css`: `--z-modal-backdrop`, `--z-modal`,
`--z-modal-popover`, `--z-over-modal`, `--z-over-modal-content`,
`--z-switcher-backdrop`, `--z-switcher`, then the boot chain `--z-connecting`
to `--z-onboarding` to `--z-setup` to `--z-crash`. Plain `z-10` / `z-20` only
for stacking within one component. No `z-[…]`.

---

## 4. Roles, not values (shape, elevation, hairline)

Every visible surface has exactly one role. The role decides radius,
elevation and hairline. **Call sites never choose any of the three.**

| Role | Examples | Radius | Elevation | Hairline |
| --- | --- | --- | --- | --- |
| **Control** | `Button` (boxed), icon buttons, `Input`, `Textarea`, `SelectTrigger`, `Badge`, tabs, `Tip` bubble | control | none | none (`outline` = inset ring tertiary) |
| **Surface** | inline widgets (`WIDGET_SHELL_CLASS`), status card, user bubble, transcript tables / fences / callouts / attachments | panel | none | tertiary, or none where the fill carries it |
| **Pane** | shell panes, sidebar, context panes, composer | panel | panel (composer: composer) | none |
| **Menu** | `DropdownMenu`, `Select` list, `PopoverContent variant="menu"`, cmdk pickers, `floating` Button | panel | menu | `--stroke-nous` |
| **Overlay** | `Dialog`, route `OverlayView`, onboarding / boot / update, notifications, floating approvals | overlay | `shadow-nous` | `--stroke-nous` |

Rules:
1. **Boxed controls share one radius.** Every `Button` variant that paints a
   box (`default`, `destructive`, `secondary`, `outline`, `floating`) and every
   icon button uses control radius. Boxless variants (`text`, `textStrong`,
   `link`, `inline`, `grip`) have no radius because they have no box. (This
   supersedes any earlier statement that text buttons are "square".)
2. **Concentric nesting**, never same-role boxes nested.
3. **Elevation only from the role table.** Surfaces inside a pane have no
   shadow.
4. **Adjacent controls share a size.** One row, one `size`.
5. **One state language.** Hover `--chrome-action-hover`, focus
   `--aro-focus-ring`, pressed and disabled owned by the primitive.
6. **Embedded third-party chrome** (terminal, editor, webview, markdown
   renderers) keeps its interior but is clipped to the owning pane's radius
   and adds no shadow or outer border.
7. **Sanctioned exceptions:** `BrandMark` tiles, generated brand assets,
   tokenized dashed drag targets. Anything else needs an inline
   `design-allow: <reason>` comment a reviewer can accept or reject.

---

## 5. Interaction states (all primitives)

Every interactive primitive implements and the gallery shows:

`rest, hover, focus-visible, pressed, selected/on, disabled, loading (where
async), error (inputs)`.

- Focus: `--aro-focus-ring` via `:focus-visible` only; never removed, never
  re-styled at call sites. Ring must not be clipped by `overflow: hidden`
  parents (use outline-offset or inset ring variants where clipped).
- Hit area: at least 24x24 CSS px for any control (icon-xs may visually be
  smaller but extends its hit area); 32px preferred in toolbars.
- Disabled: `aria-disabled` / `disabled`, no hover, `cursor-default`.
- Loading: replace the label glyph with the shared `Loader` at the same size;
  width must not jump (reserve width).
- Pressed: instant (0ms) background step, no scale transform on text buttons.
- `cursor-pointer` set in the primitive, never at call sites.
- All trigger buttons are `type="button"`.

---

## 6. Components (the usable kit)

Home: Aro-owned kit in `src/aro/ui.tsx`; shared primitives in
`src/components/ui/*`. **New = not yet in the codebase; build it. Existing =
polish onto this contract without changing its public props.**

### 6.1 Buttons: one component (`button.tsx`)

- **Variants:** `default` (primary), `destructive`, `secondary` (soft fill,
  the default non-primary look), `outline` (transparent + 1px inset ring),
  `ghost`, `floating` (loose control: opaque popover fill + menu shadow, hover
  lifts the glyph only), `link`, `text` (boxless quiet inline), `textStrong`
  (bold underlined inline), `grip` (fill-free drawer handle).
- **Sizes:** `default`, `xs`, `sm`, `lg`, `inline` (flush zero box), `micro`
  (status-stack, table footers), icon family `icon`, `icon-xs`, `icon-sm`,
  `icon-lg`, `icon-titlebar`, and `grip` (48x16 hit area).
- Padding plus line-height size text buttons; target heights *(default)*:
  xs 24, sm 28, default 32, lg 36. Icons inherit `size-3.5` (`size-3` at `xs`);
  do not re-set icon size.
- Call sites never pass `h-*`, `px-*`, `py-*`, icon-size or radius overrides.
- Polymorph with `asChild`.

### 6.2 Tooltips (`Tip`)

Only where hover teaches something new. Tip unlabeled chrome, keybind labels,
truncated paths, ownership chips, unlabeled icon grids. Do **not** tip menu
triggers, close X buttons, or controls whose label already says it. Keep
`aria-label` always. Never native `title=` on buttons (test enforces).
Placement by intent: `control` above (default), `toolbar` below, `row` right,
`left-rail` / `right-rail` inward; Radix flips and shifts; short labels size to
content, descriptions wrap within 24rem. Keybind hints via `TipKeybindLabel` /
`useKeybindHint`, never hardcoded combos. Bubble radius 0.25rem (a sanctioned
Control-role exception; migrate to control radius only via ADR).

### 6.3 Form controls

- `controlVariants` (`control.ts`) is the one shape for `Input`, `Textarea`,
  `SelectTrigger`; new text-entry controls compose it. Error state = inset ring
  in `--aro-status-danger` plus message text below, not a red box.
- `SearchField`: borderless, underline-on-focus, auto-width; the only search
  input; hidden when the list is empty.
- `SegmentedControl`: small mutually exclusive sets (replaces radio piles and
  pill rows). Selected thumb slides with `--aro-dur-base` / `--aro-ease-out`.
- `Switch` (`size="xs"`): bare with `aria-label`, no bordered wrapper.
- `ComboboxInput`: typed fields with suggestions; never `<input list>` +
  `<datalist>`.
- `FanMenu`: one hub control fanning sibling toggles (`vertical`,
  `horizontal`, `arc`); discs are `floating` off / `default` on.
- Existing, polish onto the contract: `Checkbox`, `Kbd` (keycap chip: control
  radius, `--aro-text-xs`, no border). **New:** `FieldMessage` (helper/error text).

### 6.4 Menus and pickers

`DropdownMenu`, `Select`, `PopoverContent variant="menu"` +
`Command variant="menu"` all paint through `src/components/ui/menu.ts` (Menu
role). Rows: single line, ellipsized, 28px target, icon column fixed, trailing
`Kbd`. Selected row uses `--chrome-action-hover` stronger step plus check
glyph; keyboard highlight and hover are the same visual. Enter animation
`--aro-dur-base` opacity + 2px translate; exit `--aro-dur-fast`.
Roles: `role="menu"` / `menuitem`.

### 6.5 Overlays and dialogs

`Dialog`, `OverlayView`, `ConfirmDialog`. Overlay role. Esc closes (except
install/onboarding/destructive-confirm which state it explicitly). `ConfirmDialog`
opens focused on Confirm, owns pending to done to close and the inline error;
one `secondaryAction` slot. Never `window.confirm`. Close is an x icon with
`aria-label`, not the word "Close". Focus trapped, restored to the trigger on
close. Backdrop blur is the shared default (`blurBackdrop={false}` only for
the sudo dialog).

### 6.6 Navigation and layout

`OverlaySplitLayout` with `OverlaySidebar` / `OverlayMain`; `OverlayNav`
(labels navigate, `DisclosureCaret` toggles); tabs (Control role, tab
semantics); panel titlebars (drag region on empty space, tabs/actions
no-drag, reserved native-control space). `ListRow` for label/description/action
rows: flat, flush-left, no dividers unless genuinely needed (single tertiary
hairline).

### 6.7 Feedback and states

- `Loader`: animated math/ascii curves; never the text "Loading…".
- `Skeleton` (exists, polish): flat `--ui-bg-quaternary` block, control or panel
  radius per role, opacity pulse (not shimmer gradient) at 1.2s, disabled under
  reduced motion. Use only where layout is known; otherwise `Loader`.
- `ErrorState` + canonical `ErrorIcon` (no bg chip); nodes for title and
  description so Radix a11y flows through.
- `EmptyState` (plain page bodies), `PanelEmpty` (overlay master/detail with
  icon and one action). One clear action, one sentence; no third hand-rolled
  empty.
- `LogView`: no bg, hairline, tight padding, small mono.
- `Badge`: `default`, `muted`, `warn`, `destructive`, `outline`, `solid`;
  sizes `default`, `xs`, `overlay`.
- `CardStack` (toasts, approvals) and `StatusRow` / `StatusDismissButton` /
  `StatusControlRow` / `StatusPendingIcon` keep their documented geometry and
  timing (section 9).

### 6.8 Brand and icons

`BrandMark` for hero/brand moments only (theme-aware fixed tile). Icons:
**Tabler** for chrome (via `src/lib/icons.ts`, `iconSize` scale), **Codicon**
for editor/tool/status vocabulary. Never a third set, never mix styles in one
control group, no sparkle/star decoration. Icons align optically to the first
text line.

---

## 7. Surfaces: glass, density, theming

- Glass defaults to **29% Tint, Sidebar only**, fade zero, both appearances;
  `apps/shared/src/translucency.ts` owns defaults. Saved user settings always
  win.
- Every primitive must read correctly in **all six Aro themes, glass on and off**.
  Opaque text surfaces never sit directly on translucent fills without a
  readable backing.
- Theme colors come from the active theme through `host-theme.css`; components
  never read theme colors directly.
- Density: one density (comfortable-compact). Do not add a density switch
  without an ADR.

---

## 8. Layout principles

- Chat is the home surface; panes (preview, files, review, terminal) are
  working context attached to the task; route overlays are short tasks that
  return to the previous route; pages are durable destinations.
- Readable measure for transcript text; page gutters from `PAGE_INSET_X`.
- Whitespace groups; one hairline separates; never nested rounded boxes.
- Edge actions live near their edge; forgiving geometry beats pixel-perfect
  triggers.
- Expensive stateful surfaces stay mounted when hidden (visibility is not
  lifecycle).
- Navigation preserves context: a background finish, tool result or refresh may
  update badges and caches but must not replace the foreground transcript or
  steal focus.

---

## 9. Behavior contracts carried forward (do not regress)

These are behavior, not styling. The design-system work must not alter them:

- Queued cards (`CardStack`): single 96%-scale silhouette 7px above the front,
  220ms promotion, 180ms upward clearance, no rotation or lateral throw on
  button/keyboard decisions, gestures never grant approval, departing cards
  are inert, one persistent transcript-level host owns approvals.
- Tooltip timing and placement (section 6.2).
- Sticky user messages clip covered scrolling content; wrappers unpainted,
  only the rounded bubble owns a fill.
- Composer: status groups collapsed except todos, ridge toggle persists per
  conversation, popped-out composer focus rules, dictation pins recipient.
- Status stack: stationary rounded card, bounded inner scroll, outer
  `overscroll-behavior-y: contain`, nested `auto`.
- Window layout: Minimize to tray, window glass defaults, titlebar clusters
  (`TITLEBAR_FIXED_TOOLS`).
- Keyboard: focus owns keys; one cancel gesture does one thing; cancellation is
  synchronous in the UI.

---

## 10. Chat typography

Appearance has **UI Scale** (whole-window zoom, 90% default) and **Chat Text
Size** (desktop-local multiplier, 110% default) for conversation text and the
composer editor (including floating and inline-edit composers). It does not
resize sidebar, settings, toolbars, media or pane geometry. Conversation size
and line-height tokens derive inside the transcript/editor from root base
tokens; never multiply global tokens or nest CSS zoom.

---

## 11. i18n and state

- Every user-facing string goes through `useI18n()`. No literals in JSX.
  Update **all** registered locales together (`fr`, `de`, `es` are complete
  `Translations`; `ar`, `ru` overlay via `defineLocale()`; Arabic source in
  `src/i18n/ar_<topic>.ts`). Layout must survive RTL and 40% longer strings:
  use logical properties (`ms-*`, `ps-*`, `start`/`end`), never fixed widths on
  labels.
- State: shared state in small **nanostores**; render with `useStore`;
  non-render reads use `$atom.get()`; colocated action modules; persistence
  beside the owning atom. Design-system primitives are **stateless/presentational**
  and take props; they do not import feature stores.
- Public props use `interface` and extend React primitives
  (`React.ComponentProps<'button'>`, `Omit<…>`).

---

## 12. Accessibility baseline

- WCAG 2.2 AA for text and UI contrast in all four theme modes.
- Visible `:focus-visible` ring everywhere; logical tab order; no keyboard traps
  except modals (focus trapped, restored).
- Roles and names: menus, tabs, dialogs, switches, segmented controls expose
  correct roles, `aria-selected` / `aria-checked` / `aria-expanded`; every
  icon-only control has `aria-label`.
- `prefers-reduced-motion` honored globally; `prefers-contrast: more`
  strengthens hairlines one step.
- Status never conveyed by color alone (icon or text accompanies it).
- Target size at least 24x24.

---

## 13. Enforcement

`src/components/ui/__tests__/no-raw-visuals.test.ts` (modeled on
`no-native-title.test.ts`) scans `src/**/*.{ts,tsx,css}`, excluding
`src/styles.css`, `src/aro/tokens.css`, `src/aro/host-theme.css`,
`brand-mark.tsx` and generated assets, and fails on:

- `rounded-[…]` (and `rounded-(sm|md|lg|xl|2xl|3xl)` after the theme reset)
- `shadow-[…]` and raw `shadow-(sm|md|lg|xl|2xl)`
- hex, `rgb(a)(`, `hsl(a)(` literals in `.ts` / `.tsx`
- `bg-white`, `text-black`, `border-(gray|slate|zinc|neutral)-*`
- `z-[…]`, `transition-all`
- arbitrary `p|m|gap|space-*` values and `text-[Npx]`

Existing violations are grandfathered by a **ratchet**
(`no-raw-visuals.baseline.json`, per-file counts): the test fails if a count
rises, a clean file gains a hit, or a count drops without the baseline being
lowered in the same change. The baseline only shrinks. A line with
`design-allow: <reason>` is not counted.

**Make the wrong thing impossible** (land **last**, after migration):

```css
@theme {
  --radius-*: initial;
  --radius-control: var(--aro-radius-control);
  --radius-panel: var(--aro-radius-panel);
  --radius-overlay: var(--aro-radius-overlay);
}
```

A removed class such as `rounded-md` emits nothing and silently renders
square, which is why the reset is last and the test catches stragglers first.

Additional gates for this phase: typecheck, lint, existing unit tests, the
no-native-title test, and the visual gallery check (section 14).

---

## 14. Visual gate: the gallery

The gallery is the **existing `/aro-design` route** (self-themed wrapper, fixtures only), extended so it renders every primitive in every role, variant,
size and state, in all six Aro themes, glass on and off, LTR and RTL, normal and
reduced motion. It reads no backend and no feature store (fixtures only).

- Screenshot before and after each migration step; a primitive that looks
  different from its role siblings is a bug.
- Each component entry shows: anatomy, variants x sizes grid, all states,
  long-text and truncation case, keyboard path, and its role.
- The gallery is excluded from production bundles.

---

## 15. Roadmap for phase 1 (do not deviate)

| Step | Deliverable | Gate |
| --- | --- | --- |
| 0 | Audit (commands below), distinct-value counts, value-to-role map in the PR description | Counts reported |
| 1 | Land `no-raw-visuals` test plus baseline | Test green, baseline recorded |
| 2 | Tokens: add `--aro-text-*`, `--aro-dur-*`, `--aro-ease-*`, `--aro-status-*`; point legacy at `--aro-*` | Gallery token page |
| 3 | Primitives: `button`, `control`, `menu`, `badge`, base `Dialog`, `OverlayView`, `widget-shell`, `status-stack.css`, `src/aro/ui.tsx` | Gallery before/after, a11y checks |
| 4 | Polish `Kbd`, `Skeleton`, `Checkbox`; add `FieldMessage` | Gallery, contract entry in this file |
| 5 | `/aro-design` complete across theme matrix | Screenshots attached |
| 6 | Call-site migration, largest offender first, baseline lowered each change | Ratchet only shrinks |
| 7 | Theme reset (`--radius-*: initial`) | No straggler regressions |
| 8 | Update this file; delete the migration notes it supersedes | Doc matches code |

Audit commands:

```
rg -o --no-filename "rounded-(\[[^\]]+\]|[a-z0-9]+)" src | sort | uniq -c | sort -rn
rg -o --no-filename "shadow-(\[[^\]]+\]|[a-z0-9]+)" src | sort | uniq -c | sort -rn
rg -o --no-filename "#[0-9a-fA-F]{3,8}\b" src --glob "*.{ts,tsx}" | sort | uniq -c | sort -rn
rg -o --no-filename "(p|m|gap)[xytrbl]?-\[[^\]]+\]" src | sort | uniq -c | sort -rn
```

More than three radii or three shadows in use confirms the drift.

**Hard boundaries for phase 1 (do not touch):** backend, IPC and transport,
resolvers, nanostore atoms and their persistence, routing and route wiring,
`@assistant-ui/react` runtime wiring, i18n key names (add keys, do not rename),
public prop APIs of existing components (additive changes only), business
logic in feature code. Visual and primitive layers only.

---

## 16. ADR template (founder or product additions)

`docs/adr/NNNN-short-title.md`

```
# ADR NNNN: <title>
Status: proposed | accepted | scheduled | implemented | rejected
Date / Author:
Context: what changed or was requested, and why now.
Decision: what we will do.
Alternatives considered: including the benchmark comparison.
Impact: tokens, primitives, call sites, i18n, a11y, performance.
Roadmap slot: which step or which later phase implements it.
Acceptance: gallery screenshots, tests, contract entries updated.
```

An ADR is implemented in its own change when its slot arrives, never
mid-step. Accepted ADRs are folded into this document in the implementing
change.

---

## 17. Before you add something: checklist

- [ ] Reused a primitive (`Button`, `SearchField`, `SegmentedControl`,
      `ListRow`, `Loader`, `ErrorState`, `LogView`, `ConfirmDialog`, `Kbd`,
      `Skeleton`)?
- [ ] One role from the Shape table; radius, elevation and hairline come from
      it?
- [ ] Zero raw colors, shadows, radii, spacing, type, z values?
- [ ] No `className` overriding a primitive's padding, size, radius or chrome?
- [ ] Nested radii concentric; no same-role boxes nested; adjacent controls
      share a size?
- [ ] All states implemented and shown in the gallery (rest, hover, focus,
      pressed, selected, disabled, loading, error)?
- [ ] Motion uses tokens, named properties, no `transition-all`, reduced
      motion honored?
- [ ] Tips only where hover teaches something; no kebab tips; no native
      `title=`; keybinds via `TipKeybindLabel`?
- [ ] Contrast checked in all six themes, glass on and off?
- [ ] Strings via `useI18n`, all locales updated, RTL and long strings OK?
- [ ] No automatic navigation, focus steal, or pane opening from background
      events?
- [ ] Direct manipulation paints immediately and rolls back on failure?
- [ ] No new store imports inside a design-system primitive?
- [ ] `no-raw-visuals` passes and the baseline did not grow?
- [ ] Touched a primitive, token, variant or role? This file updated in the
      same change.
