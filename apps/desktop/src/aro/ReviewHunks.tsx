/**
 * ARO REVIEW — hunk-level code review (P3, the gap-closer vs Codex/Cursor).
 *
 * The pattern the prototype proved, ported into the real desktop app:
 * every hunk is an independent decision — accept / reject / comment —
 * with verdict chips (double-click to reset), an inline comment composer
 * (⏎ send, esc close), threads the agent acknowledges and queues fixes
 * for, live per-file + global accounting, staged files, and a
 * checkpoint list behind every change. R3 replaces REVIEW_FILES with
 * the live git/worktree state from tui_gateway; the verdict/thread
 * model stays.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Hunk } from './workbenchData'
import { REVIEW_CHECKPOINTS, REVIEW_FILES, REVIEW_HUNKS, REVIEW_TOTAL_HUNKS } from './workbenchData'
import { DiffView } from './DiffCard'
import { IconCheck, IconFile, IconPencil, IconSpark, IconUndo, IconX } from './Icons'
import { Badge, Button, Input, Segmented } from './ui'
import { ToastHost, useToasts } from './toasts'

type HunkVerdict = 'accepted' | 'rejected'
type HunkThreadData = { id: string; hunkKey: string; text: string }

function HunkThread({ thread }: { thread: HunkThreadData }) {
  const [queued, setQueued] = useState(false)
  const [resolved, setResolved] = useState(false)
  return (
    <div className="animate-aro-slide-down">
      <div className={cn('border-t border-aro-line-soft bg-aro-amber-tint/50 px-2.5 py-2 transition-opacity', resolved && 'opacity-60')}>
        <div className="flex items-start gap-2">
          <IconPencil size={11} className="mt-[3px] shrink-0 text-aro-amber" />
          <div className="min-w-0 flex-1">
            <p className={cn('text-[12px] leading-[1.55] text-aro-ink-2', resolved && 'text-aro-ink-4 line-through')}>{thread.text}</p>
            <div className="mt-1 font-aro-mono text-[9.5px] text-aro-ink-4">you · just now{resolved && <span className="text-aro-mint"> · resolved</span>}</div>
          </div>
          <Button variant="ghost" size="xs" onClick={() => setResolved((r) => !r)} aria-label={resolved ? 'Reopen thread' : 'Resolve thread'}>
            {resolved ? 'Reopen' : 'Resolve'}
          </Button>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-aro-amber/20 pt-1.5">
          {queued ? (
            <>
              <IconCheck size={10} className="shrink-0 text-aro-mint" />
              <span className="font-aro-mono text-[10px] text-aro-mint">Aro queued fix · patch incoming</span>
            </>
          ) : (
            <>
              <i className="size-[5px] shrink-0 animate-aro-breathe rounded-full bg-aro-amber" />
              <span className="font-aro-mono text-[10px] text-aro-ink-4">Aro will address this before the next checkpoint</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AroReviewPage() {
  const { items, toast } = useToasts()
  const [active, setActive] = useState(0)
  const [staged, setStaged] = useState<string[]>([REVIEW_FILES[0].path])
  const [layout, setLayout] = useState<'unified' | 'split'>('split')
  const [verdicts, setVerdicts] = useState<Record<string, HunkVerdict>>({})
  const [commenting, setCommenting] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [threads, setThreads] = useState<HunkThreadData[]>([])

  const file = REVIEW_FILES[active]
  const hunks: Hunk[] = REVIEW_HUNKS[file.path]
  const hkey = (i: number) => `${file.path}#${i}`

  const fAcc = hunks.reduce((n, _, i) => n + (verdicts[hkey(i)] === 'accepted' ? 1 : 0), 0)
  const fRej = hunks.reduce((n, _, i) => n + (verdicts[hkey(i)] === 'rejected' ? 1 : 0), 0)
  const gAcc = Object.values(verdicts).filter((v) => v === 'accepted').length
  const gRej = Object.values(verdicts).filter((v) => v === 'rejected').length
  const fileThreads = threads.filter((t) => t.hunkKey.startsWith(`${file.path}#`))

  const setVerdict = (key: string, v: HunkVerdict) =>
    setVerdicts((s) => {
      if (s[key] === v) {
        const next = { ...s }
        delete next[key]
        return next
      }
      return { ...s, [key]: v }
    })
  const resetVerdict = (key: string) =>
    setVerdicts((s) => {
      if (!(key in s)) return s
      const next = { ...s }
      delete next[key]
      return next
    })
  const toggleComposer = (key: string) => {
    setDraft('')
    setCommenting((c) => (c === key ? null : key))
  }
  const sendComment = (key: string) => {
    const text = draft.trim()
    if (!text) return
    setThreads((ts) => [...ts, { id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, hunkKey: key, text }])
    setDraft('')
    setCommenting(null)
    toast('Comment sent — Aro will address it before the next checkpoint', 'amber')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-theme="obsidian">
      <header className="flex flex-wrap items-center gap-3 border-b border-aro-line-soft px-5 py-3">
        <div className="min-w-0">
          <div className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">changes · p3</div>
          <h1 className="text-[15px] font-semibold text-aro-ink">Review changes</h1>
          <p className="mt-0.5 text-[11.5px] text-aro-ink-3">Agent edits, editor edits and cloud runs land here as one reviewable diff — with a checkpoint behind every change.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented value={layout} onChange={setLayout} items={[{ value: 'unified', label: 'Unified' }, { value: 'split', label: 'Side by side' }]} />
          <Button variant="secondary" icon={IconUndo} onClick={() => toast('Checkpoint restored — working tree rolled back', 'mint')}>Restore checkpoint</Button>
          <Button variant="danger" onClick={() => toast(`Changes requested — Aro is rewriting ${gRej} hunk${gRej === 1 ? '' : 's'}`, 'amber')}>Request changes</Button>
          <Button variant="primary" icon={IconCheck} onClick={() => toast(`Accepted ${gAcc}/${REVIEW_TOTAL_HUNKS} hunks · ${gRej} rejected · ${threads.length} commented`, 'mint')}>
            Accept {gAcc}/{REVIEW_TOTAL_HUNKS} hunks
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* file sidebar */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-aro-line-soft bg-aro-sunken">
          <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2.5">
            <span className="font-aro-mono text-[9.5px] tracking-[.14em] text-aro-ink-4 uppercase">changed</span>
            <span className="font-aro-mono text-[10px] text-aro-mint">+{REVIEW_FILES.reduce((a, f) => a + f.adds, 0)}</span>
            <span className="font-aro-mono text-[10px] text-aro-rose">−{REVIEW_FILES.reduce((a, f) => a + f.dels, 0)}</span>
            <span className="ml-auto font-aro-mono text-[9.5px] text-aro-ink-4">{REVIEW_FILES.length} files</span>
          </div>
          <div className="aro-scroll-thin flex-1 overflow-y-auto p-1.5">
            {REVIEW_FILES.map((f, i) => {
              const on = i === active
              const s = staged.includes(f.path)
              return (
                <div key={f.path} onClick={() => setActive(i)} className={cn('flex cursor-pointer items-start gap-2 rounded-[8px] px-2 py-2 transition-colors', on ? 'bg-aro-raise shadow-aro-e1' : 'hover:bg-aro-raise/60')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setActive(i)} aria-label={`Open ${f.path}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setStaged((x) => (x.includes(f.path) ? x.filter((p) => p !== f.path) : [...x, f.path]))
                    }}
                    aria-label={s ? `Unstage ${f.path}` : `Stage ${f.path}`}
                    className={cn('mt-[2px] flex size-[15px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] border', s ? 'border-aro-iris bg-aro-iris text-aro-on-iris' : 'border-aro-line-strong')}
                  >
                    {s && <IconCheck size={9} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-aro-mono text-[11px] text-aro-ink-2">{f.path.split('/').pop()}</p>
                    <p className="truncate font-aro-mono text-[9.5px] text-aro-ink-4">{f.path.split('/').slice(0, -1).join('/')}</p>
                  </div>
                  <div className="text-right font-aro-mono text-[9.5px]">
                    <div className="text-aro-mint">+{f.adds}</div>
                    <div className="text-aro-rose">−{f.dels}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-aro-line-soft p-2.5">
            <div className="font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">checkpoints</div>
            {REVIEW_CHECKPOINTS.map(({ hash, label, at }, i) => (
              <div key={hash} className="group mt-2 flex items-center gap-2">
                <i className={cn('size-[6px] rounded-full', i === 0 ? 'bg-aro-iris' : 'bg-aro-line-strong')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] text-aro-ink-2">{label}</p>
                  <p className="font-aro-mono text-[9.5px] text-aro-ink-4">{hash} · {at}</p>
                </div>
                <button className="cursor-pointer font-aro-mono text-[9.5px] text-aro-iris-soft opacity-0 group-hover:opacity-100">restore</button>
              </div>
            ))}
          </div>
        </div>

        {/* hunk stream */}
        <div className="aro-scroll-thin flex-1 overflow-y-auto bg-aro-bg">
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-aro-line-soft bg-aro-bg/90 px-4 py-2.5 backdrop-blur-xl">
            <IconFile size={12} className="text-aro-ink-4" />
            <span className="font-aro-mono text-[11.5px] text-aro-ink">{file.path}</span>
            <span className="font-aro-mono text-[10px] text-aro-mint">+{file.adds}</span>
            <span className="font-aro-mono text-[10px] text-aro-rose">−{file.dels}</span>
            <div className="ml-auto flex gap-1.5">
              <Button variant="ghost" size="xs" onClick={() => hunks.length > 0 && toggleComposer(hkey(0))}>Comment</Button>
              <Button variant="ghost" size="xs" onClick={() => { const r = hunks.findIndex((_, i) => verdicts[hkey(i)] === 'rejected'); toggleComposer(hkey(r === -1 ? 0 : r)); }}>Ask agent to fix</Button>
              <Button variant="ghost" size="xs" onClick={() => toast('R3 opens this hunk set in the host editor pane', 'iris')}>Open in editor</Button>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-aro-mono text-[10px]">
              <span className="text-aro-ink-3">{hunks.length} hunk{hunks.length === 1 ? '' : 's'}</span>
              <span className="text-aro-ink-4">·</span>
              <span className="text-aro-mint">{fAcc} accepted</span>
              <span className="text-aro-ink-4">·</span>
              <span className="text-aro-rose">{fRej} rejected</span>
              <span className="text-aro-ink-4">·</span>
              <span className="text-aro-ink-4">{hunks.length - fAcc - fRej} pending</span>
              {fileThreads.length > 0 && (
                <>
                  <span className="text-aro-ink-4">·</span>
                  <span className="text-aro-amber">{fileThreads.length} thread{fileThreads.length === 1 ? '' : 's'}</span>
                </>
              )}
            </div>

            {hunks.map((h, i) => {
              const key = hkey(i)
              const v = verdicts[key]
              return (
                <div key={key} className={cn('group/hunk mb-2 overflow-clip rounded-[8px] border bg-aro-well transition-all', v === 'accepted' ? 'border-aro-mint/30' : v === 'rejected' ? 'border-aro-rose/25 opacity-60' : 'border-aro-line-soft hover:border-aro-line-strong')}>
                  <div className="sticky top-[45px] z-10 flex items-center gap-2 border-b border-aro-line-soft bg-aro-well/80 px-2.5 py-[5px] backdrop-blur">
                    <span className="shrink-0 font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">hunk {i + 1}</span>
                    <span className="shrink-0 font-aro-mono text-[9.5px]">
                      <span className="text-aro-mint">+{h.adds}</span> <span className="text-aro-rose">−{h.dels}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate font-aro-mono text-[10.5px] text-aro-ink-3">{h.header}</span>
                    {v && (
                      <button onDoubleClick={() => resetVerdict(key)} title="Double-click to reset" aria-label={`Reset hunk ${i + 1}`} className={cn('inline-flex shrink-0 cursor-pointer items-center rounded-full px-1.5 py-px font-aro-mono text-[9.5px] transition-opacity hover:opacity-75', v === 'accepted' ? 'bg-aro-mint-tint text-aro-mint' : 'bg-aro-rose-tint text-aro-rose')}>
                        {v === 'accepted' ? 'accepted ✓' : 'rejected'}
                      </button>
                    )}
                    <div className="ml-auto flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover/hunk:opacity-100 group-focus-within/hunk:opacity-100">
                      <Button variant="success" size="xs" icon={IconCheck} aria-label={`Accept hunk ${i + 1}`} onClick={() => setVerdict(key, 'accepted')}>Accept</Button>
                      <Button variant="danger" size="xs" icon={IconX} aria-label={`Reject hunk ${i + 1}`} onClick={() => setVerdict(key, 'rejected')}>Reject</Button>
                      <Button variant="ghost" size="xs" icon={IconPencil} aria-label={`Comment on hunk ${i + 1}`} onClick={() => toggleComposer(key)}>Comment</Button>
                    </div>
                  </div>
                  <div className="[&>div]:rounded-none [&>div]:border-0 [&>div>div:first-child]:hidden">
                    <DiffView key={layout + key} file={{ path: file.path, adds: h.adds, dels: h.dels, lang: file.lang, lines: h.lines }} maxLines={40} mode={layout} />
                  </div>
                  {commenting === key && (
                    <div className="flex items-center gap-1.5 border-t border-aro-line-soft bg-aro-well px-2.5 py-2">
                      <Input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            sendComment(key)
                          } else if (e.key === 'Escape') setCommenting(null)
                        }}
                        placeholder="Comment on this hunk — ⏎ to send"
                        aria-label={`Comment on hunk ${i + 1}`}
                        className="h-[26px] flex-1 text-[12px]"
                      />
                      <Button variant="primary" size="xs" onClick={() => sendComment(key)}>Ask agent to fix</Button>
                    </div>
                  )}
                  {threads.filter((t) => t.hunkKey === key).map((t) => <HunkThread key={t.id} thread={t} />)}
                </div>
              )
            })}

            <div className="mt-3 rounded-[10px] border border-aro-line-soft bg-aro-raise p-3">
              <div className="flex items-center gap-2">
                <IconSpark size={12} className="text-aro-iris-soft" />
                <span className="text-[12.5px] font-medium text-aro-ink">Why this change</span>
                <Badge tone="iris" mono className="text-[9.5px]">aro</Badge>
              </div>
              <p className="mt-1.5 text-[12px] leading-[1.6] text-aro-ink-3">
                Replaces the one-shot snapshot with a streaming <code className="font-aro-mono text-aro-cyan">SessionChannel</code>. Editor sockets negotiate capabilities and every editor-originated patch enters the same reviewer, so review, checkpoint and rewind behave identically regardless of who made the edit.
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastHost items={items} />
    </div>
  )
}
