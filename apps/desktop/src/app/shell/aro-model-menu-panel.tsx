import { REASONING_EFFORTS } from '@hermes/shared'
import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SETTINGS_ROUTE } from '@/app/routes'
import { Codicon } from '@/components/ui/codicon'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import { Brain } from '@/lib/icons'
import { catalogProviderMatches, currentModelCapabilities } from '@/lib/model-options'
import { providerDisplayName } from '@/lib/model-status-label'
import { isThinkingEnabled, reasoningEffortClamp, resolveReasoningEffort } from '@/lib/reasoning-effort'

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
  const menuCopy = t.shell.modelMenu
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
        className="flex w-full items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors hover:bg-aro-hover"
        onClick={() => setExpanded(value => !value)}
        type="button"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-aro-line-soft bg-aro-raise font-aro-mono text-[10px] font-semibold text-aro-ink-3">
          {monogram}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold text-aro-ink">{model}</span>
          <span className="block truncate font-aro-mono text-[9.5px] text-aro-ink-4">
            {providerDisplayName(provider || '')}
          </span>
        </span>
        <Codicon
          className={expanded ? 'rotate-180 text-aro-ink-4 transition-transform' : 'text-aro-ink-4 transition-transform'}
          name="chevron-up"
          size="0.75rem"
        />
      </button>

      {expanded ? (
        <div className="max-h-[340px] overflow-y-auto overflow-x-visible px-0.5 pb-1 pt-0.5">{children}</div>
      ) : (
        <div className="px-0.5 pb-1 pt-0.5">
          {supportsReasoning ? (
            <EffortSliderRow
              disabled={Boolean(effortPending)}
              effort={effortValue}
              effortWire={effortWire}
              onSetEffort={value => controller.setOptions({ effort: value }, row)}
            />
          ) : null}

          {showThinkingToggle ? (
            <div className="flex items-center gap-2.5 rounded-[7px] px-2 py-2">
              <Brain className="size-3.5 shrink-0 text-aro-plum" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-aro-ink-2">{copy.thinking}</span>
              </span>
              <Switch
                checked={thinkingOn}
                onCheckedChange={checked =>
                  controller.setOptions({ effort: checked ? effortValue || defaultEffort : 'none' }, row)
                }
                size="xs"
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
                <Codicon name="settings-gear" size="0.75rem" />
                {menuCopy.editModels}
              </button>
            )}
          </ModelMenuCloseContext.Consumer>
        </div>
      )}
    </div>
  )
}

/**
 * The effort slider: a compact UI over Hermes' REAL reasoning levels
 * (`REASONING_EFFORTS` — minimal…ultra). Moving it calls the same controller
 * action the reasoning menu's radio rows perform; nothing is faked. A clamped
 * pick ("ultra" that the route sends as "max") spells that out underneath,
 * exactly like the pills do.
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
  const stops = REASONING_EFFORTS
  const activeIndex = stops.indexOf(effort as (typeof stops)[number])
  const level = activeIndex >= 0 ? effort : stops[0]

  // `copy` also carries functions (sendsOnRoute) — only lift the string labels.
  const levelLabel = (value: string) => {
    const entry = copy[value as keyof typeof copy]

    return typeof entry === 'string' ? entry : value
  }

  const label = levelLabel(level)
  const clamp = reasoningEffortClamp(effort, effortWire)
  const color = EFFORT_COLORS[level] ?? 'var(--aro-ink-3)'

  return (
    <div className="rounded-[7px] px-2 py-2" data-aro-effort-slider="">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-aro-ink-3">
          <span
            className="size-1.5 rounded-full transition-colors"
            style={{ background: color, boxShadow: `0 0 7px color-mix(in srgb, ${color} 55%, transparent)` }}
          />
          {copy.effort}
        </span>
        <span className="truncate text-[11.5px] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <input
        aria-label={copy.effort}
        className="aro-effort-range"
        disabled={disabled}
        max={stops.length - 1}
        min={0}
        onChange={event => {
          const next = stops[Number(event.target.value)]

          if (next) {
            onSetEffort(next)
          }
        }}
        step={1}
        type="range"
        value={activeIndex >= 0 ? activeIndex : 0}
      />
      <div aria-hidden className="mt-1.5 flex items-end justify-between gap-[3px]">
        {stops.map((stop, index) => (
          <span
            className="aro-effort-bar"
            data-on={index <= activeIndex ? '' : undefined}
            key={stop}
            style={
              {
                height: `${4 + index * 1.5}px`,
                '--bar-color': EFFORT_COLORS[stop] ?? 'var(--aro-ink-3)'
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between font-aro-mono text-[9px] text-aro-ink-4">
        <span>{copy.minimal}</span>
        <span>{copy.ultra}</span>
      </div>
      {clamp ? <p className="mt-1 font-aro-mono text-[9.5px] text-aro-ink-4">{copy.sendsOnRoute(levelLabel(clamp.wire))}</p> : null}
    </div>
  )
}

/** Prototype effort ramp, extended over Hermes' full 7-level scale. */
const EFFORT_COLORS: Record<string, string> = {
  minimal: 'var(--aro-ink-3)',
  low: 'var(--aro-cyan)',
  medium: 'var(--aro-iris-soft)',
  high: 'var(--aro-amber)',
  xhigh: 'color-mix(in srgb, var(--aro-amber) 45%, var(--aro-rose))',
  max: 'var(--aro-rose)',
  ultra: 'color-mix(in srgb, var(--aro-rose) 55%, var(--aro-iris))'
}
