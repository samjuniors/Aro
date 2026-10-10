import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyDesignAxes,
  DESIGN_AXIS_KEYS,
  DESIGN_PROFILES,
  getDensity,
  getDesignProfile,
  getMotion,
  setDensity,
  setDesignProfile,
  setMotion
} from './design-axes'

const root = () => document.documentElement

describe('aro design axes (A0 foundations)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete root().dataset.design
    delete root().dataset.density
    delete root().dataset.motion
  })

  it('applies the prototype defaults when nothing is persisted', () => {
    applyDesignAxes()

    expect(root().dataset.design).toBe('aro')
    expect(root().dataset.density).toBe('comfortable')
    expect(root().dataset.motion).toBe('system')
  })

  it('applies persisted values across all three axes', () => {
    window.localStorage.setItem(DESIGN_AXIS_KEYS.design, 'editorial')
    window.localStorage.setItem(DESIGN_AXIS_KEYS.density, 'compact')
    window.localStorage.setItem(DESIGN_AXIS_KEYS.motion, 'reduced')

    applyDesignAxes()

    expect(root().dataset.design).toBe('editorial')
    expect(root().dataset.density).toBe('compact')
    expect(root().dataset.motion).toBe('reduced')
  })

  it('normalizes invalid persisted values back to the defaults', () => {
    window.localStorage.setItem(DESIGN_AXIS_KEYS.design, 'hackerman')
    window.localStorage.setItem(DESIGN_AXIS_KEYS.density, 'cozy')
    window.localStorage.setItem(DESIGN_AXIS_KEYS.motion, 'ludicrous')

    applyDesignAxes()

    expect(root().dataset.design).toBe('aro')
    expect(root().dataset.density).toBe('comfortable')
    expect(root().dataset.motion).toBe('system')
  })

  it('setters persist to the conductor.* namespace and apply the attribute', () => {
    setDesignProfile('codex')
    setDensity('compact')
    setMotion('reduced')

    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.design)).toBe('codex')
    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.density)).toBe('compact')
    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.motion)).toBe('reduced')

    expect(root().dataset.design).toBe('codex')
    expect(root().dataset.density).toBe('compact')
    expect(root().dataset.motion).toBe('reduced')

    expect(getDesignProfile()).toBe('codex')
    expect(getDensity()).toBe('compact')
    expect(getMotion()).toBe('reduced')
  })

  it('keeps every prototype profile id addressable', () => {
    for (const profile of DESIGN_PROFILES) {
      setDesignProfile(profile)

      expect(root().dataset.design).toBe(profile)
    }

    expect([...DESIGN_PROFILES]).toEqual(['aro', 'codex', 'claude', 'editorial', 'cursor'])
  })

  it('survives a re-apply (boot path) with the persisted values', () => {
    setDesignProfile('claude')
    setDensity('compact')

    delete root().dataset.design
    delete root().dataset.density

    applyDesignAxes()

    expect(root().dataset.design).toBe('claude')
    expect(root().dataset.density).toBe('compact')
  })
})
