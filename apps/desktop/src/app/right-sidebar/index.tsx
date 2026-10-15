import { useStore } from '@nanostores/react'
import { type ComponentProps, type ComponentType, useCallback, useEffect, useMemo, useState } from 'react'

import {
  IconBrain,
  IconBranch,
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconGit,
  IconGlobe,
  IconList,
  IconMaximize,
  IconMinimize,
  IconMore,
  IconPanelRight,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTerminal,
  IconX
} from '@/aro/Icons'
import { TreeSkeleton } from '@/components/chat/skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { isPaneVisible } from '@/components/pane-shell/tree/store'
import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useDelayedTrue } from '@/hooks/use-delayed-true'
import { useI18n } from '@/i18n'
import { normalizeOrLocalPreviewTarget } from '@/lib/local-preview'
import { cn } from '@/lib/utils'
import { refreshRepoStatus, registerRepoStatusCwd, repoStatusForCwd } from '@/store/coding-status'
import { $backgroundStatusBySession } from '@/store/composer-status'
import { $panesFlipped, toggleRightSide } from '@/store/layout'
import { notifyError } from '@/store/notifications'
import { openPreview } from '@/store/preview'
import { openFolderAsProject } from '@/store/projects'
import { $reviewFiles } from '@/store/review'
import { $activeSessionId, $selectedStoredSessionId } from '@/store/session'
import { $focusedWorkspaceCwd } from '@/store/session-states'
import { $subagentsBySession } from '@/store/subagents'
import { $retainedTodosBySession, $todosBySession } from '@/store/todos'

import { ExternalIdeControl } from '../shell/external-ide-control'
import { SidebarPanelLabel } from '../shell/sidebar-label'

import { BrowserSection } from './browser-section'
import { ChangesSection } from './changes-section'
import { ContextSection } from './context-section'
import { ProjectTree } from './files/tree'
import { useProjectTree } from './files/use-project-tree'
import { GitSection } from './git-section'
import { WorkspaceLaunchpad } from './launchpad'
import { PlanSection } from './plan-section'
import { SearchSection } from './search-section'
import {
  $rightSidebarSection,
  $workspaceOpenTabs,
  closeWorkspaceTab,
  type ContextSectionId,
  openWorkspaceTab,
  setRightSidebarSection
} from './store'
import { TerminalSection } from './terminal-section'

interface RightSidebarPaneProps {
  onActivateFile: (path: string) => void
  onActivateFolder: (path: string) => void
}

const isWin = typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent || '')

const SECTION_CONFIG: Record<
  ContextSectionId,
  { id: ContextSectionId; label: string; icon: ComponentType<{ size?: number; className?: string }> }
> = {
  changes: { id: 'changes', label: 'Review', icon: IconGit },
  terminal: { id: 'terminal', label: isWin ? 'powershell.exe' : 'Terminal', icon: IconTerminal },
  files: { id: 'files', label: 'Files', icon: IconFolder },
  search: { id: 'search', label: 'Search', icon: IconSearch },
  browser: { id: 'browser', label: 'Browser', icon: IconGlobe },
  plan: { id: 'plan', label: 'Plan', icon: IconList },
  context: { id: 'context', label: 'Plugins', icon: IconBrain },
  git: { id: 'git', label: 'Git', icon: IconBranch },
  launchpad: { id: 'launchpad', label: 'New Tab', icon: IconPlus }
}

export function RightSidebarPane({ onActivateFile, onActivateFolder }: RightSidebarPaneProps) {
  const { t } = useI18n()
  const r = t.rightSidebar
  const panesFlipped = useStore($panesFlipped)
  const targetCwd = useStore($focusedWorkspaceCwd)
  const hasWorkspace = Boolean(targetCwd)
  const section = useStore($rightSidebarSection)

  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) {return}

    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setFullscreen(false)
      }
    }

    window.addEventListener('keydown', esc, true)

    return () => window.removeEventListener('keydown', esc, true)
  }, [fullscreen])

  const activeSessionId = useStore($activeSessionId)
  const selectedStoredId = useStore($selectedStoredSessionId)
  const sessionId = activeSessionId || selectedStoredId
  const todosMap = useStore($todosBySession)
  const retainedMap = useStore($retainedTodosBySession)

  const activeTodos = useMemo(() => {
    const list = (sessionId ? todosMap[sessionId] ?? retainedMap[sessionId] : null) ?? []

    return list.filter(item => item.status === 'pending' || item.status === 'in_progress').length
  }, [sessionId, todosMap, retainedMap])

  const reviewFiles = useStore($reviewFiles)
  const bgStatus = useStore($backgroundStatusBySession)
  const subagents = useStore($subagentsBySession)

  const backgroundTasksCount = useMemo(() => {
    let count = 0
    if (sessionId) {
      count += (bgStatus[sessionId] ?? []).filter(i => i.state === 'running').length
      count += (subagents[sessionId] ?? []).filter(i => i.status === 'running').length
    } else {
      for (const items of Object.values(bgStatus)) {
        count += items.filter(i => i.state === 'running').length
      }
      for (const items of Object.values(subagents)) {
        count += items.filter(i => i.status === 'running').length
      }
    }
    return count
  }, [sessionId, bgStatus, subagents])

  const isDedicatedReviewVisible = isPaneVisible('review')
  useEffect(() => {
    if (isDedicatedReviewVisible && section === 'changes') {
      setRightSidebarSection('files')
    }
  }, [isDedicatedReviewVisible, section])

  const openTabs = useStore($workspaceOpenTabs)

  const handleCloseTab = (tabId: ContextSectionId, e: React.MouseEvent) => {
    e.stopPropagation()
    closeWorkspaceTab(tabId)
  }

  const {
    collapseAll,
    collapseNonce,
    data,
    effectiveCwd,
    loadChildren,
    openState,
    refreshRoot,
    rootError,
    rootLoading,
    setNodeOpen,
    setShowIgnored,
    showIgnored
  } = useProjectTree(hasWorkspace ? targetCwd : '')

  const activeRepoCwd = effectiveCwd || (hasWorkspace ? targetCwd : '')
  const repoStatus = useStore(repoStatusForCwd(activeRepoCwd))
  const dirtyCount = repoStatus ? (repoStatus.staged ?? 0) + (repoStatus.unstaged ?? 0) : 0

  useEffect(() => {
    if (!activeRepoCwd) {
      return
    }

    return registerRepoStatusCwd(activeRepoCwd)
  }, [activeRepoCwd])

  const handleRefresh = useCallback(() => {
    void refreshRoot()

    if (activeRepoCwd) {
      void refreshRepoStatus(activeRepoCwd)
    }
  }, [activeRepoCwd, refreshRoot])

  const cwdName =
    effectiveCwd
      .split(/[\\/]+/)
      .filter(Boolean)
      .pop() ?? effectiveCwd

  const canCollapse = Object.values(openState).some(Boolean)

  const previewFile = async (path: string) => {
    try {
      const preview = await normalizeOrLocalPreviewTarget(path, effectiveCwd || undefined)

      if (!preview) {
        throw new Error(r.couldNotPreview(path))
      }

      openPreview(preview)
    } catch (error) {
      notifyError(error, r.previewUnavailable)
    }
  }

  return (
    <aside
      aria-label={r.aria}
      className={cn(
        'aro-workspace-sidebar before:pointer-events-none relative flex h-full w-full min-w-0 flex-col overflow-hidden border-(--ui-stroke-secondary) bg-(--ui-sidebar-surface-background) pt-(--titlebar-height) text-(--ui-text-tertiary)',
        panesFlipped
          ? 'border-r shadow-[inset_-0.0625rem_0_0_color-mix(in_srgb,white_18%,transparent)]'
          : 'border-l shadow-[inset_0.0625rem_0_0_color-mix(in_srgb,white_18%,transparent)]',
        fullscreen && 'is-fullscreen'
      )}
    >
      {/* Workspace Tab Strip matching Antigravity UI */}
      <div aria-label="Workspace tools" className="workspace-tabstrip" role="tablist">
        <div className="workspace-tabs-scroll">
          {openTabs.map(tabId => {
            const config = SECTION_CONFIG[tabId]
            if (!config) return null
            const active = section === tabId
            const Icon = config.icon

            const count =
              tabId === 'plan'
                ? (activeTodos > 0 ? activeTodos : undefined)
                : tabId === 'changes'
                  ? (reviewFiles.length > 0 ? reviewFiles.length : undefined)
                  : tabId === 'git'
                    ? (dirtyCount > 0 ? dirtyCount : undefined)
                    : undefined

            return (
              <div
                aria-selected={active}
                className={cn('workspace-tab', active && 'is-active')}
                key={tabId}
                role="tab"
              >
                <button
                  aria-label={config.label}
                  className="workspace-tab-main"
                  onClick={() => setRightSidebarSection(tabId)}
                  type="button"
                >
                  <Icon size={11} />
                  <span className="workspace-tab-title">{config.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="ml-1 rounded-full bg-aro-hover px-1 font-aro-mono text-[9px] text-aro-ink-3">
                      {count}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Close ${config.label}`}
                  className="workspace-tab-close"
                  onClick={e => handleCloseTab(tabId, e)}
                >
                  <IconX size={10} />
                </button>
              </div>
            )
          })}

          {/* New Tab (+) Button leading to Launchpad */}
          <button
            type="button"
            className={cn('workspace-tab-new', section === 'launchpad' && 'is-on text-aro-iris-soft bg-aro-hover')}
            aria-label="New tab · Open Launchpad"
            onClick={() => setRightSidebarSection('launchpad')}
          >
            <IconPlus size={11} />
          </button>
        </div>

        {/* Toolbar: Open IDE button (Screenshot 1 & 5) + Panel controls */}
        <div className="flex items-center gap-1 shrink-0 pr-1">
          <ExternalIdeControl compact />
          <Tip label={fullscreen ? 'Exit full screen · Esc' : 'Full screen workspace tool'} side="bottom">
            <button
              aria-label={fullscreen ? 'Exit full screen' : 'Full screen workspace tool'}
              aria-pressed={fullscreen}
              className={cn('workspace-panel-full', fullscreen && 'is-on')}
              onClick={() => setFullscreen(v => !v)}
              type="button"
            >
              {fullscreen ? <IconMinimize size={12} /> : <IconMaximize size={12} />}
            </button>
          </Tip>
          <Tip label="Refresh workspace" side="bottom">
            <button
              aria-label="Refresh workspace"
              className="workspace-tab-toolbar"
              onClick={handleRefresh}
              type="button"
            >
              <IconRefresh size={12} />
            </button>
          </Tip>
          <Tip label="Close workspace panel · ⌘J" side="bottom">
            <button
              aria-label="Close workspace panel"
              className="workspace-tab-toolbar"
              onClick={toggleRightSide}
              type="button"
            >
              <IconPanelRight size={13} />
            </button>
          </Tip>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="workspace-body flex min-h-0 flex-1 flex-col overflow-hidden">
        {section === 'launchpad' && <WorkspaceLaunchpad onSelectAction={setRightSidebarSection} />}
        {section === 'files' && (
          <FilesystemTab
            canCollapse={canCollapse}
            collapseNonce={collapseNonce}
            cwd={effectiveCwd}
            cwdName={cwdName}
            data={data}
            error={rootError}
            hasWorkspace={hasWorkspace}
            loading={rootLoading}
            onActivateFile={onActivateFile}
            onActivateFolder={onActivateFolder}
            onCollapseAll={collapseAll}
            onLoadChildren={loadChildren}
            onNodeOpenChange={setNodeOpen}
            onPreviewFile={previewFile}
            onRefresh={handleRefresh}
            onToggleShowIgnored={() => setShowIgnored(!showIgnored)}
            openState={openState}
            showIgnored={showIgnored}
          />
        )}
        {section === 'changes' && <ChangesSection />}
        {section === 'terminal' && <TerminalSection />}
        {section === 'search' && <SearchSection onPreviewFile={previewFile} />}
        {section === 'browser' && <BrowserSection />}
        {section === 'plan' && <PlanSection />}
        {section === 'context' && <ContextSection />}
        {section === 'git' && <GitSection />}
        {section === 'launchpad' && <WorkspaceLaunchpad onSelectAction={openWorkspaceTab} />}
      </div>
    </aside>
  )
}

interface FilesystemTabProps extends FileTreeBodyProps {
  canCollapse: boolean
  cwdName: string
  hasWorkspace: boolean
  onCollapseAll: () => void
  onRefresh: () => void
  onToggleShowIgnored: () => void
  showIgnored: boolean
}

// Sidebar palette + hover-reveal: header actions stay reachable while moving
// from the project label to the action buttons.
const HEADER_ACTION_CLASS =
  'text-sidebar-foreground/70 hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! focus-visible:bg-sidebar-accent! focus-visible:text-sidebar-accent-foreground! focus-visible:ring-sidebar-ring'

const HEADER_ACTION_LABEL_REVEAL = `${HEADER_ACTION_CLASS} pointer-events-none opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 group-focus-within/project-header:pointer-events-auto group-focus-within/project-header:opacity-100 group-hover/project-header:pointer-events-auto group-hover/project-header:opacity-100`

function FilesystemTab({
  canCollapse,
  collapseNonce,
  cwd,
  cwdName,
  data,
  error,
  hasWorkspace,
  loading,
  onActivateFile,
  onActivateFolder,
  onCollapseAll,
  onLoadChildren,
  onNodeOpenChange,
  onPreviewFile,
  onRefresh,
  onToggleShowIgnored,
  openState,
  showIgnored
}: FilesystemTabProps) {
  const { t } = useI18n()
  const r = t.rightSidebar

  // No working directory (a bare/detached chat) → no tree, but keep a way back
  // into a folder (#53004): the projects paradigm removed the old folder picker,
  // which stranded global sessions on a dead-end "No project open" pane. The
  // affordance is the project-shaped one — ⌘O's open-folder-as-project flow,
  // which upserts/enters the project and anchors a fresh session at the picked
  // folder — entirely decoupled from $currentCwd.
  if (!hasWorkspace) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center border-b border-aro-line-soft">
          <SidebarPanelLabel className="pl-0 text-(--ui-text-quaternary)">{r.noProjectOpen}</SidebarPanelLabel>
          <Button className="h-7 gap-1.5 text-xs" onClick={() => void openFolderAsProject()} size="sm" variant="outline">
            <Codicon name="folder-opened" size="0.8125rem" />
            {r.openFolder}
          </Button>
        </div>
        <WorkspaceLaunchpad onSelectAction={setRightSidebarSection} />
      </div>
    )
  }

  const [fileFilter, setFileFilter] = useState('')

  const filteredTreeData = useMemo(() => {
    if (!fileFilter.trim()) return data
    const q = fileFilter.toLowerCase()
    return data.filter(node => node.name.toLowerCase().includes(q) || node.id.toLowerCase().includes(q))
  }, [data, fileFilter])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RightSidebarSectionHeader>
        <div className="flex min-w-0 flex-1">
          <SidebarPanelLabel>{cwdName}</SidebarPanelLabel>
        </div>
        <Tip label={showIgnored ? r.hideIgnored : r.showIgnored}>
          <Button
            aria-label={showIgnored ? r.hideIgnored : r.showIgnored}
            aria-pressed={showIgnored}
            // Stays visible while active: the tree is showing more than the
            // repo does, and that has to be legible without hovering.
            className={showIgnored ? HEADER_ACTION_CLASS : HEADER_ACTION_LABEL_REVEAL}
            onClick={onToggleShowIgnored}
            size="icon-xs"
            variant="ghost"
          >
            <Codicon name={showIgnored ? 'eye' : 'eye-closed'} size="0.8125rem" />
          </Button>
        </Tip>
        <Tip label={r.collapseAll}>
          <Button
            aria-label={r.collapseAll}
            className={cn(HEADER_ACTION_CLASS, !canCollapse && 'pointer-events-none opacity-0')}
            disabled={!canCollapse}
            onClick={onCollapseAll}
            size="icon-xs"
            variant="ghost"
          >
            <Codicon name="collapse-all" size="0.8125rem" />
          </Button>
        </Tip>
      </RightSidebarSectionHeader>
      <div className="px-2.5 py-1.5 border-b border-aro-line-soft bg-aro-well/30">
        <div className="flex items-center gap-1.5 rounded-md border border-aro-line/50 bg-aro-well px-2 py-1 text-aro-ink-4 focus-within:border-aro-iris focus-within:text-aro-ink">
          <IconSearch size={11} className="shrink-0" />
          <input
            type="text"
            placeholder="Filter files in workspace…"
            value={fileFilter}
            onChange={e => setFileFilter(e.target.value)}
            className="w-full bg-transparent text-[11px] text-aro-ink outline-none placeholder:text-aro-ink-4"
          />
          {fileFilter && (
            <button type="button" onClick={() => setFileFilter('')} className="hover:text-aro-ink">
              <IconX size={10} />
            </button>
          )}
        </div>
      </div>
      <FileTreeBody
        collapseNonce={collapseNonce}
        cwd={cwd}
        data={filteredTreeData}
        error={error}
        loading={loading}
        onActivateFile={onActivateFile}
        onActivateFolder={onActivateFolder}
        onLoadChildren={onLoadChildren}
        onNodeOpenChange={onNodeOpenChange}
        onPreviewFile={onPreviewFile}
        onRetry={onRefresh}
        openState={openState}
      />
    </div>
  )
}

export function RightSidebarSectionHeader({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('group/project-header flex h-7 shrink-0 items-center px-2.5', className)} {...props}>
      {children}
    </div>
  )
}

interface FileTreeBodyProps {
  collapseNonce: number
  cwd: string
  data: ReturnType<typeof useProjectTree>['data']
  error: string | null
  loading: boolean
  onActivateFile: (path: string) => void
  onActivateFolder: (path: string) => void
  onLoadChildren: (id: string) => void | Promise<void>
  onNodeOpenChange: (id: string, open: boolean) => void
  onPreviewFile?: (path: string) => void
  /** Force-reload the root. The hook also auto-retries while errored, so this
   *  is the impatient-user path. */
  onRetry?: () => void
  openState: ReturnType<typeof useProjectTree>['openState']
}

function FileTreeBody({
  collapseNonce,
  cwd,
  data,
  error,
  loading,
  onActivateFile,
  onActivateFolder,
  onLoadChildren,
  onNodeOpenChange,
  onPreviewFile,
  onRetry,
  openState
}: FileTreeBodyProps) {
  const { t } = useI18n()
  const r = t.rightSidebar
  // Stay blank for a beat, then skeleton — so a fast project switch doesn't
  // flash a jarring loading state.
  const showSkeleton = useDelayedTrue(loading && data.length === 0)

  if (!cwd) {
    return <EmptyState body={r.noProjectBody} title={r.noProjectTitle} />
  }

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <EmptyState body={r.unreadableBody(error)} title={r.unreadableTitle} />
        {onRetry && (
          <button
            className="text-[0.68rem] font-medium text-muted-foreground transition hover:text-foreground"
            onClick={onRetry}
            type="button"
          >
            {r.tryAgain}
          </button>
        )}
      </div>
    )
  }

  if (loading && data.length === 0) {
    return showSkeleton ? <FileTreeLoadingState /> : <div className="min-h-0 flex-1" />
  }

  if (data.length === 0) {
    return <EmptyState body={r.emptyBody} title={r.emptyTitle} />
  }

  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <EmptyState body={r.treeErrorBody} title={r.treeErrorTitle} />
          <button
            className="text-[0.68rem] font-medium text-muted-foreground transition hover:text-foreground"
            onClick={reset}
            type="button"
          >
            {r.tryAgain}
          </button>
        </div>
      )}
      key={cwd}
      label="file-tree"
    >
      <ProjectTree
        collapseNonce={collapseNonce}
        cwd={cwd}
        data={data}
        onActivateFile={onActivateFile}
        onActivateFolder={onActivateFolder}
        onLoadChildren={onLoadChildren}
        onNodeOpenChange={onNodeOpenChange}
        onPreviewFile={onPreviewFile}
        openState={openState}
      />
    </ErrorBoundary>
  )
}

function FileTreeLoadingState() {
  const { t } = useI18n()

  return (
    <div aria-label={t.rightSidebar.loadingTree} className="min-h-0 flex-1" role="status">
      <TreeSkeleton />
    </div>
  )
}

// Terse pane empty state ("No files" / "No diffs"): the panel label itself —
// same uppercase/tracking + dither dot — just muted instead of theme-primary,
// centered. Shared by the file tree and review panes so both read identically.
export function PaneEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4">
      <SidebarPanelLabel className="pl-0 text-(--ui-text-quaternary)">{label}</SidebarPanelLabel>
    </div>
  )
}

// Richer empty/error state (title + body) for the file tree's read failures.
export function EmptyState({ body, title }: { body: string; title?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-4 text-center">
      {title && (
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-muted-foreground/75">{title}</div>
      )}
      <div className="text-[0.68rem] leading-relaxed text-muted-foreground/65">{body}</div>
    </div>
  )
}
