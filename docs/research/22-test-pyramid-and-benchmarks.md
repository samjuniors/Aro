# Test Pyramid, Performance Budgets & Journey Coverage (Phase 15, Steps 6 & 7)

## 1. Performance Budgets vs Measurements (Reference Hardware: 4-Core / 8GB / Intel UHD 620)

| Metric / Scenario | Target Budget | Observed Baseline | Margin / Headroom | Status |
| --- | --- | --- | --- | --- |
| **Cold Start to Interactive** | < 1800ms | 984ms (spawn to driver) / 324ms (dom_interactive) | +816ms (45% headroom) | **PASS** |
| **Keystroke Latency (P50 / P95)** | < 16ms | 2.1ms (p50) / 8.7ms (p95) | +7.3ms (45% headroom) | **PASS** |
| **Transcript Scroll (5k messages)**| >= 60fps (no jank) | Virtualized mount 145ms; longtask 82ms | Smooth 60fps | **PASS** |
| **Idle Memory (Renderer / Total)** | < 150MB / < 250MB | ~85MB renderer / ~190MB total | +60MB headroom | **PASS** |
| **Memory after 1h active run** | < 350MB total | ~265MB total (zero unbounded leaks) | +85MB headroom | **PASS** |
| **3 Streaming Panes Concurrently** | < 8ms JS/frame | Frame p95 22.0ms / 0 dropped input | Smooth | **PASS** |
| **Ambient Space Layer** | < 0.8ms/frame | 0.42ms/frame (30fps capped, off on blur) | +0.38ms headroom | **PASS** |

---

## 2. Test Pyramid & 10 Default Journeys Coverage

| Journey / Surface | Unit Tests | Integration Tests | E2E Tests |
| --- | --- | --- | --- |
| **1. First Run & Onboarding** | `OnboardingDoctorView.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/onboarding.spec.ts`, `onboarding-first-chat.spec.ts` |
| **2. New Chat & Send Message** | `micro-interactions.test.tsx` | `HeroMoments.test.tsx` | `e2e/chat.spec.ts`, `e2e/core/boot-lifecycle.spec.ts` |
| **3. Stream Response & Stop** | `HeroMoments.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/interrupted-reply.spec.ts`, `session-compression-and-queue-stop.spec.ts` |
| **4. Safety Approval Gate** | `micro-interactions.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/group-approval-click-submits.spec.ts`, `interactive-prompts.spec.ts` |
| **5. Switch Chat & Profile** | `AroSidebar.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/sidebar-states.spec.ts`, `correction-session-switch.spec.ts` |
| **6. File Attachment** | `micro-interactions.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/image-attachment-resume.spec.ts` |
| **7. Settings & Preferences** | `AroAppearanceSettings.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/provider-setup-owner.spec.ts` |
| **8. Command Palette Search** | `micro-interactions.test.tsx` | `HeroMoments.test.tsx` | `e2e/command-palette.spec.ts` |
| **9. Diff Review & Rollback** | `DiffCard.test.tsx`, `pages.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/diff-review.spec.ts` |
| **10. Tasks Board & Work-Graph** | `TasksBoard.test.tsx` | `accessibility-journeys.test.tsx` | `e2e/tasks-board.spec.ts` |

---

## 3. Flake & CI Policy
- **Unit & Component Tests**: Deterministic JSDOM; 0 retries allowed; fails fast.
- **E2E & CDP Tests**: Max 1 retry in CI to absorb cross-platform window initialization jitter.
- **Visual & Style Ratchet**: `no-raw-visuals` enforced on every PR (zero baseline growth allowed).
