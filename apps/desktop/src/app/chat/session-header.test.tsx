import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $rightSidebarSection } from '@/app/right-sidebar/store'
import type * as LayoutStore from '@/store/layout'
import { $fileBrowserOpen, toggleRightSide } from '@/store/layout'
import { $sessions } from '@/store/session'

import { SessionHeader } from './session-header'

vi.mock('@/store/layout', async importOriginal => {
  const actual = await importOriginal<typeof LayoutStore>()

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

  it('opens the summary when a task starts and keeps it pinned after outside interaction', () => {
    render(
      <MemoryRouter>
        <SessionHeader activeSessionId="summary-start" busy cwd={null} isRoutedSessionView={false}
          messagesEmpty onDeleteSelectedSession={vi.fn()} onToggleSelectedPin={vi.fn()} selectedSessionId="summary-start" />
      </MemoryRouter>
    )
    expect(screen.getByRole('complementary', { name: 'Pinned task summary' })).toBeDefined()
    fireEvent.pointerDown(document.body)
    expect(screen.getByRole('complementary', { name: 'Pinned task summary' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Changes/ }))
    expect($rightSidebarSection.get()).toBe('changes')
    expect(toggleRightSide).toHaveBeenCalledTimes(1)
  })

  it('respects hiding through task updates and session switches, with an explicit show action', () => {
    const header = (sessionId: string, busy: boolean) => (
      <MemoryRouter>
        <SessionHeader activeSessionId={sessionId} busy={busy} cwd={null} isRoutedSessionView
          messagesEmpty={false} onDeleteSelectedSession={vi.fn()} onToggleSelectedPin={vi.fn()} selectedSessionId={sessionId} />
      </MemoryRouter>
    )

    const { rerender } = render(header('summary-toggle', true))
    fireEvent.click(screen.getAllByRole('button', { name: 'Hide pinned summary' })[0])
    rerender(header('summary-toggle', false))
    rerender(header('summary-toggle', true))
    expect(screen.queryByRole('complementary')).toBeNull()
    rerender(header('summary-other', true))
    expect(screen.getByRole('complementary')).toBeDefined()
    rerender(header('summary-toggle', false))
    expect(screen.queryByRole('complementary')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show pinned summary' }))
    expect(screen.getByRole('complementary')).toBeDefined()
  })
})
