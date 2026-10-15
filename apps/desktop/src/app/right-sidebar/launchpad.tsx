import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'

import {
  IconBrain,
  IconBranch,
  IconChevronRight,
  IconFile,
  IconFolder,
  IconGit,
  IconGlobe,
  IconList,
  IconSearch,
  IconTerminal,
  IconX
} from '@/aro/Icons'
import { displayPath } from '@/lib/display-path'
import { cn } from '@/lib/utils'
import { $projects, openFolderAsProject } from '@/store/projects'

import { type ContextSectionId, setRightSidebarSection } from './store'

interface WorkspaceLaunchpadProps {
  className?: string
  onSelectAction?: (sectionId: ContextSectionId) => void
}

interface ActionItem {
  id: string
  label: string
  detail: string
  icon: typeof IconFile
  category: 'tabs' | 'actions'
  action: () => void
}

export function WorkspaceLaunchpad({ className, onSelectAction }: WorkspaceLaunchpadProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const projects = useStore($projects)

  const handleOpenSection = (section: ContextSectionId) => {
    setRightSidebarSection(section)
    onSelectAction?.(section)
  }

  const allActions: ActionItem[] = useMemo(() => {
    return [
      {
        id: 'review',
        label: 'Review',
        detail: 'Inspect uncommitted git diffs and staging',
        icon: IconGit,
        category: 'tabs',
        action: () => handleOpenSection('changes')
      },
      {
        id: 'open-file',
        label: 'Open Project / Folder',
        detail: 'Select and attach a project workspace',
        icon: IconFolder,
        category: 'actions',
        action: () => void openFolderAsProject()
      },
      {
        id: 'terminal',
        label: 'Terminal',
        detail: 'Open interactive shell / powershell session',
        icon: IconTerminal,
        category: 'tabs',
        action: () => handleOpenSection('terminal')
      },
      {
        id: 'files',
        label: 'Files',
        detail: 'Browse workspace project tree',
        icon: IconFile,
        category: 'tabs',
        action: () => handleOpenSection('files')
      },
      {
        id: 'search',
        label: 'Search',
        detail: 'Grep text or find patterns across workspace',
        icon: IconSearch,
        category: 'tabs',
        action: () => handleOpenSection('search')
      },
      {
        id: 'plan',
        label: 'Plan & Tasks',
        detail: 'Session goals, todos, and execution steps',
        icon: IconList,
        category: 'tabs',
        action: () => handleOpenSection('plan')
      },
      {
        id: 'browser',
        label: 'Browser',
        detail: 'Built-in web browser and live previews',
        icon: IconGlobe,
        category: 'tabs',
        action: () => handleOpenSection('browser')
      },
      {
        id: 'context',
        label: 'Context & Memory',
        detail: 'Manage agent skills, rules, and memory bank',
        icon: IconBrain,
        category: 'tabs',
        action: () => handleOpenSection('context')
      }
    ]
  }, [])

  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return allActions
    const q = searchQuery.toLowerCase()
    return allActions.filter(
      item => item.label.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)
    )
  }, [allActions, searchQuery])

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return []
    if (!searchQuery.trim()) return projects.slice(0, 5)
    const q = searchQuery.toLowerCase()
    return projects
      .filter(p => {
        const pPath = p.primary_path || p.folders?.[0]?.path || ''
        return (p.name || '').toLowerCase().includes(q) || pPath.toLowerCase().includes(q)
      })
      .slice(0, 5)
  }, [projects, searchQuery])

  return (
    <div className={cn('aro-workspace-launchpad scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6', className)}>
      {/* 1. OmniSearch Input Box (Screenshot 3) */}
      <div className="aro-launchpad-omnisearch-wrap relative mx-auto w-full max-w-lg">
        <div className="aro-launchpad-omnisearch flex items-center gap-2.5 rounded-xl border border-aro-line bg-aro-well px-3.5 py-2.5 shadow-sm transition-all focus-within:border-aro-iris focus-within:ring-2 focus-within:ring-aro-iris/20">
          <IconSearch size={15} className="text-aro-ink-3 shrink-0" />
          <input
            type="text"
            className="w-full min-w-0 bg-transparent text-[13px] text-aro-ink placeholder:text-aro-ink-4 outline-none"
            placeholder="Search tabs, files, plugins, subagents, artifacts, tasks…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-aro-ink-4 hover:text-aro-ink text-xs transition-colors"
            >
              <IconX size={13} />
            </button>
          ) : (
            <span className="rounded bg-aro-raise border border-aro-line-soft px-1.5 py-0.5 font-mono text-[10px] text-aro-ink-3">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* 2. Quick Starter Navigation (Screenshot 3) */}
      <div className="mx-auto mt-6 w-full max-w-lg">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-aro-ink-4">
          {searchQuery ? 'Matching Actions' : 'Quick Actions'}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {filteredActions.slice(0, searchQuery ? 8 : 3).map(action => (
            <button
              key={action.id}
              type="button"
              onClick={action.action}
              className="group flex items-center justify-between rounded-lg border border-transparent bg-transparent px-3 py-2 text-left transition-all hover:border-aro-line-soft hover:bg-aro-hover/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-aro-line-soft bg-aro-raise text-aro-ink-2 group-hover:text-aro-iris-soft transition-colors">
                  <action.icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-aro-ink group-hover:text-aro-ink">
                    {action.label}
                  </div>
                  <div className="text-[11px] text-aro-ink-4 truncate">
                    {action.detail}
                  </div>
                </div>
              </div>
              <IconChevronRight
                size={13}
                className="text-aro-ink-4 opacity-0 transition-opacity group-hover:opacity-100 shrink-0"
              />
            </button>
          ))}
        </div>
      </div>

      {/* 3. Recent Workspaces / Projects */}
      {filteredProjects.length > 0 && (
        <div className="mx-auto mt-6 w-full max-w-lg">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-aro-ink-4">
            <span>Recent Workspaces</span>
            <button
              type="button"
              onClick={() => void openFolderAsProject()}
              className="text-[10.5px] text-aro-iris-soft hover:underline lowercase tracking-normal"
            >
              browse all…
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {filteredProjects.map(proj => {
              const projectPath = proj.primary_path || proj.folders?.[0]?.path || ''
              const displayName = proj.name || projectPath.split(/[\\/]+/).filter(Boolean).pop() || 'Workspace'
              return (
                <button
                  key={proj.id || projectPath}
                  type="button"
                  onClick={() => void openFolderAsProject(projectPath)}
                  className="group flex items-center justify-between rounded-lg border border-aro-line/50 bg-aro-raise/40 px-3 py-2 text-left transition-all hover:border-aro-line hover:bg-aro-hover"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconFolder size={14} className="text-aro-iris-soft shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-aro-ink truncate">
                        {displayName}
                      </div>
                      <div className="font-mono text-[10px] text-aro-ink-4 truncate" title={projectPath}>
                        {displayPath(projectPath)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-aro-ink-4 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    Open ↵
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Active Ecosystem Posture */}
      <div className="mx-auto mt-7 w-full max-w-lg rounded-xl border border-aro-line-soft bg-aro-well/60 p-3.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-aro-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Agent Engine Ready
          </span>
          <span className="font-mono text-[10.5px] text-aro-ink-2">
            Aro Pair Engine
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-aro-raise px-2 py-0.5 text-[10.5px] text-aro-ink-3">
            Terminal CLI
          </span>
          <span className="rounded-md bg-aro-raise px-2 py-0.5 text-[10.5px] text-aro-ink-3">
            File Tree & Diffs
          </span>
          <span className="rounded-md bg-aro-raise px-2 py-0.5 text-[10.5px] text-aro-ink-3">
            Multi-Turn Memory
          </span>
          <span className="rounded-md bg-aro-raise px-2 py-0.5 text-[10.5px] text-aro-ink-3">
            Local Dev Server
          </span>
        </div>
      </div>

      {/* 5. Keyboard Shortcuts Quick Reference */}
      <div className="mx-auto mt-6 w-full max-w-lg pt-2 text-center">
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 text-[10.5px] text-aro-ink-4 font-mono">
          <span><kbd className="rounded bg-aro-raise px-1 py-0.5 border border-aro-line-soft text-aro-ink-3">⌘O</kbd> Open Folder</span>
          <span><kbd className="rounded bg-aro-raise px-1 py-0.5 border border-aro-line-soft text-aro-ink-3">⌘J</kbd> Toggle Panel</span>
          <span><kbd className="rounded bg-aro-raise px-1 py-0.5 border border-aro-line-soft text-aro-ink-3">⌘K</kbd> Command Palette</span>
          <span><kbd className="rounded bg-aro-raise px-1 py-0.5 border border-aro-line-soft text-aro-ink-3">^`</kbd> Terminal</span>
        </div>
      </div>
    </div>
  )
}
