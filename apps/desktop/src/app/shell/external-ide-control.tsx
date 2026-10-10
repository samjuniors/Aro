import { useStore } from '@nanostores/react'
import { useState } from 'react'

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
import { persistString, readKey } from '@/lib/storage'
import { notify } from '@/store/notifications'
import { $currentCwd } from '@/store/session'

export type SupportedIde = 'cursor' | 'vscode' | 'windsurf' | 'zed'

export const IDE_CATALOG: { id: SupportedIde; name: string; scheme: string; codicon: string }[] = [
  { id: 'cursor', name: 'Cursor', scheme: 'cursor://file', codicon: 'code' },
  { id: 'vscode', name: 'VS Code', scheme: 'vscode://file', codicon: 'vscode' },
  { id: 'windsurf', name: 'Windsurf', scheme: 'windsurf://file', codicon: 'window' },
  { id: 'zed', name: 'Zed', scheme: 'zed://file', codicon: 'edit' }
]

const PREFERRED_IDE_KEY = 'hermes.desktop.external-ide.preferred'

export function ExternalIdeControl({ compact = false }: { compact?: boolean }) {
  const currentCwd = useStore($currentCwd)

  const [preferredIde, setPreferredIde] = useState<SupportedIde>(() => {
    const stored = readKey(PREFERRED_IDE_KEY) as SupportedIde | null

    return stored || 'cursor'
  })

  const currentIde = IDE_CATALOG.find(i => i.id === preferredIde) || IDE_CATALOG[0]
  // Only the REAL session cwd — no fallback path. Without an attached
  // folder there is nothing to open, and the control says so honestly.
  const projectPath = currentCwd?.trim() || null

  const openInIde = (ideId: SupportedIde) => {
    const ide = IDE_CATALOG.find(i => i.id === ideId)

    if (!ide || !projectPath) {return}

    setPreferredIde(ideId)
    persistString(PREFERRED_IDE_KEY, ideId)

    const normalizedPath = projectPath.replace(/\\/g, '/')
    const targetUrl = `${ide.scheme}/${encodeURI(normalizedPath)}`

    try {
      window.open(targetUrl, '_self')
      notify({ kind: 'info', message: `Opening in ${ide.name}…` })
    } catch {
      notify({ kind: 'info', message: `Launched ${ide.name} protocol for ${normalizedPath}` })
    }
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
          <Codicon className="size-3 text-aro-iris-soft" name={currentIde.codicon} />
          <span>{currentIde.name}</span>
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
          {IDE_CATALOG.map(ide => (
            <DropdownMenuItem
              className="flex items-center justify-between text-xs cursor-pointer"
              key={ide.id}
              onClick={() => openInIde(ide.id)}
            >
              <span className="flex items-center gap-2">
                <Codicon className="size-3 text-aro-iris-soft" name={ide.codicon} />
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
