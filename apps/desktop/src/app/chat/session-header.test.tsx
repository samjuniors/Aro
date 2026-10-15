import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $fileBrowserOpen, toggleRightSide } from '@/store/layout'
import { $sessions } from '@/store/session'

import { SessionHeader } from './session-header'

vi.mock('@/store/layout', async importOriginal => {
  const actual = await importOriginal<typeof import('@/store/layout')>()
  return {
    ...actual,
    toggleRightSide: vi.fn(actual.toggleRightSide)
  }
})

describe('SessionHeader', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    $fileBrowserOpen.set(false)
    $sessions.set([])
  })

  it('hides Overview button and Workspace panel toggle in a fresh blank session', () => {
    render(
      <MemoryRouter>
        <SessionHeader
          activeSessionId={null}
          busy={false}
          cwd={null}
          isRoutedSessionView={false}
          messagesEmpty={true}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId={null}
        />
      </MemoryRouter>
    )

    // In a blank session with no messages and agent not busy:
    expect(screen.queryByLabelText(/^Overview$/i)).toBeNull()
    expect(screen.queryByLabelText(/Toggle workspace panel/i)).toBeNull()
    // New session and session actions remain available
    expect(screen.getByLabelText(/New session/i)).toBeDefined()
    expect(screen.getByLabelText(/Session actions/i)).toBeDefined()
  })

  it('automatically opens Overview popover when agent task is running (busy: true)', () => {
    render(
      <MemoryRouter>
        <SessionHeader
          activeSessionId={null}
          busy={true}
          cwd={null}
          isRoutedSessionView={false}
          messagesEmpty={true}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId={null}
        />
      </MemoryRouter>
    )

    const overviewBtn = screen.getByLabelText(/^Overview$/i)
    const toggleBtn = screen.getByLabelText(/Toggle workspace panel/i)

    expect(overviewBtn).toBeDefined()
    expect(toggleBtn).toBeDefined()

    // Popover automatically opens when busy: true
    expect(screen.getByText('Review')).toBeDefined()
    expect(screen.getByText('Files')).toBeDefined()
    expect(screen.getByText('Terminal')).toBeDefined()
    expect(screen.getByText('Plugins')).toBeDefined()
    expect(screen.getByText('Background Tasks')).toBeDefined()

    // Clicking Review opens workspace panel and closes popover
    fireEvent.click(screen.getByText('Review'))
    expect(toggleRightSide).toHaveBeenCalled()
  })

  it('hides Overview popover when agent is not busy, but allows manual toggle via icon button', () => {
    render(
      <MemoryRouter>
        <SessionHeader
          activeSessionId="session-1"
          busy={false}
          cwd="/test/path"
          isRoutedSessionView={true}
          messagesEmpty={false}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId="session-1"
        />
      </MemoryRouter>
    )

    const overviewBtn = screen.getByLabelText(/^Overview$/i)
    expect(overviewBtn).toBeDefined()
    expect(screen.getByLabelText(/Toggle workspace panel/i)).toBeDefined()

    // Popover is initially hidden when not busy
    expect(screen.queryByText('Review')).toBeNull()

    // Clicking overview button manually toggles it open
    fireEvent.click(overviewBtn)
    expect(screen.getByText('Review')).toBeDefined()
  })
})
