import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $aroBudgetLimits, resetAroBudgetLimits } from './cost-hud'
import { AroCostHud } from './CostHud'
import { resetAroFeatures, setAroFeature } from './flags'

describe('AroCostHud Component (Slice 13.S2)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetAroFeatures()
    resetAroBudgetLimits()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders null when ambientCostHud feature flag is disabled', () => {
    setAroFeature('ambientCostHud', false)

    const { container } = render(<AroCostHud />)
    expect(container.firstChild).toBeNull()
  })

  it('renders HUD pill with formatted cost and tokens in normal budget state', () => {
    render(
      <AroCostHud
        forceEnabled={true}
        overrideBudget={{ softLimitUsd: 2.0, hardLimitUsd: 5.0 }}
        overrideUsage={{
          calls: 4,
          cost_usd: 0.042,
          input: 9800,
          output: 2600,
          total: 12400,
          cache_hit_pct: 85.5,
        }}
      />
    )

    expect(screen.getByText('$0.04')).toBeTruthy()
    expect(screen.getByText('12.4k')).toBeTruthy()

    const trigger = screen.getByRole('button', { name: /Session cost: \$0\.04, 12\.4k tokens, status: normal/i })
    expect(trigger).toBeTruthy()
  })

  it('renders caution and warning status indicators based on budget thresholds', () => {
    const { rerender } = render(
      <AroCostHud
        forceEnabled={true}
        overrideBudget={{ softLimitUsd: 2.0, hardLimitUsd: 5.0 }}
        overrideUsage={{
          calls: 10,
          cost_usd: 1.6,
          input: 50000,
          output: 10000,
          total: 60000,
        }}
      />
    )

    // Caution: 1.6 >= 2.0 * 0.75
    expect(screen.getByRole('button', { name: /status: caution/i })).toBeTruthy()

    // Warning: 2.5 >= 2.0
    rerender(
      <AroCostHud
        forceEnabled={true}
        overrideBudget={{ softLimitUsd: 2.0, hardLimitUsd: 5.0 }}
        overrideUsage={{
          calls: 15,
          cost_usd: 2.5,
          input: 80000,
          output: 20000,
          total: 100000,
        }}
      />
    )
    expect(screen.getByRole('button', { name: /status: warning/i })).toBeTruthy()

    // Exceeded: 5.2 >= 5.0
    rerender(
      <AroCostHud
        forceEnabled={true}
        overrideBudget={{ softLimitUsd: 2.0, hardLimitUsd: 5.0 }}
        overrideUsage={{
          calls: 25,
          cost_usd: 5.2,
          input: 200000,
          output: 50000,
          total: 250000,
        }}
      />
    )
    expect(screen.getByRole('button', { name: /status: exceeded/i })).toBeTruthy()
  })

  it('opens Token Forensics popover and displays full token distribution matrix', () => {
    render(
      <AroCostHud
        defaultOpen={true}
        forceEnabled={true}
        overrideBudget={{ softLimitUsd: 2.0, hardLimitUsd: 5.0 }}
        overrideUsage={{
          calls: 5,
          cost_usd: 0.12,
          input: 15000,
          output: 3200,
          total: 18200,
          cache_hit_pct: 91.2,
          context_used: 18200,
          context_max: 200000,
          context_percent: 9,
        }}
      />
    )

    expect(screen.getByText('Token Burn Forensics')).toBeTruthy()
    expect(screen.getByText('Prompt (Input)')).toBeTruthy()
    expect(screen.getByText('15.0k')).toBeTruthy()
    expect(screen.getByText('Completion (Output)')).toBeTruthy()
    expect(screen.getByText('3.2k')).toBeTruthy()
    expect(screen.getByText('Total Tokens')).toBeTruthy()
    expect(screen.getAllByText('18.2k').length).toBeGreaterThan(0)
    expect(screen.getByText('Cache Hit Rate')).toBeTruthy()
    expect(screen.getByText('91.2%')).toBeTruthy()
    expect(screen.getByText(/Prompt caching is sacred/i)).toBeTruthy()
    expect(screen.getByText(/Context Utilization/i)).toBeTruthy()
  })

  it('allows configuring budget limits and updates budget limits store', () => {
    render(
      <AroCostHud
        defaultOpen={true}
        forceEnabled={true}
        overrideUsage={{
          calls: 1,
          cost_usd: 0.01,
          input: 1000,
          output: 200,
          total: 1200,
        }}
      />
    )

    const configBtn = screen.getByRole('button', { name: 'Configure' })
    fireEvent.click(configBtn)

    const softInput = screen.getByLabelText('Soft alert limit')
    const hardInput = screen.getByLabelText('Hard quota limit')

    fireEvent.change(softInput, { target: { value: '3.5' } })
    fireEvent.change(hardInput, { target: { value: '7.5' } })

    const saveBtn = screen.getByRole('button', { name: /Save/i })
    fireEvent.click(saveBtn)

    expect($aroBudgetLimits.get().softLimitUsd).toBe(3.5)
    expect($aroBudgetLimits.get().hardLimitUsd).toBe(7.5)
  })
})
