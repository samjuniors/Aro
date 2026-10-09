import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { useSessionView } from '@/app/chat/session-view'
import { ModelMenuCloseContext } from '@/app/shell/model-menu-panel'
import { IconChevronDown } from '@/aro/Icons'
import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { GlyphSpinner } from '@/components/ui/glyph-spinner'
import { releaseTypingFocus } from '@/components/ui/keyboard-first'
import { providerDisplayName } from '@/lib/model-status-label'
import { reasoningEffortLabel } from '@/lib/reasoning-effort'
import { cn } from '@/lib/utils'

import type { ChatBarState } from './types'

/**
 * The Aro model control — the prototype's `.model-control` trigger (provider
 * monogram + live model label + reasoning-effort chip) opening the Aro model
 * menu (`AroModelMenuPanel`, built by the surface that owns the gateway).
 * Every displayed value is live Hermes session state; the menu owns the
 * actions. When the gateway is closed the Aro control is not rendered — the
 * composer falls back to the plain pill pair (full picker dialog).
 */
export function AroModelControl({ disabled, model }: { disabled: boolean; model: ChatBarState['model'] }) {
  const view = useSessionView()
  // Prefer the chat-bar snapshot (already view-scoped by ChatView); fall back
  // to the live SessionView atoms so a mid-flight session.info still paints.
  const viewModel = useStore(view.$model)
  const viewProvider = useStore(view.$provider)
  const currentModel = model.model || viewModel
  const provider = model.provider || viewProvider
  const reasoningEffort = useStore(view.$reasoningEffort)
  const reasoningEffortWire = useStore(view.$reasoningEffortWire)
  const pending = useStore(view.$reasoningEffortPending)
  const [open, setOpen] = useState(false)

  const monogram = providerDisplayName(provider || '').trim().charAt(0).toUpperCase() || 'A'
  const effortLabel = reasoningEffortLabel(reasoningEffort || '', reasoningEffortWire)

  // Closing the menu ends its claim on the keyboard (same contract as the
  // model/reasoning pills): Radix would otherwise restore focus to this
  // trigger and swallow the next keystroke.
  const setMenuOpen = (next: boolean) => {
    setOpen(next)

    if (!next) {
      releaseTypingFocus()
    }
  }

  return (
    <DropdownMenu onOpenChange={setMenuOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={currentModel || 'Model'}
          className="h-[30px] shrink-0 gap-[5px] rounded-[6px] border-none bg-transparent px-[5px] text-[11.5px] font-normal whitespace-nowrap text-aro-ink-2 shadow-none hover:bg-aro-hover hover:text-aro-ink"
          data-aro-model-control=""
          data-aro-model-pill=""
          disabled={disabled}
          type="button"
          variant="ghost"
        >
          <span className="font-aro-mono text-[10px] font-semibold text-aro-ink-3">{monogram}</span>
          <span className="max-w-[130px] truncate">{currentModel || '…'}</span>
          {pending ? (
            <GlyphSpinner className="opacity-50" spinner="braille" />
          ) : effortLabel ? (
            <span className="model-effort inline-flex items-center gap-[5px] font-[550]" data-aro-reasoning-pill="" data-level={reasoningEffort}>
              <span className="model-effort-dot" />
              {effortLabel}
            </span>
          ) : null}
          <IconChevronDown
            className={cn('size-[11px] shrink-0 text-aro-ink-4 transition-transform duration-200', open && 'rotate-180')}
            size={11}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[330px] p-0" side="top" sideOffset={8}>
        <ModelMenuCloseContext.Provider value={() => setMenuOpen(false)}>
          {model.aroMenu}
        </ModelMenuCloseContext.Provider>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
