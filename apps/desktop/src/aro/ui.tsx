/**
 * ARO DESIGN SYSTEM — PRIMITIVE KIT (desktop port)
 *
 * Ported additively from the Aro Workbench prototype
 * (src/workbench/components/ui.tsx). Same components, same behaviour, one
 * difference: every token utility is namespaced to the aro layer
 * (`bg-aro-*`, `text-aro-*`, `border-aro-line`, `shadow-aro-*`,
 * `animate-aro-*`, `font-aro-*`), so these primitives only ever paint with
 * the gated Aro token layer (see ./tokens.css) and can never pick up — or
 * leak into — the host's own theme. `cn` is the host's existing helper.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

import { IconChevronDown, IconX } from './Icons'

/* ================================ BUTTON ================================ */
type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const variantMap: Record<Variant, string> = {
  primary: 'bg-aro-iris text-aro-on-iris shadow-aro-e1 hover:brightness-110 active:brightness-95',
  secondary: 'bg-aro-raise text-aro-ink border border-aro-line hover:bg-aro-hover hover:border-aro-line-strong',
  ghost: 'text-aro-ink-2 hover:bg-aro-hover hover:text-aro-ink',
  outline:
    'border border-aro-line text-aro-ink-2 bg-transparent hover:border-aro-line-strong hover:text-aro-ink hover:bg-aro-hover/60',
  danger: 'bg-aro-rose-tint text-aro-rose border border-aro-rose/25 hover:brightness-110',
  success: 'bg-aro-mint-tint text-aro-mint border border-aro-mint/25 hover:brightness-110',
}

const sizeMap: Record<Size, string> = {
  xs: 'h-[24px] px-2 text-[11.5px] gap-1 rounded-[6px]',
  sm: 'h-[30px] px-3 text-[12.5px] gap-1.5 rounded-[7px]',
  md: 'h-[34px] px-3.5 text-[13px] gap-2 rounded-[8px]',
  lg: 'h-[40px] px-5 text-[14px] gap-2 rounded-[10px]',
}

export function Button({
  variant = 'secondary',
  size = 'sm',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ComponentType<{ size?: number; className?: string }>
  iconRight?: ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150 select-none focus-visible:aro-ring-focus disabled:pointer-events-none disabled:opacity-40',
        variantMap[variant],
        sizeMap[size],
        className,
      )}
      type={rest.type ?? 'button'}
    >
      {Icon && <Icon size={size === 'xs' ? 12 : size === 'lg' ? 16 : 13} />}
      {children}
      {IconRight && <IconRight size={size === 'xs' ? 11 : 13} />}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  active,
  size = 30,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ComponentType<{ size?: number }>
  label?: string
  active?: boolean
  size?: number
}) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[7px] text-aro-ink-3 transition-[background-color,color,box-shadow,transform] duration-150 hover:bg-aro-hover hover:text-aro-ink focus-visible:aro-ring-focus active:scale-[.94] disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-aro-iris-tint text-aro-iris-soft',
        className,
      )}
      style={{ width: size, height: size }}
      type={rest.type ?? 'button'}
    >
      <Icon size={Math.round(size * 0.5)} />
    </button>
  )
}

/* ================================ BADGE ================================ */
export type Tone = 'neutral' | 'iris' | 'cyan' | 'mint' | 'amber' | 'rose' | 'sky' | 'plum'

export const toneText: Record<Tone, string> = {
  neutral: 'text-aro-ink-3',
  iris: 'text-aro-iris-soft',
  cyan: 'text-aro-cyan',
  mint: 'text-aro-mint',
  amber: 'text-aro-amber',
  rose: 'text-aro-rose',
  sky: 'text-aro-sky',
  plum: 'text-aro-plum',
}

export const toneBg: Record<Tone, string> = {
  neutral: 'bg-aro-hover text-aro-ink-2',
  iris: 'bg-aro-iris-tint text-aro-iris-soft',
  cyan: 'bg-aro-cyan-tint text-aro-cyan',
  mint: 'bg-aro-mint-tint text-aro-mint',
  amber: 'bg-aro-amber-tint text-aro-amber',
  rose: 'bg-aro-rose-tint text-aro-rose',
  sky: 'bg-aro-sky-tint text-aro-sky',
  plum: 'bg-aro-plum-tint text-aro-plum',
}

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-aro-line-strong',
  iris: 'bg-aro-iris',
  cyan: 'bg-aro-cyan',
  mint: 'bg-aro-mint',
  amber: 'bg-aro-amber',
  rose: 'bg-aro-rose',
  sky: 'bg-aro-sky',
  plum: 'bg-aro-plum',
}

/** Raw CSS color for a tone (inline styles: bars, rings, sparklines). */
export const toneHex = (t: Tone) => `var(--aro-${t === 'neutral' ? 'line-strong' : t})`

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
  mono,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
  dot?: boolean
  mono?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-[2px] text-[10.5px] font-medium',
        mono && 'font-aro-mono text-[10px]',
        toneBg[tone],
        className,
      )}
    >
      {dot && <i className="size-[5px] rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-aro-line-strong/80 bg-aro-well px-1 font-aro-mono text-[9.5px] leading-none font-medium text-aro-ink-3',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/* ================================ SURFACES ================================ */
export function Panel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('rounded-[10px] border border-aro-line-soft bg-aro-raise', className)}>
      {children}
    </div>
  )
}

export function SectionLabel({ children, className, right }: { children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 px-2.5 pt-2.5 pb-1.5', className)}>
      <span className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">{children}</span>
      {right}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-aro-line-soft', className)} />
}

/* ================================ FORMS ================================ */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        'h-[32px] w-full rounded-[7px] border border-aro-line bg-aro-sunken px-2.5 text-[12.5px] text-aro-ink transition-shadow placeholder:text-aro-ink-4 focus:border-aro-iris/50 focus:aro-ring-focus focus:outline-none',
        className,
      )}
    />
  )
}

/* Generic popover menu */
export function Menu({
  trigger,
  children,
  align = 'left',
  width = 220,
  className,
  open: controlled,
  onOpenChange,
}: {
  trigger: (open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  width?: number
  className?: string
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const [inner, setInner] = useState(false)
  const open = controlled ?? inner

  const setOpen = useCallback(
    (v: boolean) => {
      setInner(v)
      onOpenChange?.(v)
    },
    [onOpenChange],
  )

  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [coords, setCoords] = useState<{ top: number; left: number; opensAbove: boolean }>({
    top: 0,
    left: 0,
    opensAbove: false,
  })

  const updatePosition = useCallback(() => {
    if (!ref.current) {return}
    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const menuEstimatedHeight = 220
    const opensAbove = spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow

    const top = opensAbove ? Math.max(8, rect.top - 6) : Math.min(window.innerHeight - 40, rect.bottom + 6)
    let left = align === 'right' ? rect.right - width : rect.left

    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }

    if (left < 8) {
      left = 8
    }

    setCoords({ top, left, opensAbove })
  }, [align, width])

  useEffect(() => {
    if (!open) {return}

    updatePosition()

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node

      if (
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleScrollOrResize = () => {
      updatePosition()
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open, setOpen, updatePosition])

  return (
    <div className={cn('relative inline-flex', className)} ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger(open)}</div>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-label="Menu"
            className={cn(
              'fixed z-[99999] overflow-hidden rounded-[10px] border border-aro-line-strong bg-aro-overlay p-1 shadow-aro-e4',
              coords.opensAbove
                ? 'origin-bottom animate-aro-slide-up -translate-y-full'
                : 'origin-top animate-aro-slide-down',
            )}
            ref={menuRef}
            role="menu"
            style={{
              top: coords.top,
              left: coords.left,
              width,
              maxHeight: coords.opensAbove
                ? Math.min(380, Math.max(120, coords.top - 16))
                : Math.min(380, Math.max(120, window.innerHeight - coords.top - 16)),
              overflowY: 'auto',
            }}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  )
}

export function MenuItem({
  icon,
  label,
  hint,
  active,
  onClick,
  danger,
}: {
  icon?: ReactNode
  label: ReactNode
  hint?: ReactNode
  active?: boolean
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-[12.5px] transition-colors',
        active
          ? 'bg-aro-iris-tint text-aro-iris-soft'
          : danger
            ? 'text-aro-rose hover:bg-aro-rose-tint'
            : 'text-aro-ink-2 hover:bg-aro-hover hover:text-aro-ink',
      )}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {icon && <span className="flex w-4 shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{hint}</span>}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 pt-2 pb-1 font-aro-mono text-[9px] tracking-[.14em] text-aro-ink-4 uppercase">{children}</div>
}

export function MenuSep() {
  return <div className="my-1 h-px bg-aro-line-soft" />
}

export function Select({
  value,
  onChange,
  options,
  className,
  size = 'sm',
  align = 'left',
  bare,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string }[]
  className?: string
  size?: 'xs' | 'sm'
  align?: 'left' | 'right'
  bare?: boolean
}) {
  const current = options.find((o) => o.value === value)

  return (
    <Menu
      align={align}
      className={className}
      trigger={(open) => (
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            'inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-[7px] text-aro-ink-2 transition-colors hover:text-aro-ink',
            !bare && 'border border-aro-line bg-aro-raise hover:border-aro-line-strong',
            size === 'xs' ? 'h-[24px] px-1.5 text-[11.5px]' : 'h-[30px] px-2 text-[12.5px]',
          )}
          type="button"
        >
          <span className="truncate font-medium">{current?.label ?? value}</span>
          <IconChevronDown className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')} size={12} />
        </button>
      )}
      width={200}
    >
      {(close) =>
        options.map((o) => (
          <MenuItem
            active={o.value === value}
            hint={o.hint}
            key={o.value}
            label={o.label}
            onClick={() => {
              onChange(o.value)
              close()
            }}
          />
        ))
      }
    </Menu>
  )
}

export function Toggle({
  checked,
  onChange,
  size = 'md',
  disabled,
  className,
  'aria-label': ariaLabel
}: {
  checked: boolean
  onChange: (v: boolean) => void
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  const w = size === 'sm' ? 30 : 38
  const h = size === 'sm' ? 18 : 22
  const k = h - 4
  const travel = w - k - 4

  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aro-iris/40 disabled:pointer-events-none disabled:opacity-40',
        checked
          ? 'bg-aro-iris shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
          : 'bg-black/15 dark:bg-white/15 border border-black/5 dark:border-white/10',
        className
      )}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      style={{ width: w, height: h }}
      type="button"
    >
      <span
        aria-hidden
        className="pointer-events-none block rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22),0_1px_1px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          width: k,
          height: k,
          transform: `translateX(${checked ? travel : 0}px)`
        }}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  items,
  className,
  size = 'sm',
}: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string; icon?: ComponentType<{ size?: number }>; tone?: Tone }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div aria-label="Options" className={cn('inline-flex items-center gap-0.5 rounded-[8px] border border-aro-line bg-aro-sunken p-0.5', className)} role="group">
      {items.map((it) => {
        const on = it.value === value

        return (
          <button
            aria-pressed={on}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] font-medium transition-[background-color,color,box-shadow,transform] duration-150',
              size === 'md' ? 'px-3 py-[6px] text-[12.5px]' : 'px-2.5 py-[4px] text-[12px]',
              on ? cn('bg-aro-raise text-aro-ink shadow-aro-e1', it.tone && toneText[it.tone]) : 'text-aro-ink-3 hover:text-aro-ink-2',
            )}
            key={it.value}
            onClick={() => onChange(it.value)}
            type="button"
          >
            {it.icon && <it.icon size={12} />}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string; count?: number }[]
  className?: string
}) {
  return (
    <div aria-label="Tabs" className={cn('flex items-center gap-0.5', className)} role="tablist">
      {items.map((it) => {
        const on = it.value === value

        return (
          <button
            aria-selected={on}
            className={cn(
              'relative cursor-pointer rounded-[6px] px-2.5 py-[6px] text-[12.5px] font-medium transition-colors',
              on ? 'text-aro-ink' : 'text-aro-ink-3 hover:text-aro-ink-2',
            )}
            key={it.value}
            onClick={() => onChange(it.value)}
            role="tab"
            type="button"
          >
            <span className="flex items-center gap-1.5">
              {it.label}
              {it.count !== undefined && (
                <span className={cn('rounded-full px-1.5 font-aro-mono text-[9.5px]', on ? 'bg-aro-iris-tint text-aro-iris-soft' : 'bg-aro-hover text-aro-ink-4')}>
                  {it.count}
                </span>
              )}
            </span>
            {on && <span className="absolute inset-x-1.5 -bottom-[5px] h-[2px] rounded-full bg-aro-iris" />}
          </button>
        )
      })}
    </div>
  )
}

/* ================================ PROGRESS ================================ */
export function Bar({
  value,
  tone = 'iris',
  className,
  indeterminate,
  height = 4,
}: {
  value?: number
  tone?: Tone
  className?: string
  indeterminate?: boolean
  height?: number
}) {
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-aro-track', className)} style={{ height }}>
      {indeterminate ? (
        <div className="relative h-full w-1/3">
          <div className="h-full w-full animate-aro-sweep rounded-full" style={{ background: toneHex(tone) }} />
        </div>
      ) : (
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value ?? 0}%`, background: toneHex(tone) }} />
      )}
    </div>
  )
}

export function Ring({
  value,
  size = 56,
  stroke = 5,
  tone = 'var(--aro-iris)',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  tone?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" height={size} width={size}>
        <circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke="var(--aro-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={r}
          stroke={tone}
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(value, 100)) / 100}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{ transition: 'stroke-dashoffset .7s var(--aro-ease-out-quint)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function Sparkline({ data, color = 'var(--aro-iris)', w = 64, h = 20 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const pts = data.map((d, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((d - min) / (max - min || 1)) * (h - 2) - 1).toFixed(1)}`)

  return (
    <svg className="overflow-visible" height={h} width={w}>
      <polyline fill={color} opacity="0.12" points={`0,${h} ${pts.join(' ')} ${w},${h}`} stroke="none" />
      <polyline fill="none" points={pts.join(' ')} stroke={color} strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
  chart,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
  chart?: number[]
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-aro-line-soft bg-aro-raise p-3">
      <span className="font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-ink-4 uppercase">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className={cn('text-[20px] leading-none font-semibold tracking-tight', tone === 'neutral' ? 'text-aro-ink' : toneText[tone])}>{value}</span>
        {chart && <Sparkline data={chart} h={18} w={54} />}
      </div>
      {sub && <span className="text-[11px] text-aro-ink-3">{sub}</span>}
    </div>
  )
}

/* ================================ MISC ================================ */
export function Tip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 z-[70] -translate-x-1/2 scale-95 rounded-[6px] border border-aro-line-strong bg-aro-overlay px-2 py-1 text-[11px] whitespace-nowrap text-aro-ink-2 opacity-0 shadow-aro-e3 transition-[opacity,transform] duration-150 delay-150 group-hover/tip:scale-100 group-hover/tip:opacity-100 group-focus-within/tip:scale-100 group-focus-within/tip:opacity-100',
          side === 'top' ? 'bottom-[calc(100%+7px)]' : 'top-[calc(100%+7px)]',
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-[12px] border border-aro-line bg-aro-raise text-aro-ink-3">
        <Icon size={19} />
      </div>
      <div className="space-y-1">
        <p className="text-[13.5px] font-semibold text-aro-ink">{title}</p>
        <p className="max-w-[280px] text-[12px] leading-relaxed text-aro-ink-3">{body}</p>
      </div>
      {action}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  sub,
  width = 620,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  sub?: string
  width?: number
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) {return}
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)

    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) {return null}

  if (typeof document === 'undefined') {return null}

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 animate-aro-fade bg-black/55 backdrop-blur-[3px]" onClick={onClose} />
      <div
        aria-label={title}
        aria-modal="true"
        className="relative max-h-[78vh] animate-aro-pop overflow-hidden rounded-[14px] border border-aro-line-strong bg-aro-bg shadow-aro-e4"
        role="dialog"
        style={{ width, maxWidth: '94vw' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-aro-line-soft bg-aro-raise/60 px-4 py-3">
          <div>
            <h3 className="font-aro-display text-[15px] font-semibold tracking-[-.015em] text-aro-ink">{title}</h3>
            {sub && <p className="mt-0.5 text-[12px] leading-[1.5] text-aro-ink-3">{sub}</p>}
          </div>
          <IconButton icon={IconX} label="Close" onClick={onClose} size={28} />
        </div>
        <div className="aro-scroll-thin max-h-[66vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export function Toasts({ items }: { items: { id: number; msg: string; tone: string }[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-10 left-1/2 z-[150] flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
    >
      {items.map((t) => (
        <div
          className={cn(
            'animate-aro-slide-up rounded-[9px] border bg-aro-overlay px-3 py-2 text-[12px] text-aro-ink shadow-aro-e3',
            t.tone === 'mint'
              ? 'border-aro-mint/30'
              : t.tone === 'rose'
                ? 'border-aro-rose/30'
                : t.tone === 'amber'
                  ? 'border-aro-amber/30'
                  : 'border-aro-iris/30',
          )}
          key={t.id}
        >
          <span className={cn('mr-2 inline-block size-[6px] rounded-full', toneDot[(t.tone as Tone) || 'iris'])} />
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        'w-full rounded-control border border-aro-line bg-aro-well px-3 py-2 text-sm text-aro-ink placeholder:text-aro-ink-4 outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-aro-line-strong focus:bg-aro-bg focus:ring-1 focus:ring-aro-iris disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    />
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer select-none items-center gap-2 text-sm text-aro-ink',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
    >
      <input
        checked={checked}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150',
          checked
            ? 'border-aro-iris bg-aro-iris text-aro-on-iris'
            : 'border-aro-line bg-aro-well hover:border-aro-line-strong',
        )}
      >
        {checked && (
          <svg className="size-3 stroke-current stroke-2 fill-none" viewBox="0 0 16 16">
            <polyline points="3.5 8 6.5 11 12.5 5" />
          </svg>
        )}
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('animate-pulse rounded-control bg-aro-line/50', className)}
    />
  )
}

export function Loader({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-aro-ink-3', className)}
      fill="none"
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" fill="currentColor" />
    </svg>
  )
}

export function FieldMessage({
  children,
  className,
  tone = 'error',
}: {
  children: ReactNode
  className?: string
  tone?: 'error' | 'warn' | 'success' | 'info'
}) {
  const toneMap = {
    error: 'text-aro-rose',
    warn: 'text-aro-amber',
    success: 'text-aro-mint',
    info: 'text-aro-ink-3',
  }

  return (
    <p
      className={cn('flex items-center gap-1.5 text-xs leading-4', toneMap[tone], className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}

export function ListRow({
  title,
  description,
  icon: Icon,
  action,
  badge,
  disabled = false,
  onClick,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ size?: number; className?: string }> | ReactNode
  action?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}) {
  const isInteractive = Boolean(onClick) && !disabled

  return (
    <div
      {...rest}
      aria-disabled={disabled || undefined}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-panel border border-transparent px-3 py-2.5 transition-colors duration-150',
        isInteractive &&
          'cursor-pointer hover:bg-aro-hover/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-aro-iris',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
      onClick={disabled ? undefined : onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-control bg-aro-well text-aro-ink-3 group-hover:text-aro-ink">
            {typeof Icon === 'function' ? <Icon size={14} /> : Icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-aro-ink">{title}</span>
            {badge}
          </div>
          {description && (
            <p className="truncate text-xs text-aro-ink-3">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 pl-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  retry,
  className,
}: {
  title?: string
  description?: string
  retry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-aro-rose/10 text-aro-rose">
        <svg className="size-5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-aro-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-aro-ink-3">{description}</p>}
      {retry && (
        <div className="mt-4">
          <Button onClick={retry} size="sm" variant="secondary">
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

export function LogView({
  lines,
  className,
}: {
  lines: string[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'aro-scroll-thin max-h-[300px] overflow-auto rounded-control border border-aro-line bg-aro-code p-3 font-mono text-xs leading-relaxed text-aro-ink-2',
        className,
      )}
    >
      {lines.map((l, i) => (
        <div className="whitespace-pre-wrap" key={i}>
          {l}
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal onClose={onClose} open={open} title={title} width={420}>
      <div className="p-4">
        {description && <p className="mb-4 text-xs leading-relaxed text-aro-ink-3">{description}</p>}
        <div className="flex items-center justify-end gap-2 border-t border-aro-line-soft pt-2">
          <Button onClick={onClose} size="sm" variant="ghost">
            {cancelLabel}
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            size="sm"
            variant={danger ? 'danger' : 'primary'}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

