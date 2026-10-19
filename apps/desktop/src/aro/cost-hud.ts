/**
 * ARO AMBIENT COST HUD & TOKEN BURN FORENSICS (Slice 13.S2)
 *
 * Store, budget limits, formatters, and status calculations for real-time
 * token forensics and spend guards.
 */

import { atom } from 'nanostores'

export type BudgetStatus = 'normal' | 'caution' | 'warning' | 'exceeded'

export interface AroBudgetLimits {
  softLimitUsd: number
  hardLimitUsd: number
}

export const DEFAULT_BUDGET_LIMITS: Readonly<AroBudgetLimits> = Object.freeze({
  softLimitUsd: 2.0,
  hardLimitUsd: 5.0,
})

export const ARO_BUDGET_STORAGE_KEY = 'aro.budgetLimits'

function getInitialBudgetLimits(): AroBudgetLimits {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_BUDGET_LIMITS }
  }

  try {
    const raw = window.localStorage.getItem(ARO_BUDGET_STORAGE_KEY)

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AroBudgetLimits>

      const soft =
        typeof parsed.softLimitUsd === 'number' && parsed.softLimitUsd > 0
          ? parsed.softLimitUsd
          : DEFAULT_BUDGET_LIMITS.softLimitUsd

      const hard =
        typeof parsed.hardLimitUsd === 'number' && parsed.hardLimitUsd > soft
          ? parsed.hardLimitUsd
          : DEFAULT_BUDGET_LIMITS.hardLimitUsd

      return { softLimitUsd: soft, hardLimitUsd: hard }
    }
  } catch {
    // fallback
  }

  return { ...DEFAULT_BUDGET_LIMITS }
}

export const $aroBudgetLimits = atom<AroBudgetLimits>(getInitialBudgetLimits())

export function setAroBudgetLimits(limits: Partial<AroBudgetLimits>): void {
  const current = $aroBudgetLimits.get()
  const soft = limits.softLimitUsd !== undefined ? Math.max(0.1, limits.softLimitUsd) : current.softLimitUsd
  const hard = limits.hardLimitUsd !== undefined ? Math.max(soft + 0.1, limits.hardLimitUsd) : current.hardLimitUsd
  const next = { softLimitUsd: soft, hardLimitUsd: hard }
  $aroBudgetLimits.set(next)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ARO_BUDGET_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }
}

export function resetAroBudgetLimits(): void {
  const reset = { ...DEFAULT_BUDGET_LIMITS }
  $aroBudgetLimits.set(reset)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ARO_BUDGET_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

export function getBudgetStatus(
  costUsd: number,
  softLimit: number = DEFAULT_BUDGET_LIMITS.softLimitUsd,
  hardLimit: number = DEFAULT_BUDGET_LIMITS.hardLimitUsd,
): BudgetStatus {
  if (costUsd >= hardLimit) {
    return 'exceeded'
  }

  if (costUsd >= softLimit) {
    return 'warning'
  }

  if (costUsd >= softLimit * 0.75) {
    return 'caution'
  }

  return 'normal'
}

export function formatCostUsd(cost: number | undefined): string {
  if (typeof cost !== 'number' || cost <= 0) {
    return '$0.00'
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(3)}`
  }

  return `$${cost.toFixed(2)}`
}

export function formatTokensCount(tokens: number | undefined): string {
  if (typeof tokens !== 'number' || tokens <= 0) {
    return '0'
  }

  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`
  }

  return tokens.toLocaleString()
}

export function formatCacheHitRate(pct: number | undefined): string {
  if (typeof pct !== 'number' || isNaN(pct)) {
    return 'N/A'
  }

  return `${pct.toFixed(1)}%`
}
