/**
 * ARO AMBIENT COST HUD & TOKEN BURN FORENSICS (Slice 13.S2)
 *
 * Titlebar ambient cost pill and token forensics popover:
 *  - Displays live session spend ($0.04) and token burn (12.4k).
 *  - Indicator dot reflecting budget status (normal, caution, warning, exceeded).
 *  - Forensics popover detailing prompt tokens, completion tokens, prompt-cache hit rate,
 *    and context window headroom.
 *  - Configurable soft and hard budget limit guards with persistence.
 */

import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tip } from '@/components/ui/tooltip'
import { triggerHaptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { $currentUsage } from '@/store/session'
import type { UsageStats } from '@/types/hermes'

import {
  $aroBudgetLimits,
  type AroBudgetLimits,
  type BudgetStatus,
  formatCacheHitRate,
  formatCostUsd,
  formatTokensCount,
  getBudgetStatus,
  resetAroBudgetLimits,
  setAroBudgetLimits
} from './cost-hud'
import { $aroFeatures } from './flags'
import { IconCheck, IconCoin, IconSpark } from './Icons'

export interface AroCostHudProps {
  overrideUsage?: UsageStats
  overrideBudget?: AroBudgetLimits
  forceEnabled?: boolean
  defaultOpen?: boolean
}

const STATUS_CONFIG: Record<
  BudgetStatus,
  {
    dotClass: string
    badgeText: string
    badgeTone: string
    description: string
  }
> = {
  normal: {
    dotClass: 'bg-aro-mint shadow-[0_0_8px_rgba(53,214,196,0.5)]',
    badgeText: 'Within budget',
    badgeTone: 'bg-aro-mint-tint text-aro-mint border-aro-mint/30',
    description: 'Expenditure is safely within session limits.',
  },
  caution: {
    dotClass: 'bg-aro-amber shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    badgeText: 'Approaching limit',
    badgeTone: 'bg-aro-amber-tint text-aro-amber border-aro-amber/30',
    description: 'Approaching soft budget threshold (75%+).',
  },
  warning: {
    dotClass: 'bg-aro-rose-soft shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    badgeText: 'Soft limit reached',
    badgeTone: 'bg-aro-rose-tint text-aro-rose border-aro-rose/30',
    description: 'Soft budget limit reached. Consider reviewing prompt context.',
  },
  exceeded: {
    dotClass: 'bg-aro-rose animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]',
    badgeText: 'Budget exceeded',
    badgeTone: 'bg-aro-rose-tint text-aro-rose border-aro-rose/40 font-bold',
    description: 'Hard budget limit exceeded. Session quota guard tripped.',
  },
}

export function AroCostHud({
  overrideUsage,
  overrideBudget,
  forceEnabled,
  defaultOpen = false,
}: AroCostHudProps = {}) {
  const features = useStore($aroFeatures)
  const isEnabled = forceEnabled ?? features.ambientCostHud

  const liveUsage = useStore($currentUsage)
  const usage = overrideUsage ?? liveUsage

  const liveBudget = useStore($aroBudgetLimits)
  const budget = overrideBudget ?? liveBudget

  const [popoverOpen, setPopoverOpen] = useState(defaultOpen)
  const [editingBudget, setEditingBudget] = useState(false)
  const [softInput, setSoftInput] = useState(budget.softLimitUsd.toString())
  const [hardInput, setHardInput] = useState(budget.hardLimitUsd.toString())
  const [savedFeedback, setSavedFeedback] = useState(false)

  if (!isEnabled) {
    return null
  }

  const cost = usage.cost_usd || 0
  const totalTokens = usage.total || 0
  const status = getBudgetStatus(cost, budget.softLimitUsd, budget.hardLimitUsd)
  const config = STATUS_CONFIG[status]

  const formattedCost = formatCostUsd(cost)
  const formattedTokens = formatTokensCount(totalTokens)
  const cacheHitStr = formatCacheHitRate(usage.cache_hit_pct)

  const softPct = Math.min(100, Math.round((cost / budget.softLimitUsd) * 100))

  const handleSaveBudget = () => {
    const softVal = parseFloat(softInput)
    const hardVal = parseFloat(hardInput)

    if (!isNaN(softVal) && !isNaN(hardVal) && softVal > 0 && hardVal > softVal) {
      setAroBudgetLimits({ softLimitUsd: softVal, hardLimitUsd: hardVal })
      triggerHaptic('success')
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
      setEditingBudget(false)
    }
  }

  const handleResetBudget = () => {
    resetAroBudgetLimits()
    setSoftInput(liveBudget.softLimitUsd.toString())
    setHardInput(liveBudget.hardLimitUsd.toString())
    setEditingBudget(false)
    triggerHaptic('tap')
  }

  return (
    <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
      <Tip label={`Session spend: ${formattedCost} · ${formattedTokens} tokens · Cache hit: ${cacheHitStr}`} side="bottom">
        <PopoverTrigger asChild>
          <button
            aria-label={`Session cost: ${formattedCost}, ${formattedTokens} tokens, status: ${status}`}
            className={cn(
              'flex items-center gap-1.5 rounded-control border px-2 py-[2.5px] font-aro-mono text-xs transition-colors cursor-pointer select-none',
              popoverOpen
                ? 'border-aro-iris bg-aro-iris-tint/40 text-aro-ink'
                : 'border-aro-line bg-aro-sunken text-aro-ink-2 hover:border-aro-line-strong hover:bg-aro-hover'
            )}
            type="button"
          >
            <span className={cn('size-1.5 rounded-full shrink-0', config.dotClass)} />
            <span className="font-semibold text-aro-ink">{formattedCost}</span>
            <span className="hidden text-aro-ink-4 sm:inline">·</span>
            <span className="hidden text-aro-ink-3 sm:inline">{formattedTokens}</span>
          </button>
        </PopoverTrigger>
      </Tip>

      <PopoverContent
        align="end"
        className="w-80 p-0 bg-aro-overlay border border-aro-line text-aro-ink shadow-aro-e4 rounded-overlay overflow-hidden"
        side="bottom"
        sideOffset={6}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-aro-line-soft bg-aro-raise/70 px-3 py-2.5">
          <IconCoin className="text-aro-iris-soft shrink-0" size={14} />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-aro-ink">Token Burn Forensics</h4>
            <p className="font-aro-mono text-[var(--aro-text-2xs,9px)] text-aro-ink-4 uppercase tracking-[.14em]">
              Slice 13.S2 · Ambient HUD
            </p>
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 font-aro-mono text-[var(--aro-text-2xs,9px)] uppercase', config.badgeTone)}>
            {config.badgeText}
          </span>
        </div>

        {/* Spend & Budget Gauge */}
        <div className="p-3 space-y-2 border-b border-aro-line-soft bg-aro-well/40">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-aro-ink-3">Session Spend</span>
            <span className="font-aro-mono text-sm font-bold text-aro-ink">{formattedCost}</span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-aro-sunken overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  status === 'normal' ? 'bg-aro-mint' : status === 'caution' ? 'bg-aro-amber' : 'bg-aro-rose'
                )}
                style={{ width: `${softPct}%` }}
              />
            </div>
            <div className="flex justify-between font-aro-mono text-[var(--aro-text-2xs,9px)] text-aro-ink-4">
              <span>$0.00</span>
              <span>Soft: ${budget.softLimitUsd.toFixed(2)}</span>
              <span>Hard: ${budget.hardLimitUsd.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-[11px] leading-tight text-aro-ink-3">{config.description}</p>
        </div>

        {/* Token Distribution Matrix */}
        <div className="p-3 border-b border-aro-line-soft">
          <div className="mb-2 font-aro-mono text-[var(--aro-text-2xs,9px)] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">
            Token Distribution
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-control border border-aro-line-soft bg-aro-sunken p-2">
              <div className="text-[10px] text-aro-ink-4">Prompt (Input)</div>
              <div className="font-aro-mono text-xs font-semibold text-aro-ink">
                {formatTokensCount(usage.input)}
              </div>
            </div>
            <div className="rounded-control border border-aro-line-soft bg-aro-sunken p-2">
              <div className="text-[10px] text-aro-ink-4">Completion (Output)</div>
              <div className="font-aro-mono text-xs font-semibold text-aro-ink">
                {formatTokensCount(usage.output)}
              </div>
            </div>
            <div className="rounded-control border border-aro-line-soft bg-aro-sunken p-2">
              <div className="text-[10px] text-aro-ink-4">Total Tokens</div>
              <div className="font-aro-mono text-xs font-semibold text-aro-iris-soft">
                {formatTokensCount(usage.total)}
              </div>
            </div>
            <div className="rounded-control border border-aro-line-soft bg-aro-sunken p-2">
              <div className="text-[10px] text-aro-ink-4">Cache Hit Rate</div>
              <div className="font-aro-mono text-xs font-semibold text-aro-mint">{cacheHitStr}</div>
            </div>
          </div>

          {/* Prompt Cache Savings Note */}
          <div className="mt-2.5 flex items-start gap-1.5 rounded-control bg-aro-iris-tint/25 p-2 text-[11px] leading-relaxed text-aro-ink-2">
            <IconSpark className="text-aro-iris shrink-0 mt-0.5" size={11} />
            <span>Prompt caching is sacred: prefix cache hits reduce provider input costs by up to 90%.</span>
          </div>
        </div>

        {/* Context Window Headroom (if reported) */}
        {usage.context_used !== undefined && usage.context_max !== undefined && usage.context_max > 0 && (
          <div className="p-3 border-b border-aro-line-soft">
            <div className="flex justify-between font-aro-mono text-[10px] text-aro-ink-4 mb-1">
              <span>Context Utilization</span>
              <span>
                {formatTokensCount(usage.context_used)} / {formatTokensCount(usage.context_max)} (
                {usage.context_percent || Math.round((usage.context_used / usage.context_max) * 100)}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-aro-sunken overflow-hidden">
              <div
                className="h-full bg-aro-cyan transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, usage.context_percent || Math.round((usage.context_used / usage.context_max) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Budget Limit Controls */}
        <div className="p-3 bg-aro-sunken/40">
          {!editingBudget ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-3">Session Quota Guard</span>
                <p className="text-[10px] text-aro-ink-4">
                  Soft alert: ${budget.softLimitUsd.toFixed(2)} · Hard stop: ${budget.hardLimitUsd.toFixed(2)}
                </p>
              </div>
              <button
                className="rounded-control border border-aro-line bg-aro-raise px-2 py-1 font-mono text-[10px] text-aro-ink-2 hover:bg-aro-hover hover:border-aro-line-strong transition-colors cursor-pointer"
                onClick={() => setEditingBudget(true)}
                type="button"
              >
                Configure
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-mono text-[var(--aro-text-2xs,10px)] font-semibold text-aro-ink uppercase tracking-wider">
                Set Budget Limits ($USD)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-aro-ink-4 block mb-0.5">Soft Alert ($)</label>
                  <input
                    aria-label="Soft alert limit"
                    className="w-full rounded-control border border-aro-line bg-aro-sunken px-2 py-1 font-mono text-xs text-aro-ink"
                    min="0.1"
                    onChange={(e) => setSoftInput(e.target.value)}
                    step="0.5"
                    type="number"
                    value={softInput}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-aro-ink-4 block mb-0.5">Hard Quota ($)</label>
                  <input
                    aria-label="Hard quota limit"
                    className="w-full rounded-control border border-aro-line bg-aro-sunken px-2 py-1 font-mono text-xs text-aro-ink"
                    min="0.2"
                    onChange={(e) => setHardInput(e.target.value)}
                    step="0.5"
                    type="number"
                    value={hardInput}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  className="rounded-control px-2 py-1 font-mono text-[10px] text-aro-ink-4 hover:text-aro-ink transition-colors cursor-pointer"
                  onClick={handleResetBudget}
                  type="button"
                >
                  Reset
                </button>
                <button
                  className="rounded-control border border-aro-line bg-aro-raise px-2.5 py-1 font-mono text-[10px] text-aro-ink hover:bg-aro-hover transition-colors cursor-pointer flex items-center gap-1"
                  onClick={handleSaveBudget}
                  type="button"
                >
                  <IconCheck size={10} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}
          {savedFeedback && (
            <p className="mt-1 font-mono text-[10px] text-aro-mint flex items-center gap-1">
              <IconCheck size={9} /> Budget limits saved
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
