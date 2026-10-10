import { beforeEach, describe, expect, it } from 'vitest'

import { $currentCwd, $gatewayState } from '@/store/session'

import { localDoctorAdapter } from './doctor'

describe('onboarding-doctor adapter (local)', () => {
  beforeEach(() => {
    $gatewayState.set('idle')
    $currentCwd.set('')
  })

  it('reports a real gateway signal, never a fake pass', async () => {
    $gatewayState.set('open')

    const checks = await localDoctorAdapter.sweep()

    expect(checks.find(c => c.id === 'runtime')).toMatchObject({ state: 'ok' })
  })

  it('warns when the gateway is down', async () => {
    $gatewayState.set('closed')

    const checks = await localDoctorAdapter.sweep()

    expect(checks.find(c => c.id === 'runtime')).toMatchObject({ state: 'warn' })
  })

  it('keeps provider readiness unknown — the renderer cannot verify it', async () => {
    const checks = await localDoctorAdapter.sweep()

    const providers = checks.find(c => c.id === 'providers')

    expect(providers?.state).toBe('unknown')
  })

  it('checks the attached workspace folder', async () => {
    $currentCwd.set('/home/z/SamAgent')

    const checks = await localDoctorAdapter.sweep()

    expect(checks.find(c => c.id === 'workspace')).toMatchObject({ state: 'ok', detail: 'Folder attached: /home/z/SamAgent' })

    $currentCwd.set('')

    const next = await localDoctorAdapter.sweep()

    expect(next.find(c => c.id === 'workspace')).toMatchObject({ state: 'warn' })
  })
})
