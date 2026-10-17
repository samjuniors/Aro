/**
 * ONBOARDING DOCTOR ADAPTER (local) — the prototype's readiness sweep.
 *
 * Contract refs:
 * - Feature id: `onboarding-doctor` (port/FEATURE_MAP.md — local).
 * - Glossary row: Onboarding doctor sweep — deliberately NOT merged with
 *   Hermes `/api/ops/doctor` (D-0017: medium-confidence pair; the Hermes
 *   doctor is the diagnostics surface, this is the onboarding readiness
 *   sweep — kept separate).
 * - Backend-todo shape: `ops.doctor` summary (port/FEATURE_MAP.md).
 *
 * The prototype's sweep was fake timers ("Fake doctor sweep: 3 checks,
 * 400ms apart"). This implementation is HONEST: each check reports a real
 * renderer-visible signal, and anything the renderer cannot verify without
 * the backend reports `unknown` — never guessed, never presented as passed.
 */

import { $currentCwd, $gatewayState } from '@/store/session'

export type DoctorCheckState = 'ok' | 'warn' | 'unknown'

export interface DoctorCheck {
  /** Stable check id (prototype order: runtime → providers → workspace). */
  id: 'runtime' | 'providers' | 'workspace'
  label: string
  state: DoctorCheckState
  detail: string
}

export interface DoctorAdapter {
  /** Run the readiness sweep. Renderer-side only; never throws. */
  sweep(): Promise<DoctorCheck[]>
}

/* ============================== adapter ============================== */

// BACKEND-TODO(onboarding-doctor): renderer-visible signals only — the
// future backend call is an `ops.doctor` summary (see port/FEATURE_MAP.md).
export const localDoctorAdapter: DoctorAdapter = {
  async sweep() {
    const gatewayState = $gatewayState.get()
    const cwd = $currentCwd.get()

    const runtime: DoctorCheck =
      gatewayState === 'open'
        ? { id: 'runtime', label: 'Runtime', state: 'ok', detail: 'Gateway connection is open.' }
        : gatewayState === 'connecting'
          ? { id: 'runtime', label: 'Runtime', state: 'warn', detail: 'Gateway is connecting…' }
          : { id: 'runtime', label: 'Runtime', state: 'warn', detail: `Gateway is ${gatewayState || 'idle'}.` }

    // Provider readiness is backend truth — the renderer cannot verify it
    // without a backend sweep, so it stays honestly unknown here.
    const providers: DoctorCheck = {
      id: 'providers',
      label: 'Model provider',
      state: 'unknown',
      detail: 'Provider readiness is verified by the backend doctor — not checkable from the UI.'
    }

    const workspace: DoctorCheck = cwd?.trim()
      ? { id: 'workspace', label: 'Workspace', state: 'ok', detail: `Folder attached: ${cwd}` }
      : { id: 'workspace', label: 'Workspace', state: 'warn', detail: 'No project folder attached yet.' }

    return [runtime, providers, workspace]
  }
}
