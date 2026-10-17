import { beforeEach, describe, expect, it } from 'vitest'

import { WORKSPACE_KEY } from './storage'
import { $userTasks, localTasksAdapter, sanitizeTasks } from './tasks'

describe('tasks adapter (local)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    $userTasks.set([])
  })

  it('sanitizes untrusted persisted records', () => {
    const cleaned = sanitizeTasks([
      { id: 'a', title: 'ok', status: 'doing', createdAt: '2026-01-01T00:00:00Z' },
      null,
      'nope',
      { title: 'no id' },
      { id: 'b', title: 'bad status', status: 'finished' },
      { id: 'c', title: 'ok extra', projectId: 'p1' }
    ])

    expect(cleaned.map(t => t.id)).toEqual(['a', 'b', 'c'])
    expect(cleaned[1].status).toBe('todo')
    expect(cleaned[2].projectId).toBe('p1')
  })

  it('creates, lists, and persists tasks', () => {
    const created = localTasksAdapter.create({ title: '  Wire the local list  ', projectId: 'proj-1' })

    expect(created.title).toBe('Wire the local list')
    expect(created.status).toBe('todo')
    expect(localTasksAdapter.list()).toHaveLength(1)

    const stored = window.localStorage.getItem(WORKSPACE_KEY.tasks)

    expect(stored).not.toBeNull()

    // Restart survival: a fresh read of the same key yields the same record.
    expect(sanitizeTasks(JSON.parse(stored!))).toMatchObject([{ id: created.id, title: 'Wire the local list' }])
  })

  it('updates status and title, ignores unknown ids', () => {
    const a = localTasksAdapter.create({ title: 'first' })

    const updated = localTasksAdapter.update(a.id, { status: 'done', title: 'first — done' })

    expect(updated).toMatchObject({ id: a.id, status: 'done', title: 'first — done' })
    expect(localTasksAdapter.update('missing', { status: 'done' })).toBeNull()
  })

  it('removes tasks and reports misses honestly', () => {
    const a = localTasksAdapter.create({ title: 'gone soon' })

    expect(localTasksAdapter.remove(a.id)).toBe(true)
    expect(localTasksAdapter.remove(a.id)).toBe(false)
    expect(localTasksAdapter.list()).toHaveLength(0)
  })

  it('re-hydrates persisted tasks on module re-init (restart survival)', async () => {
    const a = localTasksAdapter.create({ title: 'survives restarts' })

    // Simulate a cold boot: clear the in-memory store, re-read from storage.
    $userTasks.set(sanitizeTasks(JSON.parse(window.localStorage.getItem(WORKSPACE_KEY.tasks)!)))

    expect(localTasksAdapter.list()).toMatchObject([{ id: a.id, title: 'survives restarts' }])
  })
})
