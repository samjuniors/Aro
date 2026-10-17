import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as hermes from '@/hermes'

import { WebhooksView } from './index'

vi.mock('@/hermes', async importOriginal => {
  const actual = await importOriginal<typeof hermes>()

  return {
    ...actual,
    createWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    enableWebhooks: vi.fn(),
    getWebhooks: vi.fn(),
    setWebhookEnabled: vi.fn()
  }
})

vi.mock('@/store/notifications', () => ({
  notify: vi.fn(),
  notifyError: vi.fn()
}))

vi.mock('@/store/system-actions', () => ({
  runGatewayRestart: vi.fn()
}))

function renderWebhooksView(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <WebhooksView onClose={onClose} />
      </QueryClientProvider>
    ),
    onClose
  }
}

describe('WebhooksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty subscriptions state when enabled with no items', async () => {
    vi.mocked(hermes.getWebhooks).mockResolvedValue({
      enabled: true,
      subscriptions: []
    } as any)

    renderWebhooksView()

    await waitFor(() => {
      expect(screen.getByText('No webhook subscriptions yet.')).toBeDefined()
    })
  })

  it('renders webhook subscriptions when enabled', async () => {
    vi.mocked(hermes.getWebhooks).mockResolvedValue({
      enabled: true,
      subscriptions: [
        {
          deliver: 'log',
          deliverOnly: false,
          description: 'GitHub push listener',
          enabled: true,
          events: ['push'],
          name: 'github-push',
          path: '/hooks/github-push',
          prompt: 'Summarize commit',
          skills: []
        }
      ]
    } as any)

    renderWebhooksView()

    await waitFor(() => {
      expect(screen.getAllByText('github-push').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Subscriptions (1)')).toBeDefined()
    })
  })

  it('calls onClose when panel close is triggered', async () => {
    vi.mocked(hermes.getWebhooks).mockResolvedValue({
      enabled: true,
      subscriptions: []
    } as any)

    const onClose = vi.fn()
    renderWebhooksView(onClose)

    await waitFor(() => {
      expect(screen.getByText('No webhook subscriptions yet.')).toBeDefined()
    })

    const closeBtn = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
