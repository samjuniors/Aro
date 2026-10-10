import { beforeEach, describe, expect, it } from 'vitest'

import { $rules, localRulesAdapter } from './rules'
import { WORKSPACE_KEY } from './storage'

describe('rules adapter (local)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    $rules.set([])
  })

  it('adds trimmed rules and rejects duplicates and blanks', () => {
    expect(localRulesAdapter.add('  Prefer small diffs  ')).toBe(true)
    expect(localRulesAdapter.add('Prefer small diffs')).toBe(false)
    expect(localRulesAdapter.add('   ')).toBe(false)

    expect(localRulesAdapter.list()).toEqual(['Prefer small diffs'])
  })

  it('removes by index and reports misses honestly', () => {
    localRulesAdapter.add('one')
    localRulesAdapter.add('two')

    expect(localRulesAdapter.remove(0)).toBe(true)
    expect(localRulesAdapter.remove(9)).toBe(false)
    expect(localRulesAdapter.list()).toEqual(['two'])
  })

  it('persists under the prototype key and survives a cold re-read', () => {
    localRulesAdapter.add('never invent wire')

    const stored = window.localStorage.getItem(WORKSPACE_KEY.rules)

    expect(stored).toBe(JSON.stringify(['never invent wire']))

    $rules.set(JSON.parse(stored!))

    expect(localRulesAdapter.list()).toEqual(['never invent wire'])
  })
})
