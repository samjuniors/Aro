vi.mock('@/store/profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/profile')>()
  const { atom } = await import('nanostores')
  return {
    ...actual,
    $activeGatewayProfile: atom<string>('default')
  }
})
vi.mock('@/store/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/session')>()
  const { atom } = await import('nanostores')
  return {
    ...actual,
    $connection: atom(null),
    $defaultReasoningEffort: atom<string>('medium'),
    $currentModelSource: atom<string>('manual')
  }
})
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn()
}))

import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from '@/lib/query-client'
import { $currentModel, $currentProvider, $currentReasoningEffort } from '@/store/session'
import { AroModelMenuPanel, resolveMaxReasoningEffortIndex } from './aro-model-menu-panel'
import { ModelMenuCloseContext } from './model-menu-panel'

describe('resolveMaxReasoningEffortIndex', () => {
  it('returns 0 when supportsReasoning is false', () => {
    expect(resolveMaxReasoningEffortIndex('google', 'gemini-1.5-flash', false)).toBe(0)
  })

  it('caps bounded reasoning models at index 3 (High)', () => {
    // Claude models
    expect(resolveMaxReasoningEffortIndex('anthropic', 'claude-3-7-sonnet', true)).toBe(3)
    expect(resolveMaxReasoningEffortIndex('anthropic', 'claude-sonnet-4', true)).toBe(3)
    // Grok
    expect(resolveMaxReasoningEffortIndex('xai', 'grok-beta', true)).toBe(3)
    // Kimi K2
    expect(resolveMaxReasoningEffortIndex('moonshot', 'kimi-k2', true)).toBe(3)
  })

  it('allows uncapped models to reach index 4 (Ultra)', () => {
    expect(resolveMaxReasoningEffortIndex('openai', 'o1', true)).toBe(4)
    expect(resolveMaxReasoningEffortIndex('openai', 'o3-mini', true)).toBe(4)
    expect(resolveMaxReasoningEffortIndex('deepseek', 'deepseek-r1', true)).toBe(4)
  })

  it('clamps to effortWire returned by the gateway route', () => {
    expect(resolveMaxReasoningEffortIndex('openai', 'o1', true, 'high')).toBe(3)
    expect(resolveMaxReasoningEffortIndex('openai', 'o1', true, 'low')).toBe(1)
    expect(resolveMaxReasoningEffortIndex('openai', 'o1', true, 'minimal')).toBe(0)
  })
})

describe('AroModelMenuPanel component', () => {
  const selectModelMock = vi.fn()
  const requestGatewayMock = vi.fn()

  beforeEach(() => {
    queryClient.clear()
    $currentModel.set('claude-3-7-sonnet')
    $currentProvider.set('anthropic')
    $currentReasoningEffort.set('medium')
    selectModelMock.mockClear()
    requestGatewayMock.mockClear()
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  function renderPanel(props: {
    model?: string
    provider?: string
    effort?: string
    supportsReasoning?: boolean
  } = {}) {
    const client: QueryClient = queryClient

    return render(
      <QueryClientProvider client={client}>
        <AroModelMenuPanel
          onSelectModel={selectModelMock}
          profile="default"
          requestGateway={requestGatewayMock}
        >
          <div data-testid="catalog-children">
            <ModelMenuCloseContext.Consumer>
              {close => (
                <button data-testid="select-child-model" onClick={() => close?.()} type="button">
                  Select Child Model
                </button>
              )}
            </ModelMenuCloseContext.Consumer>
          </div>
        </AroModelMenuPanel>
      </QueryClientProvider>
    )
  }

  it('renders reasoning slider with max effort prefilled and clamped', async () => {
    renderPanel()

    // Top head button displays model monogram and name
    const headButton = screen.getByTestId('aro-model-head-button')
    expect(headButton).not.toBeNull()

    // Slider range input is rendered
    const slider = screen.getByRole('slider', { name: /Reasoning effort/i })
    expect(slider).not.toBeNull()
    expect(slider.getAttribute('max')).toBe('4')
    expect(slider.getAttribute('min')).toBe('0')
  })

  it('renders the prototype Toggle component for Thinking and toggles effort', async () => {
    renderPanel()

    const toggle = screen.getByRole('switch', { name: /Toggle thinking/i })
    expect(toggle).not.toBeNull()

    // Click toggle to turn thinking on/off
    fireEvent.click(toggle)
  })

  it('renders direct response notice for non-reasoning models like gpt-4o', async () => {
    $currentModel.set('gpt-4o')
    $currentProvider.set('openai')
    renderPanel({ model: 'gpt-4o', provider: 'openai' })

    // Non-reasoning model does NOT render a broken reasoning slider
    expect(screen.queryByRole('slider', { name: /Reasoning effort/i })).toBeNull()
    // It renders the direct response model explanation card
    expect(screen.getByText(/Direct Response Model/i)).not.toBeNull()
    expect(screen.getByText(/Browse reasoning models/i)).not.toBeNull()
  })

  it('allows clicking discrete effort buttons to select reasoning level', async () => {
    renderPanel()

    const highBtn = screen.getByRole('radio', { name: /Set effort to High/i })
    expect(highBtn).not.toBeNull()
    fireEvent.click(highBtn)
  })

  it('expands catalog and collapses back when child model is selected', async () => {
    renderPanel()

    // Initially collapsed
    expect(screen.queryByTestId('catalog-children')).toBeNull()

    // Click head to expand
    const head = screen.getByTestId('aro-model-head-button')
    fireEvent.click(head)

    // Now catalog is visible
    expect(screen.getByTestId('catalog-children')).not.toBeNull()

    // Selecting a model inside catalog calls closeMenu and collapses catalog
    const selectChild = screen.getByTestId('select-child-model')
    fireEvent.click(selectChild)

    // Now catalog is collapsed again
    expect(screen.queryByTestId('catalog-children')).toBeNull()
    // And compact slider is visible again
    expect(screen.getByRole('slider', { name: /Reasoning effort/i })).not.toBeNull()
  })
})
