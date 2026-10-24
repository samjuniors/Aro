import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Orb, ORB_LABEL, type OrbState, useMicLevel } from '@/app/chat/orb'
import { Codicon } from '@/components/ui/codicon'
import { ArrowUp } from '@/lib/icons'
import { persistBoolean } from '@/lib/storage'
import { cn } from '@/lib/utils'

import type { ConversationStatus } from './composer/hooks/use-voice-conversation'
import type { VoiceActivityState, VoiceStatus } from './composer/types'

/** Orb visibility + drag position are desktop-local presentation prefs.
 *  Syncs both `hermes.desktop.voice.orb.visible` (merge-base wire key) and
 *  `conductor.voice.orb` (prototype/titlebar key). */
export const ORB_VISIBLE_KEY = 'hermes.desktop.voice.orb.visible'
export const CONDUCTOR_ORB_KEY = 'conductor.voice.orb'

export function readOrbVisible(): boolean {
  try {
    const conductor = localStorage.getItem(CONDUCTOR_ORB_KEY)

    if (conductor !== null) {
      return conductor !== 'false'
    }

    const hermes = localStorage.getItem(ORB_VISIBLE_KEY)

    if (hermes !== null) {
      return hermes !== 'false'
    }

    return true
  } catch {
    return true
  }
}

export const $orbVisible = atom(readOrbVisible())
$orbVisible.subscribe(value => {
  persistBoolean(ORB_VISIBLE_KEY, value)

  try {
    localStorage.setItem(CONDUCTOR_ORB_KEY, String(value))
  } catch {
    // storage unavailable
  }
})

export const ORB_OPEN_KEY = 'hermes.desktop.voice.orb.open'
export const $orbOpen = atom(localStorage.getItem(ORB_OPEN_KEY) === 'true')
$orbOpen.subscribe(value => persistBoolean(ORB_OPEN_KEY, value))

export function readPosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem('hermes.desktop.voice.orb.position')
    const parsed = raw ? JSON.parse(raw) : null

    // Clamp y >= 0 so old persisted positions cannot pull the orb into the composer send band
    return parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number'
      ? { x: parsed.x, y: Math.max(0, parsed.y) }
      : { x: 0, y: 0 }
  } catch {
    return { x: 0, y: 0 }
  }
}

const STATE_HINT: Record<OrbState, string> = {
  idle: 'Tap the orb to talk',
  listening: "Speak naturally — I'm listening",
  thinking: 'The agent is working on it',
  speaking: 'Reading the reply aloud',
  completed: 'Finished — reply is in the session',
  error: 'Something needs your attention'
}

/**
 * The floating voice orb — pure presentation over the composer's REAL voice
 * engine (`useComposerVoice`): tap-to-talk runs the real dictation pipeline
 * (REST `/api/audio/transcribe` → composer), and the hands-free toggle runs
 * the REAL voice conversation (VAD loop: listen → submit → speak). Every
 * state shown (listening/thinking/speaking/elapsed/mic level) is the live
 * engine state; nothing is simulated locally.
 *
 * Portaled to document.body so that fixed positioning is truly viewport-relative
 * and never trapped by ancestor CSS transforms (such as composer-dock -translate-x-1/2),
 * preventing overlap with the composer send control across all viewports.
 */
export function VoiceAgentOrb({
  busy = false,
  conversationActive = false,
  conversationStatus = 'idle',
  dictate = () => undefined,
  onEndConversation = () => undefined,
  onStartConversation = () => undefined,
  onSubmit = () => undefined,
  voiceActivity = { elapsedSeconds: 0, level: 0, status: 'idle' },
  voiceStatus = 'idle'
}: {
  busy?: boolean
  conversationActive?: boolean
  conversationStatus?: ConversationStatus
  dictate?: () => void
  onEndConversation?: () => void
  onStartConversation?: () => void
  onSubmit?: (text: string) => void
  voiceActivity?: VoiceActivityState
  voiceStatus?: VoiceStatus
}) {
  const visible = useStore($orbVisible)
  const open = useStore($orbOpen)
  const setOpen = (next: boolean) => $orbOpen.set(next)
  const [draft, setDraft] = useState('')
  const [position, setPosition] = useState(readPosition)

  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const isListening = voiceStatus === 'recording' || conversationStatus === 'listening'
  const micLevel = useMicLevel(isListening)

  const orbState: OrbState = isListening
    ? 'listening'
    : voiceStatus === 'transcribing' || busy || conversationStatus === 'thinking'
      ? 'thinking'
      : conversationStatus === 'speaking'
        ? 'speaking'
        : 'idle'

  // Listen to conductor:voice:orb events from titlebar / shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleToggle = (event: Event) => {
      const custom = event as CustomEvent<boolean>

      if (typeof custom.detail === 'boolean') {
        $orbVisible.set(custom.detail)
      } else {
        $orbVisible.set(readOrbVisible())
      }
    }

    window.addEventListener('conductor:voice:orb', handleToggle)

    return () => window.removeEventListener('conductor:voice:orb', handleToggle)
  }, [])

  // Close open dialog on Escape
  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Keep position clamped within viewport on resize
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleResize = () => {
      setPosition(prev => {
        const maxX = window.innerWidth - 80
        const maxY = window.innerHeight - 120
        const clampedX = Math.max(-16, Math.min(maxX, prev.x))
        const clampedY = Math.max(0, Math.min(maxY, prev.y))

        if (clampedX === prev.x && clampedY === prev.y) {
          return prev
        }

        return { x: clampedX, y: clampedY }
      })
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('hermes.desktop.voice.orb.position', JSON.stringify(position))
    } catch {
      // storage unavailable — position just stops persisting
    }
  }, [position])

  const sendDraft = () => {
    const text = draft.trim()

    if (!text) {
      return
    }

    setDraft('')
    onSubmit(text)
  }

  const beginDrag = (event: React.PointerEvent, allowOnControls = false) => {
    if (!allowOnControls && (event.target as HTMLElement).closest('button,input,textarea,[role=switch]')) {
      return
    }

    dragRef.current = { x: event.clientX, y: event.clientY, px: position.x, py: position.y, moved: false }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: React.PointerEvent) => {
    if (!dragRef.current) {
      return
    }

    const dx = event.clientX - dragRef.current.x
    const dy = event.clientY - dragRef.current.y

    if (Math.abs(dx) + Math.abs(dy) > 4) {
      dragRef.current.moved = true
    }

    const maxX = typeof window !== 'undefined' ? window.innerWidth - 80 : 800
    const maxY = typeof window !== 'undefined' ? window.innerHeight - 120 : 600

    // Clamp y >= 0 so dragging can never drag the orb downward into the composer toolbar / send button
    setPosition({
      x: Math.max(-16, Math.min(maxX, dragRef.current.px - dx)),
      y: Math.max(0, Math.min(maxY, dragRef.current.py - dy))
    })
  }

  const endDrag = () => {
    suppressClick.current = Boolean(dragRef.current?.moved)
    dragRef.current = null
  }

  if (!visible) {
    return null
  }

  const tone =
    orbState === 'listening'
      ? 'text-rose-400'
      : orbState === 'thinking'
        ? 'text-amber-400'
        : orbState === 'speaking'
          ? 'text-aro-iris-soft'
          : 'text-(--ui-text-tertiary)'

  const elapsed = voiceActivity?.elapsedSeconds ?? 0

  const transcript = elapsed > 0 || isListening
    ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
    : ''

  const content = (
    <div
      className="voice-agent fixed right-6 bottom-[112px] z-[80] flex flex-col items-end select-none"
      data-orb-open={open ? '' : undefined}
      data-orb-state={orbState}
      data-testid="voice-agent-orb"
      style={{ transform: `translate(${-position.x}px, ${-position.y}px)` }}
    >
      {open && (
        <section
          aria-label="Voice assistant"
          className="mb-3 w-[min(340px,calc(100vw-28px))] animate-in fade-in zoom-in-95 duration-150 overflow-hidden rounded-overlay border border-aro-line-strong bg-aro-overlay/95 shadow-aro-e4 backdrop-blur-xl"
          role="dialog"
        >
          <div
            className="flex cursor-grab items-center gap-2 border-b border-aro-line-soft/60 px-3.5 pt-3 pb-2 active:cursor-grabbing"
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
          >
            <span className="text-xs font-semibold tracking-tight text-aro-ink">Aro</span>
            <span className={cn('flex items-center gap-1 font-aro-mono text-[var(--aro-text-2xs,10px)]', tone)}>
              <i className="size-[5px] rounded-full bg-current" />
              {ORB_LABEL[orbState].toLowerCase()}
            </span>
            <button
              aria-label="Minimise to orb"
              className="ml-auto flex size-6 cursor-pointer items-center justify-center rounded-full text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
              onClick={() => setOpen(false)}
              type="button"
            >
              <Codicon className="size-3" name="close" />
            </button>
          </div>

          {/* Hero orb — one tap starts the REAL voice conversation (VAD loop). */}
          <div className="flex flex-col items-center px-4 pt-3 pb-3">
            <button
              aria-label={conversationActive ? 'End voice conversation' : 'Start voice conversation'}
              aria-pressed={conversationActive}
              className="relative cursor-pointer rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-aro-iris focus-visible:outline-none active:scale-95"
              onClick={() => (conversationActive ? onEndConversation() : onStartConversation())}
              type="button"
            >
              <Orb levelRef={micLevel} size={118} state={orbState} />
            </button>
            <p className={cn('mt-2 text-xs font-medium', tone)}>{STATE_HINT[orbState]}</p>
            <p className="mt-1 min-h-[34px] max-w-[280px] text-center text-xs leading-[1.45] text-aro-ink-2">
              {transcript ? (
                <span className="font-aro-mono text-aro-ink-4">
                  {transcript}
                  {voiceStatus === 'transcribing' ? ' · transcribing…' : ''}
                </span>
              ) : (
                <span className="text-aro-ink-4">
                  The conversation holds the mic — speak naturally, Aro submits each turn and replies aloud.
                </span>
              )}
            </p>
          </div>

          {/* Single-shot dictation: the REAL composer dictation pipeline. */}
          <div className="flex gap-1.5 px-3.5 pb-3">
            <input
              aria-label="Send a message"
              className="h-[34px] min-w-0 flex-1 rounded-control border border-aro-line bg-aro-well px-3 text-xs text-aro-ink placeholder:text-aro-ink-4 focus:border-aro-iris/60 focus:outline-none"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  sendDraft()
                }
              }}
              placeholder="Type instead…"
              value={draft}
            />
            <button
              aria-label="Dictate once — inserts into the composer"
              className={cn(
                'flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors',
                voiceStatus === 'idle' ? 'bg-aro-raise text-aro-ink-2 hover:bg-aro-hover' : 'bg-aro-rose-tint text-aro-rose'
              )}
              disabled={conversationActive}
              onClick={() => dictate()}
              type="button"
            >
              <Codicon name="mic" size="0.9rem" />
            </button>
            <button
              aria-label="Send"
              className={cn(
                'flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors',
                draft.trim() ? 'bg-aro-iris text-white shadow-aro-e1' : 'bg-aro-raise text-aro-ink-4'
              )}
              disabled={!draft.trim()}
              onClick={sendDraft}
              type="button"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Minimised: just the orb — draggable. Double-click starts/ends the
          REAL voice conversation. */}
      {!open && (
        <div className="group relative">
          <button
            aria-label={`Aro voice · ${ORB_LABEL[orbState]} · click to open, double-click to talk`}
            className="relative flex size-[54px] cursor-grab items-center justify-center rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-aro-iris focus-visible:outline-none hover:scale-105 active:cursor-grabbing"
            data-testid="orb-toggle-button"
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false

                return
              }

              setOpen(true)
            }}
            onDoubleClick={() => (conversationActive ? onEndConversation() : onStartConversation())}
            onPointerDown={event => beginDrag(event, true)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            type="button"
          >
            <Orb levelRef={micLevel} size={46} state={orbState} />
          </button>
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 right-[62px] -translate-y-1/2 rounded-full border border-aro-line-strong bg-aro-overlay/90 px-2.5 py-1 font-aro-mono text-[var(--aro-text-2xs,10px)] whitespace-nowrap shadow-aro-e2 backdrop-blur-md transition-[opacity,transform] duration-200',
              orbState === 'idle'
                ? 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                : 'opacity-100',
              tone
            )}
          >
            {ORB_LABEL[orbState]}
            {orbState === 'idle' && <span className="ml-1.5 opacity-60">dbl-click</span>}
          </span>
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(content, document.body)
}
