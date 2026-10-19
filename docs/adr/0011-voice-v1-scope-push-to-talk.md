# ADR 0011: Voice Assistant Scope for v1 (Push-To-Talk Only)
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Step P12.2, Founder Decision D-11)

## Context
Aro prototype included audio streaming and wake word detection concepts. The Phase 0–7 release audit (`port/RELEASE_AUDIT_REPORT.md` §6 & Finding 2) noted that physical audio hardware is blocked/absent in automated headless environments, and `apps/desktop/src/lib/wake-client-capture.ts:148-150` relied on the deprecated Web Audio `ScriptProcessorNode`.

## Decision
1. **v1 Scope (Option B):** Support **Push-To-Talk (PTT)** voice input only for public v1. Always-on wake word detection is deferred to post-v1.
2. **Audio Modernization:** Replace deprecated `ScriptProcessorNode` with standard Web Audio API / `AudioWorkletNode` in `apps/desktop/src/lib/wake-client-capture.ts`.
3. **Graceful Hardware Fallback:** If no microphone or audio input hardware is detected, the UI gracefully disables the voice orb/mic button with an honest tooltip rather than failing silently or crashing.

## Alternatives Considered
- **Full Wake Word in v1:** Rejected due to high background battery/CPU overhead, false triggers, and cross-platform audio device fragmentation prior to stabilization.
- **No Voice in v1:** Rejected because quick voice prompting via push-to-talk provides significant user value for hands-free queries.

## Impact & Acceptance
- Eliminates browser console deprecation warnings.
- PTT flow tested with mock and live audio streams.
- Zero battery drain when voice interaction is idle.
