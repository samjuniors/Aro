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
import { notify } from '@/store/notifications'
import { $currentCwd } from '@/store/session'

export type SupportedIde = 'cursor' | 'vscode' | 'windsurf' | 'zed'

export const IDE_CATALOG: { id: SupportedIde; name: string; scheme: string; codicon: string }[] = [
  { id: 'cursor', name: 'Cursor', scheme: 'cursor://file', codicon: 'code' },
  { id: 'vscode', name: 'VS Code', scheme: 'vscode://file', codicon: 'vscode' },
  { id: 'windsurf', name: 'Windsurf', scheme: 'windsurf://file', codicon: 'window' },
  { id: 'zed', name: 'Zed', scheme: 'zed://file', codicon: 'edit' }
]

export function ExternalIdeControl({ compact = false }: { compact?: boolean }) {
  const currentCwd = useStore($currentCwd)
  const [preferredIde, setPreferredIde] = useState<SupportedIde>(() => {
    try {
      return (localStorage.getItem('aro.preferredIde') as SupportedIde) || 'cursor'
    } catch {
      return 'cursor'
    }
  })

  const currentIde = IDE_CATALOG.find(i => i.id === preferredIde) || IDE_CATALOG[0]
  const projectPath = currentCwd || 'E:/Projects/SamjuniorsProducts/Aro'

  const openInIde = (ideId: SupportedIde) => {
    const ide = IDE_CATALOG.find(i => i.id === ideId)
    if (!ide) return

    setPreferredIde(ideId)
    try {
      localStorage.setItem('aro.preferredIde', ideId)
    } catch {}

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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(projectPath)
      notify({ kind: 'info', message: 'Project path copied to clipboard' })
    }
  }

  return (
    <div className="inline-flex h-[20px] items-center rounded-[5px] border border-(--ui-border) bg-(--ui-bg-muted)/60 text-[10.5px] transition-colors hover:border-(--ui-border-active)">
      <Tip label={`Open in ${currentIde.name}`} placement="control">
        <button
          type="button"
          onClick={() => openInIde(preferredIde)}
          className="group inline-flex h-full cursor-pointer items-center gap-1 rounded-l-[4px] px-1.5 font-medium text-(--ui-text-secondary) transition-colors hover:bg-(--ui-control-hover-background) hover:text-foreground active:scale-[0.98]"
          aria-label={`Open project in ${currentIde.name}`}
        >
          <Codicon name={currentIde.codicon} className="size-3 text-aro-iris-soft" />
          <span>{currentIde.name}</span>
        </button>
      </Tip>

      <span className="h-2.5 w-px bg-(--ui-border) shrink-0" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-full cursor-pointer items-center justify-center rounded-r-[4px] px-1 text-(--ui-text-quaternary) transition-colors hover:bg-(--ui-control-hover-background) hover:text-foreground"
            aria-label="Switch external IDE"
          >
            <Codicon name="chevron-down" className="size-2.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44" side="top">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-(--ui-text-quaternary)">
            Connected IDEs
          </DropdownMenuLabel>
          {IDE_CATALOG.map(ide => (
            <DropdownMenuItem
              key={ide.id}
              onClick={() => openInIde(ide.id)}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Codicon name={ide.codicon} className="size-3 text-aro-iris-soft" />
                <span>{ide.name}</span>
              </span>
              {ide.id === preferredIde && <Codicon name="check" className="size-3 text-aro-mint" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyPath} className="flex items-center gap-2 text-xs cursor-pointer">
            <Codicon name="copy" className="size-3 text-(--ui-text-tertiary)" />
            <span>Copy project path</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
