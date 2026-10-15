import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { WorkspaceTask } from '@/adapters'
import type { TodoItem } from '@/lib/todos'

import { type AroBridgeEvent, deriveAroSteps } from './bridge'
import {
  mapToolName,
  parseUnifiedDiff,
  parseUnifiedDiffs,
  SourceBadge,
  todosToTasks,
  toolTarget,
  userTaskStatusForColumn,
  userTaskToCard
} from './live'

describe('Aro Live Adapters & Pure Functions (live.tsx & bridge.ts)', () => {
  afterEach(() => {
    cleanup()
  })

  describe('mapToolName', () => {
    it('maps read variants to "read"', () => {
      expect(mapToolName('read')).toBe('read')
      expect(mapToolName('view')).toBe('read')
      expect(mapToolName('ls')).toBe('read')
    })

    it('maps write/edit variants to "edit" or "write"', () => {
      expect(mapToolName('edit')).toBe('edit')
      expect(mapToolName('apply_patch')).toBe('edit')
      expect(mapToolName('write')).toBe('write')
      expect(mapToolName('save')).toBe('write')
    })

    it('maps shell execution to "bash"', () => {
      expect(mapToolName('bash')).toBe('bash')
      expect(mapToolName('shell')).toBe('bash')
      expect(mapToolName('run_command')).toBe('bash')
      expect(mapToolName('execute_code')).toBe('bash')
    })

    it('maps search variants to "grep"', () => {
      expect(mapToolName('grep')).toBe('grep')
      expect(mapToolName('search')).toBe('grep')
      expect(mapToolName('ripgrep')).toBe('grep')
      expect(mapToolName('find')).toBe('grep')
    })

    it('maps plan and browser tools', () => {
      expect(mapToolName('todo_list')).toBe('plan')
      expect(mapToolName('plan')).toBe('plan')
      expect(mapToolName('browser')).toBe('browser')
      expect(mapToolName('web_search')).toBe('browser')
      expect(mapToolName('browser_navigate')).toBe('browser')
    })

    it('maps prefixes for MCP, test, browser, and fallbacks', () => {
      expect(mapToolName('mcp__github_list_issues')).toBe('mcp')
      expect(mapToolName('mcp.fetch')).toBe('mcp')
      expect(mapToolName('run_vitest')).toBe('test')
      expect(mapToolName('pytest_runner')).toBe('test')
      expect(mapToolName('custom_unmapped_tool')).toBe('mcp')
    })
  })

  describe('toolTarget', () => {
    it('extracts strings and clips whitespace', () => {
      expect(toolTarget('ls   -la   /tmp')).toBe('ls -la /tmp')
      expect(toolTarget(null)).toBeUndefined()
      expect(toolTarget(123)).toBeUndefined()
    })

    it('picks targeted keys in priority order', () => {
      expect(toolTarget({ command: 'git status' })).toBe('git status')
      expect(toolTarget({ file_path: 'src/main.ts' })).toBe('src/main.ts')
      expect(toolTarget({ path: 'src/app.tsx' })).toBe('src/app.tsx')
      expect(toolTarget({ pattern: 'TODO' })).toBe('TODO')
      expect(toolTarget({ query: 'how to port' })).toBe('how to port')
      expect(toolTarget({ url: 'https://example.com' })).toBe('https://example.com')
    })
  })

  describe('parseUnifiedDiff & parseUnifiedDiffs', () => {
    it('parses unified diff hunks with additions and deletions', () => {
      const diffText = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 line1
-line2
+line2_modified
+line2_added
 line3`

      const files = parseUnifiedDiffs(diffText)
      expect(files.length).toBe(1)
      expect(files[0]!.path).toBe('file.txt')
      expect(files[0]!.adds).toBe(2)
      expect(files[0]!.dels).toBe(1)
      expect(files[0]!.lines.length).toBeGreaterThan(0)

      const single = parseUnifiedDiff(diffText, 'file.txt')
      expect(single).not.toBeNull()
      expect(single?.path).toBe('file.txt')
      expect(single?.adds).toBe(2)
    })

    it('returns null on empty diff', () => {
      expect(parseUnifiedDiff('')).toBeNull()
    })
  })

  describe('todosToTasks', () => {
    it('converts agent todo items into work-graph Task shapes', () => {
      const todos: TodoItem[] = [
        { id: '1', content: 'Explore repo', status: 'completed' },
        { id: '2', content: 'Implement feature', status: 'in_progress', parent: '1' },
        { id: '3', content: 'Write tests', status: 'pending' },
        { id: '4', content: 'Deploy', status: 'cancelled' }
      ]

      const tasks = todosToTasks(todos)
      expect(tasks.length).toBe(4)

      expect(tasks[0]!.status).toBe('done')
      expect(tasks[0]!.key).toBe('TODO-01')
      expect(tasks[0]!.source).toBe('agent')

      expect(tasks[1]!.status).toBe('running')
      expect(tasks[1]!.priority).toBe('p1')
      expect(tasks[1]!.estimate).toBe('now')
      expect(tasks[1]!.deps).toEqual(['1'])

      expect(tasks[2]!.status).toBe('ready')
      expect(tasks[3]!.status).toBe('backlog')
      expect(tasks[3]!.tags).toEqual(['cancelled'])
    })
  })

  describe('userTaskToCard & userTaskStatusForColumn', () => {
    it('maps user task statuses to columns and card shapes', () => {
      const task: WorkspaceTask = {
        id: 'usr_1',
        title: 'Review PR',
        status: 'doing',
        createdAt: '2026-10-13T10:00:00Z',
      }

      const card = userTaskToCard(task, 0)
      expect(card.id).toBe('usr_1')
      expect(card.key).toBe('MINE-01')
      expect(card.title).toBe('Review PR')
      expect(card.status).toBe('running')
      expect(card.human).toBe(true)
      expect(card.source).toBe('manual')

      expect(userTaskStatusForColumn('backlog')).toBe('todo')
      expect(userTaskStatusForColumn('ready')).toBe('todo')
      expect(userTaskStatusForColumn('running')).toBe('doing')
      expect(userTaskStatusForColumn('review')).toBe('doing')
      expect(userTaskStatusForColumn('done')).toBe('done')
    })
  })

  describe('SourceBadge', () => {
    it('renders "live" badge when live is true', () => {
      render(<SourceBadge live={true} />)
      expect(screen.getByText('live')).toBeDefined()
    })

    it('renders "your list · local" badge when local is true', () => {
      render(<SourceBadge live={false} local={true} />)
      expect(screen.getByText('your list · local')).toBeDefined()
    })

    it('renders offline badge with default label when neither live nor local', () => {
      render(<SourceBadge live={false} />)
      expect(screen.getByText('offline')).toBeDefined()
    })

    it('renders custom demo label when provided', () => {
      render(<SourceBadge demoLabel="preview data" live={false} />)
      expect(screen.getByText('preview data')).toBeDefined()
    })

    it('renders unavailable badge when demoLabel is unavailable and live is false', () => {
      render(<SourceBadge demoLabel="unavailable" live={false} />)
      expect(screen.getByText('unavailable')).toBeDefined()
    })
  })

  describe('deriveAroSteps (bridge.ts)', () => {
    it('folds thinking, tool_call, tool_result, deltas, and reply_done', () => {
      const events: AroBridgeEvent[] = [
        { type: 'session_start', sessionId: 's1', model: 'aro-4-70b', tools: ['web_search'] },
        { type: 'thinking', label: 'Considering task', ms: 50 },
        { type: 'tool_call', callId: 'c1', tool: 'web_search', args: { q: 'Aro port' } },
        { type: 'tool_result', callId: 'c1', ok: true, ms: 120, summary: '1 hit', lines: ['Found result'] },
        { type: 'assistant_delta', text: 'Hello ' },
        { type: 'assistant_delta', text: 'world!' },
        { type: 'reply_done', ms: 250 },
        { type: 'done', ms: 420, toolCalls: 1 }
      ]

      const steps = deriveAroSteps(events)
      expect(steps.length).toBe(3)

      expect(steps[0]!.kind).toBe('thinking')

      if (steps[0]!.kind === 'thinking') {
        expect(steps[0]!.label).toBe('Considering task')
      }

      expect(steps[1]!.kind).toBe('tool')

      if (steps[1]!.kind === 'tool') {
        expect(steps[1]!.callId).toBe('c1')
        expect(steps[1]!.ok).toBe(true)
        expect(steps[1]!.summary).toBe('1 hit')
        expect(steps[1]!.lines).toEqual(['Found result'])
      }

      expect(steps[2]!.kind).toBe('reply')

      if (steps[2]!.kind === 'reply') {
        expect(steps[2]!.text).toBe('Hello world!')
        expect(steps[2]!.closed).toBe(true)
        expect(steps[2]!.ms).toBe(250)
      }
    })

    it('accumulates error events into error steps', () => {
      const events: AroBridgeEvent[] = [
        { type: 'error', message: 'Daemon crashed unexpectedly' }
      ]

      const steps = deriveAroSteps(events)
      expect(steps.length).toBe(1)
      expect(steps[0]!.kind).toBe('error')

      if (steps[0]!.kind === 'error') {
        expect(steps[0]!.message).toBe('Daemon crashed unexpectedly')
      }
    })
  })
})
