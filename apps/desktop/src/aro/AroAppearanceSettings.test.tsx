// @vitest-environment jsdom
/* eslint-disable no-restricted-globals */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APPEARANCE_AREAS } from '@/app/settings/appearance-contrib'
import { registry } from '@/contrib/registry'

import { AroAppearanceSettings } from './AroAppearanceSettings'
import {
  DESIGN_AXIS_KEYS,
  MERGE_STRATEGY_KEY,
  THEME_SYNC_KEY,
  VOICE_ORB_KEY
} from './design-axes'
import {
  ARO_AGENTS_ROUTE,
  ARO_DESIGN_ROUTE,
  ARO_DOCTOR_ROUTE,
  ARO_RULES_ROUTE
} from './register'

const mockNavigate = vi.fn()
const mockSetTheme = vi.fn()
let mockThemeName = 'obsidian'

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate
}))

vi.mock('@/themes/context', () => ({
  useTheme: () => ({
    themeName: mockThemeName,
    setTheme: (t: string) => {
      mockThemeName = t
      mockSetTheme(t)
    },
    availableThemes: [
      { name: 'obsidian', label: 'Obsidian' },
      { name: 'nous', label: 'Nous' },
      { name: 'ember', label: 'Ember' }
    ]
  })
}))

describe('AroAppearanceSettings', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-design')
    document.documentElement.removeAttribute('data-density')
    document.documentElement.removeAttribute('data-motion')
    mockNavigate.mockReset()
    mockSetTheme.mockReset()
    mockThemeName = 'obsidian'
  })

  afterEach(() => {
    cleanup()
  })

  it('renders design profiles, density, motion, and surface quick links', () => {
    render(<AroAppearanceSettings />)

    expect(screen.getByText('Aro Design System & Preferences')).toBeTruthy()
    expect(screen.getByText('Aro UI')).toBeTruthy()

    // 5 profiles
    expect(screen.getByText('Aro Standard')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Codex Desktop' })).toBeTruthy()
    expect(screen.getByText('Claude Code Desktop')).toBeTruthy()
    expect(screen.getByText('Editorial Reference')).toBeTruthy()
    expect(screen.getByText('Cursor 2.x Lineage')).toBeTruthy()

    // Density
    expect(screen.getByText('Layout Density')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'comfortable' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'compact' })).toBeTruthy()

    // Motion
    expect(screen.getByText('Animation Motion')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'system' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'reduced' })).toBeTruthy()

    // Voice orb & git merge
    expect(screen.getByText('Voice Assistant Orb')).toBeTruthy()
    expect(screen.getByText('Preferred Git Merge Strategy')).toBeTruthy()

    // Surface links
    expect(screen.getByText('Global Rules')).toBeTruthy()
    expect(screen.getByText('Agent Adapters')).toBeTruthy()
    expect(screen.getByText('Aro Doctor')).toBeTruthy()
    expect(screen.getByText('Design Spec')).toBeTruthy()
  })

  it('switches design profile and updates DOM attribute and localStorage', () => {
    render(<AroAppearanceSettings />)

    const codexBtn = screen.getByRole('button', { name: /Codex.*Project-first/ })
    act(() => {
      fireEvent.click(codexBtn)
    })

    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.design)).toBe('codex')
    expect(document.documentElement.dataset.design).toBe('codex')

    const claudeBtn = screen.getByRole('button', { name: /Claude Code/i })
    act(() => {
      fireEvent.click(claudeBtn)
    })

    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.design)).toBe('claude')
    expect(document.documentElement.dataset.design).toBe('claude')
  })

  it('controls layout density and persists conductor.density', () => {
    render(<AroAppearanceSettings />)

    const compactBtn = screen.getByRole('button', { name: 'compact' })
    act(() => {
      fireEvent.click(compactBtn)
    })

    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.density)).toBe('compact')
    expect(document.documentElement.dataset.density).toBe('compact')

    const comfortableBtn = screen.getByRole('button', { name: 'comfortable' })
    act(() => {
      fireEvent.click(comfortableBtn)
    })

    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.density)).toBe('comfortable')
    expect(document.documentElement.dataset.density).toBe('comfortable')
  })

  it('controls animation motion and persists conductor.motion', () => {
    render(<AroAppearanceSettings />)

    const reducedBtn = screen.getByRole('button', { name: 'reduced' })
    act(() => {
      fireEvent.click(reducedBtn)
    })

    expect(window.localStorage.getItem(DESIGN_AXIS_KEYS.motion)).toBe('reduced')
    expect(document.documentElement.dataset.motion).toBe('reduced')
  })

  it('toggles voice orb visibility, syncs dual keys, and emits conductor:voice:orb event', () => {
    const orbListener = vi.fn()
    window.addEventListener('conductor:voice:orb', orbListener)

    render(<AroAppearanceSettings />)

    const toggle = screen.getByRole('checkbox', { name: 'Voice Assistant Orb' })
    act(() => {
      fireEvent.click(toggle)
    })

    expect(window.localStorage.getItem(VOICE_ORB_KEY)).toBe('false')
    expect(window.localStorage.getItem('hermes.desktop.voice.orb.visible')).toBe('false')
    expect(orbListener).toHaveBeenCalled()

    window.removeEventListener('conductor:voice:orb', orbListener)
  })

  it('toggles ambient space layer setting and persists conductor.ambient.stars', () => {
    const starsListener = vi.fn()
    window.addEventListener('conductor:ambient:stars', starsListener)

    render(<AroAppearanceSettings />)

    const toggle = screen.getByRole('checkbox', { name: 'Ambient Space Layer' })
    expect((toggle as HTMLInputElement).checked).toBe(true)

    act(() => {
      fireEvent.click(toggle)
    })

    expect(window.localStorage.getItem('conductor.ambient.stars')).toBe('false')
    expect(starsListener).toHaveBeenCalled()

    window.removeEventListener('conductor:ambient:stars', starsListener)
  })

  it('persists git merge strategy preference', () => {
    render(<AroAppearanceSettings />)

    const rebaseBtn = screen.getByRole('button', { name: 'rebase' })
    act(() => {
      fireEvent.click(rebaseBtn)
    })

    expect(window.localStorage.getItem(MERGE_STRATEGY_KEY)).toBe('rebase')
  })

  it('handles theme recommendation and auto-sync without clobbering user choice', () => {
    mockThemeName = 'nous'
    render(<AroAppearanceSettings />)

    // For 'aro', recommended theme is 'obsidian'. Active is 'nous'
    const applyBtn = screen.getByRole('button', { name: /Apply obsidian/i })
    expect(applyBtn).toBeTruthy()

    act(() => {
      fireEvent.click(applyBtn)
    })

    expect(mockSetTheme).toHaveBeenCalledWith('obsidian')

    // Test auto-sync
    const autoSyncCheckbox = screen.getByLabelText(/Auto-sync theme/i)
    act(() => {
      fireEvent.click(autoSyncCheckbox)
    })

    expect(window.localStorage.getItem(THEME_SYNC_KEY)).toBe('true')

    // With auto-sync enabled, selecting Claude Code triggers recommendation apply
    const claudeBtn = screen.getByRole('button', { name: /Claude Code/i })
    act(() => {
      fireEvent.click(claudeBtn)
    })

    expect(mockSetTheme).toHaveBeenCalledWith('ember')
  })

  it('navigates to Aro local surfaces when clicked', () => {
    render(<AroAppearanceSettings />)

    const rulesBtn = screen.getByRole('button', { name: /Global Rules/i })
    act(() => {
      fireEvent.click(rulesBtn)
    })
    expect(mockNavigate).toHaveBeenCalledWith(ARO_RULES_ROUTE)

    const agentsBtn = screen.getByRole('button', { name: /Agent Adapters/i })
    act(() => {
      fireEvent.click(agentsBtn)
    })
    expect(mockNavigate).toHaveBeenCalledWith(ARO_AGENTS_ROUTE)

    const doctorBtn = screen.getByRole('button', { name: /Aro Doctor/i })
    act(() => {
      fireEvent.click(doctorBtn)
    })
    expect(mockNavigate).toHaveBeenCalledWith(ARO_DOCTOR_ROUTE)

    const designBtn = screen.getByRole('button', { name: /Design Spec Tokens/i })
    act(() => {
      fireEvent.click(designBtn)
    })
    expect(mockNavigate).toHaveBeenCalledWith(ARO_DESIGN_ROUTE)
  })

  it('is registered in APPEARANCE_AREAS.extra registry', () => {
    const contributions = registry.getArea(APPEARANCE_AREAS.extra)
    const aroEntry = contributions.find(c => c.id === 'aro-appearance-settings')
    expect(aroEntry).toBeDefined()
    expect(aroEntry?.render).toBeDefined()
  })
})
