import { useStore } from '@nanostores/react'
import { useCallback } from 'react'

import { IconBranch, IconGit, IconPlus } from '@/aro/Icons'
import { Badge, Button, Panel } from '@/aro/ui'
import { cn } from '@/lib/utils'
import { openWorktreeDialog, repoStatusForCwd, repoWorktreesForCwd } from '@/store/coding-status'
import { openFolderAsProject } from '@/store/projects'
import { $focusedWorkspaceCwd } from '@/store/session-states'

export function GitSection() {
  const cwd = useStore($focusedWorkspaceCwd)
  const status = useStore(repoStatusForCwd(cwd))
  const worktrees = useStore(repoWorktreesForCwd(cwd))

  const handleOpenWorktreeDialog = useCallback(() => {
    void openWorktreeDialog({ repoPath: cwd || undefined })
  }, [cwd])

  const handleSwitchWorktree = useCallback((path: string) => {
    void openFolderAsProject(path)
  }, [])

  if (!status) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl border border-aro-line-soft bg-aro-raise text-aro-ink-3 shadow-aro-e1">
          <IconGit size={18} />
        </div>
        <h3 className="mt-3 font-aro-display text-[13px] font-semibold text-aro-ink">No Git Repository</h3>
        <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-aro-ink-3">
          Open a folder containing a Git repository to view branches, worktrees, and working tree changes.
        </p>
      </div>
    )
  }

  const branchName = status.detached ? 'HEAD (detached)' : status.branch || 'HEAD'
  const dirtyCount = (status.staged ?? 0) + (status.unstaged ?? 0)
  const ahead = status.ahead ?? 0
  const behind = status.behind ?? 0

  return (
    <div className="space-y-3 p-3">
      {/* Current branch status */}
      <Panel className="p-3">
        <div className="flex items-center gap-2">
          <IconBranch size={13} className="text-aro-iris-soft" />
          <span className="truncate font-aro-mono text-[12px] font-medium text-aro-iris-soft">
            {branchName}
          </span>
          <span className="ml-auto font-aro-mono text-[10px] text-aro-ink-4">
            ↑{ahead} · ↓{behind}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-aro-ink-3">
          <span>
            {dirtyCount === 0 ? (
              <span className="text-aro-mint">Working tree clean</span>
            ) : (
              <span>
                {status.staged ?? 0} staged · {status.unstaged ?? 0} unstaged
              </span>
            )}
          </span>
          {dirtyCount > 0 && (
            <Badge mono tone="amber" className="text-[9px]">
              {dirtyCount} modified
            </Badge>
          )}
        </div>

        <div className="mt-3 flex gap-1.5">
          <Button
            size="xs"
            variant="primary"
            icon={IconPlus}
            className="flex-1"
            onClick={handleOpenWorktreeDialog}
          >
            Branch / Worktree
          </Button>
        </div>
      </Panel>

      {/* Worktrees list */}
      <Panel>
        <div className="flex items-center justify-between border-b border-aro-line-soft px-2.5 py-2">
          <span className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">
            Worktrees
          </span>
          <Badge mono tone="neutral" className="text-[9px]">
            {worktrees.length} total
          </Badge>
        </div>

        <div className="space-y-0.5 p-1">
          {worktrees.length === 0 ? (
            <div className="p-2 text-center font-aro-mono text-[10.5px] text-aro-ink-4">
              Single checkout (main worktree)
            </div>
          ) : (
            worktrees.map(wt => {
              const isCurrent = cwd && wt.path.toLowerCase() === cwd.toLowerCase()
              const wtBranch = wt.branch || wt.path.split(/[\\/]+/).pop() || wt.path

              return (
                <div
                  key={wt.path}
                  className={cn(
                    'flex items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-left text-[11px] transition-colors',
                    isCurrent ? 'bg-aro-iris-tint/60 text-aro-ink' : 'text-aro-ink-2 hover:bg-aro-hover/60'
                  )}
                >
                  <IconBranch
                    size={11}
                    className={cn('shrink-0', isCurrent ? 'text-aro-iris-soft' : 'text-aro-ink-4')}
                  />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-aro-mono font-medium">{wtBranch}</span>
                    {wt.isMain && (
                      <span className="ml-1.5 font-aro-mono text-[9px] text-aro-ink-4">(main)</span>
                    )}
                  </div>
                  {isCurrent ? (
                    <Badge mono tone="iris" className="text-[8.5px]">
                      current
                    </Badge>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px]"
                      onClick={() => handleSwitchWorktree(wt.path)}
                    >
                      Open
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Panel>
    </div>
  )
}
