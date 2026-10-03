/**
 * ARO TASKS — the work-graph board pattern port.
 *
 * Not a ticket list: every task knows who does it (agent or human),
 * what "done" means (acceptance criteria), what it costs, what blocks
 * it, and which live session is executing it. Board ⇄ list layouts,
 * a detail rail with status moves / dependencies / dispatch, and
 * running tasks carry an indeterminate progress bar. R3 binds the
 * same Task shape to the agent's kanban store.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from './workbenchData'
import { TASKS, agentById } from './workbenchData'
import { AgentMark, IconBolt, IconCheck, IconGrid, IconList, IconPlus, IconRefresh, IconSearch, IconSpark, IconWarning, IconX } from './Icons'
import { Badge, Bar, Button, IconButton, Input, Segmented, Stat, Tip, toneBg, toneDot, toneText, type Tone } from './ui'
import { ToastHost, useToasts } from './toasts'

const COLS: { id: TaskStatus; label: string; tone: Tone }[] = [
  { id: 'backlog', label: 'Backlog', tone: 'neutral' },
  { id: 'ready', label: 'Ready', tone: 'sky' },
  { id: 'running', label: 'In progress', tone: 'cyan' },
  { id: 'review', label: 'Review', tone: 'amber' },
  { id: 'done', label: 'Done', tone: 'mint' },
]
const prioTone: Record<Task['priority'], Tone> = { p0: 'rose', p1: 'amber', p2: 'sky', p3: 'neutral' }
const srcLabel: Record<Task['source'], string> = { linear: 'LIN', github: 'GH', manual: 'ME', agent: 'AGT' }

function TaskCard({ t, onOpen, active }: { t: Task; onOpen: () => void; active: boolean }) {
  const a = t.assignee ? agentById(t.assignee) : null
  const blocked = t.deps?.some((d) => TASKS.find((x) => x.id === d)?.status !== 'done')
  return (
    <button onClick={onOpen} className={cn('w-full cursor-pointer space-y-2 rounded-[10px] border bg-aro-raise p-2.5 text-left transition-all hover:shadow-aro-e2', active ? 'border-aro-iris/50' : 'border-aro-line-soft hover:border-aro-line-strong')}>
      <div className="flex items-center gap-1.5">
        <span className={cn('rounded-[3px] px-1 font-aro-mono text-[8.5px] font-bold uppercase', toneBg[prioTone[t.priority]])}>{t.priority}</span>
        <span className="font-aro-mono text-[9.5px] text-aro-ink-4">{t.key}</span>
        <span className="ml-auto rounded-[3px] border border-aro-line-soft px-1 font-aro-mono text-[8.5px] text-aro-ink-4">{srcLabel[t.source]}</span>
      </div>
      <p className="text-[12.5px] leading-[1.45] font-medium text-aro-ink">{t.title}</p>
      <div className="flex items-center gap-1.5">
        {t.human ? (
          <span className="flex size-4 items-center justify-center rounded-[4px] bg-aro-hover font-aro-mono text-[8px] font-bold text-aro-ink-2" aria-hidden>DV</span>
        ) : a ? (
          <AgentMark glyph={a.glyph} from={a.from} to={a.to} size={16} />
        ) : (
          <span className="flex size-4 items-center justify-center rounded-[4px] border border-dashed border-aro-line-strong text-aro-ink-4"><IconPlus size={9} /></span>
        )}
        <span className="truncate font-aro-mono text-[9.5px] text-aro-ink-4">{t.human ? 'you' : a?.name ?? 'auto-assign'}</span>
        {blocked && t.status !== 'done' && (
          <Tip label="Blocked by an unfinished dependency">
            <span className="flex items-center gap-1 font-aro-mono text-[9px] text-aro-rose"><IconWarning size={9} /> blocked</span>
          </Tip>
        )}
        <span className="ml-auto font-aro-mono text-[9.5px] text-aro-ink-4">{t.estimate}</span>
        {t.cost && <span className="font-aro-mono text-[9.5px] text-aro-ink-3">{t.cost}</span>}
      </div>
      {t.status === 'running' && <Bar indeterminate tone="cyan" height={2} />}
    </button>
  )
}

export function AroTasksPage() {
  const { items, toast } = useToasts()
  const [layout, setLayout] = useState<'board' | 'list'>('board')
  const [sel, setSel] = useState<string | null>('k1')
  const [q, setQ] = useState('')
  const [tasks, setTasks] = useState<Task[]>(TASKS)
  const task = tasks.find((t) => t.id === sel)
  const filtered = tasks.filter((t) => (t.title + t.key + t.tags.join()).toLowerCase().includes(q.toLowerCase()))
  const move = (id: string, status: TaskStatus) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-theme="obsidian">
      <header className="flex flex-wrap items-center gap-3 border-b border-aro-line-soft px-5 py-3">
        <div className="min-w-0">
          <div className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">work graph · pattern</div>
          <h1 className="text-[15px] font-semibold text-aro-ink">Tasks</h1>
          <p className="mt-0.5 text-[11.5px] text-aro-ink-3">Every task knows who does it (agent or you), what done means, what it costs, and what blocks it.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-aro-ink-4" />
            <Input placeholder="Filter tasks…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter tasks" className="w-[190px] pl-7" />
          </div>
          <Segmented value={layout} onChange={setLayout} items={[{ value: 'board', label: 'Board', icon: IconGrid }, { value: 'list', label: 'List', icon: IconList }]} />
          <Button variant="secondary" icon={IconRefresh} onClick={() => toast('Synced 14 issues from Linear · 6 from GitHub', 'mint')}>Sync</Button>
          <Button variant="secondary" icon={IconSpark} onClick={() => toast('Agent decomposed 1 epic into 4 tasks', 'iris')}>Decompose</Button>
          <Button variant="primary" icon={IconPlus} onClick={() => toast('R3 wires this to the agent kanban store — delegate_task + board events', 'iris')}>New task</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="aro-scroll-thin flex-1 overflow-auto p-4">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="in progress" value={tasks.filter((t) => t.status === 'running').length} sub="2 agents working" tone="cyan" />
            <Stat label="needs you" value={tasks.filter((t) => t.human && t.status !== 'done').length} sub="human-only tasks" tone="amber" />
            <Stat label="blocked" value={tasks.filter((t) => t.deps?.some((d) => tasks.find((x) => x.id === d)?.status !== 'done') && t.status !== 'done').length} sub="waiting on deps" tone="rose" />
            <Stat label="spent this week" value="$12.10" sub="across 6 tasks" chart={[1, 2, 3, 5, 7, 9, 12]} />
          </div>
          {layout === 'board' ? (
            <div className="grid min-w-[900px] grid-cols-5 gap-3">
              {COLS.map((c) => {
                const list = filtered.filter((t) => t.status === c.id)
                return (
                  <div key={c.id} className="flex flex-col rounded-[11px] border border-aro-line-soft bg-aro-sunken">
                    <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2.5">
                      <i className={cn('size-[6px] rounded-full', toneDot[c.tone])} />
                      <span className="text-[12.5px] font-semibold text-aro-ink">{c.label}</span>
                      <span className="rounded-full bg-aro-raise px-1.5 font-aro-mono text-[9.5px] text-aro-ink-4">{list.length}</span>
                    </div>
                    <div className="flex-1 space-y-2 p-2">
                      {list.map((t) => <TaskCard key={t.id} t={t} onOpen={() => setSel(t.id)} active={sel === t.id} />)}
                      {list.length === 0 && <div className="rounded-[9px] border border-dashed border-aro-line px-3 py-5 text-center text-[11px] text-aro-ink-4">drop here</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[11px] border border-aro-line-soft bg-aro-raise">
              {filtered.map((t) => {
                const a = t.assignee ? agentById(t.assignee) : null
                return (
                  <button key={t.id} onClick={() => setSel(t.id)} className={cn('flex w-full cursor-pointer items-center gap-3 border-b border-aro-line-soft/70 px-3 py-2.5 text-left last:border-0 hover:bg-aro-hover/60', sel === t.id && 'bg-aro-iris-tint/50')}>
                    <span className={cn('w-6 rounded-[3px] text-center font-aro-mono text-[9px] font-bold uppercase', toneText[prioTone[t.priority]])}>{t.priority}</span>
                    <span className="w-[76px] font-aro-mono text-[10px] text-aro-ink-4">{t.key}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-aro-ink">{t.title}</span>
                    <Badge tone={COLS.find((c) => c.id === t.status)!.tone} mono className="text-[9px]">{t.status}</Badge>
                    <span className="flex w-[110px] items-center gap-1.5 font-aro-mono text-[10px] text-aro-ink-3">
                      {a && <AgentMark glyph={a.glyph} from={a.from} to={a.to} size={14} />}
                      {t.human ? 'you' : a?.name ?? '—'}
                    </span>
                    <span className="w-10 text-right font-aro-mono text-[10px] text-aro-ink-4">{t.estimate}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {task && (
          <aside className="flex w-[330px] shrink-0 flex-col border-l border-aro-line-soft bg-aro-sunken">
            <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2.5">
              <span className="font-aro-mono text-[10px] text-aro-ink-4">{task.key}</span>
              <Badge tone={prioTone[task.priority]} mono className="text-[9px]">{task.priority}</Badge>
              <IconButton icon={IconX} label="Close" size={24} className="ml-auto" onClick={() => setSel(null)} />
            </div>
            <div className="aro-scroll-thin flex-1 space-y-3 overflow-y-auto p-3">
              <h3 className="text-[14px] leading-[1.4] font-semibold text-aro-ink">{task.title}</h3>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => <span key={tag} className="rounded-[4px] bg-aro-hover px-1.5 py-px font-aro-mono text-[9.5px] text-aro-ink-3">#{tag}</span>)}
              </div>
              <div className="rounded-[9px] border border-aro-line-soft bg-aro-raise p-2.5">
                <div className="font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">status</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {COLS.map((c) => (
                    <button key={c.id} onClick={() => move(task.id, c.id)} className={cn('cursor-pointer rounded-full border px-2 py-px text-[10.5px]', task.status === c.id ? 'border-aro-iris/50 bg-aro-iris-tint text-aro-iris-soft' : 'border-aro-line text-aro-ink-3 hover:text-aro-ink')}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[9px] border border-aro-line-soft bg-aro-raise p-2.5">
                <div className="font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">done means</div>
                {task.criteria.map((c) => (
                  <label key={c} className="mt-1.5 flex cursor-pointer items-start gap-2 text-[12px] text-aro-ink-2">
                    <span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-aro-line-strong">
                      {task.status === 'done' && <IconCheck size={9} className="text-aro-mint" />}
                    </span>
                    {c}
                  </label>
                ))}
              </div>
              {task.deps && (
                <div className="rounded-[9px] border border-aro-line-soft bg-aro-raise p-2.5">
                  <div className="font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">blocked by</div>
                  {task.deps.map((d) => {
                    const dt = tasks.find((x) => x.id === d)!
                    return (
                      <button key={d} onClick={() => setSel(d)} className="mt-1.5 flex w-full cursor-pointer items-center gap-2 text-left text-[12px] text-aro-ink-2 hover:text-aro-ink">
                        <i className={cn('size-[6px] rounded-full', dt.status === 'done' ? 'bg-aro-mint' : 'bg-aro-rose')} />
                        <span className="font-aro-mono text-[10px] text-aro-ink-4">{dt.key}</span>
                        <span className="truncate">{dt.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[9px] border border-aro-line-soft bg-aro-raise p-2.5">
                  <div className="font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">estimate</div>
                  <div className="mt-1 text-[14px] font-semibold text-aro-ink">{task.estimate}</div>
                </div>
                <div className="rounded-[9px] border border-aro-line-soft bg-aro-raise p-2.5">
                  <div className="font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">spent</div>
                  <div className="mt-1 text-[14px] font-semibold text-aro-ink">{task.cost ?? '$0'}</div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 border-t border-aro-line-soft p-3">
              <Button
                variant="primary"
                className="w-full"
                icon={IconBolt}
                onClick={() => {
                  move(task.id, 'running')
                  toast(`Dispatched ${task.key} to ${task.assignee ? agentById(task.assignee).name : 'best agent'}`, 'iris')
                }}
              >
                {task.human ? 'Start' : 'Run with agent'}
              </Button>
              <div className="flex gap-1.5">
                <Button variant="outline" size="xs" className="flex-1" onClick={() => toast('Added to your todo list', 'mint')}>Add to my todos</Button>
                <Button variant="outline" size="xs" className="flex-1" onClick={() => toast('Agent split the task into 3 subtasks', 'iris')}>Split</Button>
              </div>
            </div>
          </aside>
        )}
      </div>
      <ToastHost items={items} />
    </div>
  )
}
