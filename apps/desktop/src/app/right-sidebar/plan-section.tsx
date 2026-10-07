import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'

import { IconCheck, IconChevronDown, IconList, IconRefresh, IconX } from '@/aro/Icons'
import { Badge, Bar, Panel } from '@/aro/ui'
import { cn } from '@/lib/utils'
import { $activeSessionId, $selectedStoredSessionId } from '@/store/session'
import { $retainedTodosBySession, $todosBySession } from '@/store/todos'

export function PlanSection() {
  const activeSessionId = useStore($activeSessionId)
  const selectedStoredId = useStore($selectedStoredSessionId)
  const sessionId = activeSessionId || selectedStoredId

  const todosMap = useStore($todosBySession)
  const retainedMap = useStore($retainedTodosBySession)

  const todos = useMemo(() => {
    if (!sessionId) {
      return []
    }
    return todosMap[sessionId] ?? retainedMap[sessionId] ?? []
  }, [sessionId, todosMap, retainedMap])

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const completedCount = useMemo(
    () => todos.filter(t => t.status === 'completed').length,
    [todos]
  )

  const totalCount = todos.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (todos.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl border border-aro-line-soft bg-aro-raise text-aro-ink-3 shadow-aro-e1">
          <IconList size={18} />
        </div>
        <h3 className="mt-3 font-aro-display text-[13px] font-semibold text-aro-ink">No active plan</h3>
        <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-aro-ink-3">
          The agent will create and maintain steps as tasks are planned and executed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      <Panel className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-aro-display text-[12.5px] font-semibold text-aro-ink">Implementation plan</span>
          <Badge mono tone="iris" className="text-[9.5px]">
            {completedCount}/{totalCount} tasks
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-aro-ink-3">
          Agent-maintained outline tracking turn goals and execution progress.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <Bar value={progressPercent} tone="iris" height={4} />
          <span className="shrink-0 font-aro-mono text-[10px] text-aro-ink-4">
            {progressPercent}%
          </span>
        </div>
      </Panel>

      <div className="space-y-1">
        {todos.map(item => {
          const isDone = item.status === 'completed'
          const isActive = item.status === 'in_progress'
          const isCancelled = item.status === 'cancelled'
          const isOpen = expandedId === item.id

          return (
            <div
              key={item.id}
              className={cn(
                'overflow-hidden rounded-[9px] border transition-colors',
                isOpen ? 'border-aro-line-strong bg-aro-raise' : 'border-aro-line-soft bg-aro-raise/50 hover:border-aro-line',
                isActive && 'border-aro-cyan/35 bg-aro-cyan-tint/10'
              )}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : item.id)}
                className="flex w-full cursor-pointer items-start gap-2 px-2.5 py-2 text-left"
              >
                <span
                  className={cn(
                    'mt-[1px] flex size-[16px] shrink-0 items-center justify-center rounded-[4px] border',
                    isDone
                      ? 'border-aro-mint/40 bg-aro-mint-tint text-aro-mint'
                      : isActive
                        ? 'border-aro-cyan/40 bg-aro-cyan-tint text-aro-cyan'
                        : isCancelled
                          ? 'border-aro-rose/40 bg-aro-rose-tint text-aro-rose'
                          : 'border-aro-line-strong text-aro-ink-4'
                  )}
                >
                  {isDone ? (
                    <IconCheck size={9} />
                  ) : isActive ? (
                    <IconRefresh size={9} className="animate-spin" />
                  ) : isCancelled ? (
                    <IconX size={9} />
                  ) : (
                    <span className="size-1 rounded-full bg-current" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[12px] leading-[1.45]',
                      isDone ? 'text-aro-ink-4 line-through' : 'text-aro-ink-2'
                    )}
                  >
                    {item.content}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 font-aro-mono text-[9.5px] text-aro-ink-4">
                    <span>#{item.id}</span>
                    <span>·</span>
                    <span
                      className={cn(
                        isDone
                          ? 'text-aro-mint'
                          : isActive
                            ? 'text-aro-cyan'
                            : isCancelled
                              ? 'text-aro-rose'
                              : 'text-aro-ink-4'
                      )}
                    >
                      {item.status}
                    </span>
                  </span>
                </span>
                <IconChevronDown
                  size={11}
                  className={cn('mt-0.5 shrink-0 text-aro-ink-4 transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && item.parent && (
                <div className="border-t border-aro-line-soft px-2.5 py-1.5 font-aro-mono text-[10px] text-aro-ink-4">
                  Parent task: #{item.parent}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
