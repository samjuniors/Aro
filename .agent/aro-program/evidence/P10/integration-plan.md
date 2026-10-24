# Integration Plan (P10.1)
Date: 2026-10-19
Author: Aro Program
Decision Reference: D-1 (ADR 0001)

## 1. Branch State & Divergence Analysis
- Base branch: `ui-port/2026-10-09` @ `4508ce42559ddc77b07d671f6e32a0b60620b66e`
- Patch branch: `ui-port/aro-patches` @ `81d86f11f4868511475bf74e8a1cf4552cf3452c`
- Common merge-base: `4508ce42559ddc77b07d671f6e32a0b60620b66e` (identical to `ui-port/2026-10-09` HEAD)
- Divergence: `ui-port/2026-10-09` has **0 commits** ahead of merge-base.
- `ui-port/aro-patches` has **8 commits** ahead of merge-base:
  1. `5e6a818240` composer: single glow definition, static focus, no pulsing box-shadow
  2. `49958d5c35` cn: teach tailwind-merge the role radius, Aro type and shadow keys
  3. `0c512c33c4` design: move every legacy and arbitrary radius onto rounded-control/panel/overlay (codemod)
  4. `ced827b108` design: collapse hand-picked text sizes onto text-aro-xs/sm/md/lg/xl (codemod + theme tokens)
  5. `525808acf6` design: per-file tight ratchet with broad patterns (px/rem/decimal, legacy radius, z, hex) and DESIGN.md sync
  6. `b2984e3f30` refactor: simplify composer glow and remove pulsing box-shadow animations in host theme
  7. `117a8b1685` design: apply codemod to layout.tsx
  8. `81d86f11f4` fix(desktop): stabilize theme switching and enhance desktop typography system

- Diff footprint: 326 files changed, 27,705 insertions, 1,332 deletions.
- Conflict analysis: 0 conflicts (clean fast-forward possible).

## 2. Integration Execution Steps (Scheduled for Step 2)
1. Switch to `ui-port/2026-10-09`.
2. Fast-forward merge `ui-port/aro-patches` into `ui-port/2026-10-09`.
3. Create canonical branch `aro/integration` at this commit.
4. Set `aro/integration` as the upstream reference branch for all subsequent phase branches (`aro/P<nn>-<slug>`).
5. Re-verify desktop checks (`typecheck`, `build`, etc.) on `aro/integration`.
