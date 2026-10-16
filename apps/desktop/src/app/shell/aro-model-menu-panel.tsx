import type { ModelCapabilities } from '@hermes/shared'
import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { IconBrain, IconChevronDown } from '@/aro/Icons'
import { Toggle } from '@/aro/ui'
import { useI18n } from '@/i18n'
import { catalogProviderMatches, currentModelCapabilities } from '@/lib/model-options'
import { providerDisplayName } from '@/lib/model-status-label'
import { isThinkingEnabled, resolveReasoningEffort } from '@/lib/reasoning-effort'
import { cn } from '@/lib/utils'

import { resolveFastControl } from './model-edit-submenu'
import { ModelMenuCloseContext } from './model-menu-panel'
import { type ModelMenuHostProps, useModelMenuController } from './use-model-menu-controller'

/**
 * Reasoning-effort levels — Codex-style strength ramp: the further right,
 * the hotter the accent color (neutral → cyan → iris → amber → rose).
 */
export const EFFORTS = [
  {
    id: 'minimal',
    label: 'Minimal',
    short: 'Min',
    color: 'var(--aro-ink-3)',
    desc: 'Direct response with minimal or zero hidden reasoning tokens. Fastest and most economical.'
  },
  {
    id: 'low',
    label: 'Low',
    short: 'Low',
    color: 'var(--aro-cyan)',
    desc: 'Light reasoning for quick edits, renames, syntax adjustments and single-file fixes.'
  },
  {
    id: 'medium',
    label: 'Medium',
    short: 'Med',
    color: 'var(--aro-iris-soft)',
    desc: 'Balanced thinking for day-to-day coding, feature logic, and debugging — the ideal default.'
  },
  {
    id: 'high',
    label: 'High',
    short: 'High',
    color: 'var(--aro-amber)',
    desc: 'Deep multi-step reasoning for intricate bugs, complex refactors, and architectural choices.'
  },
  {
    id: 'ultra',
    label: 'Ultra',
    short: 'Ultra',
    color: 'var(--aro-rose)',
    desc: 'Maximum reasoning power — formal proofs, wide migrations, and challenging systems problems.'
  }
] as const

/**
 * Determines whether a model supports reasoning effort / extended thinking.
 * Prioritizes backend capabilities when reported, and falls back to authoritative family heuristics.
 */
export function checkModelSupportsReasoning(model: string, caps?: ModelCapabilities): boolean {
  if (typeof caps?.reasoning === 'boolean') {
    return caps.reasoning
  }

  const norm = (model || '').toLowerCase()

  // Definitive non-reasoning models
  if (
    norm.includes('gpt-4o') ||
    norm.includes('gpt-4-turbo') ||
    norm.includes('gpt-3.5') ||
    norm.includes('claude-3-5') ||
    norm.includes('claude-3-opus') ||
    norm.includes('claude-3-haiku') ||
    norm.includes('gemini-1.5') ||
    (norm.includes('gemini-2.0') && !norm.includes('thinking')) ||
    norm.includes('llama-3') ||
    norm.includes('mistral') ||
    norm.includes('codestral')
  ) {
    return false
  }

  // Definitive reasoning / thinking models
  if (
    norm.includes('o1') ||
    norm.includes('o3') ||
    norm.includes('claude-3-7') ||
    norm.includes('claude-sonnet-4') ||
    norm.includes('deepseek-r1') ||
    norm.includes('r1') ||
    norm.includes('reasoner') ||
    norm.includes('thinking') ||
    norm.includes('qwq')
  ) {
    return true
  }

  return false
}

/**
 * Resolves the maximum reasoning-effort index (0..4) supported by a given model.
 * Clamps to 0 if the model does not support reasoning.
 * Models with bounded thinking (e.g. Claude 3.7 Sonnet, Kimi K2, Grok 3) top out at High (index 3).
 * Models with unrestricted reasoning (OpenAI o1/o3-mini, DeepSeek R1) reach Ultra (index 4).
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

    if (idx !== -1) {
      return idx
    }
  }

  const normModel = (model || '').toLowerCase()
  const normProv = (provider || '').toLowerCase()

  // Wire clamping returned by the gateway route
  if (effortWire) {
    const normWire = effortWire.toLowerCase()

    if (normWire === 'minimal') {
      return 0
    }

    if (normWire === 'low') {
      return 1
    }

    if (normWire === 'medium') {
      return 2
    }

    if (normWire === 'high' || normWire === 'xhigh') {
      return 3
    }

    if (normWire === 'max' || normWire === 'ultra') {
      return 4
    }
  }

  // Known bounded thinking models that top out at High (index 3)
  if (
    normModel.includes('claude-3-7') ||
    normModel.includes('claude-sonnet-4') ||
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
 * High-performance, silky-smooth reasoning effort slider and notch picker.
 * Supports direct notch clicking, drag sliding with local optimistic state,
 * and visual locking for steps beyond supported max effort.
 */
function EffortSliderRow({
  effort,
  maxEffortIdx,
  onSetEffort,
  supportsReasoning,
  thinkingOn
}: {
  effort: string
  maxEffortIdx: number
  onSetEffort: (value: string) => void
  supportsReasoning: boolean
  thinkingOn: boolean
}) {
  const targetIdx =
    effort === 'minimal'
      ? 0
      : effort === 'low'
        ? 1
        : effort === 'high' || effort === 'xhigh'
          ? 3
          : effort === 'max' || effort === 'ultra'
            ? 4
            : 2

  const effectiveMaxIdx = supportsReasoning ? maxEffortIdx : 0
  const clampedActiveIdx = supportsReasoning ? Math.min(targetIdx, effectiveMaxIdx) : 0

  // Local optimistic index for drag smoothness without jump/freeze
  const [localIdx, setLocalIdx] = useState<number>(clampedActiveIdx)
  const isDraggingRef = useRef<boolean>(false)

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalIdx(clampedActiveIdx)
    }
  }, [clampedActiveIdx])

  const currentDisplayIdx = isDraggingRef.current ? localIdx : clampedActiveIdx

  const effortLevel =
    supportsReasoning && thinkingOn
      ? (EFFORTS[currentDisplayIdx] ?? EFFORTS[2])
      : !thinkingOn && supportsReasoning
        ? {
            id: 'off',
            label: 'Thinking Off',
            short: 'Off',
            color: 'var(--aro-ink-4)',
            desc: 'Reasoning is turned off. Click any level below or toggle thinking to enable.'
          }
        : {
            id: 'none',
            label: 'Disabled',
            short: 'Off',
            color: 'var(--aro-ink-4)',
            desc: 'Reasoning is not supported by this model.'
          }

  const lastEffortIndex = EFFORTS.length - 1
  const fillPct = supportsReasoning && thinkingOn ? (currentDisplayIdx / lastEffortIndex) * 100 : 0
  const maxPct = supportsReasoning ? (effectiveMaxIdx / lastEffortIndex) * 100 : 0

  const handleSelectIdx = useCallback(
    (idx: number) => {
      if (!supportsReasoning) {
        return
      }
      const clamped = Math.min(Math.max(0, idx), effectiveMaxIdx)
      setLocalIdx(clamped)
      const next = EFFORTS[clamped]

      if (next) {
        onSetEffort(next.id)
      }
    },
    [supportsReasoning, effectiveMaxIdx, onSetEffort]
  )

  return (
    <div
      className={cn('effort-slider', !thinkingOn && 'is-thinking-off')}
      style={{
        ['--effort-color' as string]: effortLevel.color,
        ['--effort-fill' as string]: `${fillPct}%`,
        ['--effort-max-pct' as string]: `${maxPct}%`
      }}
    >
      <div className="effort-slider-head">
        <span className="effort-level-name">
          <i aria-hidden className="effort-level-dot" />
          <span>{effortLevel.label}</span>
          {!thinkingOn && supportsReasoning && (
            <span className="ml-1 text-[10px] font-normal text-aro-ink-4 italic">(Paused)</span>
          )}
        </span>
      </div>

      <div className="relative mt-1.5 mb-0.5 px-0.5">
        <input
          aria-label={`Reasoning effort — ${effortLevel.label}`}
          aria-valuetext={effortLevel.label}
          className="effort-range"
          disabled={!supportsReasoning}
          max={lastEffortIndex}
          min={0}
          onBlur={() => {
            isDraggingRef.current = false
          }}
          onChange={event => handleSelectIdx(Number(event.target.value))}
          onPointerCancel={() => {
            isDraggingRef.current = false
          }}
          onPointerDown={() => {
            isDraggingRef.current = true
          }}
          onPointerUp={() => {
            isDraggingRef.current = false
          }}
          step={1}
          type="range"
          value={currentDisplayIdx}
        />
      </div>

      <div className="effort-slider-scale">
        <span>Minimal</span>
        <span>
          {supportsReasoning && effectiveMaxIdx < EFFORTS.length - 1
            ? `Max: ${EFFORTS[effectiveMaxIdx].label}`
            : 'Ultra'}
        </span>
      </div>
    </div>
  )
}

/**
 * The Aro model menu — comprehensive, dynamic model selector inspired by
 * Codex, Claude Code, and Google Antigravity.
 * Collapsed: Shows model summary, reasoning effort slider, thinking toggle,
 * fast mode, and configure link.
 * Expanded: Renders live searchable model catalog with dynamic pricing from real sources.
 */
export function AroModelMenuPanel({ children, ...props }: ModelMenuHostProps & { children?: ReactNode }) {
  const { t } = useI18n()
  const copy = t.shell.modelOptions
  const { controller, defaultEffort, modelOptions } = useModelMenuController(props)
  const closeParentMenu = useContext(ModelMenuCloseContext)
  const { effort, effortWire, fast, model, provider } = controller.current
  const [expanded, setExpanded] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)

  const caps = currentModelCapabilities(modelOptions.data, provider, model)
  const supportsReasoning = checkModelSupportsReasoning(model, caps)
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
  const effectiveFastControl = fastControl ?? { kind: 'none' as const }

  const row = { isActive: true, model, provider }

  const setFast = (enabled: boolean) => {
    if (effectiveFastControl.kind === 'variant') {
      controller.setOptions({ fast: enabled }, row)
      void controller.select(enabled ? effectiveFastControl.fastId : effectiveFastControl.baseId, provider)
    } else if (effectiveFastControl.kind === 'param') {
      controller.setOptions({ fast: enabled }, row)
    }
  }

  if (!model) {
    return <div className="px-3 py-3 text-xs text-aro-ink-3">{copy.noOptions}</div>
  }

  const monogram =
    providerDisplayName(provider || '')
      .trim()
      .charAt(0)
      .toUpperCase() || 'A'
  const isLocalProvider = provider?.toLowerCase().includes('local') || provider?.toLowerCase().includes('ollama')

  return (
    <div data-aro-model-menu="" data-expanded={expanded ? '' : undefined}>
      {/* Head: the selected model is the primary control; click to browse. */}
      <button
        className="model-menu-head"
        data-testid="aro-model-head-button"
        onClick={() => setExpanded(value => !value)}
        type="button"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-aro-line-soft bg-aro-raise font-aro-mono text-[10px] font-semibold text-aro-ink-3">
          {monogram}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-medium text-aro-ink">{model}</span>
            {supportsReasoning && thinkingOn && (
              <span className="shrink-0 rounded px-1 text-[9px] font-semibold uppercase tracking-wider text-aro-iris bg-aro-iris/10 border border-aro-iris/20">
                {EFFORTS.find(e => e.id === effortValue)?.short ?? 'Think'}
              </span>
            )}
          </span>
          <span className="block truncate font-aro-mono text-[9.5px] text-aro-ink-4">
            {providerDisplayName(provider || '')} · {isLocalProvider ? 'on-device' : 'cloud'}
          </span>
        </span>
        <IconChevronDown
          className={cn('size-3 shrink-0 text-aro-ink-4 transition-transform duration-200', expanded && 'rotate-180')}
          size={12}
        />
      </button>

      {expanded ? (
        <div className="model-menu-list max-h-[380px] overflow-y-auto overflow-x-visible px-0.5 pb-1 pt-0.5">
          <ModelMenuCloseContext.Provider
            value={() => {
              setExpanded(false)
              closeParentMenu()
            }}
          >
            {children}
          </ModelMenuCloseContext.Provider>
        </div>
      ) : (
        <div className="model-menu-compact px-0.5 pb-1 pt-0.5">
          {supportsReasoning ? (
            <>
              <button
                aria-expanded={controlsOpen}
                aria-label={`Reasoning controls: ${thinkingOn ? (EFFORTS.find(item => item.id === effortValue)?.label ?? 'Medium') : 'Off'}`}
                className="flex h-7 w-full items-center gap-2 rounded-[6px] px-1.5 text-[11px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
                onClick={() => setControlsOpen(value => !value)}
                type="button"
              >
                <IconBrain className="size-[13px] shrink-0 text-aro-plum" size={13} />
                <span className="min-w-0 flex-1 text-left">{copy.thinking}</span>
                <span className="text-[10px] text-aro-ink-4">
                  {thinkingOn ? (EFFORTS.find(item => item.id === effortValue)?.label ?? 'Medium') : 'Off'}
                </span>
                <IconChevronDown
                  className={cn('size-3 text-aro-ink-4 transition-transform', controlsOpen && 'rotate-180')}
                  size={12}
                />
              </button>

              {controlsOpen && (
                <div className="mt-1 border-t border-aro-line-soft px-1 pt-1">
                  <EffortSliderRow
                    effort={effortValue}
                    maxEffortIdx={maxEffortIdx}
                    onSetEffort={value => controller.setOptions({ effort: value }, row)}
                    supportsReasoning={supportsReasoning}
                    thinkingOn={thinkingOn}
                  />

                  {showThinkingToggle ? (
                    <div className="flex items-center gap-2 border-t border-aro-line-soft px-0.5 py-1.5">
                      <span className="min-w-0 flex-1 text-[10.5px] text-aro-ink-3">{copy.thinking}</span>
                      <Toggle
                        aria-label="Toggle thinking"
                        checked={thinkingOn}
                        onChange={() =>
                          controller.setOptions({ effort: thinkingOn ? 'none' : effortValue || defaultEffort }, row)
                        }
                        size="sm"
                      />
                    </div>
                  ) : null}

                  {effectiveFastControl.kind !== 'none' && (
                    <div className="flex items-center gap-2 border-t border-aro-line-soft px-0.5 py-1.5">
                      <span className="min-w-0 flex-1 text-[10.5px] text-aro-ink-3">{copy.fast}</span>
                      <Toggle aria-label={copy.fast} checked={effectiveFastControl.on} onChange={setFast} size="sm" />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1 py-1 text-[10px] text-aro-ink-4">
              <span>Direct response model</span>
              <button
                className="shrink-0 text-aro-iris hover:text-aro-iris-soft"
                onClick={() => setExpanded(true)}
                type="button"
              >
                Browse models
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
