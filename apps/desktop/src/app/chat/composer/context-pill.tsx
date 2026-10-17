import { Ring } from '@/aro/ui'
import { Tip } from '@/components/ui/tooltip'
import type { HermesGateway } from '@/hermes'
import { useContextBreakdown } from '@/app/shell/hooks/use-context-breakdown'

export function ContextPill({
  busy,
  gateway,
  sessionId
}: {
  busy?: boolean
  gateway?: HermesGateway | null
  sessionId?: string | null
}) {
  const fallbackRequest = async <T = unknown>() => undefined as unknown as T
  const { breakdown } = useContextBreakdown({
    busy: Boolean(busy),
    enabled: Boolean(sessionId && gateway),
    requestGateway: gateway ? (method, params) => gateway.request(method, params) : fallbackRequest,
    sessionId: sessionId ?? null
  })

  const percent = breakdown?.context_percent ?? 0
  const used = breakdown?.context_used ? Math.round(breakdown.context_used / 1000) : 0
  const max = breakdown?.context_max ? Math.round(breakdown.context_max / 1000) : 0

  const tipLabel = breakdown
    ? `Context used: ${used}k / ${max}k tokens (${percent}%)`
    : 'Context window usage'

  return (
    <Tip label={tipLabel}>
      <div
        aria-label={tipLabel}
        className="hidden cursor-default items-center gap-1 rounded-control px-1.5 py-0.5 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 transition-colors hover:bg-aro-hover hover:text-aro-ink-2 sm:flex"
      >
        <Ring
          size={16}
          stroke={2.2}
          tone="var(--aro-iris)"
          value={percent}
        />
        <span className="tabular-nums font-aro-mono">{percent}%</span>
      </div>
    </Tip>
  )
}
