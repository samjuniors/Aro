import { beforeEach, describe, expect, it } from 'vitest'

import { readLocalRecord, WORKSPACE_KEY, writeLocalRecord } from './storage'
import { sanitizeTasks } from './tasks'

describe('local-adapter storage helper', () => {
  beforeEach(() => window.localStorage.clear())

  it('reads the fallback when the key is absent', () => {
    expect(readLocalRecord('conductor.missing', ['x'], (v): string[] => (Array.isArray(v) ? (v as string[]) : []))).toEqual(['x'])
  })

  it('round-trips a JSON record through the host storage choke point', () => {
    writeLocalRecord(WORKSPACE_KEY.tasks, [{ id: 't1', title: 'Ship it', status: 'todo', createdAt: '2026-10-10T00:00:00Z' }])

    const stored = window.localStorage.getItem(WORKSPACE_KEY.tasks)

    expect(stored).not.toBeNull()

    const parsed = readLocalRecord<ReturnType<typeof sanitizeTasks>>(WORKSPACE_KEY.tasks, [], sanitizeTasks)

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({ id: 't1', title: 'Ship it', status: 'todo' })
  })

  it('falls back on malformed JSON without throwing', () => {
    window.localStorage.setItem(WORKSPACE_KEY.rules, 'not json')

    expect(readLocalRecord(WORKSPACE_KEY.rules, [], (v): string[] => (Array.isArray(v) ? (v as string[]) : []))).toEqual([])
  })

  it('keeps every persisted key inside the conductor prototype namespace', () => {
    const keys = Object.values(WORKSPACE_KEY)

    expect(keys.length).toBeGreaterThan(0)

    for (const key of keys) {
      expect(key.startsWith('conductor.')).toBe(true)
    }
  })
})
