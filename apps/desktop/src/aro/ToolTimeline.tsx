/**
 * ARO TOOL TIMELINE — the chat-canvas pattern port (P2/P3), now wired
 * to the real agent (R2).
 *
 * One column of steps tells one story: user ask → reasoning → plan →
 * tools (each a card: status, duration, expandable body, inline diff)
 * → approvals → checkpoint → final prose. When a session is live the
 * steps come from the gateway's own message stream ($messages folded
 * into Step[] by `live.tsx`), approvals answer through the real
 * `approval.respond` path, and the header carries the live session +
 * model + an R3 session picker. With no session, the seed transcript
 * renders behind a DEMO DATA badge — nothing fakes being live.
 */

import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'

import { cn } from '@/lib/utils'

import { DiffView } from './DiffCard'
import { AgentMark, IconBrain, IconCheck, IconChevronDown, IconEye, IconFile, IconList, IconMcp, IconSearch, IconShield, IconSpark, IconTerminal, IconUndo, IconWarning, IconX } from './Icons'
import { InlineHint, SessionPicker, SourceBadge, useAroTranscript } from './live'
import { ToastHost, useToasts } from './toasts'
import { Badge, Button, Kbd } from './ui'
import type { Step, ToolName } from './workbenchData'
import { agentById } from './workbenchData'

/* ===================== inline markdown-ish ===================== */

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)

  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') ? (
          <code className="rounded-[4px] border border-aro-line-soft bg-aro-well px-1 py-px font-aro-mono text-[11.5px] text-aro-cyan" key={i}>{p.slice(1, -1)}</code>
        ) : p.startsWith('**') ? (
          <strong className="font-semibold text-aro-ink" key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-2.5 text-[13.5px] leading-[1.65] text-aro-ink-2', className)}>
      {text.split('\n\n').map((b, i) => {
        const lines = b.split('\n')

        if (b.startsWith('## ')) {return <h4 className="pt-1 text-[13.5px] font-semibold text-aro-ink" key={i}>{b.slice(3)}</h4>}

        if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l)))
          {return (
            <ul className="space-y-1.5 pl-0.5" key={i}>
              {lines.map((l, j) => (
                <li className="flex gap-2" key={j}>
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-aro-iris-soft/70" />
                  <span><Inline text={l.replace(/^\s*([-*]|\d+\.)\s/, '')} /></span>
                </li>
              ))}
            </ul>
          )}

        return <p key={i}><Inline text={b} /></p>
      })}
    </div>
  )
}

/* ============================== tool card ============================== */

const toolMeta: Record<ToolName, { icon: ComponentType<{ size?: number; className?: string }>; tone: string; label: string }> = {
  read: { icon: IconFile, tone: 'text-aro-sky', label: 'read' },
  edit: { icon: IconSpark, tone: 'text-aro-iris-soft', label: 'edit' },
  write: { icon: IconSpark, tone: 'text-aro-iris-soft', label: 'write' },
  bash: { icon: IconTerminal, tone: 'text-aro-cyan', label: 'shell' },
  grep: { icon: IconSearch, tone: 'text-aro-plum', label: 'search' },
  mcp: { icon: IconMcp, tone: 'text-aro-mint', label: 'tool' },
  browser: { icon: IconEye, tone: 'text-aro-sky', label: 'browser' },
  test: { icon: IconCheck, tone: 'text-aro-mint', label: 'test' },
  plan: { icon: IconList, tone: 'text-aro-amber', label: 'plan' },
}

export function ToolCard({ step }: { step: Extract<Step, { type: 'tool' }> }) {
  const meta = toolMeta[step.tool]
  const Icon = meta.icon
  const [open, setOpen] = useState(step.status === 'running' || step.status === 'error' || Boolean(step.diff))
  const hasBody = Boolean(step.lines?.length || step.output?.length || step.diff)

  return (
    <div className="animate-aro-rise overflow-hidden rounded-[9px] border border-aro-line-soft bg-aro-well">
      <button aria-expanded={open} className={cn('flex w-full items-center gap-2 px-2.5 py-2 text-left', hasBody && 'cursor-pointer hover:bg-aro-hover/60')} onClick={() => hasBody && setOpen((o) => !o)}>
        <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-aro-line-soft bg-aro-raise', meta.tone)}>
          <Icon size={11} />
        </span>
        <span className="shrink-0 font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-ink-4 uppercase">{meta.label}</span>
        {step.target && <span className="min-w-0 flex-1 truncate font-aro-mono text-[11.5px] text-aro-ink-2">{step.target}</span>}
        {step.status === 'running' && <span className="flex shrink-0 items-center gap-1.5 font-aro-mono text-[10.5px] text-aro-cyan"><i className="size-[5px] animate-aro-breathe rounded-full bg-aro-cyan" />running</span>}
        {step.status === 'done' && !!step.ms && <span className="shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{step.ms}ms</span>}
        {step.status === 'error' && <Badge mono tone="rose">failed</Badge>}
        {hasBody && <IconChevronDown className={cn('shrink-0 text-aro-ink-4 transition-transform duration-200', open && 'rotate-180')} size={12} />}
      </button>
      {open && hasBody && (
        <div className="animate-aro-slide-down border-t border-aro-line-soft">
          {step.lines && (
            <pre className="aro-scroll-thin overflow-x-auto px-3 py-2 font-aro-mono text-[11px] leading-[1.7] text-aro-ink-3">
              {step.lines.map((l, i) => <div key={i}>{l || ' '}</div>)}
            </pre>
          )}
          {step.diff && <div className="p-2"><DiffView file={step.diff} /></div>}
          {step.output && (
            <div className="border-t border-aro-line-soft/70 bg-aro-code">
              <div className="px-3 pt-2 pb-1 font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">stdout</div>
              <pre className="aro-scroll-thin overflow-x-auto px-3 pb-2.5 font-aro-mono text-[11px] leading-[1.7] text-aro-ink-3">
                {step.output.map((l, i) => (
                  <div className={cn(l.trim().startsWith('✓') && 'text-aro-mint', l.trim().startsWith('✗') && 'text-aro-rose')} key={i}>{l}</div>
                ))}
                {step.status === 'running' && <div className="text-aro-cyan"><span className="animate-aro-caret">▊</span></div>}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ============================== approval ============================== */

export function ApprovalCard({
  step,
  onDecide,
  deadlineS,
  allowAlways = true,
  alwaysLabel = 'packages/**',
}: {
  step: Extract<Step, { type: 'approval' }>
  /** Live mode: answer through the real gateway (server-request reply or
   *  `approval.respond`). Absent = the seed card, which only flips locally. */
  onDecide?: (choice: 'once' | 'always' | 'deny') => void | Promise<void>
  /** When set, the countdown ticks for real (matches the gateway timeout). */
  deadlineS?: number
  allowAlways?: boolean
  alwaysLabel?: string
}) {
  const [state, setState] = useState(step.state)
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(deadlineS ?? 18)
  useEffect(() => {
    if (deadlineS == null || state !== 'open') {return}
    const timer = window.setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)

    return () => window.clearInterval(timer)
  }, [deadlineS, state])

  const decide = async (choice: 'once' | 'always' | 'deny') => {
    if (!onDecide) {
      setState(choice === 'deny' ? 'denied' : 'allowed')

      return
    }

    setBusy(true)

    try {
      await onDecide(choice)
      setState(choice === 'deny' ? 'denied' : 'allowed')
    } catch {
      // Gateway error — leave the card open and actionable.
    } finally {
      setBusy(false)
    }
  }

  const countdown =
    deadlineS != null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '18s'

  const riskTone = step.risk === 'high' ? 'rose' : step.risk === 'medium' ? 'amber' : 'mint'

  return (
    <div className={cn('animate-aro-rise overflow-hidden rounded-[10px] border bg-aro-well', state === 'denied' ? 'border-aro-rose/30' : state === 'allowed' ? 'border-aro-mint/25' : 'border-aro-amber/40')}>
      <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2">
        <IconShield className={state === 'allowed' ? 'text-aro-mint' : state === 'denied' ? 'text-aro-rose' : 'text-aro-amber'} size={13} />
        <span className="text-[12.5px] font-semibold text-aro-ink">Approval required</span>
        <Badge className="capitalize" mono tone={riskTone}>{step.risk} risk</Badge>
        <span className="ml-auto font-aro-mono text-[10px] text-aro-ink-4">{onDecide ? 'gateway approval' : 'rule: ask-before-publish'}</span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <pre className="aro-scroll-thin overflow-x-auto rounded-[6px] border border-aro-line-soft bg-aro-code px-2.5 py-2 font-aro-mono text-[11.5px] text-aro-ink-2">{step.command}</pre>
        <p className="text-[12px] text-aro-ink-3">{step.reason}</p>
        {state === 'open' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy} icon={IconCheck} onClick={() => void decide('once')} variant="success">Allow once</Button>
            {allowAlways && (
              <Button disabled={busy} onClick={() => void decide('always')} variant="outline">
                Always in <span className="ml-1 font-aro-mono text-[10.5px] text-aro-ink-3">{alwaysLabel}</span>
              </Button>
            )}
            <Button disabled={busy} icon={IconX} onClick={() => void decide('deny')} variant="danger">Deny</Button>
            <span className="ml-auto text-[10.5px] text-aro-ink-4">auto-deny in <Kbd className="ml-1">{countdown}</Kbd></span>
          </div>
        ) : (
          <div className={cn('flex items-center gap-2 text-[12px]', state === 'denied' ? 'text-aro-rose' : 'text-aro-mint')}>
            <IconCheck size={12} />
            {state === 'allowed' ? 'Allowed for this session' : 'Denied — agent will try a different approach'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ===================== thinking + checkpoint ===================== */

function Thinking({ step }: { step: Extract<Step, { type: 'thinking' }> }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-[9px] border border-dashed border-aro-line bg-aro-well/60">
      <button aria-expanded={open} className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-[7px] text-left" onClick={() => setOpen((o) => !o)}>
        <IconBrain className="shrink-0 text-aro-plum" size={12} />
        <span className="font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-ink-4 uppercase">reasoning</span>
        {!open && <span className="min-w-0 flex-1 truncate text-[11.5px] text-aro-ink-3 italic">{step.text}</span>}
        <span className="ml-auto shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{(step.ms / 1000).toFixed(1)}s</span>
        <IconChevronDown className={cn('shrink-0 text-aro-ink-4 transition-transform', open && 'rotate-180')} size={12} />
      </button>
      {open && <p className="animate-aro-slide-down border-t border-dashed border-aro-line px-3 py-2.5 text-[12.5px] leading-[1.65] text-aro-ink-3 italic">{step.text}</p>}
    </div>
  )
}

function Checkpoint({ step }: { step: Extract<Step, { type: 'checkpoint' }> }) {
  return (
    <div className="group flex items-center gap-2 px-1 py-0.5">
      <span className="h-px flex-1 bg-aro-line-soft" />
      <span className="flex items-center gap-1.5 font-aro-mono text-[10px] text-aro-ink-4">
        <IconUndo size={10} />checkpoint <span className="text-aro-ink-3">{step.hash}</span> · {step.label}
      </span>
      <button className="cursor-pointer rounded px-1 text-[10px] text-aro-iris-soft opacity-0 transition-opacity group-hover:opacity-100 hover:underline">restore</button>
      <span className="h-px flex-1 bg-aro-line-soft" />
    </div>
  )
}

/* ============================ step router ============================ */

export function StepView({ step, agentId = 'aro' }: { step: Step; agentId?: string }) {
  const a = agentById(agentId)

  if (step.type === 'user')
    {return (
      <div className="animate-aro-rise flex gap-3">
        <div aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-aro-hover font-aro-mono text-[10.5px] font-bold text-aro-ink-2 shadow-aro-e1">DV</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-aro-ink">You</span>
            <span className="font-aro-mono text-[10px] text-aro-ink-4">{step.at}</span>
            {step.attachments?.map((x) => (
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-aro-line bg-aro-raise px-1.5 py-px font-aro-mono text-[10px] text-aro-ink-3" key={x}><IconFile size={9} /> {x}</span>
            ))}
          </div>
          <div className="rounded-[10px] rounded-tl-[3px] border border-aro-line-soft bg-aro-raise px-3.5 py-2.5"><Prose text={step.text} /></div>
        </div>
      </div>
    )}

  if (step.type === 'text')
    {return (
      <div className="animate-aro-rise flex gap-3">
        <AgentMark from={a.from} glyph={a.glyph} size={28} to={a.to} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-aro-ink">{a.name}</span>
            <Badge className="text-[9.5px]" mono tone="iris">aro-4-70b</Badge>
          </div>
          <Prose text={step.text} />
        </div>
      </div>
    )}

  if (step.type === 'thinking') {return <Thinking step={step} />}

  if (step.type === 'tool') {return <div className="pl-10"><ToolCard step={step} /></div>}

  if (step.type === 'approval') {return <div className="pl-10"><ApprovalCard step={step} /></div>}

  if (step.type === 'checkpoint') {return <Checkpoint step={step} />}

  return <div className="flex items-center gap-2 rounded-[8px] border border-aro-line-soft bg-aro-raise px-3 py-2 text-[12px] text-aro-ink-3"><IconWarning className="text-aro-amber" size={12} />Unknown step</div>
}

export function StreamingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pl-10">
      <span className="flex size-[26px] items-center justify-center rounded-[8px] border border-aro-iris/30 bg-aro-iris-tint text-aro-iris-soft"><IconSpark className="animate-aro-breathe" size={12} /></span>
      <span className="text-[12.5px] text-aro-ink-3">{label}</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => <i className="size-1 rounded-full bg-aro-iris-soft animate-aro-breathe" key={i} style={{ animationDelay: `${i * 0.16}s` }} />)}
      </span>
    </div>
  )
}

/* ============================ the page ============================ */

export function AroTranscriptPage() {
  const { items, toast } = useToasts()
  const { steps, live, busy, approvals, decide, sessionId, model, title, checkpoints, sessions, storedSessionId } = useAroTranscript()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-theme="obsidian">
      <header className="flex flex-wrap items-center gap-3 border-b border-aro-line-soft px-5 py-3">
        <div className="min-w-0">
          <div className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">tool timeline · {live ? 'live session' : 'pattern'}</div>
          <h1 className="text-[15px] font-semibold text-aro-ink">Session transcript</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SourceBadge live={live} />
          {live && model && <Badge className="text-[9.5px]" mono tone="iris">{model}</Badge>}
          <Badge mono tone="neutral">{live ? `session ${sessionId ? sessionId.slice(0, 8) : '—'}` : 'session s-9f2'}</Badge>
          {live && checkpoints.length > 0 && <Badge mono tone="sky">{checkpoints.length} checkpoint{checkpoints.length === 1 ? '' : 's'}</Badge>}
          {live && <SessionPicker activeStoredId={storedSessionId} sessions={sessions} />}
        </div>
      </header>
      <div className="aro-scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-3.5 px-5 py-6">
          {live && title && <p className="px-1 text-[11.5px] text-aro-ink-4">{title}</p>}
          {steps.map((s, i) => <StepView agentId={s.type === 'text' ? s.agentId : 'aro'} key={i} step={s} />)}
          {live
            ? approvals.map(({ request, step }) => (
                <div className="pl-10" key={request.serverRequestId ?? request.requestId ?? step.command}>
                  <ApprovalCard
                    allowAlways={request.allowPermanent !== false}
                    alwaysLabel="this session"
                    deadlineS={300}
                    onDecide={choice =>
                      decide(request, choice).catch(() => toast('Gateway unreachable — approval not delivered', 'rose'))
                    }
                    step={step}
                  />
                </div>
              ))
            : null}
          {busy ? (
            <StreamingRow label="Aro is working — tool events stream in as they run" />
          ) : live ? null : (
            <StreamingRow label="Aro is watching the review queue" />
          )}
          {live && steps.length === 0 && !busy && (
            <InlineHint>No turns in this session yet — send a prompt in chat and the live timeline fills here.</InlineHint>
          )}
        </div>
      </div>
      <ToastHost items={items} />
    </div>
  )
}
