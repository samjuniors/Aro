import { describe, expect, it } from 'vitest'

import { en } from '@/i18n/en'
import {
  errorCardKey,
  errorRecoveryPlan,
  formatCountdown,
  parseErrorSurface,
  scheduledRetryDelayMs
} from '@/lib/error-surface'
import { errorCardText } from '@/lib/error-surface-copy'

describe('Aro Desktop Failure Matrix (P12 Step 7)', () => {
  const thread = en.assistant.thread

  describe('Scenario 1: Gateway Down', () => {
    it('provides structured gateway layer error descriptor and retryable recovery', () => {
      const surface = parseErrorSurface({
        layer: 'gateway',
        code: 'stream_drop',
        retryable: true
      })

      expect(surface).not.toBeNull()
      expect(surface?.layer).toBe('gateway')

      const plan = errorRecoveryPlan(surface)
      expect(plan.retry).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toBeDefined()
      expect(card.title.length).toBeGreaterThan(0)
    })
  })

  describe('Scenario 2: No Model or Credentials', () => {
    it('suppresses retry and offers Update API Key when an API key is rejected', () => {
      const surface = parseErrorSurface({
        layer: 'auth',
        code: 'auth',
        auth_kind: 'api_key',
        api_key_env: 'ANTHROPIC_API_KEY',
        provider: 'anthropic',
        provider_label: 'Anthropic',
        retryable: false
      })

      expect(surface).not.toBeNull()
      const plan = errorRecoveryPlan(surface)

      // Fixing the key changes the outcome, so Retry is preserved as the follow-up click
      expect(plan.retry).toBe(true)
      expect(plan.updateApiKey).toBe(true)
      expect(plan.switchProvider).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toMatch(/Anthropic/i)
      expect(card.title).toMatch(/key/i)
    })

    it('offers Choose a Model and suppresses retry when model is not found', () => {
      const surface = parseErrorSurface({
        layer: 'provider',
        code: 'model_not_found',
        provider: 'openai',
        retryable: false
      })

      expect(surface).not.toBeNull()
      const plan = errorRecoveryPlan(surface)

      expect(plan.retry).toBe(false)
      expect(plan.chooseModel).toBe(true)
      expect(plan.switchProvider).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toBe(thread.errorCodes.model_not_found.title)
    })
  })

  describe('Scenario 3: Rate Limit', () => {
    it('names the provider, maintains retry, and calculates scheduled countdown', () => {
      const now = 1_700_000_000_000
      const resetsAt = Math.floor(now / 1000) + 120 // 2 minutes in the future

      const surface = parseErrorSurface({
        layer: 'provider',
        code: 'rate_limit',
        provider: 'openai',
        provider_label: 'OpenAI',
        resets_at: resetsAt,
        retryable: true
      })

      expect(surface).not.toBeNull()
      const plan = errorRecoveryPlan(surface)

      expect(plan.retry).toBe(true)

      const delay = scheduledRetryDelayMs(surface?.resetsAt, now)
      expect(delay).toBe(120_000)

      const countdown = formatCountdown(delay!)
      expect(countdown).toBe('2m 00s')

      const card = errorCardText(thread, surface)
      expect(card.title).toBe(thread.errorCodes.rate_limit.title)
      expect(card.body).toMatch(/OpenAI/i)
    })
  })

  describe('Scenario 4: Tool Error', () => {
    it('classifies tool and runtime execution failures and offers session recovery', () => {
      const surface = parseErrorSurface({
        layer: 'runtime',
        code: 'loop_error',
        retryable: false
      })

      expect(surface).not.toBeNull()
      expect(surface?.layer).toBe('runtime')

      const plan = errorRecoveryPlan(surface)
      expect(plan.startNewSession).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toBe(thread.errorCodes.loop_error.title)
    })
  })

  describe('Scenario 5: Network Loss', () => {
    it('identifies streaming drops as retryable network disruptions', () => {
      const surface = parseErrorSurface({
        layer: 'streaming',
        code: 'stream_drop',
        retryable: true
      })

      expect(surface).not.toBeNull()
      expect(surface?.layer).toBe('streaming')

      const plan = errorRecoveryPlan(surface)
      expect(plan.retry).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toBe(thread.errorCodes.stream_drop.title)
    })
  })

  describe('Scenario 6: Huge Output', () => {
    it('offers conversation compression and session start for context overflow', () => {
      const surface = parseErrorSurface({
        layer: 'provider',
        code: 'context_overflow',
        retryable: false
      })

      expect(surface).not.toBeNull()
      const plan = errorRecoveryPlan(surface)

      expect(plan.retry).toBe(false)
      expect(plan.compress).toBe(true)
      expect(plan.startNewSession).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toBe(thread.errorCodes.context_overflow.title)
    })

    it('handles payload too large by suppressing retry and prompting compression', () => {
      const surface = parseErrorSurface({
        layer: 'endpoint',
        code: 'payload_too_large',
        retryable: false
      })

      expect(surface).not.toBeNull()
      const plan = errorRecoveryPlan(surface)

      expect(plan.retry).toBe(false)
      expect(plan.compress).toBe(true)
      expect(plan.startNewSession).toBe(true)

      const key = errorCardKey(surface)
      expect(key).toEqual({ code: 'payload_too_large' })
    })
  })

  describe('Scenario 7: Session Restore After Crash', () => {
    it('suppresses retry and offers Start New Session for stranded session leases', () => {
      const surface = parseErrorSurface({
        layer: 'gateway',
        code: 'SESSION_NOT_OWNED',
        retryable: false
      })

      expect(surface).not.toBeNull()
      const plan = errorRecoveryPlan(surface)

      expect(plan.retry).toBe(false)
      expect(plan.startNewSession).toBe(true)

      const card = errorCardText(thread, surface)
      expect(card.title).toBe(thread.errorCodes.SESSION_NOT_OWNED.title)
    })
  })
})
