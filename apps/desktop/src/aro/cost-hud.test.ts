import { beforeEach, describe, expect, it } from 'vitest'

import {
  $aroBudgetLimits,
  ARO_BUDGET_STORAGE_KEY,
  DEFAULT_BUDGET_LIMITS,
  formatCacheHitRate,
  formatCostUsd,
  formatTokensCount,
  getBudgetStatus,
  resetAroBudgetLimits,
  setAroBudgetLimits
} from './cost-hud'

describe('Aro Cost HUD Store & Utilities (cost-hud.ts)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetAroBudgetLimits()
  })

  describe('formatters', () => {
    it('formats USD costs across scales', () => {
      expect(formatCostUsd(undefined)).toBe('$0.00')
      expect(formatCostUsd(0)).toBe('$0.00')
      expect(formatCostUsd(0.005)).toBe('$0.005')
      expect(formatCostUsd(0.042)).toBe('$0.04')
      expect(formatCostUsd(1.5)).toBe('$1.50')
      expect(formatCostUsd(12.3456)).toBe('$12.35')
    })

    it('formats token counts with k/M abbreviations', () => {
      expect(formatTokensCount(undefined)).toBe('0')
      expect(formatTokensCount(0)).toBe('0')
      expect(formatTokensCount(450)).toBe('450')
      expect(formatTokensCount(12_400)).toBe('12.4k')
      expect(formatTokensCount(185_000)).toBe('185.0k')
      expect(formatTokensCount(1_250_000)).toBe('1.3M')
    })

    it('formats prompt-cache hit rates', () => {
      expect(formatCacheHitRate(undefined)).toBe('N/A')
      expect(formatCacheHitRate(NaN)).toBe('N/A')
      expect(formatCacheHitRate(0)).toBe('0.0%')
      expect(formatCacheHitRate(84.23)).toBe('84.2%')
      expect(formatCacheHitRate(100)).toBe('100.0%')
    })
  })

  describe('budget status calculation', () => {
    const soft = 2.0
    const hard = 5.0

    it('classifies normal spend (< 75% of soft limit)', () => {
      expect(getBudgetStatus(0, soft, hard)).toBe('normal')
      expect(getBudgetStatus(0.5, soft, hard)).toBe('normal')
      expect(getBudgetStatus(1.4, soft, hard)).toBe('normal')
    })

    it('classifies caution spend (between 75% and 100% of soft limit)', () => {
      expect(getBudgetStatus(1.5, soft, hard)).toBe('caution')
      expect(getBudgetStatus(1.99, soft, hard)).toBe('caution')
    })

    it('classifies warning spend (between soft limit and hard limit)', () => {
      expect(getBudgetStatus(2.0, soft, hard)).toBe('warning')
      expect(getBudgetStatus(3.5, soft, hard)).toBe('warning')
      expect(getBudgetStatus(4.99, soft, hard)).toBe('warning')
    })

    it('classifies exceeded spend (at or above hard limit)', () => {
      expect(getBudgetStatus(5.0, soft, hard)).toBe('exceeded')
      expect(getBudgetStatus(7.5, soft, hard)).toBe('exceeded')
    })
  })

  describe('$aroBudgetLimits store', () => {
    it('initializes with default budget limits', () => {
      expect($aroBudgetLimits.get()).toEqual(DEFAULT_BUDGET_LIMITS)
    })

    it('updates and persists budget limits to localStorage', () => {
      setAroBudgetLimits({ softLimitUsd: 3.0, hardLimitUsd: 8.0 })

      expect($aroBudgetLimits.get()).toEqual({ softLimitUsd: 3.0, hardLimitUsd: 8.0 })
      const stored = JSON.parse(window.localStorage.getItem(ARO_BUDGET_STORAGE_KEY) || '{}')
      expect(stored.softLimitUsd).toBe(3.0)
      expect(stored.hardLimitUsd).toBe(8.0)
    })

    it('resets budget limits back to defaults', () => {
      setAroBudgetLimits({ softLimitUsd: 10.0, hardLimitUsd: 25.0 })
      resetAroBudgetLimits()

      expect($aroBudgetLimits.get()).toEqual(DEFAULT_BUDGET_LIMITS)
      expect(window.localStorage.getItem(ARO_BUDGET_STORAGE_KEY)).toBeNull()
    })
  })
})
