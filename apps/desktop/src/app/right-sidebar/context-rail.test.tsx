import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $activeSessionId,
  $selectedStoredSessionId,
  $workspaceCwdOwner,
  setCurrentCwd
} from '@/store/session'
import { $todosBySession } from '@/store/todos'

import { $rightSidebarSection, setRightSidebarSection } from './store'

import { RightSidebarPane } from './index'

describe('Right Context Rail', () => {
  beforeEach(() => {
    setRightSidebarSection('files')
    $todosBySession.set({})
    $activeSessionId.set('test-session')
    $selectedStoredSessionId.set('test-session')
    $workspaceCwdOwner.set('test-session')
    setCurrentCwd('')
  })

  afterEach(() => {
    cleanup()
    setRightSidebarSection('files')
    $todosBySession.set({})
    $activeSessionId.set(null)
    $selectedStoredSessionId.set(null)
    $workspaceCwdOwner.set(null)
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

  it('switches to Search section and renders empty state without workspace', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const searchBtn = screen.getByRole('button', { name: 'Search' })
    fireEvent.click(searchBtn)

    expect(screen.getByText('No workspace open')).toBeDefined()
    expect(
      screen.getByText('Open a project or folder to search text and code across workspace files.')
    ).toBeDefined()
  })

  it('switches to Search section with workspace and allows searching', async () => {
    setCurrentCwd('/repo')

    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const searchBtn = screen.getByRole('button', { name: 'Search' })
    fireEvent.click(searchBtn)

    const input = screen.getByPlaceholderText('Search project files…')
    expect(input).toBeDefined()

    fireEvent.change(input, { target: { value: 'test-needle' } })
    expect(screen.getByText('no matches for “test-needle”')).toBeDefined()
  })

  it('switches to Browser section and renders empty state and controls', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const browserBtn = screen.getByRole('button', { name: 'Browser' })
    fireEvent.click(browserBtn)

    expect(screen.getByText('No page open')).toBeDefined()
    expect(screen.getByPlaceholderText('https://example.com')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Desktop viewport' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Tablet (768px) viewport' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Mobile (390px) viewport' })).toBeDefined()
  })

  it('allows navigating to a preview URL in Browser section', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const browserBtn = screen.getByRole('button', { name: 'Browser' })
    fireEvent.click(browserBtn)

    const urlInput = screen.getByPlaceholderText('https://example.com')
    fireEvent.change(urlInput, { target: { value: 'https://example.org/test' } })

    const openBtn = screen.getByRole('button', { name: 'Open' })
    fireEvent.click(openBtn)

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('https://example.org/test')
  })

  it('persists right sidebar active section to storage', () => {
    render(<RightSidebarPane onActivateFile={vi.fn()} onActivateFolder={vi.fn()} />)

    const searchBtn = screen.getByRole('button', { name: 'Search' })
    fireEvent.click(searchBtn)

    expect($rightSidebarSection.get()).toBe('search')
    expect(window.localStorage.getItem('conductor.workspace.panel.section')).toBe('search')
  })
})
