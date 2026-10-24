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

  it('exposes recommended themes for each design profile', async () => {
    const { RECOMMENDED_THEMES } = await import('./design-axes')
    expect(RECOMMENDED_THEMES.aro).toBe('obsidian')
    expect(RECOMMENDED_THEMES.codex).toBe('codex')
    expect(RECOMMENDED_THEMES.claude).toBe('ember')
    expect(RECOMMENDED_THEMES.editorial).toBe('nous')
    expect(RECOMMENDED_THEMES.cursor).toBe('obsidian')
  })

  it('handles theme sync, voice orb, and merge strategy persistence', async () => {
    const {
      getMergeStrategy,
      getThemeSyncEnabled,
      getVoiceOrbVisible,
      MERGE_STRATEGY_KEY,
      setMergeStrategy,
      setThemeSyncEnabled,
      setVoiceOrbVisible,
      THEME_SYNC_KEY,
      VOICE_ORB_KEY
    } = await import('./design-axes')

    expect(getThemeSyncEnabled()).toBe(false)
    setThemeSyncEnabled(true)
    expect(window.localStorage.getItem(THEME_SYNC_KEY)).toBe('true')
    expect(getThemeSyncEnabled()).toBe(true)

    expect(getVoiceOrbVisible()).toBe(true)
    setVoiceOrbVisible(false)
    expect(window.localStorage.getItem(VOICE_ORB_KEY)).toBe('false')
    expect(window.localStorage.getItem('hermes.desktop.voice.orb.visible')).toBe('false')
    expect(getVoiceOrbVisible()).toBe(false)

    expect(getMergeStrategy()).toBe('merge')
    setMergeStrategy('squash')
    expect(window.localStorage.getItem(MERGE_STRATEGY_KEY)).toBe('squash')
    expect(getMergeStrategy()).toBe('squash')

    const {
      AMBIENT_STARS_KEY,
      getAmbientStarsEnabled,
      setAmbientStarsEnabled
    } = await import('./design-axes')

    expect(getAmbientStarsEnabled()).toBe(true)
    setAmbientStarsEnabled(false)
    expect(window.localStorage.getItem(AMBIENT_STARS_KEY)).toBe('false')
    expect(getAmbientStarsEnabled()).toBe(false)
    setAmbientStarsEnabled(true)
    expect(window.localStorage.getItem(AMBIENT_STARS_KEY)).toBe('true')
    expect(getAmbientStarsEnabled()).toBe(true)
  })
})
