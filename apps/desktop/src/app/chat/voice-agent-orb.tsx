import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Codicon } from '@/components/ui/codicon'
import { ArrowUp } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { SETTINGS_ROUTE } from '../routes'
import { Orb, ORB_LABEL, type OrbState, useMicLevel } from './orb'

const STATE_HINT: Record<OrbState, string> = {
  idle: 'Tap the orb to talk',
  listening: "Speak naturally — I'm listening",
  thinking: 'The agent is working on it',
  speaking: 'Reading the reply aloud',
  completed: 'Finished — reply is in the session',
  error: 'Something needs your attention'
}

export function VoiceAgentOrb({
  busy = false,
  onSend
}: {
  busy?: boolean
  onSend?: (text: string) => void
}) {
  const navigate = useNavigate()
  const isAro = typeof document !== 'undefined' && document.documentElement.dataset.aroUi === 'true'
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('conductor.voice.orb') !== 'false'
    } catch {
      return true
    }
  })
  const [handsFree, setHandsFree] = useState(() => {
    try {
      return localStorage.getItem('conductor.voice.handsFree') === 'true'
    } catch {
      return false
    }
  })
  const [listening, setListening] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [errorFlash, setErrorFlash] = useState(false)
  const [draft, setDraft] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [lastHeard, setLastHeard] = useState('')
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const p = JSON.parse(localStorage.getItem('conductor.voice.position') || 'null')
      return p && typeof p.x === 'number' ? p : { x: 0, y: 0 }
    } catch {
      return { x: 0, y: 0 }
    }
  })

  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  // biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition is vendor-prefixed and dynamically supported
  const recRef = useRef<any>(null)
  const restartOnEnd = useRef(false)
  const wasBusy = useRef(busy)
  // biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition is vendor-prefixed
  const supported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const micLevel = useMicLevel(enabled && listening)

  const orbState: OrbState = errorFlash
    ? 'error'
    : listening
      ? 'listening'
      : busy
        ? 'thinking'
        : completed
          ? 'completed'
          : 'idle'

  useEffect(() => {
    try {
      localStorage.setItem('conductor.voice.position', JSON.stringify(position))
    } catch {}
  }, [position])

  useEffect(() => {
    try {
      localStorage.setItem('conductor.voice.handsFree', String(handsFree))
    } catch {}
  }, [handsFree])

  useEffect(() => {
    if (wasBusy.current && !busy) {
      setCompleted(true)
      const t = window.setTimeout(() => setCompleted(false), 2800)
      wasBusy.current = busy
      return () => window.clearTimeout(t)
    }
    wasBusy.current = busy
  }, [busy])

  const flashError = (msg: string) => {
    setError(msg)
    setErrorFlash(true)
    window.setTimeout(() => setErrorFlash(false), 3200)
  }

  function stopRecognition() {
    restartOnEnd.current = false
    try {
      recRef.current?.stop()
    } catch {}
    setListening(false)
    setInterim('')
  }

  useEffect(() => {
    const handleVoiceOrbToggle = (e: Event) => {
      setEnabled(Boolean((e as CustomEvent<boolean>).detail))
    }
    window.addEventListener('conductor:voice:orb', handleVoiceOrbToggle)
    return () => {
      window.removeEventListener('conductor:voice:orb', handleVoiceOrbToggle)
    }
  }, [])

  const routeCommand = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) return
      setLastHeard(text)
      const lower = text.toLowerCase().replace(/[.!?]+$/, '')

      if (lower.includes('open settings') || lower === 'settings') {
        navigate(SETTINGS_ROUTE)
        return
      }

      if (['stop listening', 'stop voice', 'stop'].includes(lower)) {
        setHandsFree(false)
        stopRecognition()
        return
      }

      if (onSend) {
        onSend(text)
      }
    },
    [navigate, onSend]
  )

  const startRecognition = useCallback(
    (continuous: boolean) => {
      if (typeof window === 'undefined') return
      // biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition vendor prefix
      const win = window as any
      const C = win.SpeechRecognition || win.webkitSpeechRecognition
      if (!C) {
        flashError("Voice isn't supported in this browser.")
        return
      }
      try {
        recRef.current?.abort()
        const r = new C()
        r.lang = navigator.language || 'en-US'
        r.continuous = continuous
        r.interimResults = true
        restartOnEnd.current = continuous
        // biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition event
        r.onresult = (e: any) => {
          let fin = ''
          let tmp = ''
          for (let i = e.resultIndex; i < e.results.length; i += 1) {
            const it = e.results[i]
            const ph = it[0]?.transcript ?? ''
            if (it.isFinal) fin += ph
            else tmp += ph
          }
          setInterim(tmp)
          if (fin.trim()) {
            setInterim('')
            if (continuous) {
              routeCommand(fin)
            } else {
              setDraft(v => `${v}${v ? ' ' : ''}${fin.trim()}`)
            }
          }
        }
        // biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition error
        r.onerror = (e: any) => {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            restartOnEnd.current = false
            flashError('Microphone blocked — allow it in settings.')
          } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
            restartOnEnd.current = false
            flashError(`Voice stopped: ${e.error}`)
          }
          setListening(false)
        }
        r.onend = () => {
          if (restartOnEnd.current) {
            window.setTimeout(() => {
              try {
                recRef.current?.start()
                setListening(true)
              } catch {
                setListening(false)
              }
            }, 240)
          } else {
            setListening(false)
          }
        }
        recRef.current = r
        setError('')
        setListening(true)
        r.start()
      } catch {
        setListening(false)
        flashError("Couldn't start the microphone.")
      }
    },
    [routeCommand]
  )

  useEffect(
    () => () => {
      try {
        recRef.current?.abort()
      } catch {}
    },
    []
  )

  const toggleListen = () => (listening ? stopRecognition() : startRecognition(handsFree))
  const sendDraft = () => {
    if (!draft.trim()) return
    routeCommand(draft)
    setDraft('')
  }

  const beginDrag = (e: React.PointerEvent, allowOnControls = false) => {
    if (!allowOnControls && (e.target as HTMLElement).closest('button,input,textarea,[role=switch]')) return
    dragRef.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const moveDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true
    const maxX = window.innerWidth - 80
    const maxY = window.innerHeight - 90
    setPosition({
      x: Math.max(-16, Math.min(maxX, dragRef.current.px - dx)),
      y: Math.max(-30, Math.min(maxY, dragRef.current.py - dy))
    })
  }
  const endDrag = () => {
    suppressClick.current = Boolean(dragRef.current?.moved)
    dragRef.current = null
  }

  if (!isAro || !enabled) return null

  const tone =
    orbState === 'listening'
      ? 'text-rose-400'
      : orbState === 'thinking'
        ? 'text-amber-400'
        : orbState === 'completed'
          ? 'text-emerald-400'
          : orbState === 'error'
            ? 'text-rose-400'
            : 'text-(--ui-text-tertiary)'

  return (
    <div
      className="voice-agent fixed right-6 bottom-[46px] z-[80] flex flex-col items-end select-none"
      style={{ transform: `translate(${-position.x}px, ${-position.y}px)` }}
    >
      {open && (
        <section
          role="dialog"
          aria-label="Voice assistant"
          className="mb-3 w-[min(340px,calc(100vw-28px))] animate-in fade-in zoom-in-95 duration-150 overflow-hidden rounded-[20px] border border-(--ui-border-active) bg-(--ui-bg-panel)/95 shadow-2xl backdrop-blur-xl"
        >
          <div
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            className="flex cursor-grab items-center gap-2 px-3.5 pt-3 active:cursor-grabbing border-b border-(--ui-border)/40 pb-2"
          >
            <span className="font-semibold text-[13px] text-foreground tracking-tight">Aro</span>
            <span className={cn('flex items-center gap-1 font-mono text-[10px]', tone)}>
              <i className="size-[5px] rounded-full bg-current" />
              {ORB_LABEL[orbState].toLowerCase()}
            </span>
            <button
              type="button"
              onClick={() => {
                stopRecognition()
                setOpen(false)
              }}
              className="ml-auto flex size-[24px] cursor-pointer items-center justify-center rounded-full text-(--ui-text-tertiary) transition-colors hover:bg-(--ui-control-hover-background) hover:text-foreground"
              aria-label="Minimise to orb"
            >
              <Codicon name="close" className="size-3" />
            </button>
          </div>

          {/* hero orb — tap to talk */}
          <div className="flex flex-col items-center px-4 pt-3 pb-3">
            <button
              type="button"
              onClick={toggleListen}
              className="relative cursor-pointer rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aro-iris"
              aria-label={listening ? 'Stop listening' : 'Start listening'}
              aria-pressed={listening}
            >
              <Orb state={orbState} size={118} levelRef={micLevel} />
            </button>
            <p className={cn('mt-2 text-[12.5px] font-medium', tone)}>{STATE_HINT[orbState]}</p>
            <p className="mt-1 min-h-[34px] max-w-[280px] text-center text-[11.5px] leading-[1.45] text-(--ui-text-secondary)">
              {interim ? (
                <span className="italic">“{interim}”</span>
              ) : lastHeard ? (
                <span className="text-(--ui-text-quaternary)">Last: “{lastHeard.slice(0, 90)}”</span>
              ) : supported ? (
                <span className="text-(--ui-text-quaternary)">Try “settings” or dictate a request.</span>
              ) : (
                <span className="text-amber-400">Voice recognition is unavailable.</span>
              )}
            </p>
            {error && (
              <p role="alert" className="mt-1 text-center text-[10.5px] text-amber-400">
                {error}
              </p>
            )}
          </div>

          {!handsFree && (
            <div className="flex gap-1.5 px-3.5 pb-3">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendDraft()}
                placeholder="Dictated text or a command…"
                className="h-[34px] min-w-0 flex-1 rounded-[10px] border border-(--ui-border) bg-(--ui-bg-input) px-3 text-[12px] text-foreground placeholder:text-(--ui-text-quaternary) focus:border-aro-iris/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={sendDraft}
                disabled={!draft.trim()}
                className={cn(
                  'flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] transition-colors',
                  draft.trim() ? 'bg-aro-iris text-white shadow-sm' : 'bg-(--ui-bg-muted) text-(--ui-text-quaternary)'
                )}
                aria-label="Send"
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2 border-t border-(--ui-border)/60 px-3.5 py-2.5 bg-(--ui-bg-muted)/30">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-[11.5px] font-medium text-foreground">Hands-free</span>
                <span className="block text-[10px] text-(--ui-text-quaternary)">Every phrase is sent</span>
              </span>
              <input
                type="checkbox"
                checked={handsFree}
                onChange={e => {
                  const v = e.target.checked
                  setHandsFree(v)
                  if (listening) {
                    stopRecognition()
                    if (v) startRecognition(true)
                  }
                }}
                className="h-4 w-4 rounded accent-aro-iris cursor-pointer"
              />
            </label>
          </div>
        </section>
      )}

      {/* minimised: just the orb — draggable */}
      {!open && (
        <div className="group relative">
          <button
            type="button"
            onPointerDown={e => beginDrag(e, true)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false
                return
              }
              setOpen(true)
            }}
            onDoubleClick={toggleListen}
            className="relative flex size-[54px] cursor-grab items-center justify-center rounded-full transition-transform hover:scale-105 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aro-iris"
            aria-label={`Aro hands-free voice · ${ORB_LABEL[orbState]} · click to open, double-click to talk`}
          >
            <Orb state={orbState} size={46} levelRef={micLevel} />
          </button>
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 right-[62px] -translate-y-1/2 rounded-full border border-(--ui-border-active) bg-(--ui-bg-panel)/90 px-2.5 py-1 font-mono text-[10px] whitespace-nowrap shadow-md backdrop-blur-md transition-all duration-200',
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
}
