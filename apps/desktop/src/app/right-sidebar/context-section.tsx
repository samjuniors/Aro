import { compactNumber } from '@hermes/shared'
import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'

import { useContextBreakdown } from '@/app/shell/hooks/use-context-breakdown'
import { IconBrain, IconFolder, IconMcp } from '@/aro/Icons'
import { Badge, Bar, Panel, Ring } from '@/aro/ui'
import { listMcpServers } from '@/hermes'
import { cn } from '@/lib/utils'
import { activeGateway } from '@/store/gateway'
import { $activeSessionId, $busy, $selectedStoredSessionId } from '@/store/session'
import type { McpServerSummary } from '@/types/hermes'

export function ContextSection() {
  const activeSessionId = useStore($activeSessionId)
  const selectedStoredId = useStore($selectedStoredSessionId)
  const sessionId = activeSessionId || selectedStoredId
  const busy = useStore($busy)

  const requestGateway = useCallback(
    function <T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
      const gw = activeGateway()
      if (!gw) {
        return Promise.reject(new Error('Gateway not connected'))
      }
      return gw.request(method, params ?? {})
    },
    []
  )

  const { breakdown, loading: breakdownLoading } = useContextBreakdown({
    busy,
    enabled: true,
    requestGateway,
    sessionId: sessionId ?? null,
  })

  const [mcpServers, setMcpServers] = useState<McpServerSummary[]>([])
  const [mcpLoading, setMcpLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!window.hermesDesktop?.api) {
      setMcpLoading(false)
      return
    }
    setMcpLoading(true)
    listMcpServers()
      .then(res => {
        if (mounted) {
          setMcpServers(res.servers ?? [])
        }
      })
      .catch(() => {
        if (mounted) {
          setMcpServers([])
        }
      })
      .finally(() => {
        if (mounted) {
          setMcpLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const usagePercent = Math.min(100, Math.max(0, Math.round(breakdown?.context_percent ?? 0)))
  const totalTokens = breakdown?.context_used ?? 0
  const maxTokens = breakdown?.context_max ?? 200_000
  const categories = breakdown?.categories ?? []

  return (
    <div className="space-y-3 p-3">
      {/* Context window gauge & breakdown */}
      <Panel className="p-3">
        <div className="flex items-center gap-3">
          <Ring value={usagePercent} size={54} stroke={5} tone="var(--aro-iris)">
            <span className="font-aro-mono text-xs font-semibold text-aro-ink">{usagePercent}%</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-aro-ink-2">Context window</span>
              <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">
                {compactNumber(totalTokens)} / {compactNumber(maxTokens)}
              </span>
            </div>

            {categories.length > 0 ? (
              categories.map(c => {
                const percent = totalTokens > 0 ? Math.round((c.tokens / totalTokens) * 100) : 0
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="w-[84px] shrink-0 truncate text-aro-xs text-aro-ink-3">{c.label}</span>
                    <Bar value={percent} tone="iris" height={3} />
                    <span className="w-8 text-right font-aro-mono text-[var(--aro-text-2xs,9px)] text-aro-ink-4">
                      {compactNumber(c.tokens)}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="text-aro-xs text-aro-ink-4">
                {breakdownLoading ? 'Analyzing context…' : 'No active context tokens'}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* MCP Connectors */}
      <Panel>
        <div className="flex items-center justify-between border-b border-aro-line-soft px-2.5 py-2">
          <span className="flex items-center gap-1.5 font-aro-mono text-aro-xs font-semibold tracking-[.14em] text-aro-ink-4 uppercase">
            <IconMcp size={10} /> MCP Connectors
          </span>
          <Badge mono tone={mcpServers.length > 0 ? 'mint' : 'neutral'} className="text-[var(--aro-text-2xs,9px)]">
            {mcpServers.filter(s => s.enabled).length} live
          </Badge>
        </div>
        <div className="p-2">
          {mcpServers.length === 0 ? (
            <div className="py-2 text-center font-aro-mono text-aro-xs text-aro-ink-4">
              {mcpLoading ? 'Querying connectors…' : 'No MCP servers configured'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {mcpServers.map(s => {
                const toolCount = s.tools?.length ?? 0
                return (
                  <div key={s.name} className="rounded-control border border-aro-line-soft bg-aro-well px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <i
                        className={cn(
                          'size-[5px] shrink-0 rounded-full',
                          s.enabled ? 'bg-aro-mint' : 'bg-aro-line-strong'
                        )}
                      />
                      <span className="truncate font-aro-mono text-aro-xs text-aro-ink-2" title={s.name}>
                        {s.name}
                      </span>
                      <span className="ml-auto shrink-0 font-aro-mono text-[var(--aro-text-2xs,9px)] text-aro-ink-4">
                        {toolCount}t
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Panel>

      {/* Memory & context notes */}
      <Panel>
        <div className="flex items-center justify-between border-b border-aro-line-soft px-2.5 py-2">
          <span className="flex items-center gap-1.5 font-aro-mono text-aro-xs font-semibold tracking-[.14em] text-aro-ink-4 uppercase">
            <IconBrain size={10} className="text-aro-mint" /> Agent Memory
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-xs leading-relaxed text-aro-ink-3">
            Persistent cross-session memories and learned context are injected automatically per turn.
          </p>
        </div>
      </Panel>
    </div>
  )
}
