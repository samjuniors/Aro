import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { IconBolt, IconCheck, IconEye, IconShield, IconZap } from '@/aro/Icons'
import { Toggle } from '@/aro/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tip } from '@/components/ui/tooltip'
import type { HermesGateway } from '@/hermes'
import { cn } from '@/lib/utils'
import { setSessionYolo, setYoloEnabled } from '@/lib/yolo-session'
import { $approvalModes, type ApprovalMode, setApprovalModeForProfile } from '@/store/approval-mode'
import { notifyError } from '@/store/notifications'
import { $activeGatewayProfile } from '@/store/profile'
import { $activeSessionId, $yoloActive } from '@/store/session'
import { $sessionStates } from '@/store/session-states'

const APPROVAL_MODES = [
  {
    desc: 'Edits and runs commands. Prompts before risky actions.',
    icon: IconShield,
    id: 'smart' as ApprovalMode,
    label: 'Approve for me (Smart)',
    short: 'Approve for me',
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
    icon: IconBolt,
    id: 'off' as ApprovalMode,
    label: 'Full access (Autonomous)',
    short: 'Full access',
    tone: 'text-aro-rose',
  },
] as const

/**
 * Approval-mode pill — the prototype's `permission-control`, plus the Hermes
 * YOLO bypass surfaced as a fourth, session-scoped row (D-0015 / D-0033 / D-0039).
 *
 * The three radio rows write the profile-scoped `approvals.mode` config key
 * (domain on the backend is exactly manual|smart|off — `hermes_cli/approval_mode.py`
 * VALID_APPROVAL_MODES; the gateway rejects a fourth value with error 4002).
 * YOLO is a DIFFERENT backend switch: the `yolo` config key with session scope
 * (the TUI's Shift+Tab equivalent — `config.set {key:"yolo", session_id, value:"1"}`),
 * so it lives below the modes as its own toggle, never as a fake fourth mode.
 *
 * The read is honest per surface: this composer's session reports `yolo` in its
 * session state (mirrored from `session.info` — the backend's three-source truth:
 * env-frozen, session-scoped, or `approvals.mode === "off"`); a sessionless fresh
 * draft reads the armed flag the palette and `/yolo` share, and only while no other
 * session is active (the flag is global, not per-draft).
 */
export function ApprovalModePill({
  disabled,
  gateway,
  sessionId
}: {
  disabled?: boolean
  gateway?: HermesGateway | null
  sessionId?: null | string
}) {
  const profile = useStore($activeGatewayProfile) || 'default'
  const approvalModes = useStore($approvalModes)
  const currentMode = approvalModes[profile] ?? 'smart'
  const sessionStates = useStore($sessionStates)
  const activeSessionId = useStore($activeSessionId)
  const armedYolo = useStore($yoloActive)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [yoloPending, setYoloPending] = useState(false)

  const yoloActive = sessionId
    ? Boolean(sessionStates[sessionId]?.yolo)
    : // Fresh draft: the armed flag belongs to the next created session, but
      // only while nothing else is active — otherwise it reflects THAT
      // session, not this draft, and showing it here would be a lie.
      activeSessionId == null
      ? armedYolo
      : false

  const activeMeta = APPROVAL_MODES.find(m => m.id === currentMode) ?? APPROVAL_MODES[0]
  const Icon = activeMeta.icon

  const handleSelect = async (mode: ApprovalMode) => {
    if (mode === currentMode || !gateway) {return}
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

  const toggleYolo = async () => {
    if (yoloPending) {return}

    // A sessionless surface cannot honestly toggle while another session is
    // active — the armed flag is global and would arm someone else's next chat.
    if (!sessionId && activeSessionId != null) {return}

    const next = !yoloActive
    setYoloPending(true)

    try {
      if (sessionId) {
        // Session-scoped write — the same wire `/yolo` and the palette use.
        if (!gateway) {return}
        await setSessionYolo((method, params) => gateway.request(method, params), sessionId, next)
      } else {
        // Fresh draft (nothing else active): arm locally; use-session-actions
        // applies the armed flag when the first message creates the session.
        await setYoloEnabled(next)
      }
    } catch (err) {
      notifyError(err, 'Failed to toggle YOLO bypass')
    } finally {
      setYoloPending(false)
    }
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <Tip label={`Approval mode: ${activeMeta.label}${yoloActive ? ' · YOLO bypass on' : ''} · click to change`}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Approval mode: ${activeMeta.label}${yoloActive ? ' (YOLO bypass on)' : ''}`}
            className={cn(
              'permission-control inline-flex h-[28px] cursor-pointer items-center gap-[5px] rounded-full border border-aro-line-soft bg-aro-well/60 px-3 text-[11.5px] font-normal shadow-sm transition-all text-aro-ink-3 hover:border-aro-line hover:bg-aro-hover hover:text-aro-ink-2',
              activeMeta.id === 'off' && 'text-aro-amber font-medium',
              disabled && 'pointer-events-none opacity-50'
            )}
            data-aro-approval-mode=""
            data-aro-yolo={yoloActive ? 'on' : undefined}
            disabled={disabled || pending}
            type="button"
          >
            <Icon className="shrink-0" size={14} />
            <span>{activeMeta.short}</span>
            {yoloActive ? <IconZap aria-hidden className="shrink-0 text-aro-rose" size={11} /> : null}
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

        <DropdownMenuSeparator className="my-1.5" />

        {/* YOLO bypass — a separate session-scoped backend switch (the `yolo`
            config key), not a fourth approvals.mode value. Grammar mirrors the
            Aro model menu's Thinking row: label + description + Switch. */}
        <div className="model-thinking-row" data-aro-yolo-row="">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-aro-line-soft bg-aro-well text-aro-rose">
            <IconZap size={12} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-aro-ink-2">
              YOLO bypass{sessionId ? '' : ' (next session)'}
            </span>
            <span className="block text-[10px] leading-tight text-aro-ink-4">
              Skip approval prompts for this session
            </span>
          </span>
          <Toggle
            aria-label="Toggle YOLO bypass"
            checked={yoloActive}
            disabled={disabled || yoloPending || (sessionId != null && !gateway) || (!sessionId && activeSessionId != null)}
            onChange={() => void toggleYolo()}
            size="sm"
          />
        </div>

        {/* Hardline floor — the backend's actual safety contract
            (tools/approval.py `_floor_block` runs BEFORE the yolo bypass:
            catastrophic commands, interpreter self-delete, sudo-stdin, and the
            user's approvals.deny rules are never bypassable). */}
        <p className="mt-1 border-t border-aro-line-soft px-2 pt-2 pb-1 text-[10px] leading-relaxed text-aro-ink-4">
          Hardline deny rules and your deny list always apply — even with YOLO on.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
