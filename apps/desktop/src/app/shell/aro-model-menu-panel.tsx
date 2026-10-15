import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SETTINGS_ROUTE } from '@/app/routes'
import { IconBrain, IconChevronDown, IconPlus } from '@/aro/Icons'
import { Toggle } from '@/aro/ui'
import { useI18n } from '@/i18n'
import type { ModelCapabilities } from '@hermes/shared'
import { catalogProviderMatches, currentModelCapabilities } from '@/lib/model-options'
import { providerDisplayName } from '@/lib/model-status-label'
import { isThinkingEnabled, reasoningEffortClamp, resolveReasoningEffort } from '@/lib/reasoning-effort'
import { cn } from '@/lib/utils'

import { ModelOptionsContent, resolveFastControl } from './model-edit-submenu'
import { ModelMenuCloseContext } from './model-menu-panel'
import { type ModelMenuHostProps, useModelMenuController } from './use-model-menu-controller'

/**
 * The Aro model menu — the prototype's `.model-control` dropdown, wired to the
 * REAL Hermes model state. Collapsed it shows the effort slider (a UI over
 * the live reasoning effort + `config.set reasoning` path), the Thinking
 * toggle (effort ≠ none — the same action the reasoning menu's toggle
 * performs), the Fast control when the model has one, and a Configure
 * providers link. Expanded it renders the SAME live catalog the model pill
 * uses (search, provider groups, refresh) — passed in as `children` from the
 * surface that owns the gateway, exactly like `ModelMenuPanel` /
 * `ReasoningMenuPanel`.
 *
 * Every action goes through `useModelMenuController` — one code path shared
 * with the catalog submenus and the reasoning pill: session write, preset,
 * optimistic store, rollback.
 */
export function AroModelMenuPanel({ children, ...props }: ModelMenuHostProps & { children?: ReactNode }) {
  const { t } = useI18n()
  const copy = t.shell.modelOptions
  const navigate = useNavigate()
  const { controller, defaultEffort, modelOptions } = useModelMenuController(props)
  const { effort, effortPending, effortWire, fast, model, provider } = controller.current
  const [expanded, setExpanded] = useState(false)

  const caps = currentModelCapabilities(modelOptions.data, provider, model)
  const supportsReasoning = caps?.reasoning ?? true
  const canDisableReasoning = caps?.can_disable_reasoning ?? undefined

  const effortValue = resolveReasoningEffort(effort, defaultEffort)
  const thinkingOn = isThinkingEnabled(effort, defaultEffort)
  const showThinkingToggle = supportsReasoning && canDisableReasoning !== false
  const maxEffortIdx = resolveMaxReasoningEffortIndex(provider, model, supportsReasoning, effortWire, caps)

  const fastControl = useMemo(
    () =>
      model
        ? resolveFastControl(
            model,
            modelOptions.data?.providers?.find(p => catalogProviderMatches(p, provider))?.models ?? [],
            caps?.fast ?? false,
            fast
          )
        : null,
    [model, modelOptions.data, provider, caps?.fast, fast]
  )

  const row = { isActive: true, model, provider }

  if (!model) {
    return <div className="px-3 py-3 text-xs text-aro-ink-3">{copy.noOptions}</div>
  }

  const monogram = providerDisplayName(provider || '').trim().charAt(0).toUpperCase() || 'A'

  return (
    <div data-aro-model-menu="" data-expanded={expanded ? '' : undefined}>
      {/* Head: monogram + live model + provider line; clicking expands the catalog. */}
      <button
        className="model-menu-head"
        onClick={() => setExpanded(value => !value)}
        type="button"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-aro-line-soft bg-aro-raise font-aro-mono text-[10px] font-semibold text-aro-ink-3">
          {monogram}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[12.5px] font-medium text-aro-ink">{model}</span>
          <span className="block truncate font-aro-mono text-[9.5px] text-aro-ink-4">
            {providerDisplayName(provider || '')} · {provider?.toLowerCase().includes('local') || provider?.toLowerCase().includes('ollama') ? 'on-device' : 'cloud'}
          </span>
        </span>
        <IconChevronDown
          className={cn('size-3 shrink-0 text-aro-ink-4 transition-transform duration-200', expanded && 'rotate-180')}
          size={12}
        />
      </button>

      {expanded ? (
        <div className="model-menu-list max-h-[340px] overflow-y-auto overflow-x-visible px-0.5 pb-1 pt-0.5">
          <ModelMenuCloseContext.Provider value={() => setExpanded(false)}>
            {children}
          </ModelMenuCloseContext.Provider>
        </div>
      ) : (
        <div className="model-menu-compact px-0.5 pb-1 pt-0.5">
          <EffortSliderRow
            disabled={Boolean(effortPending) || !supportsReasoning}
            effort={effortValue}
            effortWire={effortWire}
            maxEffortIdx={maxEffortIdx}
            model={model}
            onSetEffort={value => controller.setOptions({ effort: value }, row)}
            supportsReasoning={supportsReasoning}
          />

          {showThinkingToggle ? (
            <div className="model-thinking-row">
              <IconBrain className="size-[13px] shrink-0 text-aro-plum" size={13} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-aro-ink-2">Thinking</span>
                <span className="block text-[10px] leading-tight text-aro-ink-4">
                  Show the model's reasoning before it replies
                </span>
              </span>
              <Toggle
                aria-label="Toggle thinking"
                checked={thinkingOn}
                disabled={Boolean(effortPending) || !supportsReasoning}
                onChange={() =>
                  controller.setOptions({ effort: thinkingOn ? 'none' : effortValue || defaultEffort }, row)
                }
                size="sm"
              />
            </div>
          ) : null}

          {fastControl && fastControl.kind !== 'none' ? (
            <ModelOptionsContent
              canDisableReasoning={canDisableReasoning}
              defaultEffort={defaultEffort}
              effort={effort}
              effortWire={effortWire}
              fastControl={fastControl}
              isActive
              model={model}
              onSelectModel={nextModel => controller.select(nextModel, provider)}
              onSetOptions={patch => controller.setOptions(patch, row)}
              provider={provider}
              reasoning={supportsReasoning}
            />
          ) : null}

          <ModelMenuCloseContext.Consumer>
            {close => (
              <button
                className="mt-0.5 flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-[11.5px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink-2"
                onClick={() => {
                  close?.()
                  void navigate(`${SETTINGS_ROUTE}?tab=providers`)
                }}
                type="button"
              >
                <IconPlus size={12} />
                Configure providers
              </button>
            )}
          </ModelMenuCloseContext.Consumer>
        </div>
      )}
    </div>
  )
}

/* Reasoning-effort levels — Codex-style strength ramp: the further right,
   the hotter the accent color (neutral → cyan → iris → amber → rose). */
export const EFFORTS = [
  { id: 'minimal', label: 'Minimal', color: 'var(--aro-ink-3)', desc: 'Straight to the point — no visible reasoning. Fastest and cheapest for lookups.' },
  { id: 'low', label: 'Low', color: 'var(--aro-cyan)', desc: 'Light reasoning for small edits, renames and quick fixes.' },
  { id: 'medium', label: 'Medium', color: 'var(--aro-iris-soft)', desc: 'Balanced thinking for everyday coding — the sensible default.' },
  { id: 'high', label: 'High', color: 'var(--aro-amber)', desc: 'Deep multi-step reasoning for tricky bugs and cross-file refactors.' },
  { id: 'ultra', label: 'Ultra', color: 'var(--aro-rose)', desc: 'Maximum reasoning power — architecture, migrations, hard proofs.' },
] as const

/**
 * Resolves the maximum reasoning-effort index (0..4) supported by a given model.
 * Clamps to 0 if the model does not support reasoning.
 * Models with bounded thinking (e.g. Claude 3.7 Sonnet, legacy Grok, Solar, Kimi K2)
 * top out at High (index 3). Models with unrestricted reasoning reach Ultra (index 4).
 */
export function resolveMaxReasoningEffortIndex(
  provider: string,
  model: string,
  supportsReasoning: boolean,
  effortWire?: string,
  caps?: ModelCapabilities
): number {
  if (!supportsReasoning) {
    return 0
  }

  // Explicit supported max from caps if provided
  const explicitMax = (caps as { max_effort?: string } | undefined)?.max_effort
  if (typeof explicitMax === 'string') {
    const idx = EFFORTS.findIndex(e => e.id === explicitMax.toLowerCase())
    if (idx !== -1) return idx
  }

  const normModel = (model || '').toLowerCase()
  const normProv = (provider || '').toLowerCase()

  // Wire clamping returned by the gateway
  if (effortWire) {
    const normWire = effortWire.toLowerCase()
    if (normWire === 'minimal') return 0
    if (normWire === 'low') return 1
    if (normWire === 'medium') return 2
    if (normWire === 'high' || normWire === 'xhigh') return 3
    if (normWire === 'max' || normWire === 'ultra') return 4
  }

  // Known bounded-ladder models that top out at High (index 3)
  if (
    normModel.includes('claude') ||
    normModel.includes('grok') ||
    normModel.includes('kimi-k2') ||
    normModel.includes('solar') ||
    normModel.includes('nebius') ||
    normModel.includes('tokenhub') ||
    normProv.includes('xai') ||
    normProv.includes('anthropic')
  ) {
    return 3
  }

  return 4
}

/**
 * The effort slider: a compact UI over Hermes' REAL reasoning levels
 * (`REASONING_EFFORTS` — minimal…ultra). Moving it calls the same controller
 * action the reasoning menu's radio rows perform; nothing is faked.
 * Respects max reasoning supported by the model: tracks beyond max are grayed out
 * and dragging is capped so reasoning cannot be increased beyond what is supported.
 */
function EffortSliderRow({
  disabled,
  effort,
  effortWire,
  maxEffortIdx,
  model,
  onSetEffort,
  supportsReasoning
}: {
  disabled: boolean
  effort: string
  effortWire?: string
  maxEffortIdx: number
  model: string
  onSetEffort: (value: string) => void
  supportsReasoning: boolean
}) {
  const { t } = useI18n()
  const copy = t.shell.modelOptions

  const activeIdx = useMemo(() => {
    switch (effort) {
      case 'minimal':
        return 0

      case 'low':
        return 1

      case 'medium':
        return 2

      case 'high':
      case 'xhigh':
        return 3

      case 'max':
      case 'ultra':
        return 4

      default:
        return 2
    }
  }, [effort])

  const effectiveMaxIdx = supportsReasoning ? maxEffortIdx : 0
  const clampedActiveIdx = supportsReasoning ? Math.min(activeIdx, effectiveMaxIdx) : 0
  const effortLevel = supportsReasoning
    ? (EFFORTS[clampedActiveIdx] ?? EFFORTS[2])
    : { id: 'none', label: 'Disabled', color: 'var(--aro-ink-4)', desc: 'Reasoning is not supported by this model.' }

  const levelLabel = (value: string) => {
    const entry = copy[value as keyof typeof copy]

    return typeof entry === 'string' ? entry : value
  }

  const clamp = reasoningEffortClamp(effort, effortWire)
  const fillPct = supportsReasoning ? (clampedActiveIdx / (EFFORTS.length - 1)) * 100 : 0
  const maxPct = supportsReasoning ? (effectiveMaxIdx / (EFFORTS.length - 1)) * 100 : 0

  return (
    <div
      className="effort-slider"
      style={{
        ['--effort-color' as string]: effortLevel.color,
        ['--effort-fill' as string]: `${fillPct}%`,
        ['--effort-max-pct' as string]: `${maxPct}%`
      }}
    >
      <div className="effort-slider-head">
        <span className="effort-level-name">
          <i aria-hidden className="effort-level-dot" />
          {effortLevel.label}
        </span>
        <span aria-hidden className="effort-bars">
          {EFFORTS.map((eff, i) => {
            const isSupported = supportsReasoning && i <= effectiveMaxIdx
            const isOn = supportsReasoning && i <= clampedActiveIdx

            return (
              <i
                className={cn(isOn && 'is-on', !isSupported && 'is-unsupported')}
                key={i}
                style={{ height: `${4 + i * 2}px` }}
                title={
                  isSupported
                    ? eff.label
                    : `${eff.label} (${supportsReasoning ? `Max supported by ${model} is ${EFFORTS[effectiveMaxIdx].label}` : 'Reasoning not supported'})`
                }
              />
            )
          })}
        </span>
      </div>
      <input
        aria-label={`Reasoning effort — ${effortLevel.label}`}
        aria-valuetext={effortLevel.label}
        className="effort-range"
        disabled={disabled || !supportsReasoning}
        max={EFFORTS.length - 1}
        min={0}
        onChange={event => {
          if (!supportsReasoning || effectiveMaxIdx === 0) {
            return
          }

          const raw = Number(event.target.value)
          const clamped = Math.min(Math.max(0, raw), effectiveMaxIdx)
          const next = EFFORTS[clamped]

          if (next) {
            onSetEffort(next.id)
          }
        }}
        step={1}
        type="range"
        value={clampedActiveIdx}
      />
      <div className="effort-slider-scale">
        <span>Minimal</span>
        <span>
          {supportsReasoning && effectiveMaxIdx < EFFORTS.length - 1
            ? `Max: ${EFFORTS[effectiveMaxIdx].label}`
            : 'Ultra'}
        </span>
      </div>
      <p className="effort-slider-desc">{effortLevel.desc}</p>
      {supportsReasoning && effectiveMaxIdx < EFFORTS.length - 1 ? (
        <p className="mt-1 font-aro-mono text-[9.5px] text-aro-amber">
          Max reasoning supported: {EFFORTS[effectiveMaxIdx].label}
        </p>
      ) : null}
      {clamp ? <p className="mt-1 font-aro-mono text-[9.5px] text-aro-ink-4">{copy.sendsOnRoute(levelLabel(clamp.wire))}</p> : null}
    </div>
  )
}
