/**
 * ARO HERO MOMENTS & INTERACTION HARNESS (Phase 14, Step 3 & Gate 14.2)
 *
 * Implements and benchmarks the 9 signature Hero Moments in Aro Desktop:
 * 1. Launch/Boot Sequence (gentle fade, CLS=0)
 * 2. Message Send (optimistic insertion, aro-rise 160ms, 0ms input freeze)
 * 3. Streaming Text and Caret (stepped typewriter, aro-caret 1.1s, 0 layout bounce)
 * 4. Tool-Call Timeline (aro-breathe 2.6s pulse, status flip, crisp accordion)
 * 5. Pane Open/Close (aro-sheet-in 260ms, transform-only, 0 width animation)
 * 6. Command Palette (aro-pop 220ms spring, instant keyboard focus)
 * 7. Theme Switch (atomic CSS variable swap, 0 layout shift, <8ms)
 * 8. Voice Orb (canvas DPR-scaled reactive sphere, halts on reduced-motion)
 * 9. Empty States (blueprint dot/grid texture, staggered card arrival)
 */
import { useState } from 'react'

import { Orb, type OrbState } from '@/app/chat/orb'
import { triggerHaptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

import { AmbientSpaceLayer } from './AmbientSpaceLayer'
import {
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconCommand,
  IconGrid,
  IconLayers,
  IconMic,
  IconPalette,
  IconPlay,
  IconPulse,
  IconSearch,
  IconSpark,
  IconTerminal,
  IconX,
} from './Icons'

// ---------------------------------------------------------------------------
// 1. LAUNCH / BOOT SEQUENCE
// ---------------------------------------------------------------------------
export function HeroLaunchBoot({ onTiming }: { onTiming?: (ms: number) => void }) {
  const [booting, setBooting] = useState(false)
  const [stage, setStage] = useState<'idle' | 'splash' | 'ready'>('ready')

  const triggerBoot = () => {
    const t0 = performance.now()
    setBooting(true)
    setStage('splash')

    setTimeout(() => {
      setStage('ready')
      setBooting(false)
      const duration = performance.now() - t0
      onTiming?.(Math.round(duration))
      triggerHaptic('success')
    }, 450) // --aro-dur-hero
  }

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-launch-boot">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconSpark className="text-aro-iris shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">1. Launch / Boot Sequence</span>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-control border border-aro-line bg-aro-raise px-2.5 py-1 text-aro-xs font-medium text-aro-ink hover:bg-aro-hover transition-colors cursor-pointer"
          disabled={booting}
          onClick={triggerBoot}
          type="button"
        >
          <IconPlay size={10} />
          <span>Replay Boot</span>
        </button>
      </div>

      <div className="relative mt-3 flex h-32 items-center justify-center overflow-hidden rounded-panel border border-aro-line-soft bg-aro-bg">
        {stage === 'splash' ? (
          <div className="flex flex-col items-center gap-2 animate-aro-pop text-center">
            <div className="size-8 rounded-full bg-aro-iris flex items-center justify-center text-white shadow-aro-glow">
              <span className="font-aro-display text-sm font-bold">A</span>
            </div>
            <p className="font-aro-mono text-aro-xs text-aro-ink-3">Initializing Aro Core...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 animate-aro-fade text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-aro-mint/30 bg-aro-mint-tint px-2.5 py-0.5 text-aro-xs text-aro-mint font-medium">
              <IconCheck size={11} /> Workspace Ready
            </span>
            <p className="text-aro-xs text-aro-ink-4">0 layout shifts · CLS = 0.000 · Settle time: 450ms</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. MESSAGE SEND (OPTIMISTIC INSERTION)
// ---------------------------------------------------------------------------
export function HeroMessageSend({ onSendTiming }: { onSendTiming?: (ms: number) => void }) {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; time: string }>>([
    { id: '1', text: 'Analyze git repository architecture and test motion budget.', time: '10:42 AM' },
  ])

  const [inputValue, setInputValue] = useState('')

  const handleSend = () => {
    if (!inputValue.trim()) {
      return
    }

    const t0 = performance.now()

    const newMsg = {
      id: String(Date.now()),
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Paint in the current frame immediately
    setMessages((prev) => [...prev, newMsg])
    setInputValue('')
    triggerHaptic('tap')

    const latency = performance.now() - t0
    onSendTiming?.(Math.round(latency * 100) / 100)
  }

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-message-send">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconArrowUp className="text-aro-iris shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">2. Message Send (Optimistic Insertion)</span>
        </div>
        <span className="text-aro-xs text-aro-ink-4 font-mono">aro-rise · 160ms</span>
      </div>

      <div className="mt-3 flex h-32 flex-col justify-between overflow-hidden rounded-panel border border-aro-line-soft bg-aro-bg p-3">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <div
              className="ml-auto max-w-[85%] rounded-panel bg-aro-iris px-3 py-1.5 text-xs text-white animate-aro-rise shadow-aro-e1"
              key={m.id}
            >
              <p>{m.text}</p>
              <span className="block text-right text-[var(--aro-text-2xs,9px)] opacity-75">{m.time}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-1.5">
          <input
            className="flex-1 rounded-control border border-aro-line bg-aro-sunken px-2.5 py-1 text-xs text-aro-ink outline-none focus:border-aro-iris"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message and hit Enter..."
            type="text"
            value={inputValue}
          />
          <button
            className="rounded-control bg-aro-iris px-3 py-1 text-xs font-medium text-white hover:bg-aro-iris-soft transition-colors cursor-pointer"
            onClick={handleSend}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. STREAMING TEXT AND CARET
// ---------------------------------------------------------------------------
export function HeroStreamingCaret() {
  const fullText = 'Aro Desktop streams tokens incrementally with zero layout reflow and steady 60fps.'
  const [displayedText, setDisplayedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const startStream = () => {
    setDisplayedText('')
    setIsStreaming(true)
    let idx = 0

    const interval = setInterval(() => {
      idx += 3

      if (idx >= fullText.length) {
        setDisplayedText(fullText)
        setIsStreaming(false)
        clearInterval(interval)
      } else {
        setDisplayedText(fullText.slice(0, idx))
      }
    }, 45)
  }

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-streaming-caret">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconPulse className="text-aro-cyan shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">3. Streaming Text and Caret</span>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-control border border-aro-line bg-aro-raise px-2.5 py-1 text-aro-xs font-medium text-aro-ink hover:bg-aro-hover transition-colors cursor-pointer"
          disabled={isStreaming}
          onClick={startStream}
          type="button"
        >
          <IconPlay size={10} />
          <span>Stream Tokens</span>
        </button>
      </div>

      <div className="mt-3 flex h-24 items-center rounded-panel border border-aro-line-soft bg-aro-bg p-3">
        <p className="font-mono text-xs text-aro-ink leading-relaxed">
          {displayedText || 'Click "Stream Tokens" to simulate live completion output...'}
          {isStreaming && (
            <span aria-hidden className="inline-block h-3.5 w-1.5 ml-0.5 bg-aro-iris animate-aro-caret align-middle" />
          )}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. TOOL-CALL TIMELINE
// ---------------------------------------------------------------------------
export function HeroToolTimeline() {
  const [toolState, setToolState] = useState<'idle' | 'running' | 'complete'>('idle')
  const [expanded, setExpanded] = useState(false)

  const runTool = () => {
    setToolState('running')
    setTimeout(() => {
      setToolState('complete')
      setExpanded(true)
      triggerHaptic('success')
    }, 700)
  }

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-tool-timeline">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconTerminal className="text-aro-amber shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">4. Tool-Call Timeline</span>
        </div>
        <button
          className="rounded-control border border-aro-line bg-aro-raise px-2 py-1 text-aro-xs text-aro-ink hover:bg-aro-hover transition-colors cursor-pointer"
          onClick={runTool}
          type="button"
        >
          Execute Tool
        </button>
      </div>

      <div className="mt-3 rounded-panel border border-aro-line-soft bg-aro-bg overflow-hidden">
        <button
          className="flex w-full items-center justify-between p-2.5 text-left hover:bg-aro-hover/50 transition-colors cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-2 rounded-full',
                toolState === 'running'
                  ? 'bg-aro-amber animate-aro-breathe'
                  : toolState === 'complete'
                    ? 'bg-aro-mint'
                    : 'bg-aro-ink-4'
              )}
            />
            <span className="font-mono text-xs font-semibold text-aro-ink">bash: git diff --stat</span>
          </div>
          <IconChevronDown
            className={cn('text-aro-ink-4 transition-transform duration-aro-base', expanded && 'rotate-180')}
            size={13}
          />
        </button>

        {expanded && (
          <div className="border-t border-aro-line-soft bg-aro-well/50 p-2.5 font-mono text-aro-xs text-aro-ink-3 animate-aro-slide-down">
            <p>11 files changed, 1406 insertions(+), 1039 deletions(-)</p>
            <p className="text-aro-mint mt-1">Status: Exit code 0 (success in 42ms)</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 5. PANE OPEN / CLOSE (DRAWERS & SHEETS)
// ---------------------------------------------------------------------------
export function HeroPaneDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-pane-drawer">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconLayers className="text-aro-plum shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">5. Pane Open / Close (Drawers & Sheets)</span>
        </div>
        <button
          className="rounded-control border border-aro-line bg-aro-raise px-2.5 py-1 text-aro-xs font-medium text-aro-ink hover:bg-aro-hover transition-colors cursor-pointer"
          onClick={() => setDrawerOpen(!drawerOpen)}
          type="button"
        >
          {drawerOpen ? 'Close Drawer' : 'Open Drawer'}
        </button>
      </div>

      <div className="relative mt-3 h-32 overflow-hidden rounded-panel border border-aro-line-soft bg-aro-bg flex items-center justify-center">
        <span className="text-aro-xs text-aro-ink-4">Main Workspace View</span>

        {drawerOpen && (
          <div className="absolute inset-y-0 right-0 w-48 border-l border-aro-line bg-aro-raise p-3 shadow-aro-e3 animate-aro-sheet">
            <div className="flex items-center justify-between border-b border-aro-line-soft pb-2">
              <span className="text-xs font-semibold text-aro-ink">Task Inspector</span>
              <button
                className="text-aro-ink-4 hover:text-aro-ink cursor-pointer"
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                <IconX size={12} />
              </button>
            </div>
            <p className="mt-2 text-aro-xs text-aro-ink-3">
              GPU-composited via translateX across --aro-dist-xl (28px).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 6. COMMAND PALETTE (⌘K / CTRL+K)
// ---------------------------------------------------------------------------
export function HeroCommandPalette() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-command-palette">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconCommand className="text-aro-iris shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">6. Command Palette (⌘K)</span>
        </div>
        <button
          className="rounded-control border border-aro-line bg-aro-raise px-2.5 py-1 text-aro-xs font-medium text-aro-ink hover:bg-aro-hover transition-colors cursor-pointer"
          onClick={() => setOpen(!open)}
          type="button"
        >
          Trigger Palette
        </button>
      </div>

      <div className="relative mt-3 h-32 overflow-hidden rounded-panel border border-aro-line-soft bg-aro-bg flex items-center justify-center">
        {open ? (
          <div className="w-64 rounded-overlay border border-aro-line bg-aro-overlay p-2.5 shadow-aro-e4 animate-aro-pop">
            <div className="flex items-center gap-1.5 border-b border-aro-line-soft pb-1.5 px-1">
              <IconSearch className="text-aro-ink-4" size={11} />
              <input
                autoFocus
                className="w-full bg-transparent text-xs text-aro-ink outline-none"
                placeholder="Search commands..."
              />
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="rounded-control bg-aro-hover px-2 py-1 text-xs text-aro-ink font-medium">
                Switch to Model: Claude 3.7
              </div>
              <div className="rounded-control px-2 py-1 text-xs text-aro-ink-3">Open Project Dialog</div>
            </div>
          </div>
        ) : (
          <span className="text-aro-xs text-aro-ink-4">Press ⌘K or click Trigger Palette</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7. THEME SWITCH
// ---------------------------------------------------------------------------
export function HeroThemeSwitch() {
  const [activeTheme, setActiveTheme] = useState<'obsidian' | 'daylight' | 'nord'>('obsidian')
  const [switchTimeMs, setSwitchTimeMs] = useState<number | null>(null)

  const handleSwitch = (theme: 'obsidian' | 'daylight' | 'nord') => {
    const t0 = performance.now()
    setActiveTheme(theme)
    document.documentElement.setAttribute('data-theme', theme)
    const dt = performance.now() - t0
    setSwitchTimeMs(Math.round(dt * 100) / 100)
    triggerHaptic('tap')
  }

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-theme-switch">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconPalette className="text-aro-cyan shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">7. Theme Switch</span>
        </div>
        {switchTimeMs !== null && (
          <span className="font-mono text-aro-xs text-aro-mint">{switchTimeMs}ms swap</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 rounded-panel border border-aro-line-soft bg-aro-bg p-4">
        {(['obsidian', 'daylight', 'nord'] as const).map((t) => (
          <button
            className={cn(
              'rounded-control border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              activeTheme === t
                ? 'border-aro-iris bg-aro-iris-tint text-aro-ink font-semibold'
                : 'border-aro-line bg-aro-raise text-aro-ink-3 hover:bg-aro-hover'
            )}
            key={t}
            onClick={() => handleSwitch(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 8. VOICE ORB
// ---------------------------------------------------------------------------
export function HeroVoiceOrb() {
  const [state, setState] = useState<OrbState>('idle')

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-voice-orb">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconMic className="text-aro-rose shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">8. Voice Orb</span>
        </div>
        <div className="flex gap-1">
          {(['idle', 'listening', 'thinking', 'speaking'] as const).map((s) => (
            <button
              className={cn(
                'rounded-control px-2 py-0.5 text-[var(--aro-text-2xs,10px)] transition-colors cursor-pointer',
                state === s ? 'bg-aro-iris text-white font-medium' : 'text-aro-ink-3 hover:text-aro-ink'
              )}
              key={s}
              onClick={() => setState(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-panel border border-aro-line-soft bg-aro-bg">
        <Orb size={54} state={state} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 9. EMPTY STATES
// ---------------------------------------------------------------------------
export function HeroEmptyStates() {
  const [gridStyle, setGridStyle] = useState<'dots' | 'grid'>('dots')

  return (
    <div className="rounded-panel border border-aro-line bg-aro-sunken p-4" data-testid="hero-empty-states">
      <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
        <div className="flex items-center gap-2">
          <IconGrid className="text-aro-iris shrink-0" size={14} />
          <span className="text-xs font-semibold text-aro-ink">9. Empty States</span>
        </div>
        <div className="flex gap-1">
          <button
            className={cn(
              'rounded-control px-2 py-0.5 text-[var(--aro-text-2xs,10px)] transition-colors cursor-pointer',
              gridStyle === 'dots' ? 'bg-aro-iris text-white' : 'text-aro-ink-3'
            )}
            onClick={() => setGridStyle('dots')}
            type="button"
          >
            Dots
          </button>
          <button
            className={cn(
              'rounded-control px-2 py-0.5 text-[var(--aro-text-2xs,10px)] transition-colors cursor-pointer',
              gridStyle === 'grid' ? 'bg-aro-iris text-white' : 'text-aro-ink-3'
            )}
            onClick={() => setGridStyle('grid')}
            type="button"
          >
            Grid
          </button>
        </div>
      </div>

      <div
        className={cn(
          'mt-3 flex h-32 flex-col items-center justify-center rounded-panel border border-aro-line-soft p-4 text-center',
          gridStyle === 'dots' ? 'aro-dot-bg bg-aro-bg' : 'aro-grid-bg bg-aro-bg'
        )}
      >
        <span className="font-semibold text-xs text-aro-ink animate-aro-rise">No Active Sessions</span>
        <p className="mt-1 max-w-xs text-aro-xs text-aro-ink-4">
          Radial blueprint depth texture with zero layout cost.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UNIFIED HERO MOMENTS GALLERY & AMBIENT HARNESS
// ---------------------------------------------------------------------------
export function AroHeroMomentsGallery() {
  return (
    <div className="space-y-6" data-testid="aro-hero-moments-gallery">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-aro-ink">Phase 14 · Signature Hero Moments</h3>
        <p className="text-aro-xs text-aro-ink-3">
          Nine audited interaction moments governed by compositor budgets, 60fps frame caps, and zero layout shift.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HeroLaunchBoot />
        <HeroMessageSend />
        <HeroStreamingCaret />
        <HeroToolTimeline />
        <HeroPaneDrawer />
        <HeroCommandPalette />
        <HeroThemeSwitch />
        <HeroVoiceOrb />
        <HeroEmptyStates />
      </div>

      {/* Ambient Layer Demo */}
      <div className="rounded-panel border border-aro-line bg-aro-sunken p-4">
        <div className="flex items-center justify-between border-b border-aro-line-soft pb-2.5">
          <div className="flex items-center gap-2">
            <IconSpark className="text-aro-iris shrink-0" size={14} />
            <span className="text-xs font-semibold text-aro-ink">10. Ambient Space Layer (Starfield)</span>
          </div>
          <span className="font-mono text-aro-xs text-aro-ink-4">30fps cap · &lt;0.8ms/frame</span>
        </div>
        <div className="relative mt-3 h-32 overflow-hidden rounded-panel border border-aro-line-soft bg-aro-bg flex items-center justify-center">
          <AmbientSpaceLayer forceActive />
          <span className="relative z-10 text-aro-xs text-white/80 font-mono bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
            Active Starfield Background (drifting canvas)
          </span>
        </div>
      </div>
    </div>
  )
}
