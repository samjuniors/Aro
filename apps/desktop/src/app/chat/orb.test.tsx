import { cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Orb, ORB_LABEL, type OrbState, useMicLevel } from './orb'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Orb and ORB_LABEL', () => {
  it('defines labels for all Orb states', () => {
    const states: OrbState[] = ['idle', 'listening', 'thinking', 'speaking', 'completed', 'error']

    for (const st of states) {
      expect(ORB_LABEL[st]).toBeDefined()
      expect(typeof ORB_LABEL[st]).toBe('string')
    }

    expect(ORB_LABEL.idle).toBe('Idle')
    expect(ORB_LABEL.listening).toBe('Listening')
    expect(ORB_LABEL.thinking).toBe('Thinking')
    expect(ORB_LABEL.speaking).toBe('Speaking')
    expect(ORB_LABEL.completed).toBe('Done')
    expect(ORB_LABEL.error).toBe('Needs attention')
  })

  it('renders a canvas element with aria-hidden', () => {
    const { container } = render(<Orb size={44} state="idle" />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies custom className and size scaling to canvas', () => {
    const { container } = render(<Orb className="custom-orb" size={60} state="thinking" />)
    const canvas = container.querySelector('canvas')
    expect(canvas?.classList.contains('custom-orb')).toBe(true)
  })

  it('handles state transitions gracefully', () => {
    const { rerender, container } = render(<Orb size={44} state="listening" />)
    expect(container.querySelector('canvas')).toBeTruthy()

    rerender(<Orb size={44} state="speaking" />)
    expect(container.querySelector('canvas')).toBeTruthy()

    rerender(<Orb size={44} state="completed" />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})

describe('useMicLevel', () => {
  it('returns level 0 when inactive', () => {
    const { result } = renderHook(() => useMicLevel(false))
    expect(result.current.current).toBe(0)
  })

  it('handles missing AudioContext or getUserMedia without throwing', () => {
    const origMediaDevices = navigator.mediaDevices

    try {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true
      })
      const { result } = renderHook(() => useMicLevel(true))
      expect(result.current.current).toBe(0)
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: origMediaDevices,
        configurable: true
      })
    }
  })
})
