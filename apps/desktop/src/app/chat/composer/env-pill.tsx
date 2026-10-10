import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { IconCheck, IconChevronDown, IconGit, IconLaptop, IconPlus } from '@/aro/Icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { registerRepoStatusCwd, repoStatusForCwd, repoWorktreesForCwd } from '@/store/coding-status'

export function EnvPill({
  cwd,
  disabled,
  onBranchOff,
  onOpenWorktree
}: {
  cwd?: string | null
  disabled?: boolean
  onBranchOff?: () => void
  onOpenWorktree?: (path: string) => void
}) {
  const [open, setOpen] = useState(false)
  const $repoStatus = repoStatusForCwd(cwd)
  const repoStatus = useStore($repoStatus)
  const $worktrees = repoWorktreesForCwd(cwd)
  const worktrees = useStore($worktrees)

  useEffect(() => {
    if (!cwd) return
    const unregister = registerRepoStatusCwd(cwd)
    return () => {
      unregister?.()
    }
  }, [cwd])

  const hasGit = Boolean(repoStatus?.branch)
  const currentBranch = repoStatus?.branch || ''
  const isWorktree = Boolean(currentBranch && worktrees.length > 1 && worktrees.some(w => w.branch === currentBranch && w.path === cwd))

  const label = isWorktree ? `Worktree: ${currentBranch}` : hasGit ? `Local (${currentBranch})` : 'Local'
  const Icon = isWorktree ? IconGit : IconLaptop

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <Tip label={hasGit ? (isWorktree ? `Active worktree (${currentBranch})` : `Local repo (${currentBranch})`) : 'Environment: Local'}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Environment: ${label}`}
            className={cn(
              'inline-flex h-(--composer-control-size) cursor-pointer items-center gap-1.5 rounded-[7px] border border-aro-line-soft bg-aro-raise px-2 font-aro-mono text-[11px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink',
              isWorktree && 'text-aro-iris-soft border-aro-iris/30',
              disabled && 'pointer-events-none opacity-50'
            )}
            data-aro-env-pill=""
            disabled={disabled}
            type="button"
          >
            <Icon className="shrink-0" size={12} />
            <span className="max-w-[110px] truncate">{label}</span>
            {repoStatus?.changed && repoStatus.changed > 0 ? (
              <span className="shrink-0 rounded px-1 text-[9.5px] font-mono font-medium text-amber-500 bg-amber-500/10">
                +{repoStatus.changed}
              </span>
            ) : null}
            <IconChevronDown className="shrink-0 text-aro-ink-4 opacity-60" size={10} />
          </button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-[240px] p-1.5">
        <div className="px-2 py-1 font-aro-mono text-[10px] font-semibold tracking-wide uppercase text-aro-ink-4">
          Environment & Worktrees
        </div>

        <DropdownMenuItem
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] transition-colors',
            !isWorktree && 'bg-aro-hover text-aro-ink'
          )}
          onClick={() => {
            if (isWorktree && worktrees[0]?.path && onOpenWorktree) {
              onOpenWorktree(worktrees[0].path)
            }
          }}
        >
          <IconLaptop className="shrink-0 text-aro-ink-3" size={12} />
          <div className="min-w-0 flex-1 truncate font-aro-mono">Local working tree</div>
          {!isWorktree && <IconCheck className="shrink-0 text-aro-mint" size={12} />}
        </DropdownMenuItem>

        {worktrees.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1 bg-aro-line-soft" />
            <div className="px-2 py-0.5 font-aro-mono text-[9.5px] text-aro-ink-4">Worktrees</div>
            {worktrees.map(wt => {
              const active = wt.branch === currentBranch
              return (
                <DropdownMenuItem
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] transition-colors',
                    active && 'bg-aro-hover text-aro-ink font-medium'
                  )}
                  key={wt.path}
                  onClick={() => {
                    if (wt.path && onOpenWorktree) {
                      onOpenWorktree(wt.path)
                    }
                  }}
                >
                  <IconGit className="shrink-0 text-aro-iris-soft" size={12} />
                  <span className="min-w-0 flex-1 truncate font-aro-mono">{wt.branch || wt.path}</span>
                  {active && <IconCheck className="shrink-0 text-aro-iris" size={12} />}
                </DropdownMenuItem>
              )
            })}
          </>
        )}

        {onBranchOff && (
          <>
            <DropdownMenuSeparator className="my-1 bg-aro-line-soft" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-aro-iris-soft transition-colors hover:bg-aro-hover hover:text-aro-iris"
              onClick={onBranchOff}
            >
              <IconPlus className="shrink-0" size={11} />
              <span>Branch off into worktree…</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
