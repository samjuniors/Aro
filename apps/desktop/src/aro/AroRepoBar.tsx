import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'

import {
  IconBranch,
  IconCheck,
  IconChevronDown,
  IconGit,
  IconPlus,
  IconSearch,
  IconSettings
} from '@/aro/Icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  openWorktreeDialog,
  refreshRepoStatus,
  registerRepoStatusCwd,
  repoStatusForCwd
} from '@/store/coding-status'
import { $projectScope } from '@/store/project-scope'
import {
  $projectTree,
  $projects,
  listRepoBranches,
  projectIdForCwd,
  projectRootCwd,
  switchBranchInRepo
} from '@/store/projects'
import { $aroSessionProjectMap } from '@/aro/project-session-map'
import { $pullRequestsByBranch, branchPrKey, refreshPullRequests } from '@/store/pull-requests'
import { notify, notifyError } from '@/store/notifications'
import type { HermesGitBranch } from '@/global'

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

  const sessionProjectFromMap = sessionId ? aroSessionProjectMap[sessionId] : null
  const currentProjectId = sessionId ? (sessionProjectFromMap || (cwd ? projectIdForCwd(cwd) : null)) : projectScope
  const currentProject = projects.find(project => project.id === currentProjectId) || explicitProjects.find(p => p.id === currentProjectId)

  const currentRoot = (currentProject && 'label' in currentProject ? projectRootCwd(currentProject) : null)
    || (currentProject && 'primary_path' in currentProject ? currentProject.primary_path : null)
    || (currentProject && 'folders' in currentProject ? currentProject.folders?.[0]?.path : null)
    || (cwd || null)

  const folderName = currentRoot ? currentRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() : undefined
  const repoName = currentProject ? ('label' in currentProject ? currentProject.label : currentProject.name) : folderName || 'Repository'
  const isDemo = Boolean(currentProject?.id?.includes('demo') || repoName.toLowerCase().includes('demo'))

  // Live status
  const $status = repoStatusForCwd(currentRoot)
  const status = useStore($status)

  useEffect(() => {
    if (!currentRoot) return
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
    if (!currentRoot) return
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
    if (!currentRoot || !targetBranch.trim()) return
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

  const filteredBranches = branches.filter(b =>
    !branchSearch.trim() || b.name.toLowerCase().includes(branchSearch.toLowerCase())
  )

  const adds = status?.added ?? 0
  const dels = status?.removed ?? 0
  const hasChanges = adds > 0 || dels > 0 || (status?.changed ?? 0) > 0

  return (
    <div className="repo-dock" data-demo={isDemo ? 'true' : undefined} data-aro-repo-bar="">
      {/* Repo / Project Name button */}
      <button
        className="repo-dock-repo"
        onClick={onOpenDiff}
        title="Open changes panel"
        type="button"
      >
        <IconGit className="repo-dock-repo-icon" size={13} />
        <span className="repo-dock-repo-name">{repoName}</span>
        {isDemo && <span className="repo-dock-demo">DEMO</span>}
      </button>

      <span className="repo-dock-sep" />

      {/* Branch Dropdown */}
      <DropdownMenu onOpenChange={setBranchMenuOpen} open={branchMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="repo-dock-branch"
            disabled={switching}
            title={`Branch: ${currentBranch} (Click to switch or create)`}
            type="button"
          >
            <IconBranch size={11} className="shrink-0" />
            <span className="truncate">{currentBranch}</span>
            <IconChevronDown size={10} className="shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] p-1.5" side="top" sideOffset={8}>
          {creatingBranch ? (
            <div className="p-2 space-y-2">
              <div className="text-[10px] font-semibold text-aro-ink-4 uppercase tracking-wider">
                Create new branch
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  void handleCreateBranch(newBranchName)
                }}
                className="space-y-2"
              >
                <input
                  autoFocus
                  className="w-full h-[28px] rounded-[6px] border border-aro-line bg-aro-sunken/60 px-2 font-mono text-[11.5px] text-aro-ink focus:border-aro-iris focus:outline-none"
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
                  <Button
                    disabled={!newBranchName.trim() || switching}
                    size="xs"
                    type="submit"
                    variant="default"
                  >
                    Create branch
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-aro-ink-4">
                Branches
              </div>

              {branches.length > 5 && (
                <div className="mb-1 flex items-center gap-1.5 rounded-[6px] border border-aro-line-soft bg-aro-sunken/40 px-2 py-1">
                  <IconSearch size={11} className="text-aro-ink-4 shrink-0" />
                  <input
                    aria-label="Filter branches"
                    className="w-full bg-transparent text-[11px] text-aro-ink focus:outline-none placeholder:text-aro-ink-4"
                    onChange={e => setBranchSearch(e.target.value)}
                    placeholder="Filter branches…"
                    value={branchSearch}
                  />
                </div>
              )}

              <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                {filteredBranches.length === 0 && branches.length > 0 ? (
                  <div className="px-2 py-2 text-center text-[11px] text-aro-ink-4">
                    No matching branches
                  </div>
                ) : filteredBranches.length === 0 ? (
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] font-mono bg-aro-hover text-aro-ink"
                    disabled
                  >
                    <IconBranch size={12} className="shrink-0 text-aro-iris-soft" />
                    <span className="flex-1 truncate">{currentBranch}</span>
                    <IconCheck size={12} className="shrink-0 text-aro-mint" />
                  </DropdownMenuItem>
                ) : (
                  filteredBranches.map(b => {
                    const isActive = b.name === currentBranch
                    return (
                      <DropdownMenuItem
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] font-mono transition-colors',
                          isActive ? 'bg-aro-hover text-aro-ink font-medium' : 'hover:bg-aro-hover/60 text-aro-ink-2'
                        )}
                        key={b.name}
                        onClick={() => void handleSwitch(b.name)}
                      >
                        <IconBranch size={12} className="shrink-0 text-aro-ink-3" />
                        <span className="flex-1 truncate">{b.name}</span>
                        {isActive && <IconCheck size={12} className="shrink-0 text-aro-mint" />}
                      </DropdownMenuItem>
                    )
                  })
                )}
              </div>

              <DropdownMenuSeparator className="my-1 bg-aro-line-soft" />

              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] text-aro-iris-soft transition-colors hover:bg-aro-hover hover:text-aro-iris"
                onClick={e => {
                  e.preventDefault()
                  setCreatingBranch(true)
                }}
              >
                <IconPlus size={11} className="shrink-0" />
                <span>Create new branch…</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
                onClick={() => {
                  setBranchMenuOpen(false)
                  if (currentRoot) {
                    void openWorktreeDialog({ repoPath: currentRoot })
                  }
                }}
              >
                <IconGit size={11} className="shrink-0" />
                <span>Branch off into worktree…</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Changes Diff Counts */}
      <button
        className={cn('repo-dock-diff', !hasChanges && 'repo-dock-diff-empty')}
        onClick={onOpenDiff}
        title={hasChanges ? 'Open changes review panel' : 'Working tree clean'}
        type="button"
      >
        {hasChanges ? (
          <>
            <span className="repo-dock-adds">+{formatCount(adds || status?.changed || 0)}</span>
            <span className="repo-dock-dels">-{formatCount(dels)}</span>
            <IconChevronDown size={11} className="-rotate-90 opacity-60" />
          </>
        ) : (
          <span className="repo-dock-clean">No changes</span>
        )}
      </button>

      {/* Right Actions: Merge PR & Settings */}
      <div className="repo-dock-right">
        {pr ? (
          <button
            className="repo-dock-merge"
            onClick={() => {
              if (pr.url) {
                window.open(pr.url, '_blank')
              } else {
                notify({ kind: 'info', message: `PR #${pr.number}: ${pr.title}` })
              }
            }}
            title={`View PR #${pr.number}: ${pr.title}`}
            type="button"
          >
            <IconGit size={12} /> Merge PR #{pr.number}
          </button>
        ) : (
          <button
            className="repo-dock-merge repo-dock-merge-disabled"
            onClick={() => {
              notify({ kind: 'info', message: 'No open pull request on this branch.' })
            }}
            title="Merge PR (No open PR)"
            type="button"
          >
            <IconGit size={12} /> Merge PR
          </button>
        )}
        <button
          className="repo-dock-gear"
          onClick={onOpenSettings}
          title="Project & worktree settings"
          type="button"
          aria-label="Project settings"
        >
          <IconSettings size={13} />
        </button>
      </div>
    </div>
  )
}
