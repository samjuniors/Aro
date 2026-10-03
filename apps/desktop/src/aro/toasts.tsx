/**
 * ARO PAGES — local toast feedback.
 *
 * The host app has its own notification surfaces; the Aro pattern pages
 * keep feedback local so they stay self-contained until R3 wires them
 * to the agent's real event bus. Uses the ported Toasts primitive.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Toasts } from './ui'

export type ToastTone = 'mint' | 'rose' | 'amber' | 'iris' | 'cyan' | 'neutral'

export function useToasts() {
  const [items, setItems] = useState<{ id: number; msg: string; tone: ToastTone }[]>([])
  const seq = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => { for (const t of timers.current) clearTimeout(t) }, [])

  const toast = useCallback((msg: string, tone: ToastTone = 'iris') => {
    const id = ++seq.current
    setItems((s) => [...s, { id, msg, tone }])
    const t = setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3400)
    timers.current.push(t)
  }, [])

  return { items, toast }
}

/** Render point — mount once at page level. */
export function ToastHost({ items }: { items: { id: number; msg: string; tone: string }[] }) {
  return <Toasts items={items} />
}
