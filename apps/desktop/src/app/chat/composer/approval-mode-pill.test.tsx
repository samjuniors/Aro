import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HermesGateway } from '@/hermes'
import { createClientSessionState } from '@/lib/chat-runtime'
import { $approvalModes } from '@/store/approval-mode'
import { $activeSessionId, $yoloActive } from '@/store/session'
import { $sessionStates } from '@/store/session-states'
import { stubMenuDomApis, stubResizeObserver } from '@/test/jsdom'

import { ApprovalModePill } from './approval-mode-pill'

beforeAll(() => {
  stubResizeObserver()
  stubMenuDomApis()
})

beforeEach(() => {
  $activeSessionId.set(null)
  $yoloActive.set(false)
  $sessionStates.set({})
})

afterEach(() => {
  cleanup()
  $approvalModes.set({})
  $activeSessionId.set(null)
  $yoloActive.set(false)
  $sessionStates.set({})
})

/** Minimal gateway double: records config.set writes, answers them. */
function gatewayDouble(result: (method: string, params?: Record<string, unknown>) => unknown): HermesGateway {
  return {
    request: vi.fn(async (method: string, params?: Record<string, unknown>) => result(method, params))
  } as unknown as HermesGateway
}

function openMenu() {
  // Radix dropdown opens on pointerdown (the host statusbar test uses the
  // same gesture).
  fireEvent.pointerDown(screen.getByRole('button', { name: /approval mode/i }), { button: 0 })
}

describe('ApprovalModePill', () => {
  it('round-trips a mode selection through config.set {approvals.mode} scoped to the profile', async () => {
    $approvalModes.set({ default: 'smart' })
    const gateway = gatewayDouble((method, params) => ({ value: params?.value ?? 'smart' }))
    render(<ApprovalModePill gateway={gateway} sessionId="s1" />)

    openMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /ask first/i }))

    await waitFor(() => {
      expect(gateway.request).toHaveBeenCalledWith('config.set', {
        key: 'approvals.mode',
        value: 'manual',
        profile: 'default'
      })
    })
  })

  it('toggles YOLO for the surface session through the yolo config key (session-scoped)', async () => {
    $approvalModes.set({ default: 'smart' })
    const gateway = gatewayDouble((method, params) => ({ value: params?.value }))
    render(<ApprovalModePill gateway={gateway} sessionId="s1" />)

    openMenu()
    const yoloSwitch = await screen.findByRole('switch', { name: 'Toggle YOLO bypass' })
    expect(yoloSwitch.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(yoloSwitch)

    await waitFor(() => {
      expect(gateway.request).toHaveBeenCalledWith('config.set', {
        key: 'yolo',
        session_id: 's1',
        value: '1'
      })
      expect($yoloActive.get()).toBe(true)
    })

    // The backend's `_set_yolo` emits a session.info carrying the new flag;
    // the per-session state patch is what the pill reads (utils.ts
    // sessionInfoStatePatch → applySessionInfoStatePatch). Simulate it.
    $sessionStates.set({ s1: { ...createClientSessionState(null), yolo: true } })
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Toggle YOLO bypass' }).getAttribute('aria-checked')).toBe('true')
    })

    // And back off.
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle YOLO bypass' }))
    await waitFor(() => {
      expect(gateway.request).toHaveBeenCalledWith('config.set', {
        key: 'yolo',
        session_id: 's1',
        value: '0'
      })
      expect($yoloActive.get()).toBe(false)
    })
  })

  it('reads YOLO from the surface session state, not the global active-session flag', async () => {
    $approvalModes.set({ default: 'smart' })
    // Another session is active and has yolo on…
    $activeSessionId.set('other')
    $yoloActive.set(true)
    // …but THIS surface's session reports yolo off — the pill must not lie.
    $sessionStates.set({ s1: { ...createClientSessionState(null), yolo: false } })

    render(<ApprovalModePill gateway={null} sessionId="s1" />)

    const trigger = screen.getByRole('button', { name: /approval mode/i })
    expect(trigger.getAttribute('data-aro-yolo')).toBeNull()
    expect(trigger.getAttribute('aria-label')).not.toContain('YOLO')

    // Flip the session's own state on → the trigger reflects it.
    $sessionStates.set({ s1: { ...createClientSessionState(null), yolo: true } })
    await waitFor(() => {
      expect(trigger.getAttribute('data-aro-yolo')).toBe('on')
      expect(trigger.getAttribute('aria-label')).toContain('YOLO bypass on')
    })
  })

  it('arms YOLO locally on a sessionless fresh draft (applied when the session is created)', async () => {
    $approvalModes.set({ default: 'smart' })
    const gateway = gatewayDouble(() => ({ value: '1' }))
    render(<ApprovalModePill gateway={gateway} sessionId={null} />)

    openMenu()
    fireEvent.click(await screen.findByRole('switch', { name: 'Toggle YOLO bypass' }))

    await waitFor(() => {
      expect($yoloActive.get()).toBe(true)
    })
    // Arming is renderer-local: no config.write happened.
    expect(gateway.request).not.toHaveBeenCalled()
  })

  it('disables the YOLO toggle on a sessionless surface while another session is active', async () => {
    $approvalModes.set({ default: 'smart' })
    $activeSessionId.set('other')
    render(<ApprovalModePill gateway={null} sessionId={null} />)

    openMenu()
    const yoloSwitch = await screen.findByRole('switch', { name: 'Toggle YOLO bypass' })
    expect(yoloSwitch.getAttribute('disabled')).not.toBeNull()
    expect($yoloActive.get()).toBe(false)
  })

  it('states the hardline floor the backend actually enforces', async () => {
    $approvalModes.set({ default: 'smart' })
    render(<ApprovalModePill gateway={null} sessionId="s1" />)

    openMenu()
    expect(
      await screen.findByText(/hardline deny rules and your deny list always apply/i)
    ).toBeTruthy()
  })
})
