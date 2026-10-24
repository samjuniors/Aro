/**
 * ARO ONBOARDING & DOCTOR VIEW — Readiness sweep and system diagnostics (Phase 4 / A10).
 *
 * Contract refs:
 * - Feature id: `onboarding-doctor` (port/FEATURE_MAP.md — local, Origin: Prototype-only).
 * - Glossary row: Onboarding doctor sweep — deliberately NOT merged with
 *   Hermes `/api/ops/doctor` (D-0017: medium-confidence pair; Hermes doctor
 *   is diagnostics, this is the onboarding readiness sweep).
 * - Persistence: `conductor.onboarding.done` (onboarding completion state).
 * - Backend-todo shape: `ops.doctor` summary (port/FEATURE_MAP.md).
 *
 * Both the reusable OnboardingStrip and the full AroDoctorPage are exported here.
 */

import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'

import { adapters } from '@/adapters'
import type { DoctorCheck } from '@/adapters/doctor'
import { getActionStatus, runDoctor } from '@/api/system'
import { PageHeader } from '@/components/ui/layout'
import { readKey, writeKey } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { $currentCwd, $gatewayState } from '@/store/session'
import type { ActionResponse } from '@/types/hermes'

import {
  IconCheck,
  IconRefresh,
  IconTerminal,
  IconWarning,
  IconX,
  IconZap,
  LogoMark
} from './Icons'
import { ToastHost, useToasts } from './toasts'
import { Badge, Button, IconButton, Stat } from './ui'

export const ONBOARDING_DONE_STORAGE_KEY = 'conductor.onboarding.done'

/* ====================================================================
   ONBOARDING STRIP — First-run checklist with honest signals
   ==================================================================== */

type StepState = 'done' | 'todo' | 'optional' | 'checking'

function StepMark({ state }: { state: StepState }) {
  return (
    <span className="flex size-[18px] shrink-0 items-center justify-center">
      {state === 'done' && <IconCheck className="text-aro-mint" size={13} />}
      {state === 'todo' && <i className="size-[10px] rounded-full border-[1.5px] border-aro-amber" />}
      {state === 'optional' && <i className="size-[10px] rounded-full border-[1.5px] border-aro-line-strong" />}
      {state === 'checking' && <i className="size-[8px] animate-pulse rounded-full bg-aro-iris" />}
    </span>
  )
}

function Step({
  state,
  label,
  sub,
  action
}: {
  state: StepState
  label: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <StepMark state={state} />
      <div className="min-w-0">
        <p
          className={cn(
            'text-xs leading-[1.35] font-medium',
            state === 'checking' ? 'text-aro-ink-2' : 'text-aro-ink'
          )}
        >
          {label}
        </p>
        {sub && <p className="mt-0.5 font-aro-mono text-[var(--aro-text-2xs,10px)] leading-[1.35] text-aro-ink-4">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function OnboardingStrip({ onDismiss }: { onDismiss?: () => void }) {
  const gatewayState = useStore($gatewayState)
  const cwd = useStore($currentCwd)
  const { toast } = useToasts()

  const [checking, setChecking] = useState(false)

  const [dismissed, setDismissed] = useState<boolean>(() => {
    return readKey(ONBOARDING_DONE_STORAGE_KEY) === 'true'
  })

  const runtimeState: StepState =
    gatewayState === 'open'
      ? 'done'
      : gatewayState === 'connecting'
        ? 'checking'
        : 'todo'

  const workspaceState: StepState = cwd?.trim() ? 'done' : 'todo'

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    writeKey(ONBOARDING_DONE_STORAGE_KEY, 'true')
    onDismiss?.()
    toast('Onboarding banner dismissed', 'neutral')
  }, [onDismiss, toast])

  const handleRunDoctorSweep = useCallback(async () => {
    setChecking(true)

    try {
      const results = await adapters.doctor.sweep()
      const allOk = results.every(r => r.state === 'ok')
      const anyWarn = results.some(r => r.state === 'warn')

      if (allOk) {
        toast('Readiness sweep: all checks passed', 'mint')
      } else if (anyWarn) {
        toast('Readiness sweep: warnings found in workspace or runtime', 'amber')
      } else {
        toast('Readiness sweep complete (provider verification requires backend doctor)', 'iris')
      }
    } catch {
      toast('Readiness sweep encountered an error', 'rose')
    } finally {
      setChecking(false)
    }
  }, [toast])

  if (dismissed) {return null}

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-panel border border-aro-iris/25 bg-aro-iris-tint/40 px-4 py-3 shadow-aro-e1"
      data-testid="onboarding-strip"
    >
      {/* Brand & Title */}
      <div className="flex min-w-[200px] items-center gap-2.5">
        <span className="shrink-0">
          <LogoMark size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-xs leading-[1.3] font-semibold text-aro-ink">Get Aro Running</p>
          <p className="text-xs leading-[1.4] text-aro-ink-3">
            {workspaceState === 'done' && runtimeState === 'done'
              ? 'Workspace attached and runtime ready.'
              : 'Complete runtime and workspace setup to start prompting.'}
          </p>
        </div>
      </div>

      <span className="hidden h-5 w-px bg-aro-iris/20 sm:block" />

      {/* ① Runtime */}
      <Step
        label="Runtime"
        state={runtimeState}
        sub={
          runtimeState === 'done'
            ? 'Gateway connected'
            : runtimeState === 'checking'
              ? 'Connecting…'
              : `Gateway is ${gatewayState || 'idle'}`
        }
      />

      {/* ② Model Provider */}
      <Step
        label="Model"
        state="optional"
        sub="Backend-verified"
      />

      {/* ③ Workspace */}
      <Step
        action={
          workspaceState !== 'done' ? (
            <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-amber">
              Open a folder
            </span>
          ) : undefined
        }
        label="Workspace"
        state={workspaceState}
        sub={cwd?.trim() ? cwd : 'No folder attached'}
      />

      {/* ④ Channels (optional) */}
      <Step
        label="Channels"
        state="optional"
        sub="Optional"
      />

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          disabled={checking}
          icon={IconZap}
          onClick={handleRunDoctorSweep}
          size="xs"
          variant="ghost"
        >
          {checking ? 'Checking…' : 'Run Doctor'}
        </Button>
        <IconButton
          icon={IconX}
          label="Dismiss onboarding"
          onClick={handleDismiss}
          size={24}
        />
      </div>
    </div>
  )
}

/* ====================================================================
   ARO DOCTOR PAGE — Readiness Sweep & Deep Diagnostics Dashboard
   ==================================================================== */

// BACKEND-TODO(onboarding-doctor): [D-10, research/10 §2] renderer-visible signals only — the
// future backend call is an `ops.doctor` summary (see port/FEATURE_MAP.md).
export function AroDoctorPage() {
  const gatewayState = useStore($gatewayState)
  const cwd = useStore($currentCwd)
  const { items: toastItems, toast } = useToasts()

  // Local readiness sweep results
  const [checks, setChecks] = useState<DoctorCheck[]>([])
  const [isSweeping, setIsSweeping] = useState(false)
  const [lastSweepTime, setLastSweepTime] = useState<Date | null>(null)

  // Onboarding completion status
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    return readKey(ONBOARDING_DONE_STORAGE_KEY) === 'true'
  })

  // Deep backend doctor execution (/api/ops/doctor)
  const [isRunningBackendDoctor, setIsRunningBackendDoctor] = useState(false)
  const [backendDoctorResult, setBackendDoctorResult] = useState<ActionResponse | null>(null)
  const [backendDoctorLogs, setBackendDoctorLogs] = useState<string[]>([])
  const [backendDoctorError, setBackendDoctorError] = useState<string | null>(null)

  // Run local readiness sweep
  const runSweep = useCallback(async () => {
    setIsSweeping(true)

    try {
      const results = await adapters.doctor.sweep()
      setChecks(results)
      setLastSweepTime(new Date())
      toast('Readiness sweep updated', 'mint')
    } catch {
      toast('Readiness sweep failed', 'rose')
    } finally {
      setIsSweeping(false)
    }
  }, [toast])

  // Initial sweep on mount
  useEffect(() => {
    void runSweep()
  }, [runSweep])

  // Run real Hermes backend doctor
  const handleRunBackendDoctor = useCallback(async () => {
    if (gatewayState !== 'open') {
      setBackendDoctorError(
        `Gateway is currently "${gatewayState || 'offline'}". Start the Aro backend gateway to run deep diagnostics.`
      )

      return
    }

    setIsRunningBackendDoctor(true)
    setBackendDoctorError(null)
    setBackendDoctorLogs([])
    setBackendDoctorResult(null)

    try {
      const response = await runDoctor()
      setBackendDoctorResult(response)

      // Tail action logs if command was spawned
      if (response?.name || response?.pid) {
        try {
          const status = await getActionStatus(response.name || 'doctor', 50)

          if (status?.lines) {
            setBackendDoctorLogs(status.lines)
          }
        } catch {
          // Status polling is best-effort
        }
      }

      toast('Backend doctor diagnostics started', 'mint')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBackendDoctorError(`Backend doctor invocation failed: ${msg}`)
      toast('Backend doctor failed to execute', 'rose')
    } finally {
      setIsRunningBackendDoctor(false)
    }
  }, [gatewayState, toast])

  const toggleOnboardingDone = useCallback(() => {
    const next = !onboardingDone
    setOnboardingDone(next)
    writeKey(ONBOARDING_DONE_STORAGE_KEY, String(next))
    toast(
      next ? 'Onboarding marked as completed' : 'Onboarding reset to active',
      'iris'
    )
  }, [onboardingDone, toast])

  const okCount = checks.filter(c => c.state === 'ok').length
  const warnCount = checks.filter(c => c.state === 'warn').length
  const unknownCount = checks.filter(c => c.state === 'unknown').length

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-aro-bg text-aro-ink select-text">
      {/* Header */}
      <div className="mx-auto w-full max-w-5xl px-6 pt-6">
        <PageHeader
          actions={<>
            <Button
              disabled={isSweeping}
              icon={IconRefresh}
              onClick={runSweep}
              size="sm"
              variant="secondary"
            >
              {isSweeping ? 'Sweeping…' : 'Refresh Sweep'}
            </Button>
          </>}
          description="Audits local application readiness, workspace attachment, and triggers backend diagnostics without simulated success."
          title="System Readiness Doctor"
        />
      </div>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        {/* Onboarding Strip Preview */}
        {!onboardingDone && (
          <section aria-label="Active Onboarding Checklist">
            <OnboardingStrip onDismiss={() => setOnboardingDone(true)} />
          </section>
        )}

        {/* Statistics Row */}
        <section aria-label="Doctor Statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Stat
            label="Verified Checks"
            sub="Ready for use"
            tone="mint"
            value={okCount}
          />
          <Stat
            label="Warnings"
            sub="Action recommended"
            tone={warnCount > 0 ? 'amber' : 'neutral'}
            value={warnCount}
          />
          <Stat
            label="Backend Dependent"
            sub="Needs backend doctor"
            tone="neutral"
            value={unknownCount}
          />
          <Stat
            label="Gateway State"
            sub={gatewayState === 'open' ? 'RPC connected' : 'Not connected'}
            tone={gatewayState === 'open' ? 'cyan' : 'rose'}
            value={gatewayState.toUpperCase() || 'IDLE'}
          />
        </section>

        {/* Readiness Sweep Results */}
        <section
          aria-label="Readiness Checks"
          className="rounded-panel border border-aro-line-soft bg-aro-raise p-4 shadow-aro-e1 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-aro-ink">
                Renderer Readiness Sweep
              </h2>
              <p className="text-xs text-aro-ink-3">
                Evaluates signals visible to the desktop UI. Provider status remains honestly unknown until tested by backend.
              </p>
            </div>
            {lastSweepTime && (
              <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">
                Swept at {lastSweepTime.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="divide-y divide-aro-line-soft/60">
            {checks.map(check => {
              const stateTone =
                check.state === 'ok'
                  ? 'mint'
                  : check.state === 'warn'
                    ? 'amber'
                    : 'neutral'

              return (
                <div
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`doctor-check-${check.id}`}
                  key={check.id}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-aro-ink">
                        {check.label}
                      </span>
                      <Badge dot={check.state !== 'unknown'} mono tone={stateTone}>
                        {check.state === 'ok'
                          ? 'Pass'
                          : check.state === 'warn'
                            ? 'Warning'
                            : 'Unknown (backend truth)'}
                      </Badge>
                    </div>
                    <p className="text-xs text-aro-ink-3">{check.detail}</p>
                  </div>

                  {/* Remediation / info hint */}
                  <div className="text-right sm:max-w-xs">
                    {check.id === 'runtime' && check.state !== 'ok' && (
                      <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-amber">
                        Launch gateway (`hermes serve`)
                      </span>
                    )}
                    {check.id === 'workspace' && check.state !== 'ok' && (
                      <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-amber">
                        Attach project folder
                      </span>
                    )}
                    {check.id === 'providers' && (
                      <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">
                        Requires backend probe below
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Deep Backend Doctor Diagnostics Section */}
        <section
          aria-label="Deep Backend Diagnostics"
          className="rounded-panel border border-aro-line-soft bg-aro-raise p-4 shadow-aro-e1 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <IconTerminal className="text-aro-iris" size={15} />
                <h2 className="text-sm font-semibold text-aro-ink">
                  Aro Deep Doctor Diagnostics
                </h2>
              </div>
              <p className="text-xs text-aro-ink-3">
                Executes the authentic `/api/ops/doctor` backend command to audit Python environment, models, and tools.
              </p>
            </div>

            <Button
              disabled={isRunningBackendDoctor || gatewayState !== 'open'}
              icon={IconZap}
              onClick={handleRunBackendDoctor}
              size="sm"
              variant="primary"
            >
              {isRunningBackendDoctor ? 'Running Doctor…' : 'Run Backend Doctor'}
            </Button>
          </div>

          {gatewayState !== 'open' && (
            <div
              className="flex items-center gap-2 rounded-control border border-aro-amber/30 bg-aro-amber-tint/30 p-3 text-xs text-aro-amber"
              role="status"
            >
              <IconWarning className="shrink-0" size={14} />
              <span>
                Gateway connection is currently &ldquo;{gatewayState || 'idle'}&rdquo;. Deep diagnostics require an active connection to Aro core.
              </span>
            </div>
          )}

          {backendDoctorError && (
            <div
              className="flex items-center gap-2 rounded-control border border-aro-rose/30 bg-aro-rose-tint/30 p-3 text-xs text-aro-rose"
              role="alert"
            >
              <IconWarning className="shrink-0" size={14} />
              <span>{backendDoctorError}</span>
            </div>
          )}

          {backendDoctorResult && (
            <div className="rounded-control border border-aro-line-soft bg-aro-sunken/60 p-3 space-y-2">
              <div className="flex items-center justify-between font-aro-mono text-xs">
                <span className="text-aro-ink-3">
                  Action: {backendDoctorResult.name || 'doctor'} (PID: {backendDoctorResult.pid})
                </span>
                <Badge mono tone={backendDoctorResult.ok ? 'mint' : 'amber'}>
                  {backendDoctorResult.ok ? 'Running' : 'Failed'}
                </Badge>
              </div>

              {backendDoctorLogs.length > 0 && (
                <pre className="max-h-48 overflow-y-auto rounded-control bg-aro-bg p-2 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-2 leading-relaxed">
                  {backendDoctorLogs.join('\n')}
                </pre>
              )}
            </div>
          )}
        </section>

        {/* Onboarding State Management */}
        <section
          aria-label="Onboarding Persistence Settings"
          className="flex items-center justify-between rounded-panel border border-aro-line-soft bg-aro-raise p-4 shadow-aro-e1"
        >
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-aro-ink">
              Onboarding Checklist State
            </h3>
            <p className="text-xs text-aro-ink-3">
              Persisted under <code className="font-aro-mono text-aro-iris">{ONBOARDING_DONE_STORAGE_KEY}</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge dot mono tone={onboardingDone ? 'mint' : 'amber'}>
              {onboardingDone ? 'Completed' : 'Active'}
            </Badge>
            <Button
              onClick={toggleOnboardingDone}
              size="xs"
              variant="secondary"
            >
              {onboardingDone ? 'Reset to Active' : 'Mark Completed'}
            </Button>
          </div>
        </section>
      </main>

      <ToastHost items={toastItems} />
    </div>
  )
}
