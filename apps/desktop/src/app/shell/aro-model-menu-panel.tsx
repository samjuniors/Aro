import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SETTINGS_ROUTE } from '@/app/routes'
import { IconBrain, IconChevronDown, IconPlus } from '@/aro/Icons'
import { useI18n } from '@/i18n'
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
        <div className="model-menu-list max-h-[340px] overflow-y-auto overflow-x-visible px-0.5 pb-1 pt-0.5">{children}</div>
      ) : (
        <div className="model-menu-compact px-0.5 pb-1 pt-0.5">
          {supportsReasoning ? (
            <EffortSliderRow
              disabled={Boolean(effortPending)}
              effort={effortValue}
              effortWire={effortWire}
              onSetEffort={value => controller.setOptions({ effort: value }, row)}
            />
          ) : null}

          {showThinkingToggle ? (
            <div className="model-thinking-row">
              <IconBrain className="size-[13px] shrink-0 text-aro-plum" size={13} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-aro-ink-2">Thinking</span>
                <span className="block text-[10px] leading-tight text-aro-ink-4">
                  Show the model's reasoning before it replies
                </span>
              </span>
              {/* The prototype's PLAIN toggle button (ui.tsx Toggle), not a Radix
                  Switch: a Radix Switch inside DropdownMenuContent never receives
                  its click handler in the real renderer (diagnosed live
                  2026-10-13 — this row was dead since the Phase-3 port), while
                  plain buttons dispatch reliably. */}
              <button
                aria-checked={thinkingOn}
                aria-label="Toggle thinking"
                className={cn(
                  'relative h-[17px] w-[30px] shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                  thinkingOn ? 'bg-aro-iris' : 'bg-aro-line-strong'
                )}
                disabled={Boolean(effortPending)}
                onClick={() =>
                  controller.setOptions({ effort: thinkingOn ? 'none' : effortValue || defaultEffort }, row)
                }
                role="switch"
                type="button"
              >
                <span
                  aria-hidden
                  className="absolute top-[2px] left-0 block size-[13px] rounded-full bg-white shadow-e1 transition-transform duration-200"
                  style={{ transform: `translateX(${thinkingOn ? 15 : 2}px)` }}
                />
              </button>
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
const EFFORTS = [
  { id: 'minimal', label: 'Minimal', color: 'var(--aro-ink-3)', desc: 'Straight to the point — no visible reasoning. Fastest and cheapest for lookups.' },
  { id: 'low', label: 'Low', color: 'var(--aro-cyan)', desc: 'Light reasoning for small edits, renames and quick fixes.' },
  { id: 'medium', label: 'Medium', color: 'var(--aro-iris-soft)', desc: 'Balanced thinking for everyday coding — the sensible default.' },
  { id: 'high', label: 'High', color: 'var(--aro-amber)', desc: 'Deep multi-step reasoning for tricky bugs and cross-file refactors.' },
  { id: 'ultra', label: 'Ultra', color: 'var(--aro-rose)', desc: 'Maximum reasoning power — architecture, migrations, hard proofs.' },
] as const

/**
 * The effort slider: a compact UI over Hermes' REAL reasoning levels
 * (`REASONING_EFFORTS` — minimal…ultra). Moving it calls the same controller
 * action the reasoning menu's radio rows perform; nothing is faked.
 */
function EffortSliderRow({
  disabled,
  effort,
  effortWire,
  onSetEffort
}: {
  disabled: boolean
  effort: string
  effortWire?: string
  onSetEffort: (value: string) => void
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

  const effortLevel = EFFORTS[activeIdx] ?? EFFORTS[2]

  const levelLabel = (value: string) => {
    const entry = copy[value as keyof typeof copy]

    return typeof entry === 'string' ? entry : value
  }

  const clamp = reasoningEffortClamp(effort, effortWire)

  return (
    <div className="effort-slider" style={{ ['--effort-color' as string]: effortLevel.color }}>
      <div className="effort-slider-head">
        <span className="effort-level-name">
          <i aria-hidden className="effort-level-dot" />
          {effortLevel.label}
        </span>
        <span aria-hidden className="effort-bars">
          {EFFORTS.map((_, i) => (
            <i className={cn(i <= activeIdx && 'is-on')} key={i} style={{ height: `${4 + i * 2}px` }} />
          ))}
        </span>
      </div>
      <input
        aria-label={`Reasoning effort — ${effortLevel.label}`}
        aria-valuetext={effortLevel.label}
        className="effort-range"
        disabled={disabled}
        max={EFFORTS.length - 1}
        min={0}
        onChange={event => {
          const next = EFFORTS[Number(event.target.value)]

          if (next) {
            onSetEffort(next.id)
          }
        }}
        step={1}
        style={{ ['--effort-fill' as string]: `${(activeIdx / (EFFORTS.length - 1)) * 100}%` }}
        type="range"
        value={activeIdx}
      />
      <div className="effort-slider-scale">
        <span>Minimal</span>
        <span>Ultra</span>
      </div>
      <p className="effort-slider-desc">{effortLevel.desc}</p>
      {clamp ? <p className="mt-1 font-aro-mono text-[9.5px] text-aro-ink-4">{copy.sendsOnRoute(levelLabel(clamp.wire))}</p> : null}
    </div>
  )
}
