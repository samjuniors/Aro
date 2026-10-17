import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $rightSidebarSection } from '@/app/right-sidebar/store'
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
    $rightSidebarSection.set('files')
    $sessions.set([])
  })

  it('hides Overview button but keeps Workspace panel toggle accessible in a fresh blank session', () => {
    render(
      <MemoryRouter>
        <SessionHeader
          activeSessionId="draft_new-user"
          busy={false}
          cwd={null}
          isRoutedSessionView={false}
          messagesEmpty={true}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId="draft_new-user"
        />
      </MemoryRouter>
    )

    // In a blank session with no messages and agent not busy:
    expect(screen.queryByLabelText(/^Overview$/i)).toBeNull()
    expect(screen.getByLabelText(/Toggle workspace panel/i)).toBeDefined()
    // A new-user draft has no title/session bar. Its corner tab menu stays in
    // the chat pane, while session-only actions stay hidden.
    expect(document.querySelector('[data-aro-session-header-mode="corner-tabs-only"]')).not.toBeNull()
    expect(screen.getByLabelText(/New tab/i)).toBeDefined()
    expect(screen.queryByLabelText(/Session actions/i)).toBeNull()
    expect(screen.queryByText(/New session/i)).toBeNull()
  })

  it('opens the workspace new-tab surface instead of creating another chat session', () => {
    render(
      <MemoryRouter>
        <SessionHeader
          activeSessionId="draft_new-user"
          busy={false}
          cwd={null}
          isRoutedSessionView={false}
          messagesEmpty={true}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId="draft_new-user"
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByLabelText(/New tab/i))

    expect($rightSidebarSection.get()).toBe('launchpad')
    expect(toggleRightSide).toHaveBeenCalledTimes(1)
    expect($sessions.get()).toEqual([])
  })

  it('toggles between New tab icon and Close workspace panel icon in the right corner', () => {
    const { rerender } = render(
      <MemoryRouter>
        <SessionHeader
          activeSessionId="draft_new-user"
          busy={false}
          cwd={null}
          isRoutedSessionView={false}
          messagesEmpty={true}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId="draft_new-user"
        />
      </MemoryRouter>
    )

    const newTabBtn = screen.getByLabelText(/New tab/i)
    fireEvent.click(newTabBtn)
    expect($rightSidebarSection.get()).toBe('launchpad')
    expect(toggleRightSide).toHaveBeenCalledTimes(1)

    // Simulate panel opened in store
    $fileBrowserOpen.set(true)
    rerender(
      <MemoryRouter>
        <SessionHeader
          activeSessionId="draft_new-user"
          busy={false}
          cwd={null}
          isRoutedSessionView={false}
          messagesEmpty={true}
          onDeleteSelectedSession={vi.fn()}
          onToggleSelectedPin={vi.fn()}
          selectedSessionId="draft_new-user"
        />
      </MemoryRouter>
    )

    const closeBtn = screen.getByLabelText(/Close workspace panel/i)
    fireEvent.click(closeBtn)
    expect(toggleRightSide).toHaveBeenCalledTimes(2)
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
