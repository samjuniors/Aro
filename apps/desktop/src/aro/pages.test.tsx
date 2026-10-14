import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $reviewFiles, $reviewIsRepo } from '@/store/review'
import { $currentCwd } from '@/store/session'

import { AroBridgeView } from './AroBridgeView'
import { useAroBridge } from './bridge'
import { AroDesignSystemPage } from './DesignSystemAro'
import { AroReviewPage } from './ReviewHunks'
import { AroTasksPage } from './TasksBoard'
import { AroTranscriptPage } from './ToolTimeline'

// Mock useAroBridge for AroBridgeView tests without circular imports
vi.mock('./bridge', () => ({
  useAroBridge: vi.fn(() => ({
    status: 'ready' as const,
    sessionId: 'as_mock123456',
    activeSessionId: 'sess_active123',
    startError: null,
    steps: [
      { kind: 'thinking' as const, label: 'Reading repository structure', ms: 1200 },
      {
        kind: 'tool' as const,
        callId: 'call_1',
        tool: 'web_search',
        args: { query: 'Aro design system' },
        ok: true,
        ms: 350,
        summary: 'Found 3 results',
        lines: ['- Result 1', '- Result 2']
      },
      { kind: 'reply' as const, text: 'Here are the design tokens for Aro.', closed: true, ms: 800 }
    ],
    busy: false,
    send: vi.fn(),
    toolResult: vi.fn(),
    interrupt: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn()
  }))
}))

function stubGitReview(diffContent = '') {
  const diffMock = vi.fn(async () => diffContent)
  const stageMock = vi.fn(async () => undefined)

  const unstageMock = vi.fn(async () => undefined)

  ;(window as unknown as { hermesDesktop?: unknown }).hermesDesktop = {
    git: {
      review: {
        diff: diffMock,
        stage: stageMock,
        unstage: unstageMock,
        list: vi.fn(async () => ({ files: [] })),
        revert: vi.fn(async () => undefined)
      }
    }
  }

  return { diffMock, stageMock, unstageMock }
}

const SAMPLE_UNIFIED_DIFF = `diff --git a/src/core.ts b/src/core.ts
--- a/src/core.ts
+++ b/src/core.ts
@@ -1,2 +1,3 @@
 const a = 1
-const b = 2
+const b = 20
+const c = 30
`

describe('Aro Pages Component Tests', () => {
  beforeEach(() => {
    $currentCwd.set('/repo')
    $reviewIsRepo.set(true)
    $reviewFiles.set([])
    stubGitReview('')
  })

  afterEach(() => {
    cleanup()
    delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
  })

  describe('AroTranscriptPage (/aro-transcript)', () => {
    it('renders the timeline header, session details, and step cards', () => {
      render(<AroTranscriptPage />)

      expect(screen.getByText('Session transcript')).toBeDefined()
      expect(screen.getByText(/tool timeline/)).toBeDefined()
      expect(screen.getAllByText(/edit|read|shell|search|plan/).length).toBeGreaterThan(0)
    })
  })

  describe('AroReviewPage (/aro-review)', () => {
    it('renders genuine empty state when working tree is clean', () => {
      $reviewIsRepo.set(true)
      $reviewFiles.set([])

      render(<AroReviewPage />)

      expect(screen.getByText('Review changes')).toBeDefined()
      expect(screen.getByText('live')).toBeDefined()
      expect(screen.getByText(/Working tree clean/)).toBeDefined()
    })

    it('renders honest unavailable state when git review is unavailable', () => {
      $reviewIsRepo.set(false)
      $reviewFiles.set([])

      render(<AroReviewPage />)

      expect(screen.getByText('Review changes')).toBeDefined()
      expect(screen.getByText('unavailable')).toBeDefined()
      expect(screen.getByText(/Git review unavailable|Git review is unavailable/)).toBeDefined()
    })

    it('renders real diff files, hunks, layout switchers, and comment composer without mock fallback', async () => {
      stubGitReview(SAMPLE_UNIFIED_DIFF)
      $reviewIsRepo.set(true)
      $reviewFiles.set([
        {
          path: 'src/core.ts',
          status: 'modified',
          staged: false,
          added: 2,
          removed: 1
        } as any
      ])

      render(<AroReviewPage />)

      expect(screen.getByText('Review changes')).toBeDefined()

      // Wait for diff to load and render the file and hunks
      await waitFor(() => {
        expect(screen.getByText('src/core.ts')).toBeDefined()
      })

      expect(screen.getByText('Side by side')).toBeDefined()
      expect(screen.getByText('Unified')).toBeDefined()

      // Toggle layout
      const unifiedButton = screen.getByText('Unified')
      fireEvent.click(unifiedButton)

      // Check action buttons
      expect(screen.getByText('Restore checkpoint')).toBeDefined()
      expect(screen.getByText('Request changes')).toBeDefined()

      // Accept hunk
      const acceptButton = screen.getByRole('button', { name: /Accept hunk 1/i })
      fireEvent.click(acceptButton)
      expect(screen.getByText('accepted ✓')).toBeDefined()

      // Open comment composer
      const commentButton = screen.getByRole('button', { name: /Comment on hunk 1/i })
      fireEvent.click(commentButton)
      const input = screen.getByPlaceholderText(/Comment on this hunk/i)
      expect(input).toBeDefined()
      fireEvent.change(input, { target: { value: 'Please rename this variable' } })
      expect((input as HTMLInputElement).value).toBe('Please rename this variable')
    })
  })

  describe('AroTasksPage (/aro-tasks)', () => {
    it('renders the 5 work-graph columns', () => {
      render(<AroTasksPage />)

      expect(screen.getByText('Tasks')).toBeDefined()
      expect(screen.getAllByText('Backlog').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Ready').length).toBeGreaterThan(0)
      expect(screen.getAllByText('In progress').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Review').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Done').length).toBeGreaterThan(0)
    })

    it('filters tasks by search input', () => {
      render(<AroTasksPage />)

      const searchInput = screen.getByPlaceholderText(/Filter tasks/i)
      fireEvent.change(searchInput, { target: { value: 'Aro' } })
      expect((searchInput as HTMLInputElement).value).toBe('Aro')
    })

    it('allows creating a new user task', () => {
      render(<AroTasksPage />)

      const addButton = screen.getByRole('button', { name: /New task/i })
      fireEvent.click(addButton)

      const taskInput = screen.getByPlaceholderText(/What needs to be done/i)
      fireEvent.change(taskInput, { target: { value: 'Custom user task' } })

      const submitButton = screen.getByRole('button', { name: /^Add$/i })
      fireEvent.click(submitButton)

      expect(screen.getByText('Custom user task')).toBeDefined()
    })
  })

  describe('AroDesignSystemPage (/aro-design)', () => {
    it('renders design system tokens, sections, and interactive primitives', () => {
      render(<AroDesignSystemPage />)

      expect(screen.getByText(/A design system for/)).toBeDefined()
      expect(screen.getAllByText(/Obsidian|Daylight|Nord|Ember|Paper/).length).toBeGreaterThan(0)
    })
  })

  describe('AroBridgeView (/aro-agent)', () => {
    it('renders bridge session status, timeline steps, demo badge, and engine switcher', () => {
      render(<AroBridgeView />)

      expect(screen.getByText('Bridge session')).toBeDefined()
      expect(screen.getByText('ready')).toBeDefined()
      expect(screen.getByText(/bridge as_mock/)).toBeDefined()
      expect(screen.getByText(/session sess_act/)).toBeDefined()
      expect(screen.getByText('demo mode (synthetic)')).toBeDefined()
      expect(screen.getByText(/Running in/)).toBeDefined()
      expect(screen.getByText('Demo')).toBeDefined()
      expect(screen.getByRole('button', { name: 'OpenAI' })).toBeDefined()

      // Switching to OpenAI reveals endpoint controls
      fireEvent.click(screen.getByRole('button', { name: 'OpenAI' }))
      expect(screen.getByText('endpoint')).toBeDefined()
      expect(screen.getByLabelText('base url')).toBeDefined()
      expect(screen.getByLabelText('model')).toBeDefined()
      expect(screen.getByLabelText('api key')).toBeDefined()

      // Steps rendered
      expect(screen.getByText('Reading repository structure')).toBeDefined()
      expect(screen.getByText('Here are the design tokens for Aro.')).toBeDefined()
    })

    it('renders idle status and Start bridge button when bridge is not yet started', () => {
      const mockBridge = vi.mocked(useAroBridge)
      mockBridge.mockReturnValueOnce({
        status: 'idle' as const,
        sessionId: null,
        activeSessionId: 'sess_active123',
        startError: null,
        steps: [],
        events: [],
        busy: false,
        start: vi.fn(async () => undefined),
        send: vi.fn(),
        toolResult: vi.fn(),
        interrupt: vi.fn(),
        stop: vi.fn(),
        restart: vi.fn(async () => undefined)
      })

      render(<AroBridgeView />)

      expect(screen.getByText('idle')).toBeDefined()
      expect(screen.getByRole('button', { name: /Start bridge/i })).toBeDefined()
      expect(screen.getByText('Bridge daemon idle')).toBeDefined()
    })
  })
})
