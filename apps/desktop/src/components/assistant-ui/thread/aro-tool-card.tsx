'use client'

import { type ToolCallMessagePartProps, useAuiState } from '@assistant-ui/react'
import { useStore } from '@nanostores/react'
import { type FC, type ReactNode, useMemo } from 'react'

import {
  IconChevronDown,
  IconEye,
  IconFile,
  IconList,
  IconMcp,
  IconSearch,
  IconSpark,
  IconTerminal,
  IconX
} from '@/aro/Icons'
import { Badge } from '@/aro/ui'
import { ToolFallback } from '@/components/assistant-ui/tool/fallback'
import {
  buildToolView,
  countDiffLineStats,
  fileEditPath,
  inlineDiffFromResult,
  isFileEditTool,
  looksRedundant,
  parseMaybeObject,
  toolEntryDisclosureId
} from '@/components/assistant-ui/tool/fallback-model'
import type { ToolPart, ToolStatus, ToolTone, ToolView } from '@/components/assistant-ui/tool/fallback-model/types'
import { toolResultRecord } from '@/lib/tool-result-metadata'
import { cn } from '@/lib/utils'
import { $toolRowDismissed, dismissToolRow } from '@/store/tool-dismiss'
import { $hideCodeDiffs, $toolDisclosureOpen, $toolViewMode, setToolDisclosureOpen } from '@/store/tool-view'

/**
 * A2 — the prototype's ToolCard grammar over the REAL Hermes tool row.
 *
 * The host `ToolFallback` stays mounted as the body engine (inline diffs,
 * search results, vision images, split stdout/stderr, ANSI, technical payload
 * view — every working surface is preserved); its own disclosure header is
 * visually retired and this card's Aro header drives the SAME persisted
 * disclosure store, so open/closed state stays shared with every other
 * consumer (the approval card's jump-to-tool, the run grouping, the
 * `$toolViewMode`/`$hideCodeDiffs` prefs).
 *
 * Prototype source: `prototype/src/workbench/components/Transcript.tsx`
 * ToolCard — 20px tone icon tile, mono uppercase label, mono target, running
 * dot / duration / failed badge, hover border on the header. The Hermes
 * run-grouping behaviour (summary lines, live ticker, collapse) is upstream
 * of this component and unchanged.
 */

type AroToolCardProps = ToolCallMessagePartProps & {
  completedAt?: number
  timestamp?: number
} & Pick<ToolPart, 'innerToolName' | 'interrupted' | 'toolResultMetadata'>

type AroToolIcon = FC<{ size?: number; className?: string }>

const ARO_TOOL_META: Record<string, { icon: AroToolIcon; label: string; tone: string }> = {
  browser_click: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  browser_fill: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  browser_navigate: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  browser_snapshot: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  browser_take_screenshot: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  browser_type: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  cronjob: { icon: IconList, label: 'cron', tone: 'text-aro-amber' },
  edit_file: { icon: IconSpark, label: 'edit', tone: 'text-aro-iris-soft' },
  execute_code: { icon: IconTerminal, label: 'code', tone: 'text-aro-cyan' },
  list_files: { icon: IconFile, label: 'read', tone: 'text-aro-sky' },
  memory: { icon: IconMcp, label: 'memory', tone: 'text-aro-mint' },
  patch: { icon: IconSpark, label: 'edit', tone: 'text-aro-iris-soft' },
  read_file: { icon: IconFile, label: 'read', tone: 'text-aro-sky' },
  search_files: { icon: IconSearch, label: 'search', tone: 'text-aro-plum' },
  session_search_recall: { icon: IconSearch, label: 'recall', tone: 'text-aro-plum' },
  terminal: { icon: IconTerminal, label: 'shell', tone: 'text-aro-cyan' },
  todo: { icon: IconList, label: 'plan', tone: 'text-aro-amber' },
  vision_analyze: { icon: IconEye, label: 'vision', tone: 'text-aro-sky' },
  web_extract: { icon: IconEye, label: 'extract', tone: 'text-aro-sky' },
  web_search: { icon: IconSearch, label: 'search', tone: 'text-aro-plum' },
  write_file: { icon: IconSpark, label: 'write', tone: 'text-aro-iris-soft' }
}

// Unknown tools fall back on the host view model's tone classification so
// every real tool name (incl. new backend tools) still gets a tile.
const TONE_FALLBACK: Record<ToolTone, { icon: AroToolIcon; label: string; tone: string }> = {
  agent: { icon: IconMcp, label: 'tool', tone: 'text-aro-mint' },
  browser: { icon: IconEye, label: 'browser', tone: 'text-aro-sky' },
  default: { icon: IconMcp, label: 'tool', tone: 'text-aro-mint' },
  file: { icon: IconFile, label: 'file', tone: 'text-aro-sky' },
  image: { icon: IconEye, label: 'image', tone: 'text-aro-sky' },
  terminal: { icon: IconTerminal, label: 'shell', tone: 'text-aro-cyan' },
  web: { icon: IconSearch, label: 'search', tone: 'text-aro-plum' }
}

/** Mirror of the host ToolEntry's expandable-content gate (fallback.tsx),
 * rebuilt from the same exported pure functions so the chevron only appears
 * when the delegated host body actually has something to show. */
function hasCardBody(
  view: ToolView,
  { hideCodeDiffs, isFileEdit, toolViewMode }: { hideCodeDiffs: boolean; isFileEdit: boolean; toolViewMode: string }
): boolean {
  const summaryOnly = hideCodeDiffs && isFileEdit && view.status !== 'error'
  const showInlineDiff = Boolean(view.inlineDiff) && !hideCodeDiffs
  const showPayload = toolViewMode === 'technical' && !(hideCodeDiffs && isFileEdit)

  if (summaryOnly) {
    return false
  }

  const detail = view.detail.trim()

  // The host splits error detail into summary/body chunks; for the
  // expandable decision "any error detail" is equivalent.
  const detailShown =
    (!view.inlineDiff || (hideCodeDiffs && view.status === 'error')) &&
    Boolean(
      view.stdout ||
        view.stderr ||
        ((view.status === 'error' || view.status === 'notice') && detail) ||
        (view.status !== 'error' && detail && !looksRedundant(view.title, detail) && !looksRedundant(view.subtitle, detail))
    )

  return Boolean(
    view.imageUrl ||
      showInlineDiff ||
      detailShown ||
      view.searchHits?.length ||
      view.terminalCommand ||
      view.terminalExitCode !== undefined ||
      showPayload
  )
}

const statusBadge = (status: ToolStatus): ReactNode => {
  if (status === 'error') {
    return <Badge mono tone="rose">failed</Badge>
  }

  if (status === 'warning') {
    return <Badge mono tone="amber">warning</Badge>
  }

  return null
}

export const AroToolCard: FC<AroToolCardProps> = props => {
  const { args, completedAt, innerToolName, interrupted, isError, result, timestamp, toolCallId, toolName, toolResultMetadata } = props
  const messageId = useAuiState(s => s.message.id)
  const messageRunning = useAuiState(s => s.message.status?.type === 'running')
  const hideCodeDiffs = useStore($hideCodeDiffs)
  const toolViewMode = useStore($toolViewMode)

  // Same stable-part derivation the host row performs, so the view model and
  // disclosure id agree with ToolEntry across streaming re-renders.
  const stablePart = useMemo<ToolPart>(
    () => ({
      args,
      completedAt,
      innerToolName,
      interrupted,
      isError,
      result,
      timestamp,
      toolCallId,
      toolName,
      toolResultMetadata,
      type: 'tool-call'
    }),
    [args, completedAt, innerToolName, interrupted, isError, result, timestamp, toolCallId, toolName, toolResultMetadata]
  )

  const inlineDiff = useMemo(() => inlineDiffFromResult(toolResultRecord(stablePart)), [stablePart])
  const isFileEdit = isFileEditTool(toolName)
  const isPending = messageRunning && result === undefined && completedAt === undefined

  // Presentation-only completion marker, exactly like the host row: a stopped
  // turn is not evidence that an unobserved tool succeeded.
  const view = useMemo(() => {
    const part =
      !isPending && result === undefined ? { ...stablePart, completedAt: stablePart.completedAt ?? 0 } : stablePart

    return buildToolView(part, inlineDiff)
  }, [inlineDiff, isPending, result, stablePart])

  const disclosureId = useMemo(() => toolEntryDisclosureId(messageId, stablePart), [messageId, stablePart])
  const dismissed = useStore(useMemo(() => $toolRowDismissed(disclosureId), [disclosureId]))
  const persistedOpen = useStore(useMemo(() => $toolDisclosureOpen(disclosureId), [disclosureId]))

  // Host row guards, replicated so the card chrome never outlives the row:
  // a completed file edit with no diff to review (a `write_file` create after
  // reload rehydrates diff-less) renders nothing, same as the host row.
  if (dismissed) {
    return null
  }

  if (isFileEdit && !isPending && view.status !== 'error' && !inlineDiff) {
    return null
  }

  const summaryOnly = hideCodeDiffs && isFileEdit && view.status !== 'error'
  // Prototype parity: error cards and inline-diff rows open by default
  // (Transcript.tsx ToolCard seeds open for status 'running' | 'error' | diff).
  const defaultOpen = view.status === 'error' || (Boolean(inlineDiff) && !hideCodeDiffs)
  const open = (persistedOpen ?? defaultOpen) && !summaryOnly
  const expandable = hasCardBody(view, { hideCodeDiffs, isFileEdit, toolViewMode })
  const canDismiss = !isPending

  const meta = ARO_TOOL_META[toolName] ?? {
    icon: TONE_FALLBACK[view.tone].icon,
    label: toolName,
    tone: TONE_FALLBACK[view.tone].tone
  }

  const Icon = meta.icon

  // The header target names WHAT was worked on, mirroring the prototype's
  // `step.target` (a path or command) — never the error text, which the
  // expanded body carries as its headline (and which would otherwise render
  // twice inside one card).
  const target =
    view.status === 'error'
      ? (isFileEdit ? fileEditPath(parseMaybeObject(args), toolResultRecord(stablePart)) : view.terminalCommand) || ''
      : view.subtitle.trim()

  const diffStats =
    isFileEdit && view.inlineDiff && !hideCodeDiffs ? countDiffLineStats(view.inlineDiff) : null

  const badge = statusBadge(view.status)

  const headerClass = 'flex w-full items-center gap-2 px-2.5 py-2 text-left'

  return (
    <div
      className="group/aro-tool animate-aro-rise relative min-w-0 max-w-full"
      data-aro-tool-card=""
      data-tool-name={toolName}
    >
      <div className="overflow-hidden rounded-panel border border-aro-line-soft bg-aro-well">
        {expandable ? (
          <button
            aria-expanded={open}
            className={cn(headerClass, 'cursor-pointer transition-colors hover:bg-aro-hover/60')}
            onClick={() => setToolDisclosureOpen(disclosureId, !open)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-control border border-aro-line-soft bg-aro-raise',
                meta.tone
              )}
            >
              <Icon size={11} />
            </span>
            <span className="shrink-0 font-aro-mono text-[9.5px] font-semibold tracking-[0.12em] text-aro-ink-4 uppercase">
              {meta.label}
            </span>
            {target && (
              <span className="min-w-0 flex-1 truncate font-aro-mono text-[11.5px] text-aro-ink-2" title={target}>
                {target}
              </span>
            )}
            {isPending && (
              <span className="flex shrink-0 items-center gap-1.5 font-aro-mono text-[10.5px] text-aro-cyan">
                <i aria-hidden="true" className="size-[5px] animate-aro-breathe rounded-full bg-aro-cyan" />
                running
              </span>
            )}
            {!isPending && diffStats && (
              <span className="flex shrink-0 items-center gap-1 font-aro-mono text-[var(--aro-text-2xs,10px)] tabular-nums">
                {diffStats.added > 0 && <span className="text-aro-mint">+{diffStats.added}</span>}
                {diffStats.removed > 0 && <span className="text-aro-rose">−{diffStats.removed}</span>}
              </span>
            )}
            {!isPending && !diffStats && view.durationLabel && (
              <span className="shrink-0 font-aro-mono text-[var(--aro-text-2xs,10px)] tabular-nums text-aro-ink-4">
                {view.durationLabel}
              </span>
            )}
            {badge}
            <IconChevronDown
              className={cn('shrink-0 text-aro-ink-4 transition-transform duration-200', open && 'rotate-180')}
              size={12}
            />
          </button>
        ) : (
          <div className={headerClass}>
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-control border border-aro-line-soft bg-aro-raise',
                meta.tone
              )}
            >
              <Icon size={11} />
            </span>
            <span className="shrink-0 font-aro-mono text-[9.5px] font-semibold tracking-[0.12em] text-aro-ink-4 uppercase">
              {meta.label}
            </span>
            {target && (
              <span className="min-w-0 flex-1 truncate font-aro-mono text-[11.5px] text-aro-ink-2" title={target}>
                {target}
              </span>
            )}
            {isPending && (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 font-aro-mono text-[10.5px] text-aro-cyan">
                <i aria-hidden="true" className="size-[5px] animate-aro-breathe rounded-full bg-aro-cyan" />
                running
              </span>
            )}
            {!isPending && view.durationLabel && (
              <span className="ml-auto shrink-0 font-aro-mono text-[var(--aro-text-2xs,10px)] tabular-nums text-aro-ink-4">
                {view.durationLabel}
              </span>
            )}
            {badge}
          </div>
        )}
        {/* The host row stays the body engine: its disclosure header is
            visually retired (scoped display:none) while its expanded body —
            diffs, search hits, images, split streams — renders inside the
            card. The scoped variants also neutralise the aro indent + the
            host's own expanded-shell border, which the card now provides. */}
        <div
          className={cn(
            '[&_[data-tool-open]]:rounded-none [&_[data-tool-open]]:border-none',
            '[&_[data-tool-row]>div:first-child]:hidden',
            '[&_[data-tool-row]>div:nth-child(2)]:border-t [&_[data-tool-row]>div:nth-child(2)]:border-aro-line-soft',
            '[&_[data-conversation-scaffold]]:ml-0',
            '[&_[data-slot=tool-block]]:ml-0'
          )}
        >
          <ToolFallback {...props} />
        </div>
        {canDismiss && (
          <button
            /* Distinct label from the retired host header's dismiss (which is
               display:none'd by the scoped variant above but stays in the
               a11y tree in CSS-less environments); both write the same
               disclosure-store state. */
            aria-label="Dismiss tool"
            className="absolute right-1 top-1 z-10 flex size-5 cursor-pointer items-center justify-center rounded-md text-aro-ink-4 opacity-0 transition-opacity group-hover/aro-tool:opacity-100 hover:bg-aro-hover hover:text-aro-ink focus-visible:opacity-100"
            onClick={event => {
              event.stopPropagation()
              dismissToolRow(disclosureId)
            }}
            type="button"
          >
            <IconX size={11} />
          </button>
        )}
      </div>
    </div>
  )
}
