import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetAroFeatures, setAroFeature } from './flags'
import { AroReviewPage } from './ReviewHunks'
import type { DiffFile } from './workbenchData'

const mockFiles: DiffFile[] = [
  {
    path: 'src/agent/turn.ts',
    adds: 3,
    dels: 1,
    lang: 'typescript',
    lines: [
      { t: 'hunk', text: '@@ -12,4 +12,6 @@' },
      { t: 'ctx', text: 'export function runTurn() {' },
      { t: 'del', text: '  const oldCost = 0' },
      { t: 'add', text: '  const activeCost = computeCost()' },
      { t: 'add', text: '  logCost(activeCost)' },
      { t: 'add', text: '  checkpointSave()' },
      { t: 'ctx', text: '}' },
    ],
  },
  {
    path: 'src/tools/git.ts',
    adds: 2,
    dels: 0,
    lang: 'typescript',
    lines: [
      { t: 'hunk', text: '@@ -1,3 +1,5 @@' },
      { t: 'ctx', text: 'import { exec } from "child_process"' },
      { t: 'add', text: 'export const STAGE_FILE = "git add"' },
      { t: 'add', text: 'export const RESET_HUNK = "git checkout -p"' },
    ],
  },
]

describe('AroReviewPage (Slice 13.S1 Diff-First Review & Rollback)', () => {
  beforeEach(() => {
    resetAroFeatures()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders disabled state when reviewHunks flag is disabled', () => {
    setAroFeature('reviewHunks', false)

    render(<AroReviewPage />)

    expect(screen.getByText(/Diff-first visual review is currently disabled by feature flag/i)).toBeTruthy()
    expect(screen.getByText('reviewHunks')).toBeTruthy()
    expect(screen.getByText('disabled')).toBeTruthy()
  })

  it('renders honest unavailable state when git review is unavailable or in error', () => {
    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: false,
          error: 'No active repository workspace found for session.',
          files: [],
        }}
      />
    )

    expect(screen.getByText(/No active repository workspace found for session/i)).toBeTruthy()
    expect(screen.getByText('unavailable')).toBeTruthy()
  })

  it('renders clean working tree empty state when no changes exist', () => {
    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: true,
          error: null,
          files: [],
          loading: false,
        }}
      />
    )

    expect(screen.getByText(/Working tree clean\. No uncommitted changes in the repository\./i)).toBeTruthy()
  })

  it('renders loading scanner state when scanning working tree', () => {
    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: true,
          error: null,
          files: [],
          loading: true,
        }}
      />
    )

    expect(screen.getByText(/scanning working tree…/i)).toBeTruthy()
  })

  it('renders changed files list with additions, deletions, and staging controls', () => {
    const stagedSet = new Set<string>(['src/agent/turn.ts'])
    const toggleStaged = vi.fn()

    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: true,
          error: null,
          files: mockFiles,
          loading: false,
          stagedSet,
          toggleStaged,
        }}
      />
    )

    expect(screen.getByText('turn.ts')).toBeTruthy()
    expect(screen.getByText('git.ts')).toBeTruthy()
    expect(screen.getByText('2 files')).toBeTruthy()

    // Staging button test
    const stageButton = screen.getByLabelText('Unstage src/agent/turn.ts')
    expect(stageButton).toBeTruthy()
    fireEvent.click(stageButton)
    expect(toggleStaged).toHaveBeenCalledWith('src/agent/turn.ts')
  })

  it('switches active file when clicking file row in sidebar', () => {
    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: true,
          error: null,
          files: mockFiles,
          loading: false,
          stagedSet: new Set(),
        }}
      />
    )

    expect(screen.getAllByText('src/agent/turn.ts').length).toBeGreaterThan(0)

    const gitFileRow = screen.getByLabelText('Open src/tools/git.ts')
    fireEvent.click(gitFileRow)

    expect(screen.getAllByText('src/tools/git.ts').length).toBeGreaterThan(0)
  })

  it('handles hunk verdicts: accept, reject, reset on double click', () => {
    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: true,
          error: null,
          files: mockFiles,
          loading: false,
          stagedSet: new Set(),
        }}
      />
    )

    // Initially 0 accepted, 0 rejected, 1 pending
    expect(screen.getByText('0 accepted')).toBeTruthy()
    expect(screen.getByText('0 rejected')).toBeTruthy()
    expect(screen.getByText('1 pending')).toBeTruthy()

    // Accept hunk 1
    const acceptBtn = screen.getByLabelText('Accept hunk 1')
    fireEvent.click(acceptBtn)

    expect(screen.getByText('1 accepted')).toBeTruthy()
    expect(screen.getByText('0 pending')).toBeTruthy()
    const resetChip = screen.getByLabelText('Reset hunk 1')
    expect(resetChip.textContent).toContain('accepted')

    // Double-click resets verdict
    fireEvent.doubleClick(resetChip)
    expect(screen.getByText('0 accepted')).toBeTruthy()
    expect(screen.getByText('1 pending')).toBeTruthy()

    // Reject hunk 1
    const rejectBtn = screen.getByLabelText('Reject hunk 1')
    fireEvent.click(rejectBtn)

    expect(screen.getByText('1 rejected')).toBeTruthy()
    expect(screen.getByText('0 pending')).toBeTruthy()
  })

  it('supports inline commenting on hunks with thread resolution and reopening', () => {
    render(
      <AroReviewPage
        forceEnabled={true}
        overrideData={{
          available: true,
          error: null,
          files: mockFiles,
          loading: false,
          stagedSet: new Set(),
        }}
      />
    )

    // Open comment composer on hunk 1
    const commentBtn = screen.getByLabelText('Comment on hunk 1')
    fireEvent.click(commentBtn)

    const input = screen.getByPlaceholderText(/Comment on this hunk — ⏎ to send/i)
    expect(input).toBeTruthy()

    // Type comment and press Enter
    fireEvent.change(input, { target: { value: 'Ensure checkpointSave handles exceptions' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    // Verify comment thread was created
    expect(screen.getByText('Ensure checkpointSave handles exceptions')).toBeTruthy()
    expect(screen.getByText(/1 thread/i)).toBeTruthy()

    // Resolve thread
    const resolveBtn = screen.getByLabelText('Resolve thread')
    fireEvent.click(resolveBtn)
    expect(screen.getByText(/resolved/i)).toBeTruthy()

    // Reopen thread
    const reopenBtn = screen.getByLabelText('Reopen thread')
    fireEvent.click(reopenBtn)
    expect(screen.queryByText(/resolved/i)).toBeNull()
  })

  it('renders checkpoints and triggers restore', () => {
    const checkpoints = [
      { hash: 'a1b2c3d', label: 'Added cost HUD computation', at: '14:22' },
      { hash: 'e4f5g6h', label: 'Initial tool setup', at: '14:10' },
    ]

    render(
      <AroReviewPage
        forceEnabled={true}
        overrideCheckpoints={checkpoints}
        overrideData={{
          available: true,
          error: null,
          files: mockFiles,
          loading: false,
          stagedSet: new Set(),
        }}
      />
    )

    expect(screen.getByText('Added cost HUD computation')).toBeTruthy()
    expect(screen.getByText('Initial tool setup')).toBeTruthy()

    const restoreButtons = screen.getAllByText('restore')
    expect(restoreButtons.length).toBe(2)
    fireEvent.click(restoreButtons[0])

    expect(screen.getByText(/Checkpoint restored — working tree rolled back/i)).toBeTruthy()
  })
})
