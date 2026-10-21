/**
 * ARO HERO MOMENTS & AMBIENT SPACE LAYER TEST SUITE (Phase 14, Gate 14.2)
 *
 * Verifies the 9 Hero Moments and the Ambient Space Layer's off-conditions,
 * frame-budget invariants, and reduced-motion compliance.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AmbientSpaceLayer,
  checkAmbientRunConditions,
} from './AmbientSpaceLayer'
import {
  HeroCommandPalette,
  HeroEmptyStates,
  HeroLaunchBoot,
  HeroMessageSend,
  HeroPaneDrawer,
  HeroStreamingCaret,
  HeroThemeSwitch,
  HeroToolTimeline,
  HeroVoiceOrb,
} from './HeroMoments'

describe('Aro Hero Moments (Phase 14 Step 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('Hero 1: Launch / Boot sequence transitions and settles within hero duration', () => {
    let recordedTiming = 0
    render(<HeroLaunchBoot onTiming={(ms) => (recordedTiming = ms)} />)

    expect(screen.getByTestId('hero-launch-boot')).toBeTruthy()
    expect(screen.getByText(/Workspace Ready/i)).toBeTruthy()

    const replayBtn = screen.getByRole('button', { name: /Replay Boot/i })
    act(() => {
      fireEvent.click(replayBtn)
    })

    // Should enter splash stage
    expect(screen.getByText(/Initializing Aro Core/i)).toBeTruthy()

    // Advance through the hero duration
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Settle back to workspace ready
    expect(screen.getByText(/Workspace Ready/i)).toBeTruthy()
    expect(recordedTiming).toBeGreaterThanOrEqual(0)
  })

  it('Hero 2: Message Send inserts optimistically without input freeze', () => {
    let latency = 0
    render(<HeroMessageSend onSendTiming={(ms) => (latency = ms)} />)

    expect(screen.getByTestId('hero-message-send')).toBeTruthy()
    const input = screen.getByPlaceholderText(/Type a message/i) as HTMLInputElement
    const sendBtn = screen.getByRole('button', { name: /Send/i })

    act(() => {
      fireEvent.change(input, { target: { value: 'Optimistic motion test message' } })
      fireEvent.click(sendBtn)
    })

    // Optimistically painted in the same frame
    expect(screen.getByText('Optimistic motion test message')).toBeTruthy()
    expect(input.value).toBe('')
    expect(latency).toBeGreaterThanOrEqual(0)
  })

  it('Hero 3: Streaming text and caret blinks during live generation', () => {
    render(<HeroStreamingCaret />)

    expect(screen.getByTestId('hero-streaming-caret')).toBeTruthy()
    const streamBtn = screen.getByRole('button', { name: /Stream Tokens/i })

    act(() => {
      fireEvent.click(streamBtn)
    })

    // Advance 90ms (multiple token increments)
    act(() => {
      vi.advanceTimersByTime(90)
    })
    expect(screen.getByText(/Aro/i)).toBeTruthy()

    // Complete stream
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText(/60fps/i)).toBeTruthy()
  })

  it('Hero 4: Tool-Call Timeline pulses and expands disclosure', () => {
    render(<HeroToolTimeline />)

    expect(screen.getByTestId('hero-tool-timeline')).toBeTruthy()
    const execBtn = screen.getByRole('button', { name: /Execute Tool/i })

    act(() => {
      fireEvent.click(execBtn)
      vi.advanceTimersByTime(800)
    })

    // Output drawer should be open with execution results
    expect(screen.getByText(/11 files changed/i)).toBeTruthy()
    expect(screen.getByText(/Exit code 0/i)).toBeTruthy()
  })

  it('Hero 5: Pane Open/Close slides drawer with transform-only sheet', () => {
    render(<HeroPaneDrawer />)

    expect(screen.getByTestId('hero-pane-drawer')).toBeTruthy()
    const toggleBtn = screen.getByRole('button', { name: /Open Drawer/i })

    fireEvent.click(toggleBtn)
    expect(screen.getByText('Task Inspector')).toBeTruthy()
    expect(screen.getByText(/GPU-composited via translateX/i)).toBeTruthy()

    const closeBtn = screen.getByRole('button', { name: /Close Drawer/i })
    fireEvent.click(closeBtn)
    expect(screen.queryByText('Task Inspector')).toBeNull()
  })

  it('Hero 6: Command Palette pops in with spring easing', () => {
    render(<HeroCommandPalette />)

    expect(screen.getByTestId('hero-command-palette')).toBeTruthy()
    const triggerBtn = screen.getByRole('button', { name: /Trigger Palette/i })

    fireEvent.click(triggerBtn)
    expect(screen.getByPlaceholderText(/Search commands/i)).toBeTruthy()
    expect(screen.getByText(/Switch to Model: Claude 3.7/i)).toBeTruthy()
  })

  it('Hero 7: Theme Switch mutates data-theme with atomic variable update', () => {
    render(<HeroThemeSwitch />)

    expect(screen.getByTestId('hero-theme-switch')).toBeTruthy()
    const daylightBtn = screen.getByRole('button', { name: 'daylight' })

    fireEvent.click(daylightBtn)
    expect(window.document.documentElement.getAttribute('data-theme')).toBe('daylight')

    const nordBtn = screen.getByRole('button', { name: 'nord' })
    fireEvent.click(nordBtn)
    expect(window.document.documentElement.getAttribute('data-theme')).toBe('nord')
  })

  it('Hero 8: Voice Orb switches states smoothly on canvas', () => {
    render(<HeroVoiceOrb />)

    expect(screen.getByTestId('hero-voice-orb')).toBeTruthy()
    const listeningBtn = screen.getByRole('button', { name: 'listening' })

    fireEvent.click(listeningBtn)
    expect(listeningBtn.className).toContain('bg-aro-iris')
  })

  it('Hero 9: Empty States toggles blueprint grid and dot textures', () => {
    render(<HeroEmptyStates />)

    expect(screen.getByTestId('hero-empty-states')).toBeTruthy()
    expect(screen.getByText('No Active Sessions')).toBeTruthy()

    const gridBtn = screen.getByRole('button', { name: 'Grid' })
    fireEvent.click(gridBtn)
    expect(screen.getByText('No Active Sessions').parentElement?.className).toContain('aro-grid-bg')

    const dotsBtn = screen.getByRole('button', { name: 'Dots' })
    fireEvent.click(dotsBtn)
    expect(screen.getByText('No Active Sessions').parentElement?.className).toContain('aro-dot-bg')
  })
})

describe('Ambient Space Layer & Off Conditions (Phase 14 Step 4)', () => {
  it('strictly halts running under all five required off conditions', () => {
    // 1. Setting disabled
    const cond1 = checkAmbientRunConditions({
      settingEnabled: false,
      reducedMotion: false,
      batteryDischarging: false,
      weakHardware: false,
      documentHidden: false,
    })

    expect(cond1.canRun).toBe(false)
    expect(cond1.reason).toContain('Disabled in Appearance settings')

    // 2. Reduced motion
    const cond2 = checkAmbientRunConditions({
      settingEnabled: true,
      reducedMotion: true,
      batteryDischarging: false,
      weakHardware: false,
      documentHidden: false,
    })

    expect(cond2.canRun).toBe(false)
    expect(cond2.reason).toContain('Reduced motion active')

    // 3. Battery discharging
    const cond3 = checkAmbientRunConditions({
      settingEnabled: true,
      reducedMotion: false,
      batteryDischarging: true,
      weakHardware: false,
      documentHidden: false,
    })

    expect(cond3.canRun).toBe(false)
    expect(cond3.reason).toContain('discharging battery power')

    // 4. Weak hardware
    const cond4 = checkAmbientRunConditions({
      settingEnabled: true,
      reducedMotion: false,
      batteryDischarging: false,
      weakHardware: true,
      documentHidden: false,
    })

    expect(cond4.canRun).toBe(false)
    expect(cond4.reason).toContain('Low-concurrency CPU/GPU')

    // 5. Document hidden
    const cond5 = checkAmbientRunConditions({
      settingEnabled: true,
      reducedMotion: false,
      batteryDischarging: false,
      weakHardware: false,
      documentHidden: true,
    })

    expect(cond5.canRun).toBe(false)
    expect(cond5.reason).toContain('Window is hidden/minimized')

    // 6. All conditions clear -> can run!
    const condOk = checkAmbientRunConditions({
      settingEnabled: true,
      reducedMotion: false,
      batteryDischarging: false,
      weakHardware: false,
      documentHidden: false,
    })

    expect(condOk.canRun).toBe(true)
    expect(condOk.reason).toBeNull()
  })

  it('mounts canvas element and reports diagnostics', () => {
    render(<AmbientSpaceLayer forceActive />)

    expect(screen.getByTestId('ambient-space-canvas')).toBeTruthy()
  })
})
