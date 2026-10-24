/**
 * ARO ONE-CLICK IDE DEEP LINK & EDITOR HANDOFF (Phase 13, Slice 5)
 *
 * Feature flag: $aroFeatures.editorDeepLink
 * Preferences: adapters.editors ($preferredIde)
 *
 * Connects diff hunks, review cards, and statusbars to external IDEs
 * (Cursor, VS Code, Windsurf, Zed, JetBrains) with exact file and line coordinates.
 */

import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { $preferredIde, adapters, type SupportedIde } from '@/adapters'
import { cn } from '@/lib/utils'
import { notify } from '@/store/notifications'
import { $currentCwd } from '@/store/session'

import { $aroFeatures } from './flags'
import { IconCheck, IconCopy, IdeMark } from './Icons'
import { Button, Tip } from './ui'

export type ExtendedIde = SupportedIde | 'jetbrains'

export const EXTENDED_IDE_CATALOG: { id: ExtendedIde; name: string; mark: string }[] = [
  { id: 'cursor', name: 'Cursor', mark: 'cursor' },
  { id: 'vscode', name: 'VS Code', mark: 'vscode' },
  { id: 'windsurf', name: 'Windsurf', mark: 'windsurf' },
  { id: 'zed', name: 'Zed', mark: 'zed' },
  { id: 'jetbrains', name: 'JetBrains', mark: 'jetbrains' },
]

/** Parse starting line number from a unified diff hunk header (e.g., '@@ -12,4 +18,6 @@' -> 18). */
export function parseHunkLine(header: string): number | undefined {
  const match = /\+([0-9]+)/.exec(header)

  if (!match) {
    return undefined
  }

  const num = parseInt(match[1], 10)

  return isNaN(num) ? undefined : num
}

/** Construct an IDE deep-link URL targeting exact file path and optional line coordinate. */
export function buildIdeDeepLink(
  filePath: string,
  line?: number,
  ide: ExtendedIde = 'cursor',
  cwd?: string,
): string {
  let resolved = filePath.trim().replace(/\\/g, '/')

  // Resolve relative file paths against session cwd if present
  if (cwd && !resolved.startsWith('/') && !resolved.match(/^[a-zA-Z]:\//)) {
    const cleanCwd = cwd.trim().replace(/\\/g, '/').replace(/\/$/, '')
    resolved = `${cleanCwd}/${resolved.replace(/^\.?\//, '')}`
  }

  if (ide === 'jetbrains') {
    return line !== undefined && line > 0
      ? `idea://open?file=${encodeURI(resolved)}&line=${line}`
      : `idea://open?file=${encodeURI(resolved)}`
  }

  const scheme =
    ide === 'vscode'
      ? 'vscode://file'
      : ide === 'windsurf'
        ? 'windsurf://file'
        : ide === 'zed'
          ? 'zed://file'
          : 'cursor://file'

  return line !== undefined && line > 0
    ? `${scheme}/${encodeURI(resolved)}:${line}`
    : `${scheme}/${encodeURI(resolved)}`
}

/** Trigger OS deep-link launch into chosen external IDE. */
export function openIdeDeepLink({
  filePath,
  line,
  ide,
  cwd,
  onNotify,
}: {
  filePath: string
  line?: number
  ide?: ExtendedIde
  cwd?: string
  onNotify?: (msg: string) => void
}): boolean {
  if (!filePath.trim()) {
    return false
  }

  const targetIde = ide ?? ($preferredIde.get() as ExtendedIde)
  const ideName = EXTENDED_IDE_CATALOG.find((e) => e.id === targetIde)?.name ?? 'IDE'
  const url = buildIdeDeepLink(filePath, line, targetIde, cwd)

  const lineSuffix = line !== undefined ? ` at line ${line}` : ''
  const displayMsg = `Opening in ${ideName}${lineSuffix}…`

  try {
    if (typeof window !== 'undefined' && window.hermesDesktop?.openExternal) {
      void window.hermesDesktop.openExternal(url)
    } else if (typeof window !== 'undefined') {
      window.open(url, '_self')
    }

    if (onNotify) {
      onNotify(displayMsg)
    } else {
      notify({ kind: 'info', message: displayMsg })
    }

    return true
  } catch {
    const fallbackMsg = `Launched ${ideName} protocol: ${url}`

    if (onNotify) {
      onNotify(fallbackMsg)
    } else {
      notify({ kind: 'info', message: fallbackMsg })
    }

    return false
  }
}

export interface AroIdeHandoffButtonProps {
  filePath: string
  line?: number
  ide?: ExtendedIde
  label?: string
  size?: 'xs' | 'sm' | 'md'
  variant?: 'ghost' | 'outline' | 'primary'
  forceEnabled?: boolean
  onOpen?: (url: string) => void
  className?: string
}

/** Button to jump into external IDE with exact file and line coordinates. */
export function AroIdeHandoffButton({
  filePath,
  line,
  ide,
  label,
  size = 'xs',
  variant = 'ghost',
  forceEnabled,
  onOpen,
  className,
}: AroIdeHandoffButtonProps) {
  const features = useStore($aroFeatures)
  const preferred = useStore($preferredIde)
  const currentCwd = useStore($currentCwd)

  const enabled = forceEnabled ?? features.editorDeepLink

  if (!enabled || !filePath) {
    return null
  }

  const activeIde = ide ?? (preferred as ExtendedIde)
  const ideMeta = EXTENDED_IDE_CATALOG.find((e) => e.id === activeIde) ?? EXTENDED_IDE_CATALOG[0]
  const deepLink = buildIdeDeepLink(filePath, line, activeIde, currentCwd ?? undefined)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openIdeDeepLink({
      filePath,
      line,
      ide: activeIde,
      cwd: currentCwd ?? undefined,
    })
    onOpen?.(deepLink)
  }

  const displayLabel = label ?? `Open in ${ideMeta.name}`

  return (
    <Tip label={`Deep-link to ${filePath}${line !== undefined ? `:${line}` : ''} in ${ideMeta.name}`}>
      <Button
        aria-label={displayLabel}
        className={cn('gap-1.5 font-aro-mono text-[var(--aro-text-2xs,10px)]', className)}
        onClick={handleClick}
        size={size}
        variant={variant}
      >
        <IdeMark kind={ideMeta.mark} size={13} />
        <span>{displayLabel}</span>
      </Button>
    </Tip>
  )
}

export interface AroIdeSelectorProps {
  forceEnabled?: boolean
  onSelect?: (ide: ExtendedIde) => void
  className?: string
}

/** Segmented/toggle control to switch preferred editor. */
export function AroIdeSelector({ forceEnabled, onSelect, className }: AroIdeSelectorProps) {
  const features = useStore($aroFeatures)
  const preferred = useStore($preferredIde)
  const enabled = forceEnabled ?? features.editorDeepLink

  if (!enabled) {
    return null
  }

  return (
    <div
      aria-label="Select preferred IDE"
      className={cn('inline-flex items-center gap-1 rounded-control border border-aro-line-soft bg-aro-sunken p-0.5', className)}
      role="radiogroup"
    >
      {EXTENDED_IDE_CATALOG.map((item) => {
        const isSelected = item.id === preferred

        return (
          <button
            aria-checked={isSelected}
            aria-label={item.name}
            className={cn(
              'flex items-center gap-1.5 rounded-control px-2 py-1 font-aro-mono text-xs transition-colors',
              isSelected
                ? 'bg-aro-raise font-medium text-aro-ink shadow-aro-e1 border border-aro-line'
                : 'text-aro-ink-3 hover:text-aro-ink hover:bg-aro-hover/60',
            )}
            key={item.id}
            onClick={() => {
              if (item.id !== 'jetbrains') {
                adapters.editors.setPreferred(item.id)
              }

              onSelect?.(item.id)
            }}
            role="radio"
            type="button"
          >
            <IdeMark kind={item.mark} size={14} />
            <span>{item.name}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Showcase and interactive tester panel for IDE deep-linking in Design System & Settings. */
export function AroIdeHandoffPanel({
  forceEnabled,
  defaultPath = 'apps/desktop/src/aro/ReviewHunks.tsx',
  defaultLine = 326,
}: {
  forceEnabled?: boolean
  defaultPath?: string
  defaultLine?: number
}) {
  const preferred = useStore($preferredIde)
  const [testPath, setTestPath] = useState(defaultPath)
  const [testLine, setTestLine] = useState<number | undefined>(defaultLine)
  const [copied, setCopied] = useState(false)

  const activeLink = buildIdeDeepLink(testPath, testLine, preferred as ExtendedIde)

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(activeLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="space-y-3 rounded-panel border border-aro-line-soft bg-aro-raise/40 p-4 font-aro-sans text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-aro-ink">Active Editor Handoff</span>
          <p className="text-aro-xs text-aro-ink-3">
            One-click jumps to exact file and line coordinates in your preferred IDE.
          </p>
        </div>
        <AroIdeSelector forceEnabled={forceEnabled} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-control border border-aro-line-soft bg-aro-sunken p-2">
        <input
          aria-label="Target file path"
          className="h-[26px] min-w-[200px] flex-1 rounded-control border border-aro-line-soft bg-aro-bg px-2 font-aro-mono text-xs text-aro-ink outline-none"
          onChange={(e) => setTestPath(e.target.value)}
          placeholder="Path to file"
          type="text"
          value={testPath}
        />
        <input
          aria-label="Target line number"
          className="h-[26px] w-20 rounded-control border border-aro-line-soft bg-aro-bg px-2 font-aro-mono text-xs text-aro-ink outline-none"
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            setTestLine(isNaN(val) ? undefined : val)
          }}
          placeholder="Line"
          type="number"
          value={testLine ?? ''}
        />
        <Button
          aria-label={copied ? 'Copied Deep Link' : 'Copy Deep Link'}
          icon={copied ? IconCheck : IconCopy}
          onClick={handleCopyLink}
          size="xs"
          variant="outline"
        >
          {copied ? 'Copied Link' : 'Copy Link'}
        </Button>
        <AroIdeHandoffButton
          filePath={testPath}
          forceEnabled={forceEnabled}
          label="Launch IDE"
          line={testLine}
          size="xs"
          variant="primary"
        />
      </div>

      <div className="flex items-center gap-2 truncate font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-3">
        <span className="shrink-0 text-aro-iris-soft">Generated Link:</span>
        <span className="truncate text-aro-ink-2 select-all">{activeLink}</span>
      </div>
    </div>
  )
}

export default AroIdeHandoffButton
