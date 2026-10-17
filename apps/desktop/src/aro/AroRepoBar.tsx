import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'

import { IconBranch, IconCheck, IconChevronDown, IconGit, IconPlus, IconSearch, IconSettings } from '@/aro/Icons'
import {
  $aroDraftProjectId,
  $aroSessionProjectMap,
  resolveAroDraftProjectId,
  resolveAroSessionProjectId
} from '@/aro/project-session-map'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { HermesGitBranch } from '@/global'
import { cn } from '@/lib/utils'
import { openWorktreeDialog, refreshRepoStatus, registerRepoStatusCwd, repoStatusForCwd } from '@/store/coding-status'
import { notify, notifyError } from '@/store/notifications'
import { $projectScope } from '@/store/project-scope'
import {
  $projectOwnerBySessionId,
  $projects,
  $projectTree,
  listRepoBranches,
  projectRootCwd,
  switchBranchInRepo
} from '@/store/projects'
import { $pullRequestsByBranch, branchPrKey, refreshPullRequests } from '@/store/pull-requests'
import { $sessions } from '@/store/session'

function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

export function AroRepoBar({
  cwd,
  sessionId,
  onOpenDiff,
  onOpenSettings
}: {
  cwd?: string | null
  sessionId?: string | null
  onOpenDiff?: () => void
  onOpenSettings?: () => void
}) {
  const projects = useStore($projectTree)
  const explicitProjects = useStore($projects)
  const projectScope = useStore($projectScope)
  const aroSessionProjectMap = useStore($aroSessionProjectMap)
  const aroDraftProjectId = useStore($aroDraftProjectId)
  const sessions = useStore($sessions)
  const projectOwners = useStore($projectOwnerBySessionId)

  const session = sessionId ? sessions.find(item => item.id === sessionId) : null

  const currentProjectId = session
    ? session.id.startsWith('draft_')
      ? aroSessionProjectMap[session.id] || resolveAroDraftProjectId(aroDraftProjectId, projectScope)
      : resolveAroSessionProjectId(session, explicitProjects, projectOwners, aroSessionProjectMap)
    : sessionId
      ? aroSessionProjectMap[sessionId] ||
        (sessionId.startsWith('draft_') ? resolveAroDraftProjectId(aroDraftProjectId, projectScope) : null)
      : resolveAroDraftProjectId(aroDraftProjectId, projectScope)

  const currentProject = currentProjectId ? explicitProjects.find(p => p.id === currentProjectId && !p.archived) : null

  const currentRoot = currentProject
    ? currentProject.primary_path ||
      currentProject.folders?.[0]?.path ||
      projectRootCwd(projects.find(item => item.id === currentProjectId))
    : ''

  const folderName = currentRoot
    .replace(/[/\\]+$/, '')
    .split(/[/\\]/)
    .pop()

  const repoName = currentProject?.name || folderName || 'Repository'
  const isDemo = Boolean(currentProject?.id?.includes('demo') || repoName.toLowerCase().includes('demo'))

  // Live status
  const $status = repoStatusForCwd(currentRoot)
  const status = useStore($status)

  useEffect(() => {
    if (!currentRoot) {
      return
    }

    const unregister = registerRepoStatusCwd(currentRoot)

    return () => {
      unregister?.()
    }
  }, [currentRoot])

  const currentBranch = status?.branch || 'main'

  // Branches list
  const [branches, setBranches] = useState<HermesGitBranch[]>([])
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const [branchSearch, setBranchSearch] = useState('')
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [switching, setSwitching] = useState(false)

  const loadBranches = useCallback(async () => {
    if (!currentRoot) {
      return
    }

    try {
      const list = await listRepoBranches(currentRoot)
      setBranches(list)
    } catch {
      // ignore
    }
  }, [currentRoot])

  useEffect(() => {
    if (branchMenuOpen) {
      void loadBranches()
      setCreatingBranch(false)
      setNewBranchName('')
      setBranchSearch('')
    }
  }, [branchMenuOpen, loadBranches])

  // PR info
  const prBranch = status?.detached ? null : status?.branch || null
  useEffect(() => {
    if (currentRoot && prBranch) {
      void refreshPullRequests({ [currentRoot]: [prBranch] })
    }
  }, [currentRoot, prBranch])

  const pr = useStore($pullRequestsByBranch)[currentRoot && prBranch ? branchPrKey(currentRoot, prBranch) : '']

  const handleSwitch = async (targetBranch: string) => {
    if (!currentRoot || targetBranch === currentBranch) {
      setBranchMenuOpen(false)

      return
    }

    setSwitching(true)

    try {
      await switchBranchInRepo(currentRoot, targetBranch)
      void refreshRepoStatus(currentRoot)
      notify({ kind: 'info', message: `Switched to branch '${targetBranch}'` })
      setBranchMenuOpen(false)
    } catch (err) {
      notifyError(err, `Could not switch to branch '${targetBranch}'`)
    } finally {
      setSwitching(false)
    }
  }

  const handleCreateBranch = async (targetBranch: string) => {
    if (!currentRoot || !targetBranch.trim()) {
      return
    }

    const branchToCreate = targetBranch.trim()
    setSwitching(true)

    try {
      await switchBranchInRepo(currentRoot, branchToCreate, true)
      void refreshRepoStatus(currentRoot)
      notify({ kind: 'info', message: `Created and switched to branch '${branchToCreate}'` })
      setCreatingBranch(false)
      setNewBranchName('')
      setBranchMenuOpen(false)
      void loadBranches()
    } catch (err) {
      notifyError(err, `Could not create branch '${branchToCreate}'`)
    } finally {
      setSwitching(false)
    }
  }

  const filteredBranches = branches.filter(
    b => !branchSearch.trim() || b.name.toLowerCase().includes(branchSearch.toLowerCase())
  )

  const adds = status?.added ?? 0
  const dels = status?.removed ?? 0
  const hasChanges = adds > 0 || dels > 0 || (status?.changed ?? 0) > 0

  if (!currentProject || !currentRoot) {
    return null
  }

  return (
    <div className="repo-dock" data-aro-repo-bar="" data-demo={isDemo ? 'true' : undefined}>
      {/* Repo / Project Name button */}
      <button aria-label="Open changes panel" className="repo-dock-repo" onClick={onOpenDiff} type="button">
        <IconGit className="repo-dock-repo-icon" size={13} />
        <span className="repo-dock-repo-name">{repoName}</span>
        {isDemo && <span className="repo-dock-demo">DEMO</span>}
      </button>

      <span className="repo-dock-sep" />

      {/* Branch Dropdown */}
      <DropdownMenu onOpenChange={setBranchMenuOpen} open={branchMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Branch: ${currentBranch} (Click to switch or create)`}
            className="repo-dock-branch"
            disabled={switching}
            type="button"
          >
            <IconBranch className="shrink-0" size={11} />
            <span className="truncate">{currentBranch}</span>
            <IconChevronDown className="shrink-0 opacity-60" size={10} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] p-1.5" side="top" sideOffset={8}>
          {creatingBranch ? (
            <div className="p-2 space-y-2">
              <div className="text-[var(--aro-text-2xs,10px)] font-semibold text-aro-ink-4 uppercase tracking-wider">Create new branch</div>
              <form
                className="space-y-2"
                onSubmit={e => {
                  e.preventDefault()
                  void handleCreateBranch(newBranchName)
                }}
              >
                <input
                  autoFocus
                  className="w-full h-[28px] rounded-control border border-aro-line bg-aro-sunken/60 px-2 font-mono text-[11.5px] text-aro-ink focus:border-aro-iris focus:outline-none"
                  onChange={e => setNewBranchName(e.target.value)}
                  placeholder="e.g. feature/my-update"
                  value={newBranchName}
                />
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    onClick={() => {
                      setCreatingBranch(false)
                      setNewBranchName('')
                    }}
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                  <Button disabled={!newBranchName.trim() || switching} size="xs" type="submit" variant="default">
                    Create branch
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="px-2 py-1 text-[var(--aro-text-2xs,10px)] font-semibold tracking-wider uppercase text-aro-ink-4">
                Branches
              </div>

              {branches.length > 5 && (
                <div className="mb-1 flex items-center gap-1.5 rounded-control border border-aro-line-soft bg-aro-sunken/40 px-2 py-1">
                  <IconSearch className="text-aro-ink-4 shrink-0" size={11} />
                  <input
                    aria-label="Filter branches"
                    className="w-full bg-transparent text-xs text-aro-ink focus:outline-none placeholder:text-aro-ink-4"
                    onChange={e => setBranchSearch(e.target.value)}
                    placeholder="Filter branches…"
                    value={branchSearch}
                  />
                </div>
              )}

              <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                {filteredBranches.length === 0 && branches.length > 0 ? (
                  <div className="px-2 py-2 text-center text-xs text-aro-ink-4">No matching branches</div>
                ) : filteredBranches.length === 0 ? (
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[11.5px] font-mono bg-aro-hover text-aro-ink"
                    disabled
                  >
                    <IconBranch className="shrink-0 text-aro-iris-soft" size={12} />
                    <span className="flex-1 truncate">{currentBranch}</span>
                    <IconCheck className="shrink-0 text-aro-mint" size={12} />
                  </DropdownMenuItem>
                ) : (
                  filteredBranches.map(b => {
                    const isActive = b.name === currentBranch

                    return (
                      <DropdownMenuItem
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[11.5px] font-mono transition-colors',
                          isActive ? 'bg-aro-hover text-aro-ink font-medium' : 'hover:bg-aro-hover/60 text-aro-ink-2'
                        )}
                        key={b.name}
                        onClick={() => void handleSwitch(b.name)}
                      >
                        <IconBranch className="shrink-0 text-aro-ink-3" size={12} />
                        <span className="flex-1 truncate">{b.name}</span>
                        {isActive && <IconCheck className="shrink-0 text-aro-mint" size={12} />}
                      </DropdownMenuItem>
                    )
                  })
                )}
              </div>

              <DropdownMenuSeparator className="my-1 bg-aro-line-soft" />

              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[11.5px] text-aro-iris-soft transition-colors hover:bg-aro-hover hover:text-aro-iris"
                onClick={e => {
                  e.preventDefault()
                  setCreatingBranch(true)
                }}
              >
                <IconPlus className="shrink-0" size={11} />
                <span>Create new branch…</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-xs text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
                onClick={() => {
                  setBranchMenuOpen(false)

                  if (currentRoot) {
                    void openWorktreeDialog({ repoPath: currentRoot })
                  }
                }}
              >
                <IconGit className="shrink-0" size={11} />
                <span>Branch off into worktree…</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Changes Diff Counts */}
      <button
        aria-label={hasChanges ? 'Open changes review panel' : 'Working tree clean'}
        className={cn('repo-dock-diff', !hasChanges && 'repo-dock-diff-empty')}
        onClick={onOpenDiff}
        type="button"
      >
        {hasChanges ? (
          <>
            <span className="repo-dock-adds">+{formatCount(adds || status?.changed || 0)}</span>
            <span className="repo-dock-dels">-{formatCount(dels)}</span>
            <IconChevronDown className="-rotate-90 opacity-60" size={11} />
          </>
        ) : (
          <span className="repo-dock-clean">No changes</span>
        )}
      </button>

      {/* Right Actions: Merge PR & Settings */}
      <div className="repo-dock-right">
        {pr ? (
          <button
            aria-label={`View PR #${pr.number}: ${pr.title}`}
            className="repo-dock-merge"
            onClick={() => {
              if (pr.url) {
                window.open(pr.url, '_blank')
              } else {
                notify({ kind: 'info', message: `PR #${pr.number}: ${pr.title}` })
              }
            }}
            type="button"
          >
            <IconGit size={12} /> Merge PR #{pr.number}
          </button>
        ) : (
          <button
            aria-label="Merge PR (No open PR)"
            className="repo-dock-merge repo-dock-merge-disabled"
            onClick={() => {
              notify({ kind: 'info', message: 'No open pull request on this branch.' })
            }}
            type="button"
          >
            <IconGit size={12} /> Merge PR
          </button>
        )}
        <button aria-label="Project settings" className="repo-dock-gear" onClick={onOpenSettings} type="button">
          <IconSettings size={13} />
        </button>
      </div>
    </div>
  )
}
