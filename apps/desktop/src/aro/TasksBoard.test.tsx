import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetAroFeatures, setAroFeature } from './flags'
import { AroTasksPage } from './TasksBoard'
import type { Task } from './workbenchData'

const mockTasks: Task[] = [
  {
    id: 't1',
    key: 'T-101',
    title: 'Design token HUD architecture',
    status: 'done',
    priority: 'p1',
    source: 'agent',
    assignee: 'aro',
    estimate: '2h',
    criteria: ['Atom store implemented', 'Persistent limits'],
    tags: ['cost', 'hud'],
    cost: '$0.05',
  },
  {
    id: 't2',
    key: 'T-102',
    title: 'Implement work-graph dependencies',
    status: 'running',
    priority: 'p0',
    source: 'agent',
    assignee: 'claude-code',
    estimate: '4h',
    deps: ['t1'],
    criteria: ['Blocked badge rendered', 'Click to inspect dependency'],
    tags: ['tasks', 'graph'],
    cost: '$0.12',
  },
  {
    id: 't3',
    key: 'T-103',
    title: 'Deploy multi-agent test harness',
    status: 'ready',
    priority: 'p2',
    source: 'github',
    assignee: 'codex',
    estimate: '3h',
    deps: ['t2'], // t2 is running, not done -> t3 is blocked
    criteria: ['Harness verification suite passes'],
    tags: ['test', 'harness'],
  },
  {
    id: 't4',
    key: 'T-104',
    title: 'Human verification and review',
    status: 'backlog',
    priority: 'p3',
    source: 'manual',
    human: true,
    estimate: '1h',
    criteria: ['Founder sign-off'],
    tags: ['review'],
  },
]

describe('AroTasksPage (Slice 13.S3 Parallel Tasks Work-Graph)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetAroFeatures()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders disabled state when parallelTasksBoard flag is false', () => {
    setAroFeature('parallelTasksBoard', false)

    render(<AroTasksPage />)

    expect(screen.getByText(/Parallel Tasks Work-Graph is currently disabled by feature flag/i)).toBeTruthy()
    expect(screen.getByText('parallelTasksBoard')).toBeTruthy()
    expect(screen.getByText('disabled')).toBeTruthy()
  })

  it('renders clean empty state when no tasks exist', () => {
    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          hasSession: false,
          live: false,
          local: true,
          tasks: [],
        }}
      />
    )

    expect(screen.getByText('No tasks on this board yet')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add your first task/i })).toBeTruthy()
  })

  it('renders 5-column Kanban board with task counts and cards', () => {
    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          hasSession: true,
          live: true,
          local: false,
          tasks: mockTasks,
        }}
      />
    )

    // Column titles
    expect(screen.getByText('Backlog')).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
    expect(screen.getByText('In progress')).toBeTruthy()
    expect(screen.getByText('Review')).toBeTruthy()
    expect(screen.getByText('Done')).toBeTruthy()

    // Task card keys & titles
    expect(screen.getByText('T-101')).toBeTruthy()
    expect(screen.getByText('Design token HUD architecture')).toBeTruthy()
    expect(screen.getByText('T-102')).toBeTruthy()
    expect(screen.getByText('Implement work-graph dependencies')).toBeTruthy()
    expect(screen.getByText('T-103')).toBeTruthy()
    expect(screen.getByText('T-104')).toBeTruthy()
  })

  it('correctly calculates blocked status based on upstream unfinished dependencies', () => {
    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          hasSession: true,
          live: true,
          local: false,
          tasks: mockTasks,
        }}
      />
    )

    // t3 depends on t2 (which is running, not done) -> t3 is blocked
    expect(screen.getAllByText('blocked').length).toBeGreaterThan(0)

    // Stats row checks
    expect(screen.getByText('in progress')).toBeTruthy()
    expect(screen.getByText('needs you')).toBeTruthy()
    expect(screen.getByText('waiting on deps')).toBeTruthy()
  })

  it('switches between Board and List layouts', () => {
    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          hasSession: true,
          live: true,
          local: false,
          tasks: mockTasks,
        }}
      />
    )

    const listBtn = screen.getByRole('button', { name: 'List' })
    fireEvent.click(listBtn)

    // In list mode, rows render priority, key, title in a table-like layout
    expect(screen.getByText('Design token HUD architecture')).toBeTruthy()

    const boardBtn = screen.getByRole('button', { name: 'Board' })
    fireEvent.click(boardBtn)
    expect(screen.getByText('Backlog')).toBeTruthy()
  })

  it('filters tasks based on search query', () => {
    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          hasSession: true,
          live: true,
          local: false,
          tasks: mockTasks,
        }}
      />
    )

    const filterInput = screen.getByLabelText('Filter tasks')
    fireEvent.change(filterInput, { target: { value: 'HUD' } })

    expect(screen.getByText('Design token HUD architecture')).toBeTruthy()
    expect(screen.queryByText('Deploy multi-agent test harness')).toBeNull()
  })

  it('opens task detail drawer, displays criteria, and allows status transition', () => {
    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          hasSession: true,
          live: true,
          local: false,
          tasks: mockTasks,
        }}
      />
    )

    // Click T-101 card
    const card = screen.getByText('Design token HUD architecture')
    fireEvent.click(card)

    // Detail drawer inspection
    expect(screen.getByText('Atom store implemented')).toBeTruthy()
    expect(screen.getByText('Persistent limits')).toBeTruthy()
    expect(screen.getByText('estimate')).toBeTruthy()
    expect(screen.getByText('spent')).toBeTruthy()

    // Move to Review status
    const reviewBtn = screen.getAllByRole('button', { name: 'Review' })
    // The button inside the status control
    fireEvent.click(reviewBtn[reviewBtn.length - 1]!)

    // Close detail drawer
    const closeBtn = screen.getByLabelText('Close')
    fireEvent.click(closeBtn)
  })

  it('allows creating a new user task via the task composer', () => {
    const createUserTask = vi.fn()

    render(
      <AroTasksPage
        forceEnabled={true}
        overrideData={{
          createUserTask,
          hasSession: true,
          isUserTask: () => true,
          live: false,
          local: true,
          tasks: mockTasks,
        }}
      />
    )

    const newBtn = screen.getByRole('button', { name: 'New task' })
    fireEvent.click(newBtn)

    const input = screen.getByLabelText('New task title')
    fireEvent.change(input, { target: { value: 'Write E2E integration test' } })

    const addBtn = screen.getByRole('button', { name: 'Add' })
    fireEvent.click(addBtn)

    expect(createUserTask).toHaveBeenCalledWith('Write E2E integration test')
  })
})
