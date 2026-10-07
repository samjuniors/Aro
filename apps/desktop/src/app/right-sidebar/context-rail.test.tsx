import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $activeSessionId, $sessions, setCurrentCwd } from '@/store/session'
import { $focusedWorkspaceCwd } from '@/store/session-states'
import { $todosBySession } from '@/store/todos'

import { RightSidebarPane } from './index'
import { $rightSidebarSection, setRightSidebarSection } from './store'

describe('Right Context Rail', () => {
  beforeEach(() => {
    setRightSidebarSection('files')
    $todosBySession.set({})
    $activeSessionId.set('test-session')
    setCurrentCwd('')
  })

  afterEach(() => {
    cleanup()
    setRightSidebarSection('files')
    $todosBySession.set({})
    $activeSessionId.set(null)
    setCurrentCwd('')
  })

  it('switches to Plan section and shows empty state when no todos', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const planBtn = screen.getByRole('button', { name: 'Plan' })
    fireEvent.click(planBtn)

    expect(screen.getByText('No active plan')).toBeDefined()
    expect(
      screen.getByText('The agent will create and maintain steps as tasks are planned and executed.')
    ).toBeDefined()
  })

  it('renders live todos in Plan section when present', () => {
    $todosBySession.set({
      'test-session': [
        { id: '1', content: 'Configure Aro UI layer', status: 'completed' },
        { id: '2', content: 'Run verification tests', status: 'in_progress' },
        { id: '3', content: 'Final code audit', status: 'pending' },
      ],
    })

    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const planBtn = screen.getByRole('button', { name: 'Plan' })
    fireEvent.click(planBtn)

    expect(screen.getByText('Implementation plan')).toBeDefined()
    expect(screen.getByText('1/3 tasks')).toBeDefined()
    expect(screen.getByText('Configure Aro UI layer')).toBeDefined()
    expect(screen.getByText('Run verification tests')).toBeDefined()
    expect(screen.getByText('Final code audit')).toBeDefined()
  })

  it('switches to Git section and renders empty state without workspace git', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const gitBtn = screen.getByRole('button', { name: 'Git' })
    fireEvent.click(gitBtn)

    expect(screen.getByText('No Git Repository')).toBeDefined()
  })

  it('switches to Terminal section and mounts terminal slot', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const terminalBtn = screen.getByRole('button', { name: 'Terminal' })
    fireEvent.click(terminalBtn)

    expect(screen.getByText('Embedded Terminal')).toBeDefined()
    expect(document.querySelector('[data-terminal-slot]')).not.toBeNull()
  })

  it('switches to Context section and shows context window info', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const contextBtn = screen.getByRole('button', { name: 'Context' })
    fireEvent.click(contextBtn)

    expect(screen.getByText('Context window')).toBeDefined()
    expect(screen.getByText('MCP Connectors')).toBeDefined()
  })
})
