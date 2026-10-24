import { useStore } from '@nanostores/react'
import { map } from 'nanostores'
import { useId } from 'react'

import { type ContextSectionId, openWorkspaceTab } from '@/app/right-sidebar/store'
import { IconFolder, IconGit, IconLayers, IconList, IconX } from '@/aro/Icons'
import { Button } from '@/components/ui/button'
import { $fileBrowserOpen, toggleRightSide } from '@/store/layout'

const $summaryVisibility = map<Record<string, boolean>>({})

export interface PinnedSummaryProps {
  sessionKey: string
  title: string
  running: number
  completed: number
  added: number
  removed: number
}

export function PinnedSummary({ sessionKey, title, running, completed, added, removed }: PinnedSummaryProps) {
  const visibility = useStore($summaryVisibility)
  const open = visibility[sessionKey] ?? true
  const panelId = useId()
  const setOpen = (value: boolean) => $summaryVisibility.setKey(sessionKey, value)

  const openSection = (section: ContextSectionId) => {
    openWorkspaceTab(section)

    if (!$fileBrowserOpen.get()) {
      toggleRightSide()
    }
  }

  return (
    <div className="aro-pinned-summary-anchor">
      <Button aria-controls={panelId} aria-expanded={open} aria-label={open ? 'Hide pinned summary' : 'Show pinned summary'} onClick={() => setOpen(!open)} size="icon-sm" variant="ghost">
        <IconList size={16} />
      </Button>
      {open && (
        <aside aria-label="Pinned task summary" className="aro-pinned-summary" id={panelId}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-aro-ink-2">{title}</span>
            <Button aria-label="Hide pinned summary" onClick={() => setOpen(false)} size="icon-xs" variant="ghost"><IconX size={14} /></Button>
          </div>
          <button className="aro-summary-row" onClick={() => openSection('changes')} type="button">
            <IconGit size={16} /><span className="flex-1 text-start">Changes</span>
            <span className="text-aro-mint">+{added}</span><span className="text-aro-rose">−{removed}</span>
          </button>
          <div className="mt-4 text-aro-ink-2">Subagents</div>
          <button className="aro-summary-row" onClick={() => openSection('overview')} type="button">
            <IconLayers size={16} /><span>{running} running · {completed} done</span>
          </button>
          <div className="mt-4 text-aro-ink-2">Workspace</div>
          <button className="aro-summary-row" onClick={() => openSection('files')} type="button"><IconFolder size={16} /><span>Browse files</span></button>
          <button className="aro-summary-row" onClick={() => openSection('context')} type="button"><IconList size={16} /><span>View context</span></button>
        </aside>
      )}
    </div>
  )
}
