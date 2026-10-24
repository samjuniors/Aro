import { type ComponentType, useCallback, useMemo, useState } from 'react'

import {
  IconBrain,
  IconBranch,
  IconChevronRight,
  IconFolder,
  IconGit,
  IconGlobe,
  IconList,
  IconSearch,
  IconSpark,
  IconTerminal,
  IconX
} from '@/aro/Icons'
import { $newSideChatAction } from '@/components/pane-shell/tree/store'
import { cn } from '@/lib/utils'

import { type ContextSectionId, openWorkspaceTab } from './store'

interface WorkspaceLaunchpadProps {
  className?: string
  onSelectAction?: (sectionId: ContextSectionId) => void
}

interface ActionItem {
  id: string
  label: string
  detail?: string
  icon: ComponentType<{ size?: number; className?: string }>
  action: () => void
}

export function WorkspaceLaunchpad({ className, onSelectAction }: WorkspaceLaunchpadProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleOpenSection = useCallback((section: ContextSectionId) => {
    openWorkspaceTab(section)
    onSelectAction?.(section)
  }, [onSelectAction])

  const allActions: ActionItem[] = useMemo(() => {
    return [
      {
        id: 'overview',
        label: 'Overview',
        detail: 'Turn execution summary, touched files ledger, and checkpoints',
        icon: IconSpark,
        action: () => handleOpenSection('overview')
      },
      {
        id: 'review',
        label: 'Review',
        detail: 'Inspect uncommitted changes and git diffs',
        icon: IconGit,
        action: () => handleOpenSection('changes')
      },
      {
        id: 'open-file',
        label: 'Open File',
        detail: 'Browse workspace project files and directories',
        icon: IconFolder,
        action: () => handleOpenSection('files')
      },
      {
        id: 'side-chat',
        label: 'Side Chat',
        detail: 'Open a secondary conversation side-by-side with your active chat',
        icon: IconSpark,
        action: () => {
          const sideChat = $newSideChatAction.get()
          if (sideChat) {
            sideChat()
          } else {
            handleOpenSection('files')
          }
        }
      },
      {
        id: 'terminal',
        label: 'Terminal',
        detail: 'Open interactive shell or powershell session',
        icon: IconTerminal,
        action: () => handleOpenSection('terminal')
      },
      {
        id: 'browser',
        label: 'Browser',
        detail: 'In-app web browser and live previews',
        icon: IconGlobe,
        action: () => handleOpenSection('browser')
      },
      {
        id: 'plan',
        label: 'Plan',
        detail: 'Tasks, steps, and goal execution list',
        icon: IconList,
        action: () => handleOpenSection('plan')
      },
      {
        id: 'context',
        label: 'Context',
        detail: 'Context window, MCP connectors, and agent memory',
        icon: IconBrain,
        action: () => handleOpenSection('context')
      },
      {
        id: 'git',
        label: 'Git History',
        detail: 'Commit log, branches, and repository status',
        icon: IconBranch,
        action: () => handleOpenSection('git')
      },
      {
        id: 'search',
        label: 'Search',
        detail: 'Find text patterns across files',
        icon: IconSearch,
        action: () => handleOpenSection('search')
      }
    ]
  }, [handleOpenSection])

  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) {
      return allActions
    }

    const q = searchQuery.toLowerCase().trim()

    return allActions.filter(
      item => item.label.toLowerCase().includes(q) || (item.detail && item.detail.toLowerCase().includes(q))
    )
  }, [allActions, searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredActions.length > 0) {
      filteredActions[0].action()
    }
  }

  return (
    <div className={cn('aro-workspace-launchpad flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8', className)}>
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Antigravity-style Centered Search Input */}
        <div className="relative flex items-center gap-2.5 rounded-control border border-aro-line-soft bg-aro-well/70 px-3.5 py-2.5 shadow-(--aro-shadow-e1) transition-[border-color,box-shadow] focus-within:border-aro-iris focus-within:ring-2 focus-within:ring-aro-iris/20">
          <IconSearch className="text-aro-ink-4 shrink-0" size={14} />
          <input
            aria-label="Search workspace tools"
            autoFocus
            className="w-full min-w-0 bg-transparent text-sm text-aro-ink placeholder:text-aro-ink-4 outline-none"
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search workspace tools…"
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              className="text-aro-ink-4 hover:text-aro-ink text-xs transition-colors cursor-pointer"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              <IconX size={13} />
            </button>
          )}
        </div>

        {/* Action list directly under search input, matching Google Antigravity screenshot */}
        <div className="flex flex-col gap-0.5">
          {filteredActions.length > 0 ? (
            filteredActions.map(action => (
              <button
                className="group flex items-center justify-between rounded-control px-3 py-2 text-left transition-colors hover:bg-aro-hover cursor-pointer"
                key={action.id}
                onClick={action.action}
                type="button"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <action.icon className="text-aro-ink-3 shrink-0 group-hover:text-aro-iris-soft transition-colors" size={15} />
                  <span className="text-sm font-medium text-aro-ink">
                    {action.label}
                  </span>
                </div>
                <IconChevronRight
                  className="text-aro-ink-4 opacity-0 transition-opacity group-hover:opacity-100 shrink-0"
                  size={13}
                />
              </button>
            ))
          ) : (
            <p aria-live="polite" className="px-3 py-2 text-center text-xs text-aro-ink-4" role="status">
              No workspace tools match “{searchQuery.trim()}”.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
