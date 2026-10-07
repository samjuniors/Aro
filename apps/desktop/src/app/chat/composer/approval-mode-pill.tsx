import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { IconBolt, IconCheck, IconChevronDown, IconEye, IconShield } from '@/aro/Icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tip } from '@/components/ui/tooltip'
import type { HermesGateway } from '@/hermes'
import { cn } from '@/lib/utils'
import { $approvalModes, setApprovalModeForProfile, type ApprovalMode } from '@/store/approval-mode'
import { notifyError } from '@/store/notifications'
import { $activeGatewayProfile } from '@/store/profile'

const APPROVAL_MODES = [
  {
    desc: 'Edits and runs commands. Prompts before risky actions.',
    icon: IconBolt,
    id: 'smart' as ApprovalMode,
    label: 'Agent (Smart)',
    short: 'Agent',
    tone: 'text-aro-cyan',
  },
  {
    desc: 'Prompts for confirmation before every tool or command.',
    icon: IconEye,
    id: 'manual' as ApprovalMode,
    label: 'Ask first (Manual)',
    short: 'Ask first',
    tone: 'text-aro-amber',
  },
  {
    desc: 'Autonomous edits and shell. Guarded by hardline deny rules.',
    icon: IconShield,
    id: 'off' as ApprovalMode,
    label: 'Autonomous (Full)',
    short: 'Full access',
    tone: 'text-aro-rose',
  },
] as const

export function ApprovalModePill({
  disabled,
  gateway
}: {
  disabled?: boolean
  gateway?: HermesGateway | null
}) {
  const profile = useStore($activeGatewayProfile) || 'default'
  const approvalModes = useStore($approvalModes)
  const currentMode = approvalModes[profile] ?? 'smart'
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const activeMeta = APPROVAL_MODES.find(m => m.id === currentMode) ?? APPROVAL_MODES[0]
  const Icon = activeMeta.icon

  const handleSelect = async (mode: ApprovalMode) => {
    if (mode === currentMode || !gateway) return
    setPending(true)
    try {
      await setApprovalModeForProfile((method, params) => gateway.request(method, params), profile, mode)
    } catch (err) {
      notifyError(err, 'Failed to update approval mode')
    } finally {
      setPending(false)
      setOpen(false)
    }
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <Tip label={`Approval mode: ${activeMeta.label} · click to change`}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Approval mode: ${activeMeta.label}`}
            className={cn(
              'inline-flex h-(--composer-control-size) cursor-pointer items-center gap-1.5 rounded-[7px] border border-aro-line-soft bg-aro-raise px-2 font-aro-mono text-[11px] font-medium transition-colors hover:bg-aro-hover hover:text-aro-ink',
              activeMeta.tone,
              disabled && 'pointer-events-none opacity-50'
            )}
            disabled={disabled || pending}
            type="button"
          >
            <Icon className="shrink-0" size={12} />
            <span>{activeMeta.short}</span>
            <IconChevronDown className="shrink-0 text-aro-ink-4 opacity-60" size={10} />
          </button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="start" className="w-[280px] p-1.5">
        <div className="px-2 py-1 font-aro-mono text-[10px] font-semibold tracking-wide uppercase text-aro-ink-4">
          Approval Mode
        </div>
        {APPROVAL_MODES.map(m => {
          const ItemIcon = m.icon
          const isSelected = m.id === currentMode
          return (
            <DropdownMenuItem
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors',
                isSelected && 'bg-aro-hover'
              )}
              key={m.id}
              onClick={() => void handleSelect(m.id)}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-aro-line-soft bg-aro-well',
                  m.tone
                )}
              >
                <ItemIcon size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-aro-ink">{m.label}</div>
                <div className="text-[10.5px] leading-snug text-aro-ink-3">{m.desc}</div>
              </div>
              {isSelected && <IconCheck className="mt-1 shrink-0 text-aro-iris" size={12} />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
