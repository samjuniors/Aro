# Extending the Aro design system

One page. Follow it so new work stays consistent. Contract: `apps/desktop/DESIGN.md`.

**Add a component**
1. Reuse first (`Button`, `SearchField`, `SegmentedControl`, `ListRow`,
   `Loader`, `ErrorState`, `LogView`, `ConfirmDialog`, `Kbd`, `Skeleton`).
2. Pick exactly one role (Control / Surface / Pane / Menu / Overlay); radius,
   elevation, hairline come from it. No raw colors, radii, shadows, spacing,
   `z-[..]`, `text-[Npx]`, `transition-all`.
3. Put it in `src/components/ui/` (screens) with cva `variant`/`size`; call
   sites never override padding, size, radius.
4. Implement all states: rest, hover, focus-visible, pressed, selected,
   disabled, loading, error. Icon-only needs `aria-label`.
5. Add a section to `/aro-design` (variant x size x state, 6 themes, glass,
   RTL, reduced motion) and a vitest file next to it.
6. Strings via `useI18n`, all locales. Add its entry to `DESIGN.md` section 6
   in the same change.
7. `no-raw-visuals` must pass with the ratchet not grown.

**Add a token:** add-only in `src/aro/tokens.css` (never edit existing
values: parity test). Name `--aro-*`. Prove contrast in all 6 themes.

**Add a theme:** add the theme to `prototype/` first (source of truth), keep
`prototype-parity.test.ts` green, then check the gallery.

**Add a screen:** compose kit components only; no wiring or store changes in
the visual layer; open it live; check empty/loading/error states.

**Change request that is not a fix:** write `docs/adr/NNNN-title.md`
(`docs/adr/0000-template.md`), schedule it, implement it in its own change.
