import { useStore } from '@nanostores/react'

import { $preferredIde, adapters, EDITOR_CATALOG, type SupportedIde } from '@/adapters'
import { Codicon } from '@/components/ui/codicon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tip } from '@/components/ui/tooltip'
import { notify } from '@/store/notifications'
import { $currentCwd } from '@/store/session'

export type { SupportedIde }

/** Presentation-only codicon per editor (component chrome, not adapter data). */
const IDE_CODICON: Record<SupportedIde, string> = {
  cursor: 'code',
  vscode: 'vscode',
  windsurf: 'window',
  zed: 'edit'
}

export function ExternalIdeControl({ compact = false }: { compact?: boolean }) {
  const currentCwd = useStore($currentCwd)
  const preferredIde = useStore($preferredIde)

  const currentIde = EDITOR_CATALOG.find(i => i.id === preferredIde) || EDITOR_CATALOG[0]
  // Only the REAL session cwd — no fallback path. Without an attached
  // folder there is nothing to open, and the control says so honestly.
  const projectPath = currentCwd?.trim() || null

  const openInIde = (ideId: SupportedIde) => {
    if (!projectPath) {return}

    // The editors adapter owns the catalog, the persisted preference, and
    // the OS protocol launch (behavior identical to the previous inline
    // implementation — same key, same schemes).
    adapters.editors.open(projectPath, ideId)
  }

  const copyPath = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && projectPath) {
      void navigator.clipboard.writeText(projectPath)
      notify({ kind: 'info', message: 'Project path copied to clipboard' })
    }
  }

  const disabled = !projectPath

  return (
    <div className="inline-flex h-[20px] items-center rounded-[5px] border border-(--ui-border) bg-(--ui-bg-muted)/60 text-[10.5px] transition-colors hover:border-(--ui-border-active)">
      <Tip label={disabled ? 'No project folder attached' : `Open in ${currentIde.name}`} placement="control">
        <button
          aria-label={disabled ? 'No project folder attached' : `Open project in ${currentIde.name}`}
          className="group inline-flex h-full cursor-pointer items-center gap-1 rounded-l-[4px] px-1.5 font-medium text-(--ui-text-secondary) transition-colors hover:bg-(--ui-control-hover-background) hover:text-foreground active:scale-[0.98] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={disabled}
          onClick={() => openInIde(preferredIde)}
          type="button"
        >
          <Codicon className="size-3 text-aro-iris-soft" name={IDE_CODICON[currentIde.id]} />
          <span className={compact ? 'sr-only' : undefined}>{currentIde.name}</span>
        </button>
      </Tip>

      <span aria-hidden="true" className="h-2.5 w-px bg-(--ui-border) shrink-0" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Switch external IDE"
            className="flex h-full cursor-pointer items-center justify-center rounded-r-[4px] px-1 text-(--ui-text-quaternary) transition-colors hover:bg-(--ui-control-hover-background) hover:text-foreground"
            type="button"
          >
            <Codicon className="size-2.5" name="chevron-down" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44" side="top">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-(--ui-text-quaternary)">
            Connected IDEs
          </DropdownMenuLabel>
          {EDITOR_CATALOG.map(ide => (
            <DropdownMenuItem
              className="flex items-center justify-between text-xs cursor-pointer"
              key={ide.id}
              onClick={() => openInIde(ide.id)}
            >
              <span className="flex items-center gap-2">
                <Codicon className="size-3 text-aro-iris-soft" name={IDE_CODICON[ide.id]} />
                <span>{ide.name}</span>
              </span>
              {ide.id === preferredIde && <Codicon className="size-3 text-aro-mint" name="check" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center gap-2 text-xs cursor-pointer" onClick={copyPath}>
            <Codicon className="size-3 text-(--ui-text-tertiary)" name="copy" />
            <span>Copy project path</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
