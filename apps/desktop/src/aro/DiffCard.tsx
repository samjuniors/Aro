/**
 * ARO DIFF CARD — unified/split diff renderer (prototype pattern port).
 *
 * Renders a DiffFile: hunk headers, line numbers, add/del/context
 * colouring via the aro-diff-add / aro-diff-del utilities, a
 * unified ⇄ split toggle, and an expand control for long files.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DiffFile, DiffLine } from './workbenchData'
import { IconChevronDown, IconFile } from './Icons'
import { Segmented } from './ui'

function pairLines(lines: DiffLine[]) {
  const rows: { l?: DiffLine; r?: DiffLine; hunk?: string }[] = []
  let i = 0
  while (i < lines.length) {
    const ln = lines[i]
    if (ln.t === 'hunk') { rows.push({ hunk: ln.text }); i++; continue }
    if (ln.t === 'ctx') { rows.push({ l: ln, r: ln }); i++; continue }
    const dels: DiffLine[] = []
    const adds: DiffLine[] = []
    while (i < lines.length && lines[i].t === 'del') dels.push(lines[i++])
    while (i < lines.length && lines[i].t === 'add') adds.push(lines[i++])
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) rows.push({ l: dels[k], r: adds[k] })
  }
  return rows
}

export function DiffView({
  file,
  maxLines = 22,
  mode: forced,
  showToggle,
}: {
  file: DiffFile
  maxLines?: number
  mode?: 'unified' | 'split'
  showToggle?: boolean
}) {
  const [all, setAll] = useState(false)
  const [mode, setMode] = useState<'unified' | 'split'>(forced ?? 'unified')
  const shown = all ? file.lines : file.lines.slice(0, maxLines)
  const Cell = ({ l, side }: { l?: DiffLine; side: 'l' | 'r' }) => (
    <div className={cn('flex min-w-0 flex-1 items-start', l?.t === 'add' && 'aro-diff-add', l?.t === 'del' && 'aro-diff-del', !l && 'bg-aro-well/40')}>
      <span className="w-8 shrink-0 py-px pr-2 text-right text-aro-ink-4/70 select-none">{l ? (side === 'l' ? l.o ?? '' : l.n ?? '') : ''}</span>
      <span className={cn('truncate py-px pr-3 whitespace-pre', l?.t === 'add' ? 'text-aro-mint' : l?.t === 'del' ? 'text-aro-rose' : 'text-aro-ink-2')}>{l?.text || ' '}</span>
    </div>
  )
  return (
    <div className="overflow-hidden rounded-[8px] border border-aro-line-soft bg-aro-sunken">
      <div className="flex items-center justify-between gap-2 border-b border-aro-line-soft bg-aro-well px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconFile size={11} className="shrink-0 text-aro-ink-4" />
          <span className="truncate font-aro-mono text-[11px] text-aro-ink-2">{file.path}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-aro-mono text-[10px]">
          <span className="text-aro-mint">+{file.adds}</span>
          <span className="text-aro-rose">−{file.dels}</span>
          {showToggle && (
            <Segmented
              value={mode}
              onChange={setMode}
              items={[{ value: 'unified', label: 'Unified' }, { value: 'split', label: 'Split' }]}
              className="ml-1 scale-90"
            />
          )}
        </div>
      </div>
      <div className="aro-scroll-thin overflow-x-auto font-aro-mono text-[11.5px] leading-[1.65]">
        {mode === 'unified'
          ? shown.map((l, i) => (
              <div key={i} className={cn('flex items-start whitespace-pre', l.t === 'add' && 'aro-diff-add', l.t === 'del' && 'aro-diff-del', l.t === 'hunk' && 'bg-aro-iris-tint/50')}>
                {l.t !== 'hunk' ? (
                  <>
                    <span className="w-8 shrink-0 py-px pr-2 text-right text-aro-ink-4/70 select-none">{l.o ?? ''}</span>
                    <span className="w-8 shrink-0 py-px pr-2 text-right text-aro-ink-4/70 select-none">{l.n ?? ''}</span>
                    <span className="w-3 shrink-0 py-px text-aro-ink-4/60 select-none">{l.t === 'add' ? '+' : l.t === 'del' ? '−' : ' '}</span>
                    <span className={cn('py-px pr-3', l.t === 'add' ? 'text-aro-mint' : l.t === 'del' ? 'text-aro-rose' : 'text-aro-ink-2')}>{l.text || ' '}</span>
                  </>
                ) : (
                  <span className="py-0.5 pl-3 text-aro-ink-3">{l.text}</span>
                )}
              </div>
            ))
          : pairLines(shown).map((r, i) =>
              r.hunk ? (
                <div key={i} className="bg-aro-iris-tint/50 py-0.5 pl-3 text-aro-ink-3">{r.hunk}</div>
              ) : (
                <div key={i} className="flex divide-x divide-aro-line-soft">
                  <Cell l={r.l} side="l" />
                  <Cell l={r.r} side="r" />
                </div>
              ),
            )}
      </div>
      {file.lines.length > maxLines && (
        <button
          onClick={() => setAll((a) => !a)}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-aro-line-soft py-1.5 text-[11px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
        >
          {all ? 'Collapse' : `Show ${file.lines.length - maxLines} more lines`}
          <IconChevronDown size={11} className={cn('transition-transform', all && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}
