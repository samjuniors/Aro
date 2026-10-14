/**
 * ARO BRIDGE (R4) — the live aro_bridge session hook.
 *
 * The aro pages so far (live.tsx) fold the HOST's own stores into the ported
 * shapes. This hook is the other direction: it starts a real aro_bridge
 * daemon session through the preload surface (Electron main owns the python
 * child — the renderer never touches it), holds the aro.jsonl/1 event stream
 * in local state, and derives the renderable steps the timeline page draws.
 * No nanostores: the bridge session is page-local, created on mount and
 * stopped on unmount.
 */

import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AroBridgeEvent, AroBridgeStartOptions } from '@/global'
import { $activeSessionId, $currentCwd } from '@/store/session'

export type { AroBridgeEvent, AroBridgeStartOptions }

export type AroBridgeStatus = 'starting' | 'ready' | 'exited'

/** A renderable timeline entry derived from the event stream: thinking rows,
 * tool cards (call + merged result), the accumulating reply block, errors. */
export type AroBridgeStep =
  | { kind: 'thinking'; label: string; ms: number }
  | {
      kind: 'tool'
      callId: string
      tool: string
      args: Record<string, unknown>
      ok?: boolean
      ms?: number
      summary?: string
      lines?: string[]
    }
  | { kind: 'reply'; text: string; ms?: number; closed: boolean }
  | { kind: 'error'; message: string }

/** Fold the protocol events into steps. Pure: called per render over the
 * event list — tool_result merges into its call (matched on callId), and
 * consecutive assistant_deltas accumulate into one growing reply block. */
export function deriveAroSteps(events: AroBridgeEvent[]): AroBridgeStep[] {
  const steps: AroBridgeStep[] = []

  for (const ev of events) {
    switch (ev.type) {
      case 'thinking':
        steps.push({ kind: 'thinking', label: ev.label, ms: ev.ms })

        break

      case 'tool_call':
        steps.push({ kind: 'tool', callId: ev.callId, tool: ev.tool, args: ev.args })

        break

      case 'tool_result':
        for (let i = steps.length - 1; i >= 0; i--) {
          const step = steps[i]

          if (step.kind === 'tool' && step.callId === ev.callId) {
            step.ok = ev.ok
            step.ms = ev.ms
            step.summary = ev.summary
            step.lines = ev.lines

            break
          }
        }

        break
      case 'assistant_delta': {
        const last = steps[steps.length - 1]

        if (last && last.kind === 'reply' && !last.closed) {
          last.text += ev.text
        } else {
          steps.push({ kind: 'reply', text: ev.text, closed: false })
        }

        break
      }

      case 'reply_done': {
        const last = steps[steps.length - 1]

        if (last && last.kind === 'reply') {
          last.ms = ev.ms
          last.closed = true
        }

        break
      }

      case 'error':
        steps.push({ kind: 'error', message: ev.message })

        break

      case 'session_start':

      case 'done':
        break
    }
  }

  return steps
}

export interface UseAroBridge {
  status: AroBridgeStatus
  sessionId: string | null
  activeSessionId: string | null
  /** Why a session failed to start or exited unexpectedly. */
  startError: string | null
  events: AroBridgeEvent[]
  steps: AroBridgeStep[]
  /** A turn is in flight (sent, `done` not yet seen). */
  busy: boolean
  send: (text: string) => void
  toolResult: (callId: string, ok: boolean, output: string) => void
  interrupt: () => void
  stop: () => void
  /** Tear the session down and start a new one (engine dial / restart). */
  restart: (opts: AroBridgeStartOptions) => void
}

export function useAroBridge(): UseAroBridge {
  const activeSessionId = useStore($activeSessionId)
  const currentCwd = useStore($currentCwd)

  const [status, setStatus] = useState<AroBridgeStatus>('starting')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [events, setEvents] = useState<AroBridgeEvent[]>([])
  const [busy, setBusy] = useState(false)

  const sessionRef = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const startTokenRef = useRef(0)

  const teardown = useCallback((): void => {
    startTokenRef.current++
    unsubscribeRef.current?.()
    unsubscribeRef.current = null

    const sid = sessionRef.current

    sessionRef.current = null
    setSessionId(null)

    if (sid && window.hermesDesktop?.aroBridge) {
      void window.hermesDesktop.aroBridge.stop(sid)
    }
  }, [])

  const startSession = useCallback(
    async (opts: AroBridgeStartOptions): Promise<void> => {
      const token = ++startTokenRef.current

      teardown()
      setEvents([])
      setStartError(null)
      setBusy(false)
      setStatus('starting')

      try {
        if (!window.hermesDesktop?.aroBridge) {
          throw new Error('Aro bridge preload surface unavailable in this environment')
        }

        const runOpts: AroBridgeStartOptions = {
          cwd: currentCwd?.trim() || undefined,
          ...opts
        }

        const { sessionId: sid } = await window.hermesDesktop.aroBridge.start(runOpts)

        if (token !== startTokenRef.current) {
          // A newer start (or unmount/session switch) won the race — drop this session.
          void window.hermesDesktop.aroBridge.stop(sid)

          return
        }

        sessionRef.current = sid
        setSessionId(sid)

        const offEvent = window.hermesDesktop.aroBridge.onEvent(sid, (ev: AroBridgeEvent): void => {
          // Ensure late events from previous or stopped sessions never update active UI
          if (token !== startTokenRef.current || sessionRef.current !== sid) {
            return
          }

          setEvents(prev => [...prev, ev])

          if (ev.type === 'done') {
            setBusy(false)
          }
        })

        const offExit = window.hermesDesktop.aroBridge.onExit(sid, (payload: { code: number | null }): void => {
          if (token !== startTokenRef.current || sessionRef.current !== sid) {
            return
          }

          setBusy(false)
          setStatus('exited')

          if (payload?.code !== null && payload?.code !== 0) {
            setStartError(`Bridge daemon exited unexpectedly (code ${payload.code})`)
          }
        })

        unsubscribeRef.current = (): void => {
          offEvent()
          offExit()
        }

        setStatus('ready')
      } catch (error: unknown) {
        if (token === startTokenRef.current) {
          setStartError(error instanceof Error ? error.message : String(error))
          setStatus('exited')
        }
      }
    },
    [currentCwd, teardown]
  )

  // One session per active session & workspace mount, demo engine by default
  useEffect(() => {
    void startSession({ engine: 'demo' })

    return () => {
      teardown()
    }
  }, [activeSessionId, currentCwd, startSession, teardown])

  const send = useCallback((text: string): void => {
    const sid = sessionRef.current

    if (!sid || !text.trim() || !window.hermesDesktop?.aroBridge) {
      return
    }

    setBusy(true)
    void window.hermesDesktop.aroBridge.send(sid, text)
  }, [])

  const toolResult = useCallback((callId: string, ok: boolean, output: string): void => {
    const sid = sessionRef.current

    if (sid && window.hermesDesktop?.aroBridge) {
      void window.hermesDesktop.aroBridge.toolResult(sid, callId, ok, output)
    }
  }, [])

  const interrupt = useCallback((): void => {
    const sid = sessionRef.current

    if (sid && window.hermesDesktop?.aroBridge) {
      void window.hermesDesktop.aroBridge.interrupt(sid)
    }
  }, [])

  const stop = useCallback((): void => {
    startTokenRef.current++
    teardown()
    setBusy(false)
    setStatus('exited')
  }, [teardown])

  const steps = deriveAroSteps(events)

  return {
    status,
    sessionId,
    activeSessionId: activeSessionId || null,
    startError,
    events,
    steps,
    busy,
    send,
    toolResult,
    interrupt,
    stop,
    restart: startSession
  }
}
