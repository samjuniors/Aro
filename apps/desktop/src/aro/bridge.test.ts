import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $activeSessionId, $currentCwd } from '@/store/session'

import { type AroBridgeEvent, type AroBridgeStartOptions, useAroBridge } from './bridge'

describe('useAroBridge lifecycle and context isolation', () => {
  let eventListeners: Map<string, (ev: AroBridgeEvent) => void>
  let exitListeners: Map<string, (payload: { code: number | null }) => void>
  let startMock: ReturnType<typeof vi.fn>
  let stopMock: ReturnType<typeof vi.fn>
  let sessionSeq: number

  beforeEach(() => {
    sessionSeq = 0
    eventListeners = new Map()
    exitListeners = new Map()

    $activeSessionId.set('sess_alpha')
    $currentCwd.set('/workspace/alpha')

    startMock = vi.fn(async (opts?: AroBridgeStartOptions) => {
      const sid = `as_mock_${++sessionSeq}`

      return { sessionId: sid }
    })

    stopMock = vi.fn(async (_sid: string) => undefined)

    const onEventMock = vi.fn((sid: string, callback: (ev: AroBridgeEvent) => void) => {
      eventListeners.set(sid, callback)

      return () => {
        eventListeners.delete(sid)
      }
    })

    const onExitMock = vi.fn((sid: string, callback: (payload: { code: number | null }) => void) => {
      exitListeners.set(sid, callback)

      return () => {
        exitListeners.delete(sid)
      }
    })

    ;(window as unknown as { hermesDesktop?: unknown }).hermesDesktop = {
      aroBridge: {
        start: startMock,
        stop: stopMock,
        send: vi.fn(),
        toolResult: vi.fn(),
        interrupt: vi.fn(),
        onEvent: onEventMock,
        onExit: onExitMock
      }
    }
  })

  afterEach(() => {
    delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
  })

  it('starts in idle status without automatically spawning a daemon on mount', () => {
    const { result } = renderHook(() => useAroBridge())

    expect(result.current.status).toBe('idle')
    expect(result.current.sessionId).toBeNull()
    expect(result.current.steps).toEqual([])
    expect(startMock).not.toHaveBeenCalled()
  })

  it('spawns a daemon only after an explicit start action', async () => {
    const { result } = renderHook(() => useAroBridge())

    expect(startMock).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.start({ engine: 'demo' })
    })

    expect(startMock).toHaveBeenCalledTimes(1)
    expect(startMock).toHaveBeenCalledWith({
      cwd: '/workspace/alpha',
      engine: 'demo'
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.sessionId).toBe('as_mock_1')
  })

  it('tears down active bridge on session switch and does not automatically spawn a new daemon', async () => {
    const { result } = renderHook(() => useAroBridge())

    await act(async () => {
      await result.current.start({ engine: 'demo' })
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.sessionId).toBe('as_mock_1')

    // Switch session
    act(() => {
      $activeSessionId.set('sess_beta')
    })

    // Previous daemon must be stopped and state reset to idle
    expect(stopMock).toHaveBeenCalledWith('as_mock_1')
    expect(result.current.status).toBe('idle')
    expect(result.current.sessionId).toBeNull()
    expect(result.current.steps).toEqual([])

    // NO automatic daemon spawn occurs on session switch
    expect(startMock).toHaveBeenCalledTimes(1)
  })

  it('tears down active bridge on project/workspace switch and does not automatically spawn a new daemon', async () => {
    const { result } = renderHook(() => useAroBridge())

    await act(async () => {
      await result.current.start({ engine: 'demo' })
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.sessionId).toBe('as_mock_1')

    // Switch project/workspace
    act(() => {
      $currentCwd.set('/workspace/beta')
    })

    // Previous daemon must be stopped and state reset to idle
    expect(stopMock).toHaveBeenCalledWith('as_mock_1')
    expect(result.current.status).toBe('idle')
    expect(result.current.sessionId).toBeNull()
    expect(result.current.steps).toEqual([])

    // NO automatic daemon spawn occurs on workspace switch
    expect(startMock).toHaveBeenCalledTimes(1)
  })

  it('ignores late events and exit callbacks from previous or defunct daemons', async () => {
    const { result } = renderHook(() => useAroBridge())

    await act(async () => {
      await result.current.start({ engine: 'demo' })
    })

    const staleSid = result.current.sessionId!
    const staleEventListener = eventListeners.get(staleSid)
    const staleExitListener = exitListeners.get(staleSid)

    expect(staleEventListener).toBeDefined()
    expect(staleExitListener).toBeDefined()

    // Context switch to invalidate session
    act(() => {
      $activeSessionId.set('sess_gamma')
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.steps).toEqual([])

    // Late event arrives from the defunct session
    act(() => {
      staleEventListener!({
        type: 'thinking',
        label: 'Stale thinking step',
        ms: 500
      })
    })

    // Must be completely ignored
    expect(result.current.steps).toEqual([])

    // Late exit arrives from defunct session
    act(() => {
      staleExitListener!({ code: 1 })
    })

    // Must not mutate current idle status or report error for invalid session
    expect(result.current.status).toBe('idle')
    expect(result.current.startError).toBeNull()
  })

  it('explicit start after switching context starts exactly one daemon with the new context', async () => {
    const { result } = renderHook(() => useAroBridge())

    // Initial session
    await act(async () => {
      await result.current.start({ engine: 'demo' })
    })

    expect(startMock).toHaveBeenCalledTimes(1)
    expect(startMock).toHaveBeenLastCalledWith({
      cwd: '/workspace/alpha',
      engine: 'demo'
    })

    // Switch session and workspace
    act(() => {
      $activeSessionId.set('sess_delta')
      $currentCwd.set('/workspace/delta')
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.sessionId).toBeNull()
    expect(startMock).toHaveBeenCalledTimes(1)

    // Explicit user start in the new context
    await act(async () => {
      await result.current.start({
        engine: 'openai',
        baseUrl: 'http://localhost:8080/v1',
        model: 'gpt-4o'
      })
    })

    // Exactly one new daemon started with the new CWD
    expect(startMock).toHaveBeenCalledTimes(2)
    expect(startMock).toHaveBeenLastCalledWith({
      cwd: '/workspace/delta',
      engine: 'openai',
      baseUrl: 'http://localhost:8080/v1',
      model: 'gpt-4o'
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.sessionId).toBe('as_mock_2')
    expect(result.current.activeSessionId).toBe('sess_delta')
  })

  it('cleans up daemon process on unmount', async () => {
    const { result, unmount } = renderHook(() => useAroBridge())

    await act(async () => {
      await result.current.start({ engine: 'demo' })
    })

    expect(result.current.status).toBe('ready')

    unmount()

    expect(stopMock).toHaveBeenCalledWith('as_mock_1')
  })
})
