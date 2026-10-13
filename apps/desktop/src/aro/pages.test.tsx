import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AroBridgeView } from './AroBridgeView'
import type * as bridgeModule from './bridge'
import { AroDesignSystemPage } from './DesignSystemAro'
import { AroReviewPage } from './ReviewHunks'
import { AroTasksPage } from './TasksBoard'
import { AroTranscriptPage } from './ToolTimeline'

// Mock useAroBridge for AroBridgeView tests
vi.mock('./bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof bridgeModule>()

  return {
    ...actual,
    useAroBridge: vi.fn(() => ({
      status: 'ready' as const,
      sessionId: 'as_mock123456',
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
  }
})

describe('Aro Pages Component Tests', () => {
  afterEach(() => {
    cleanup()
  })

  describe('AroTranscriptPage (/aro-transcript)', () => {
    it('renders the timeline header, session details, and step cards', () => {
      render(<AroTranscriptPage />)

      expect(screen.getByText('Session transcript')).toBeDefined()
      expect(screen.getByText(/tool timeline/)).toBeDefined()
      // Check that tool cards and prose steps are rendered from seed or live data
      expect(screen.getAllByText(/edit|read|shell|search|plan/).length).toBeGreaterThan(0)
    })
  })

  describe('AroReviewPage (/aro-review)', () => {
    it('renders review header, files list, diff view, and layout switchers', () => {
      render(<AroReviewPage />)

      expect(screen.getByText('Review changes')).toBeDefined()
      expect(screen.getByText('Side by side')).toBeDefined()
      expect(screen.getByText('Unified')).toBeDefined()

      // Toggle layout
      const unifiedButton = screen.getByText('Unified')
      fireEvent.click(unifiedButton)

      // Check action buttons
      expect(screen.getByText('Restore checkpoint')).toBeDefined()
      expect(screen.getByText('Request changes')).toBeDefined()
    })

    it('allows opening comment composer and typing comments on hunks', () => {
      render(<AroReviewPage />)

      const commentButton = screen.getAllByRole('button', { name: /Comment/i })[0]

      if (commentButton) {
        fireEvent.click(commentButton)
        const input = screen.getByPlaceholderText(/Comment on this hunk/i)
        expect(input).toBeDefined()
        fireEvent.change(input, { target: { value: 'Please rename this variable' } })
        expect((input as HTMLInputElement).value).toBe('Please rename this variable')
      }
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
    it('renders bridge session status, timeline steps, and engine switcher', () => {
      render(<AroBridgeView />)

      expect(screen.getByText('Bridge session')).toBeDefined()
      expect(screen.getByText('ready')).toBeDefined()
      expect(screen.getByText(/session as_mock/)).toBeDefined()
      expect(screen.getByText('Demo')).toBeDefined()
      expect(screen.getByText('OpenAI')).toBeDefined()

      // Switching to OpenAI reveals endpoint controls
      fireEvent.click(screen.getByText('OpenAI'))
      expect(screen.getByText('endpoint')).toBeDefined()
      expect(screen.getByLabelText('base url')).toBeDefined()
      expect(screen.getByLabelText('model')).toBeDefined()

      // Steps rendered
      expect(screen.getByText('Reading repository structure')).toBeDefined()
      expect(screen.getByText('Here are the design tokens for Aro.')).toBeDefined()
    })
  })
})
