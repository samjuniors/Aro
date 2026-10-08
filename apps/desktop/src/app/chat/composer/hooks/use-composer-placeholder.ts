import { useEffect, useRef, useState } from 'react'

import { useI18n } from '@/i18n'
import { resetBrowseState } from '@/store/composer-input-history'

import { pickPlaceholder } from '../composer-utils'

interface UseComposerPlaceholderOptions {
  disabled: boolean
  reconnecting: boolean
  sessionId: null | string | undefined
}

/**
 * The composer's placeholder text. A resting starter (new session) / continuation
 * (existing session) is picked once and only re-rolled when we genuinely move to
 * a *different* conversation — the null→id persist of a freshly-started session
 * keeps its starter so the text doesn't flip mid-stream. While the transport is
 * down, it swaps to a reconnecting / starting message instead.
 */
export function useComposerPlaceholder({ disabled, reconnecting, sessionId }: UseComposerPlaceholderOptions): string {
  const { t } = useI18n()
  const newSessionPlaceholders = t.composer.newSessionPlaceholders
  const followUpPlaceholders = t.composer.followUpPlaceholders

  const [restingPlaceholder, setRestingPlaceholder] = useState(() =>
    pickPlaceholder(sessionId ? followUpPlaceholders : newSessionPlaceholders)
  )

  const prevSessionIdRef = useRef(sessionId)

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    const prev = prevSessionIdRef.current
    prevSessionIdRef.current = sessionId

    if (prev === sessionId) {
      return
    }

    // null → id: the new session we're already in just got persisted. Keep the
    // starter we showed instead of swapping to a follow-up under the user.
    if (prev == null && sessionId) {
      return
    }

    resetBrowseState(prev)
    setRestingPlaceholder(pickPlaceholder(sessionId ? followUpPlaceholders : newSessionPlaceholders))
  }, [followUpPlaceholders, newSessionPlaceholders, sessionId])

  const [typewriterText, setTypewriterText] = useState('')

  useEffect(() => {
    if (sessionId || disabled) {
      setTypewriterText('')
      return
    }

    const phrases = [
      'Ask Aro anything or describe what you want to build…',
      'Drag a project from the sidebar to connect…',
      'Plan a refactor, fix a bug, or write tests…',
      'Explain code architecture and design patterns…'
    ]
    let phraseIdx = 0
    let charIdx = 0
    let isDeleting = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = () => {
      const phrase = phrases[phraseIdx]!
      if (!isDeleting) {
        charIdx++
        setTypewriterText(phrase.slice(0, charIdx))
        if (charIdx >= phrase.length) {
          isDeleting = true
          timer = setTimeout(tick, 2400)
          return
        }
        timer = setTimeout(tick, 38)
      } else {
        charIdx -= 2
        if (charIdx <= 0) {
          charIdx = 0
          isDeleting = false
          phraseIdx = (phraseIdx + 1) % phrases.length
          timer = setTimeout(tick, 450)
          return
        }
        setTypewriterText(phrase.slice(0, charIdx))
        timer = setTimeout(tick, 22)
      }
    }

    timer = setTimeout(tick, 400)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [sessionId, disabled])

  // When the transport is disabled it's because the gateway isn't open.
  // Distinguish a cold start ("Starting Hermes...") from a dropped connection
  // we're trying to restore. During reconnect, keep the textbox editable so a
  // flaky network doesn't block drafting; only submit/backend actions stay
  // disabled until the gateway is open again.
  if (disabled) {
    return reconnecting ? t.composer.placeholderReconnecting : t.composer.placeholderStarting
  }

  if (!sessionId && typewriterText) {
    return `${typewriterText}▍`
  }

  return restingPlaceholder
}
