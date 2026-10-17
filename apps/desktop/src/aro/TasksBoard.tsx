/**
 * ARO TASKS — the work-graph board pattern port, wired to the agent (R2).
 *
 * Not a ticket list: every task knows who does it (agent or human),
 * what "done" means (acceptance criteria), what it costs, what blocks
 * it, and which live session is executing it. When the session's agent
 * has a todo_list, the board IS that list — status, deps and completion
 * stream in live — and a session with no todos shows an honest empty
 * board. Without a session the seed graph renders behind a DEMO badge.
 * R5 wires dispatch (delegate_task) on top of this shape.
 */

import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { AgentMark, IconBolt, IconCheck, IconGrid, IconList, IconPlus, IconSearch, IconSpark, IconWarning, IconX } from './Icons'
import { InlineHint, SourceBadge, useAroTasks } from './live'
import { ToastHost, useToasts } from './toasts'
import { Badge, Bar, Button, IconButton, Input, Segmented, Stat, Tip, type Tone, toneBg, toneDot, toneText } from './ui'
import type { Task, TaskStatus } from './workbenchData'
import { agentById } from './workbenchData'

const COLS: { id: TaskStatus; label: string; tone: Tone }[] = [
  { id: 'backlog', label: 'Backlog', tone: 'neutral' },
  { id: 'ready', label: 'Ready', tone: 'sky' },
  { id: 'running', label: 'In progress', tone: 'cyan' },
  { id: 'review', label: 'Review', tone: 'amber' },
  { id: 'done', label: 'Done', tone: 'mint' },
]

const prioTone: Record<Task['priority'], Tone> = { p0: 'rose', p1: 'amber', p2: 'sky', p3: 'neutral' }
const srcLabel: Record<Task['source'], string> = { linear: 'LIN', github: 'GH', manual: 'ME', agent: 'AGT' }

function TaskCard({ t, blocked, onOpen, active }: { t: Task; blocked?: boolean; onOpen: () => void; active: boolean }) {
  const a = t.assignee ? agentById(t.assignee) : null

  return (
    <button className={cn('w-full cursor-pointer space-y-2 rounded-control border bg-aro-raise p-2.5 text-left transition-colors hover:shadow-aro-e2', active ? 'border-aro-iris/50' : 'border-aro-line-soft hover:border-aro-line-strong')} onClick={onOpen}>
      <div className="flex items-center gap-1.5">
        <span className={cn('rounded-control px-1 font-aro-mono text-[var(--aro-text-2xs,10px)] font-bold uppercase', toneBg[prioTone[t.priority]])}>{t.priority}</span>
        <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{t.key}</span>
        <span className="ml-auto rounded-control border border-aro-line-soft px-1 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{srcLabel[t.source]}</span>
      </div>
      <p className="text-xs leading-[1.45] font-medium text-aro-ink">{t.title}</p>
      <div className="flex items-center gap-1.5">
        {t.human ? (
          <span aria-hidden className="flex size-4 items-center justify-center rounded-control bg-aro-hover font-aro-mono text-[var(--aro-text-2xs,10px)] font-bold text-aro-ink-2">DV</span>
        ) : a ? (
          <AgentMark from={a.from} glyph={a.glyph} size={16} to={a.to} />
        ) : (
          <span className="flex size-4 items-center justify-center rounded-control border border-dashed border-aro-line-strong text-aro-ink-4"><IconPlus size={9} /></span>
        )}
        <span className="truncate font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{t.human ? 'you' : a?.name ?? 'auto-assign'}</span>
        {blocked && t.status !== 'done' && (
          <Tip label="Blocked by an unfinished dependency">
            <span className="flex items-center gap-1 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-rose"><IconWarning size={9} /> blocked</span>
          </Tip>
        )}
        <span className="ml-auto font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{t.estimate}</span>
        {t.cost && <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-3">{t.cost}</span>}
      </div>
      {t.status === 'running' && <Bar height={2} indeterminate tone="cyan" />}
    </button>
  )
}

export function AroTasksPage() {
  const { items, toast } = useToasts()
  const { tasks: sourceTasks, live, hasSession, local, isUserTask, createUserTask, moveUserTask, removeUserTask } = useAroTasks()
  const [layout, setLayout] = useState<'board' | 'list'>('board')
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [overrides, setOverrides] = useState<Record<string, TaskStatus>>({})
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const tasks = useMemo(() => sourceTasks.map(t => (overrides[t.id] ? { ...t, status: overrides[t.id]! } : t)), [sourceTasks, overrides])
  const task = tasks.find((t) => t.id === sel)
  const filtered = tasks.filter((t) => (t.title + t.key + t.tags.join()).toLowerCase().includes(q.toLowerCase()))
  const isBlocked = (t: Task) => Boolean(t.deps?.some((d) => tasks.find((x) => x.id === d)?.status !== 'done'))

  // User tasks persist through the local adapter (survive restarts);
  // agent-todo moves stay ephemeral — the agent owns its list (D-0009).
  const move = (id: string, status: TaskStatus) => {
    if (isUserTask(id)) {
      moveUserTask(id, status)

      return
    }

    setOverrides((o) => ({ ...o, [id]: status }))
  }

  const submitNewTask = () => {
    const title = draft.trim()

    if (!title) {return}

    createUserTask(title)
    setDraft('')
    setComposing(false)
    toast('Saved to your local task list — it stays on this device', 'mint')
  }

  const running = tasks.filter((t) => t.status === 'running').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-theme="obsidian">
      <header className="flex flex-wrap items-center gap-3 border-b border-aro-line-soft px-5 py-3">
        <div className="min-w-0">
          <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">work graph · {live ? 'agent todo_list' : local ? 'your tasks' : 'tasks'}</div>
          <h1 className="text-sm font-semibold text-aro-ink">Tasks</h1>
          <p className="mt-0.5 text-xs text-aro-ink-3">{live ? 'This board is the session’s live todo_list — statuses stream in as the agent works.' : local ? 'Your own tasks, saved on this device — separate from the agent’s plans.' : 'Tasks and plans appear here as you add them or as Aro plans its work.'}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SourceBadge live={live} local={local} />
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-aro-ink-4" size={12} />
            <Input aria-label="Filter tasks" className="w-[190px] pl-7" onChange={(e) => setQ(e.target.value)} placeholder="Filter tasks…" value={q} />
          </div>
          <Segmented items={[{ value: 'board', label: 'Board', icon: IconGrid }, { value: 'list', label: 'List', icon: IconList }]} onChange={setLayout} value={layout} />
          <Button icon={IconSpark} onClick={() => toast(live ? 'Ask the agent to decompose a goal — new todos stream onto this board' : 'Ask the agent in chat to plan or decompose a goal', live ? 'iris' : 'mint')} variant="secondary">Decompose</Button>
          {composing ? (
            <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); submitNewTask() }}>
              <Input aria-label="New task title" autoFocus className="w-[220px]" onChange={(e) => setDraft(e.target.value)} placeholder="What needs to be done?" value={draft} />
              <Button disabled={!draft.trim()} icon={IconCheck} size="sm" type="submit" variant="primary">Add</Button>
              <IconButton icon={IconX} label="Cancel new task" onClick={() => { setComposing(false); setDraft('') }} size={24} />
            </form>
          ) : (
            <Button icon={IconPlus} onClick={() => setComposing(true)} variant="primary">New task</Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="aro-scroll-thin flex-1 overflow-auto p-4">
          {hasSession && !live && tasks.length === 0 && (
            <InlineHint>No todo_list in this session yet — ask the agent to plan and its todos fill this board live.</InlineHint>
          )}
          {tasks.length === 0 && !composing && (
            <div className="mb-4 rounded-panel border border-dashed border-aro-line-soft bg-aro-well/40 p-6 text-center">
              <h3 className="text-sm font-semibold text-aro-ink">No tasks on this board yet</h3>
              <p className="mx-auto mt-1 max-w-[420px] text-xs text-aro-ink-3">
                Create a task above to keep a personal list on this device, or prompt Aro to plan a goal and watched todos will populate here automatically.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button icon={IconPlus} onClick={() => setComposing(true)} size="sm" variant="primary">Add your first task</Button>
              </div>
            </div>
          )}
          <div className="mb-4 mt-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="in progress" sub="active tasks" tone="cyan" value={running} />
            <Stat label="needs you" sub="human-only tasks" tone="amber" value={tasks.filter((t) => t.human && t.status !== 'done').length} />
            <Stat label="blocked" sub="waiting on deps" tone="rose" value={tasks.filter((t) => isBlocked(t) && t.status !== 'done').length} />
            <Stat label="done" sub="todos completed" tone="mint" value={tasks.length > 0 ? `${doneCount}/${tasks.length}` : '0'} />
          </div>
          {layout === 'board' ? (
            <div className="grid min-w-[900px] grid-cols-5 gap-3">
              {COLS.map((c) => {
                const list = filtered.filter((t) => t.status === c.id)

                return (
                  <div className="flex flex-col rounded-panel border border-aro-line-soft bg-aro-sunken" key={c.id}>
                    <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2.5">
                      <i className={cn('size-[6px] rounded-full', toneDot[c.tone])} />
                      <span className="text-xs font-semibold text-aro-ink">{c.label}</span>
                      <span className="rounded-full bg-aro-raise px-1.5 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{list.length}</span>
                    </div>
                    <div className="flex-1 space-y-2 p-2">
                      {list.map((t) => <TaskCard active={sel === t.id} blocked={isBlocked(t)} key={t.id} onOpen={() => setSel(t.id)} t={t} />)}
                      {list.length === 0 && <div className="rounded-control border border-dashed border-aro-line px-3 py-5 text-center text-xs text-aro-ink-4">drop here</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-panel border border-aro-line-soft bg-aro-raise">
              {filtered.map((t) => {
                const a = t.assignee ? agentById(t.assignee) : null

                return (
                  <button className={cn('flex w-full cursor-pointer items-center gap-3 border-b border-aro-line-soft/70 px-3 py-2.5 text-left last:border-0 hover:bg-aro-hover/60', sel === t.id && 'bg-aro-iris-tint/50')} key={t.id} onClick={() => setSel(t.id)}>
                    <span className={cn('w-6 rounded-control text-center font-aro-mono text-[var(--aro-text-2xs,10px)] font-bold uppercase', toneText[prioTone[t.priority]])}>{t.priority}</span>
                    <span className="w-[76px] font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{t.key}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-aro-ink">{t.title}</span>
                    <Badge className="text-[var(--aro-text-2xs,10px)]" mono tone={COLS.find((c) => c.id === t.status)!.tone}>{t.status}</Badge>
                    <span className="flex w-[110px] items-center gap-1.5 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-3">
                      {a && <AgentMark from={a.from} glyph={a.glyph} size={14} to={a.to} />}
                      {t.human ? 'you' : a?.name ?? '—'}
                    </span>
                    <span className="w-10 text-right font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{t.estimate}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {task && (
          <aside className="flex w-[330px] shrink-0 flex-col border-l border-aro-line-soft bg-aro-sunken">
            <div className="flex items-center gap-2 border-b border-aro-line-soft px-3 py-2.5">
              <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{task.key}</span>
              <Badge className="text-[var(--aro-text-2xs,10px)]" mono tone={prioTone[task.priority]}>{task.priority}</Badge>
              <IconButton className="ml-auto" icon={IconX} label="Close" onClick={() => setSel(null)} size={24} />
            </div>
            <div className="aro-scroll-thin flex-1 space-y-3 overflow-y-auto p-3">
              <h3 className="text-sm leading-[1.4] font-semibold text-aro-ink">{task.title}</h3>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => <span className="rounded-control bg-aro-hover px-1.5 py-px font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-3" key={tag}>#{tag}</span>)}
              </div>
              <div className="rounded-control border border-aro-line-soft bg-aro-raise p-2.5">
                <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] tracking-[.14em] text-aro-ink-4 uppercase">status</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {COLS.map((c) => (
                    <button className={cn('cursor-pointer rounded-full border px-2 py-px text-[var(--aro-text-2xs,10px)]', task.status === c.id ? 'border-aro-iris/50 bg-aro-iris-tint text-aro-iris-soft' : 'border-aro-line text-aro-ink-3 hover:text-aro-ink')} key={c.id} onClick={() => move(task.id, c.id)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-control border border-aro-line-soft bg-aro-raise p-2.5">
                <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] tracking-[.14em] text-aro-ink-4 uppercase">done means</div>
                {task.criteria.length === 0 ? (
                  <p className="mt-1.5 text-xs italic text-aro-ink-4">The agent owns this list — completion comes from its todo_list updates.</p>
                ) : (
                  task.criteria.map((c) => (
                    <label className="mt-1.5 flex cursor-pointer items-start gap-2 text-xs text-aro-ink-2" key={c}>
                      <span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-control border border-aro-line-strong">
                        {task.status === 'done' && <IconCheck className="text-aro-mint" size={9} />}
                      </span>
                      {c}
                    </label>
                  ))
                )}
              </div>
              {task.deps && (
                <div className="rounded-control border border-aro-line-soft bg-aro-raise p-2.5">
                  <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] tracking-[.14em] text-aro-ink-4 uppercase">blocked by</div>
                  {task.deps.map((d) => {
                    const dt = tasks.find((x) => x.id === d)

                    if (!dt) {return null}

                    return (
                      <button className="mt-1.5 flex w-full cursor-pointer items-center gap-2 text-left text-xs text-aro-ink-2 hover:text-aro-ink" key={d} onClick={() => setSel(d)}>
                        <i className={cn('size-[6px] rounded-full', dt.status === 'done' ? 'bg-aro-mint' : 'bg-aro-rose')} />
                        <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{dt.key}</span>
                        <span className="truncate">{dt.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-control border border-aro-line-soft bg-aro-raise p-2.5">
                  <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] tracking-[.14em] text-aro-ink-4 uppercase">estimate</div>
                  <div className="mt-1 text-sm font-semibold text-aro-ink">{task.estimate}</div>
                </div>
                <div className="rounded-control border border-aro-line-soft bg-aro-raise p-2.5">
                  <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] tracking-[.14em] text-aro-ink-4 uppercase">spent</div>
                  <div className="mt-1 text-sm font-semibold text-aro-ink">{task.cost ?? '$0'}</div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 border-t border-aro-line-soft p-3">
              <Button
                className="w-full"
                icon={IconBolt}
                onClick={() => {
                  move(task.id, 'running')
                  toast(isUserTask(task.id) ? 'Status saved to your local task list' : `Dispatched ${task.key} to ${task.assignee ? agentById(task.assignee).name : 'best agent'}`, isUserTask(task.id) ? 'mint' : 'iris')
                }}
                variant="primary"
              >
                {task.human ? 'Start' : 'Run with agent'}
              </Button>
              <div className="flex gap-1.5">
                <Button className="flex-1" onClick={() => { createUserTask(task.title); toast('Copied to your local task list', 'mint') }} size="xs" variant="outline">Add to my todos</Button>
                <Button className="flex-1" onClick={() => toast('Agent split the task into 3 subtasks', 'iris')} size="xs" variant="outline">Split</Button>
              </div>
              {isUserTask(task.id) && (
                <Button className="w-full" onClick={() => { removeUserTask(task.id); setSel(null); toast('Removed from your local task list', 'mint') }} size="xs" variant="outline">Delete task</Button>
              )}
            </div>
          </aside>
        )}
      </div>
      <ToastHost items={items} />
    </div>
  )
}
