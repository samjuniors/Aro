import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as systemApi from '@/api/system'
import { readKey, writeKey } from '@/lib/storage'
import { $currentCwd, $gatewayState } from '@/store/session'

import {
  AroDoctorPage,
  ONBOARDING_DONE_STORAGE_KEY,
  OnboardingStrip
} from './OnboardingDoctorView'

describe('OnboardingStrip and AroDoctorPage (OnboardingDoctorView.tsx)', () => {
  beforeEach(() => {
    writeKey(ONBOARDING_DONE_STORAGE_KEY, null)
    $gatewayState.set('open')
    $currentCwd.set('/home/user/my-project')
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('OnboardingStrip', () => {
    it('renders checklist steps reflecting current application state', () => {
      render(<OnboardingStrip />)

      expect(screen.getByTestId('onboarding-strip')).toBeDefined()
      expect(screen.getByText('Get Aro Running')).toBeDefined()
      expect(screen.getByText('Runtime')).toBeDefined()
      expect(screen.getByText('Gateway connected')).toBeDefined()
      expect(screen.getByText('Workspace')).toBeDefined()
      expect(screen.getByText('/home/user/my-project')).toBeDefined()
    })

    it('updates workspace step when no folder is attached', () => {
      $currentCwd.set('')
      render(<OnboardingStrip />)

      expect(screen.getByText('No folder attached')).toBeDefined()
      expect(screen.getByText('Open a folder')).toBeDefined()
    })

    it('dismisses the strip and persists completion flag', () => {
      const onDismiss = vi.fn()
      render(<OnboardingStrip onDismiss={onDismiss} />)

      const dismissBtn = screen.getByRole('button', { name: 'Dismiss onboarding' })
      fireEvent.click(dismissBtn)

      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(readKey(ONBOARDING_DONE_STORAGE_KEY)).toBe('true')
      expect(screen.queryByTestId('onboarding-strip')).toBeNull()
    })

    it('stays hidden if previously dismissed in storage', () => {
      writeKey(ONBOARDING_DONE_STORAGE_KEY, 'true')
      render(<OnboardingStrip />)

      expect(screen.queryByTestId('onboarding-strip')).toBeNull()
    })
  })

  describe('AroDoctorPage', () => {
    it('renders readiness sweep dashboard with honest check states', async () => {
      render(<AroDoctorPage />)

      expect(
        screen.getByRole('heading', { level: 1, name: 'System Readiness Doctor' })
      ).toBeDefined()
      expect(screen.getByText('local readiness sweep')).toBeDefined()

      await waitFor(() => {
        expect(screen.getByTestId('doctor-check-runtime')).toBeDefined()
        expect(screen.getByTestId('doctor-check-providers')).toBeDefined()
        expect(screen.getByTestId('doctor-check-workspace')).toBeDefined()
      })

      // Runtime is ok (gateway is open)
      const runtimeCheck = screen.getByTestId('doctor-check-runtime')
      expect(runtimeCheck.textContent).toContain('Pass')
      expect(runtimeCheck.textContent).toContain('Gateway connection is open.')

      // Providers must honestly report unknown (never faked as pass)
      const providersCheck = screen.getByTestId('doctor-check-providers')
      expect(providersCheck.textContent).toContain('Unknown (backend truth)')
      expect(providersCheck.textContent).toContain(
        'Provider readiness is verified by the backend doctor'
      )

      // Workspace is ok
      const workspaceCheck = screen.getByTestId('doctor-check-workspace')
      expect(workspaceCheck.textContent).toContain('Pass')
      expect(workspaceCheck.textContent).toContain('/home/user/my-project')
    })

    it('reflects warning state when gateway is disconnected', async () => {
      $gatewayState.set('idle')
      render(<AroDoctorPage />)

      await waitFor(() => {
        const runtimeCheck = screen.getByTestId('doctor-check-runtime')
        expect(runtimeCheck.textContent).toContain('Warning')
        expect(runtimeCheck.textContent).toContain('Gateway is idle.')
      })
    })

    it('toggles onboarding completion state and persists to storage', () => {
      render(<AroDoctorPage />)

      const toggleBtn = screen.getByRole('button', { name: 'Mark Completed' })
      fireEvent.click(toggleBtn)

      expect(readKey(ONBOARDING_DONE_STORAGE_KEY)).toBe('true')
      expect(screen.getByText('Completed')).toBeDefined()
      expect(screen.getByRole('button', { name: 'Reset to Active' })).toBeDefined()

      fireEvent.click(screen.getByRole('button', { name: 'Reset to Active' }))
      expect(readKey(ONBOARDING_DONE_STORAGE_KEY)).toBe('false')
      expect(screen.getByText('Active')).toBeDefined()
    })

    it('triggers real backend doctor diagnostics when gateway is open', async () => {
      const runDoctorSpy = vi.spyOn(systemApi, 'runDoctor').mockResolvedValueOnce({
        name: 'doctor',
        ok: true,
        pid: 12345
      })

      const getActionStatusSpy = vi.spyOn(systemApi, 'getActionStatus').mockResolvedValueOnce({
        name: 'doctor',
        lines: ['[1/3] Python 3.12 verified', '[2/3] Model providers checked', '[3/3] Tools healthy'],
        running: false,
        exit_code: 0,
        pid: 12345
      })

      render(<AroDoctorPage />)

      const runBackendBtn = screen.getByRole('button', { name: 'Run Backend Doctor' }) as HTMLButtonElement
      expect(runBackendBtn.disabled).toBe(false)

      fireEvent.click(runBackendBtn)

      await waitFor(() => {
        expect(runDoctorSpy).toHaveBeenCalledTimes(1)
        expect(getActionStatusSpy).toHaveBeenCalledWith('doctor', 50)
        expect(screen.getByText(/Action: doctor \(PID: 12345\)/)).toBeDefined()
        expect(screen.getByText(/\[1\/3\] Python 3.12 verified/)).toBeDefined()
      })
    })

    it('prevents backend doctor execution when gateway is offline with honest error message', async () => {
      $gatewayState.set('closed')
      render(<AroDoctorPage />)

      const runBackendBtn = screen.getByRole('button', { name: 'Run Backend Doctor' }) as HTMLButtonElement
      expect(runBackendBtn.disabled).toBe(true)

      expect(
        screen.getByText(/Gateway connection is currently.*closed/)
      ).toBeDefined()
    })
  })
})
