# ROADMAP P14: Motion and interaction (the "space" feel, inside a budget)
Branch: `aro/P14-motion` | Gates: 14.1, 14.2, 14.3 | Needs: P12.1 approved
Goal: a motion language where every movement explains something (feedback, continuity, state), feels fast,
and never costs frames.
Hard budget: animate `transform` and `opacity`; no animated blur or `box-shadow` on large surfaces; no
animation that blocks input; reduced-motion gives the same information without movement.

## Interview batch 1
1. Intensity. A. calm and functional / **B. expressive but fast (UI at or under 200 ms, hero moments 400 to 700 ms)** / C. cinematic.
2. Ambient "space" layer (starfield, particles, glow) on idle screens. A. none / **B. optional, off on battery, reduced motion, or weak GPU, with a setting** / C. always on.
3. Sound. **A. none** / B. subtle and optional.
4. Reference products to feel like (pick 2 to 3): Codex Desktop, Claude desktop, Cursor, Zed, Linear, Raycast.

## Steps
- [ ] 0. Recon and context pack.
- [ ] 1. Inventory every animation: keyframes in `src/aro/host-theme.css` and `src/styles.css`, the `motion` library uses, CSS transitions, durations. Classify keep / replace / remove; flag anything that animates layout or paint properties.
- [ ] 2. Motion language: extend the existing `--aro-dur-*` and `--aro-ease-*` tokens in `src/aro/tokens.css` (add only what is missing, plus distance), rules (enter, exit, shared element, list change, loading), and a "when not to animate" list. `docs/research/11-motion-language.md` plus a short section in `DESIGN.md`.
- [ ] 🛑 **GATE 14.1** language, tokens, inventory decisions, interview answers.
- [ ] 3. Hero moments, each with acceptance criteria and a frame-timing trace: launch/boot, message send, streaming text and caret, tool-call timeline, pane open/close, command palette, theme switch, voice orb, empty states.
- [ ] 4. Ambient layer if approved (Q2), with the off conditions and a measured cost.
- [ ] 🛑 **GATE 14.2** hero moments with traces and short recordings.
- [ ] 5. Micro-interactions: hover, press, focus, drag, reorder, toast, skeleton, optimistic updates; consistent via primitives, not call sites.
- [ ] 6. Performance pass on a low-end reference machine; reduced-motion parity pass; keyboard pass.
- [ ] 🛑 **GATE 14.3** budget met (numbers in the report), nothing janky on the reference machine.

## Exit criteria
Every animation traces back to a token and a rule; `no-raw-visuals` ratchet not grown; budget met; reduced motion verified.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
