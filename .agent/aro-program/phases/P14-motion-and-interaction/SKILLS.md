# SKILLS P14
Research questions: how do the reference apps handle streaming text, pane transitions, and command palettes (principles, not assets)? What are current guidelines for motion duration and easing, and for `prefers-reduced-motion`? Which properties are compositor-friendly in Chromium?
Tools to prefer: Playwright (screenshots, tracing), Chromium performance panel traces, the `motion` library already in `apps/desktop/package.json` (verify the version), the design gallery.
Read map: `apps/desktop/DESIGN.md` (motion headings), `apps/desktop/src/aro/tokens.css` (motion tokens), the grep results from step 1, `apps/desktop/LAYOUT-UX.md` only for pane behavior.
Never read: `src/aro/host-theme.css` whole (grep `@keyframes` and `animation:`).
Evidence: traces, frame-time table, recordings or frame strips per hero moment, before/after of removed animations.
Attack focus: low-end GPU, 4K and 150% scaling, 200 messages streaming, theme switch mid-animation, reduced motion, background tab, battery saver.
