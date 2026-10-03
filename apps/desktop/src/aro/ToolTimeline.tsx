/**
 * ARO TOOL TIMELINE — the chat-canvas pattern port (P2/P3 foundation).
 *
 * One column of steps tells one story: user ask → reasoning → plan →
 * tools (each a card: status, duration, expandable body, inline diff)
 * → approvals → checkpoint → final prose. This is the pattern the
 * prototype proved; here it renders inside the real desktop app,
 * driven by Step[] — the same shape tui_gateway emits per turn.
 */

import { useState } from 'react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import type { Step, ToolName } from './workbenchData'
import { TRANSCRIPT, agentById } from './workbenchData'
import { DiffView } from './DiffCard'
import { AgentMark, IconBrain, IconCheck, IconChevronDown, IconFile, IconList, IconMcp, IconSearch, IconShield, IconSpark, IconTerminal, IconUndo, IconWarning, IconEye, IconX } from './Icons'
import { Badge, Button, Kbd } from './ui'
import { ToastHost, useToasts } from './toasts'

/* ===================== inline markdown-ish ===================== */

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') ? (
          <code key={i} className="rounded-[4px] border border-aro-line-soft bg-aro-well px-1 py-px font-aro-mono text-[11.5px] text-aro-cyan">{p.slice(1, -1)}</code>
        ) : p.startsWith('**') ? (
          <strong key={i} className="font-semibold text-aro-ink">{p.slice(2, -2)}</strong>
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
        if (b.startsWith('## ')) return <h4 key={i} className="pt-1 text-[13.5px] font-semibold text-aro-ink">{b.slice(3)}</h4>
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l)))
          return (
            <ul key={i} className="space-y-1.5 pl-0.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-aro-iris-soft/70" />
                  <span><Inline text={l.replace(/^\s*([-*]|\d+\.)\s/, '')} /></span>
                </li>
              ))}
            </ul>
          )
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
      <button onClick={() => hasBody && setOpen((o) => !o)} className={cn('flex w-full items-center gap-2 px-2.5 py-2 text-left', hasBody && 'cursor-pointer hover:bg-aro-hover/60')} aria-expanded={open}>
        <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-aro-line-soft bg-aro-raise', meta.tone)}>
          <Icon size={11} />
        </span>
        <span className="shrink-0 font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-ink-4 uppercase">{meta.label}</span>
        {step.target && <span className="min-w-0 flex-1 truncate font-aro-mono text-[11.5px] text-aro-ink-2">{step.target}</span>}
        {step.status === 'running' && <span className="flex shrink-0 items-center gap-1.5 font-aro-mono text-[10.5px] text-aro-cyan"><i className="size-[5px] animate-aro-breathe rounded-full bg-aro-cyan" />running</span>}
        {step.status === 'done' && !!step.ms && <span className="shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{step.ms}ms</span>}
        {step.status === 'error' && <Badge tone="rose" mono>failed</Badge>}
        {hasBody && <IconChevronDown size={12} className={cn('shrink-0 text-aro-ink-4 transition-transform duration-200', open && 'rotate-180')} />}
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
                  <div key={i} className={cn(l.trim().startsWith('✓') && 'text-aro-mint', l.trim().startsWith('✗') && 'text-aro-rose')}>{l}</div>
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

export function ApprovalCard({ step }: { step: Extract<Step, { type: 'approval' }> }) {
  const [state, setState] = useState(step.state)
  const riskTone = step.risk === 'high' ? 'rose' : step.risk === 'medium' ? 'amber' : 'mint'
  return (
    <div className={cn('animate-aro-rise overflow-hidden rounded-[10px] border bg-aro-well', state === 'denied' ? 'border-aro-rose/30' : state === 'allowed' ? 'border-aro-mint/25' : 'border-aro-amber/40')}>
      <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2">
        <IconShield size={13} className={state === 'allowed' ? 'text-aro-mint' : state === 'denied' ? 'text-aro-rose' : 'text-aro-amber'} />
        <span className="text-[12.5px] font-semibold text-aro-ink">Approval required</span>
        <Badge tone={riskTone} mono className="capitalize">{step.risk} risk</Badge>
        <span className="ml-auto font-aro-mono text-[10px] text-aro-ink-4">rule: ask-before-publish</span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <pre className="aro-scroll-thin overflow-x-auto rounded-[6px] border border-aro-line-soft bg-aro-code px-2.5 py-2 font-aro-mono text-[11.5px] text-aro-ink-2">{step.command}</pre>
        <p className="text-[12px] text-aro-ink-3">{step.reason}</p>
        {state === 'open' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="success" icon={IconCheck} onClick={() => setState('allowed')}>Allow once</Button>
            <Button variant="outline" onClick={() => setState('allowed')}>Always in <span className="ml-1 font-aro-mono text-[10.5px] text-aro-ink-3">packages/**</span></Button>
            <Button variant="danger" icon={IconX} onClick={() => setState('denied')}>Deny</Button>
            <span className="ml-auto text-[10.5px] text-aro-ink-4">auto-deny in <Kbd className="ml-1">18s</Kbd></span>
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
      <button onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-[7px] text-left" aria-expanded={open}>
        <IconBrain size={12} className="shrink-0 text-aro-plum" />
        <span className="font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-ink-4 uppercase">reasoning</span>
        {!open && <span className="min-w-0 flex-1 truncate text-[11.5px] text-aro-ink-3 italic">{step.text}</span>}
        <span className="ml-auto shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{(step.ms / 1000).toFixed(1)}s</span>
        <IconChevronDown size={12} className={cn('shrink-0 text-aro-ink-4 transition-transform', open && 'rotate-180')} />
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
    return (
      <div className="animate-aro-rise flex gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-aro-hover font-aro-mono text-[10.5px] font-bold text-aro-ink-2 shadow-aro-e1" aria-hidden>DV</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-aro-ink">You</span>
            <span className="font-aro-mono text-[10px] text-aro-ink-4">{step.at}</span>
            {step.attachments?.map((x) => (
              <span key={x} className="inline-flex items-center gap-1 rounded-[5px] border border-aro-line bg-aro-raise px-1.5 py-px font-aro-mono text-[10px] text-aro-ink-3"><IconFile size={9} /> {x}</span>
            ))}
          </div>
          <div className="rounded-[10px] rounded-tl-[3px] border border-aro-line-soft bg-aro-raise px-3.5 py-2.5"><Prose text={step.text} /></div>
        </div>
      </div>
    )
  if (step.type === 'text')
    return (
      <div className="animate-aro-rise flex gap-3">
        <AgentMark glyph={a.glyph} from={a.from} to={a.to} size={28} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-aro-ink">{a.name}</span>
            <Badge tone="iris" mono className="text-[9.5px]">aro-4-70b</Badge>
          </div>
          <Prose text={step.text} />
        </div>
      </div>
    )
  if (step.type === 'thinking') return <Thinking step={step} />
  if (step.type === 'tool') return <div className="pl-10"><ToolCard step={step} /></div>
  if (step.type === 'approval') return <div className="pl-10"><ApprovalCard step={step} /></div>
  if (step.type === 'checkpoint') return <Checkpoint step={step} />
  return <div className="flex items-center gap-2 rounded-[8px] border border-aro-line-soft bg-aro-raise px-3 py-2 text-[12px] text-aro-ink-3"><IconWarning size={12} className="text-aro-amber" />{step.text}</div>
}

export function StreamingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pl-10">
      <span className="flex size-[26px] items-center justify-center rounded-[8px] border border-aro-iris/30 bg-aro-iris-tint text-aro-iris-soft"><IconSpark size={12} className="animate-aro-breathe" /></span>
      <span className="text-[12.5px] text-aro-ink-3">{label}</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => <i key={i} className="size-1 rounded-full bg-aro-iris-soft animate-aro-breathe" style={{ animationDelay: `${i * 0.16}s` }} />)}
      </span>
    </div>
  )
}

/* ============================ the page ============================ */

export function AroTranscriptPage() {
  const { items, toast } = useToasts()
  const [steps] = useState<Step[]>(TRANSCRIPT)
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-theme="obsidian">
      <header className="flex items-center gap-3 border-b border-aro-line-soft px-5 py-3">
        <div className="min-w-0">
          <div className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">tool timeline · pattern</div>
          <h1 className="text-[15px] font-semibold text-aro-ink">Session transcript</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge tone="mint" mono>daemon</Badge>
          <Badge tone="neutral" mono>session s-9f2</Badge>
          <Button variant="secondary" size="xs" onClick={() => toast('R3 wires this page to tui_gateway — live turns replace the seed transcript', 'iris')}>Live wiring</Button>
        </div>
      </header>
      <div className="aro-scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-3.5 px-5 py-6">
          {steps.map((s, i) => <StepView key={i} step={s} agentId={s.type === 'text' ? s.agentId : 'aro'} />)}
          <StreamingRow label="Aro is watching the review queue" />
        </div>
      </div>
      <ToastHost items={items} />
    </div>
  )
}
