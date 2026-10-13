import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { $activeSessionId } from '@/store/session'
import { $subagentsBySession, type SubagentProgress } from '@/store/subagents'

import { AgentsView } from './index'

describe('AgentsView', () => {
  const onClose = vi.fn()

  beforeAll(() => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn().mockReturnValue({
        cancel: vi.fn(),
        finished: Promise.resolve(),
        onfinish: null
      })
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    $activeSessionId.set('sess-1')
    $subagentsBySession.set({})
  })

  afterEach(() => {
    cleanup()
    $subagentsBySession.set({})
  })

  it('renders empty state when there are no subagents', () => {
    render(<AgentsView onClose={onClose} />)

    expect(screen.getByText('No live subagents')).toBeDefined()
    expect(
      screen.getByText('When a turn delegates work, child agents stream their progress here.')
    ).toBeDefined()
  })

  it('calls onClose when close button is clicked', () => {
    render(<AgentsView onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: 'Close agents' })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders subagent tree when active subagents exist', () => {
    const mockAgent: SubagentProgress = {
      filesRead: ['package.json'],
      filesWritten: [],
      goal: 'Explore workspace files and summarize dependencies',
      id: 'sub-1',
      model: 'claude-3-5-sonnet',
      parentId: null,
      startedAt: Date.now() - 5000,
      status: 'running',
      stream: [
        {
          at: Date.now() - 2000,
          kind: 'progress',
          text: 'Scanning project structure...'
        }
      ],
      taskCount: 1,
      taskIndex: 0,
      updatedAt: Date.now()
    }

    $subagentsBySession.set({
      'sess-1': [mockAgent]
    })

    render(<AgentsView onClose={onClose} />)

    expect(screen.getByText('Spawn tree')).toBeDefined()
    expect(screen.getByText('Explore workspace files and summarize dependencies')).toBeDefined()
    expect(screen.getByText('Scanning project structure...')).toBeDefined()
  })
})
