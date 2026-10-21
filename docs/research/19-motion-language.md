# Aro Motion Language & Animation Budget (Phase 14, Step 1 & 2)

**Status**: Approved & Integrated (Phase 14, Gate 14.1)  
**Authority**: `apps/desktop/src/aro/tokens.css`, `apps/desktop/DESIGN.md` §14  
**Benchmark References**: Linear (crisp instant response), Raycast (focused list transitions), Zed (flat, low-latency dev-tool panes)

---

## 1. Interview Batch 1 Decisions

1. **Intensity**: **B. Expressive but fast**.
   - Standard UI micro-interactions: 100ms – 200ms.
   - Complex panels and dialog transitions: 220ms – 260ms.
   - Hero moments (boot sequence, mode switches): 400ms – 600ms.
   - Zero animations that feel sluggish or delay user intent.
2. **Ambient "Space" Layer**: **B. Optional**.
   - Disabled by default on battery power, low-power GPU mode, or when reduced motion is preferred.
   - Gated behind appearance setting (`conductor.ambient.stars`).
3. **Sound**: **A. None**.
   - Complete silence. Feedback is strictly visual and haptic where supported.
4. **Reference Products**:
   - **Linear**: High-density rhythm, 0ms hover feedback, crisp hairlines.
   - **Raycast**: Predictable list navigations, quick upward clearances.
   - **Zed**: Zero-latency editor feel, distraction-free surfaces.

---

## 2. Animation Inventory & Classification

A complete audit of every animation across `tokens.css`, `host-theme.css`, and `styles.css`.

| Animation / Keyframe | File | Properties Animated | Status | Classification & Rationale |
|---|---|---|---|---|
| `aro-rise` | `tokens.css` | `opacity`, `transform: translateY(6px)` | Keep | GPU-composited row & card entrance (320ms out-quint). |
| `aro-fade` | `tokens.css` | `opacity` | Keep | Standard zero-layout cross-fade (220ms). |
| `aro-pop` | `tokens.css` | `opacity`, `transform: scale(0.96)` | Keep | Modal & popover entry with slight spring (220ms). |
| `aro-slide-down` | `tokens.css` | `opacity`, `transform: translateY(-4px)` | Keep | Menu, dropdown, and disclosure reveal (200ms). |
| `aro-slide-up` | `tokens.css` | `opacity`, `transform: translateY(8px)` | Keep | Toast and status banner arrival (240ms). |
| `aro-sheet-in` | `tokens.css` | `opacity`, `transform: translateX(28px)` | Keep | Right-hand side pane & task drawer entry (280ms). |
| `aro-drawer-in` | `tokens.css` | `opacity`, `transform: translateX(-28px)` | Keep | Left-hand navigation drawer entry (240ms). |
| `aro-shimmer` | `tokens.css` | `background-position` | Keep | Loading skeleton shimmer (linear 2.2s). |
| `aro-breathe` | `tokens.css` | `opacity`, `transform: scale()` | Keep | Live agent working pulse indicator (2.6s). |
| `aro-caret` | `tokens.css` | `opacity` | Keep | Stepped typewriter terminal/editor caret (1.1s). |
| `aro-sweep` | `tokens.css` | `transform: translateX()` | Keep | Indeterminate progress sweep (1.6s). |
| `shimmerSpin` | `host-theme.css` | `--shimmer-angle` (CSS property) | Replace | Replaced with CSS conic gradient transform to save repaint cycles. |
| `aroModelListIn` | `host-theme.css` | `opacity`, `transform` | Keep | Fast model selector menu pop-in (240ms expo). |
| `decode-cursor` | `styles.css` | `opacity` (step-end) | Keep | Terminal decoder cursor blink. |
| `pet-egg-*` | `styles.css` | `transform`, `filter: drop-shadow` | Keep | Isolated pet canvas animation; disabled under reduced-motion. |
| `setting-field-flash` | `styles.css` | `background-color` | Keep | Target highlight pulse when deep-linking settings. |

### Paint & Layout Property Audit:
- **Zero layout properties animated**: No animations target `height`, `width`, `top`, `left`, `margin`, or `padding`.
- **Zero heavy blur filters animated**: No animated `filter: blur()` on large panel backdrops.
- **Hardware compositing**: 100% of spatial movement is constrained to `transform` (translates, scales) and `opacity`.

---

## 3. Motion Token Contract

### 3.1 Duration Tokens (`--aro-dur-*`)
- `--aro-dur-instant`: `0ms` (instantaneous state, pressed button step)
- `--aro-dur-fast`: `100ms` (hover state, micro-tooltips, icon flips)
- `--aro-dur-mid`: `150ms` (dropdowns, popover exit, disclosure toggles)
- `--aro-dur-base`: `160ms` (default UI transition, list row reorder)
- `--aro-dur-slow`: `220ms` (modals, dialog overlays, card entrance)
- `--aro-dur-panel`: `260ms` (workspace drawers, sidebar collapse/expand)
- `--aro-dur-hero`: `450ms` (mode switch Code<->Bots, boot sequence, theme shift)
- `--aro-dur-ambient`: `2200ms` (subtle idle pulse loops)

### 3.2 Easing Tokens (`--aro-ease-*`)
- `--aro-ease-standard`: `cubic-bezier(0.2, 0, 0, 1)` (smooth deceleration for UI moves)
- `--aro-ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` (crisp exit from motion)
- `--aro-ease-in`: `cubic-bezier(0.4, 0, 1, 1)` (snappy exit from screen)
- `--aro-ease-out-quint`: `cubic-bezier(0.22, 1, 0.36, 1)` (signature Aro curve: gentle landing)
- `--aro-ease-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight organic overshoot for dialogs/popovers)

### 3.3 Distance Tokens (`--aro-dist-*`)
- `--aro-dist-xs`: `2px` (micro-press, subtle active button depression)
- `--aro-dist-sm`: `4px` (tooltips, small menu drops, inline disclosures)
- `--aro-dist-md`: `8px` (cards, hunk review banners, notifications)
- `--aro-dist-lg`: `16px` (modal popover entry, hero alerts)
- `--aro-dist-xl`: `28px` (side panel sheets, task drawer slide-ins)

---

## 4. Motion Rules by Interaction Type

1. **Enter Transitions**:
   - `opacity: 0 -> 1` paired with a small directional translation (`--aro-dist-sm` to `--aro-dist-md`).
   - Timing: `--aro-dur-base` (160ms) to `--aro-dur-slow` (220ms).
   - Easing: `--aro-ease-out-quint` or `--aro-ease-out`.
2. **Exit Transitions**:
   - Pure `opacity: 1 -> 0` or tiny reverse translation (`--aro-dist-xs`).
   - Timing: Must be 30% faster than entrance (`--aro-dur-fast` to `--aro-dur-mid`, 100–140ms).
   - Easing: `--aro-ease-in`.
3. **Micro-Interactions (Hover & Active)**:
   - Hover tint: `--aro-dur-fast` (100ms).
   - Pressed: `0ms` (instant response on pointerdown; feels hardware-fast).
4. **List & Item Changes**:
   - Items entering existing lists use staggered delays (`i * 25ms`, capped at 150ms).
   - Reordering uses CSS FLIP transitions strictly on `transform`.
5. **Reduced-Motion Contract**:
   - When either `html[data-motion='reduced']` or `@media (prefers-reduced-motion: reduce)` is true:
     - All duration tokens clamp to `.001ms !important`.
     - `animation-iteration-count: 1 !important`.
     - `scroll-behavior: auto !important`.
     - Information hierarchy remains completely intact without spatial translation.

---

## 5. When NOT to Animate (Hard Invariants)

1. **During Rapid Typing**: No animation on composer typing, caret repositioning, or text stream reflow.
2. **During Critical Approvals**: Safety approval gates (YOLO confirmations, destructive bash executions) render instantaneously (0ms) so users are never waiting on decorative motion to make a security decision.
3. **Layout Properties**: Never animate `width`, `height`, `margin`, `padding`, or `border-width`.
4. **Infinite Heavy Shaders**: No continuous canvas background animations on battery power.
5. **Input Blocking**: No animation may block focus, click, or keyboard navigation.
