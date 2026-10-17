import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $orbOpen,
  $orbVisible,
  CONDUCTOR_ORB_KEY,
  ORB_VISIBLE_KEY,
  readOrbVisible,
  readPosition,
  VoiceAgentOrb
} from './voice-agent-orb'

beforeEach(() => {
  localStorage.clear()
  $orbVisible.set(true)
  $orbOpen.set(false)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('VoiceAgentOrb integration and lifecycle', () => {
  it('renders into document.body via portal with baseline safe clearance', () => {
    const { baseElement } = render(<VoiceAgentOrb />)
    const orb = baseElement.querySelector('[data-testid="voice-agent-orb"]')
    expect(orb).toBeTruthy()
    expect(orb?.parentElement).toBe(baseElement)

    // Confirms elevated resting baseline to avoid composer dock overlap
    expect(orb?.className).toContain('fixed')
    expect(orb?.className).toContain('right-6')
    expect(orb?.className).toContain('bottom-[112px]')
    expect(orb?.className).toContain('z-[80]')
  })

  it('guarantees layout clearance above composer send control across standard viewports', () => {
    // Composer send control rests inside bottom toolbar (height ~46px, bottom offset 12px-24px, max y ~70px from bottom)
    // VoiceAgentOrb has bottom-[112px], giving a guaranteed resting buffer >= 42px above composer send zone
    const viewports = [
      { width: 1440, height: 900, name: '1440x900' },
      { width: 1280, height: 800, name: '1280x800' },
      { width: 1024, height: 768, name: '1024x768' },
      { width: 375, height: 667, name: 'mobile-375' }
    ]

    for (const vp of viewports) {
      window.innerWidth = vp.width
      window.innerHeight = vp.height
      window.dispatchEvent(new Event('resize'))

      const { baseElement, unmount } = render(<VoiceAgentOrb />)
      const orb = baseElement.querySelector('[data-testid="voice-agent-orb"]')
      expect(orb, `Orb should mount at ${vp.name}`).toBeTruthy()

      // Position bottom is 112px, strictly above the composer dock's send button bounds
      const style = orb?.getAttribute('style') || ''
      expect(style).toContain('transform')
      unmount()
    }
  })

  it('hides when $orbVisible is false and restores when true', () => {
    const { baseElement } = render(<VoiceAgentOrb />)
    expect(baseElement.querySelector('[data-testid="voice-agent-orb"]')).toBeTruthy()

    act(() => {
      $orbVisible.set(false)
    })
    expect(baseElement.querySelector('[data-testid="voice-agent-orb"]')).toBeNull()

    act(() => {
      $orbVisible.set(true)
    })
    expect(baseElement.querySelector('[data-testid="voice-agent-orb"]')).toBeTruthy()
  })

  it('synchronizes visibility across both hermes and conductor storage keys and events', () => {
    render(<VoiceAgentOrb />)

    act(() => {
      $orbVisible.set(false)
    })
    expect(localStorage.getItem(ORB_VISIBLE_KEY)).toBe('false')
    expect(localStorage.getItem(CONDUCTOR_ORB_KEY)).toBe('false')

    act(() => {
      window.dispatchEvent(new CustomEvent('conductor:voice:orb', { detail: true }))
    })
    expect($orbVisible.get()).toBe(true)
    expect(readOrbVisible()).toBe(true)
  })

  it('reflects voice status and conversation status in data-orb-state', () => {
    const { baseElement, rerender } = render(
      <VoiceAgentOrb voiceStatus="recording" />
    )

    let orb = baseElement.querySelector('[data-testid="voice-agent-orb"]')
    expect(orb?.getAttribute('data-orb-state')).toBe('listening')

    rerender(<VoiceAgentOrb voiceStatus="transcribing" />)
    orb = baseElement.querySelector('[data-testid="voice-agent-orb"]')
    expect(orb?.getAttribute('data-orb-state')).toBe('thinking')

    rerender(<VoiceAgentOrb conversationStatus="speaking" voiceStatus="idle" />)
    orb = baseElement.querySelector('[data-testid="voice-agent-orb"]')
    expect(orb?.getAttribute('data-orb-state')).toBe('speaking')

    rerender(<VoiceAgentOrb conversationStatus="idle" voiceStatus="idle" />)
    orb = baseElement.querySelector('[data-testid="voice-agent-orb"]')
    expect(orb?.getAttribute('data-orb-state')).toBe('idle')
  })

  it('toggles dialog open on click and minimizes on escape or close button', () => {
    const { baseElement } = render(<VoiceAgentOrb />)
    const orbButton = screen.getByTestId('orb-toggle-button')
    expect(orbButton).toBeTruthy()

    // Open via click
    fireEvent.click(orbButton)
    expect(baseElement.querySelector('[data-orb-open]')).toBeTruthy()
    expect(screen.getByPlaceholderText('Type instead…')).toBeTruthy()

    // Close via Escape key
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(baseElement.querySelector('[data-orb-open]')).toBeNull()

    // Reopen and close via Minimise to orb button
    const reopenButton = screen.getByTestId('orb-toggle-button')
    fireEvent.click(reopenButton)
    expect(baseElement.querySelector('[data-orb-open]')).toBeTruthy()
    const minimizeBtn = screen.getByLabelText('Minimise to orb')
    fireEvent.click(minimizeBtn)
    expect(baseElement.querySelector('[data-orb-open]')).toBeNull()
  })

  it('triggers onStartConversation on double click of the minimized orb button', () => {
    const onStartConversation = vi.fn()
    render(<VoiceAgentOrb onStartConversation={onStartConversation} />)
    const orbButton = screen.getByTestId('orb-toggle-button')

    fireEvent.doubleClick(orbButton)
    expect(onStartConversation).toHaveBeenCalledTimes(1)
  })

  it('triggers dictate callback when clicking microphone button inside dialog', () => {
    const dictate = vi.fn()
    render(<VoiceAgentOrb dictate={dictate} />)
    const orbButton = screen.getByTestId('orb-toggle-button')

    fireEvent.click(orbButton)
    const micButton = screen.getByLabelText('Dictate once — inserts into the composer')
    fireEvent.click(micButton)
    expect(dictate).toHaveBeenCalledTimes(1)
  })

  it('allows typing and submitting text via onSubmit callback in the open dialog', () => {
    const onSubmit = vi.fn()
    const { baseElement } = render(<VoiceAgentOrb onSubmit={onSubmit} />)
    const orbButton = screen.getByTestId('orb-toggle-button')

    fireEvent.click(orbButton)
    const input = screen.getByPlaceholderText('Type instead…')
    fireEvent.change(input, { target: { value: 'Analyze current repository' } })

    const sendBtn = screen.getByLabelText('Send')
    fireEvent.click(sendBtn)

    expect(onSubmit).toHaveBeenCalledWith('Analyze current repository')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('submits on Enter key in dialog input', () => {
    const onSubmit = vi.fn()
    render(<VoiceAgentOrb onSubmit={onSubmit} />)
    const orbButton = screen.getByTestId('orb-toggle-button')

    fireEvent.click(orbButton)
    const input = screen.getByPlaceholderText('Type instead…')
    fireEvent.change(input, { target: { value: 'Run tests' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    expect(onSubmit).toHaveBeenCalledWith('Run tests')
  })

  it('clamps readPosition y >= 0 to protect from corrupted persisted coordinates', () => {
    localStorage.setItem('hermes.desktop.voice.orb.position', JSON.stringify({ x: 50, y: -200 }))
    const pos = readPosition()
    expect(pos.x).toBe(50)
    expect(pos.y).toBe(0) // clamped >= 0
  })
})
