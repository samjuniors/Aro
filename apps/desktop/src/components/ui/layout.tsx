import {
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
  isValidElement,
} from 'react'

import {
  CHAT_MAX_W,
  FORM_MAX_W,
  PAGE_INSET_X,
  PAGE_MAX_W,
} from '@/app/layout-constants'
import { cn } from '@/lib/utils'

// Re-export aligned primitives for unified access
export { ListRow, type ListRowProps } from './list-row'
export { EmptyState } from './empty-state'
export { PanelEmpty } from '@/app/overlays/panel'
export { OverlaySplitLayout, OverlaySidebar, OverlayMain } from '@/app/overlays/overlay-split-layout'

/* ============================================================================
   PAGE SHELL — The top-level scroll and gutter container for screen views
   ============================================================================ */

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  /** Gutter & measure variant: default (75rem), narrow (40rem for forms), wide (90rem), or full */
  variant?: 'default' | 'narrow' | 'wide' | 'full'
  /** If true, omits standard PAGE_INSET_X padding for edge-to-edge splits */
  bare?: boolean
  /** Whether the shell itself owns the scroll behavior (default: true) */
  scrollable?: boolean
}

export function PageShell({
  bare = false,
  children,
  className,
  scrollable = true,
  variant = 'default',
  ...rest
}: PageShellProps) {
  const maxWClass =
    variant === 'narrow'
      ? FORM_MAX_W
      : variant === 'wide'
        ? 'max-w-[90rem]'
        : variant === 'full'
          ? 'w-full'
          : PAGE_MAX_W

  return (
    <div
      {...rest}
      className={cn(
        'w-full flex-1',
        scrollable && 'h-full min-h-0 overflow-y-auto',
        !bare && cn('pb-12 pt-4', PAGE_INSET_X),
        className
      )}
    >
      <div className={cn('mx-auto w-full', maxWClass)}>{children}</div>
    </div>
  )
}

/* ============================================================================
   PAGE HEADER — Canonical header for Page and List page templates
   ============================================================================ */

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string; size?: number }> | ReactNode
  meta?: ReactNode
  actions?: ReactNode
  breadcrumb?: ReactNode
  sticky?: boolean
  className?: string
}

export function PageHeader({
  actions,
  breadcrumb,
  className,
  description,
  icon: Icon,
  meta,
  sticky = false,
  title,
}: PageHeaderProps) {
  const renderIcon = () => {
    if (!Icon) return null
    if (isValidElement(Icon)) return Icon
    const IconComp = Icon as ComponentType<{ className?: string; size?: number }>
    return <IconComp className="size-5 shrink-0 text-muted-foreground" size={20} />
  }

  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-2 border-b border-(--ui-stroke-tertiary)/60 pb-4',
        sticky && 'sticky top-0 z-10 bg-(--ui-chat-surface-background)/95 backdrop-blur-sm',
        className
      )}
    >
      {breadcrumb && <div className="text-xs text-muted-foreground">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {renderIcon()}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {meta}
            </div>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground leading-normal">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2 self-center">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

/* ============================================================================
   SECTION — Semantic block with header, divider, and content body
   ============================================================================ */

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string; size?: number }> | ReactNode
  meta?: ReactNode
  aside?: ReactNode
  variant?: 'card' | 'flat' | 'flush'
  children: ReactNode
  className?: string
}

export function Section({
  aside,
  children,
  className,
  description,
  icon: Icon,
  meta,
  title,
  variant = 'flush',
  ...rest
}: SectionProps) {
  const renderIcon = () => {
    if (!Icon) return null
    if (isValidElement(Icon)) return Icon
    const IconComp = Icon as ComponentType<{ className?: string; size?: number }>
    return <IconComp className="size-4 shrink-0 text-muted-foreground" size={16} />
  }

  const hasHeader = Boolean(title || aside || meta)

  return (
    <section
      {...rest}
      className={cn(
        'mb-6',
        variant === 'card' &&
          'rounded-panel border border-(--ui-stroke-tertiary) bg-(--ui-bg-secondary) p-4 sm:p-5',
        variant === 'flat' &&
          'border-b border-(--ui-stroke-tertiary)/50 pb-6 last:border-b-0',
        className
      )}
    >
      {hasHeader && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {renderIcon()}
            {title && (
              <span className="text-sm font-medium tracking-tight text-foreground">
                {title}
              </span>
            )}
            {meta}
          </div>
          {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
        </div>
      )}
      {description && (
        <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  )
}

/* ============================================================================
   FORM ROW — Form field item: label start side, control end side
   ============================================================================ */

export interface FormRowProps {
  label: ReactNode
  description?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  aside?: ReactNode
  layout?: 'horizontal' | 'vertical' | 'responsive'
  children: ReactNode
  className?: string
}

export function FormRow({
  aside,
  children,
  className,
  description,
  error,
  hint,
  label,
  layout = 'responsive',
  required = false,
}: FormRowProps) {
  const isHorizontal = layout === 'horizontal'
  const isVertical = layout === 'vertical'

  return (
    <div
      className={cn(
        'py-2.5 transition-colors',
        isHorizontal && 'flex items-center justify-between gap-4',
        isVertical && 'flex flex-col gap-1.5',
        layout === 'responsive' &&
          'flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-foreground">
            {label}
            {required && <span className="ms-1 text-destructive">*</span>}
          </label>
          {aside}
        </div>
        {description && (
          <p className="mt-0.5 text-aro-xs text-muted-foreground leading-normal">
            {description}
          </p>
        )}
        {error && (
          <p className="mt-1 text-aro-xs font-medium text-destructive leading-normal">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-0.5 text-aro-xs text-muted-foreground/80 leading-normal">
            {hint}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:max-w-xs">{children}</div>
    </div>
  )
}

/* ============================================================================
   STACK — Vertical layout container on the 4px spacing scale
   ============================================================================ */

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 6 | 8
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
  dividers?: boolean
  children: ReactNode
  className?: string
}

const gapClassMap = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
} as const

const alignClassMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const

const justifyClassMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

export function Stack({
  align = 'stretch',
  children,
  className,
  dividers = false,
  gap = 4,
  justify = 'start',
  ...rest
}: StackProps) {
  return (
    <div
      {...rest}
      className={cn(
        'flex flex-col',
        gapClassMap[gap],
        alignClassMap[align],
        justifyClassMap[justify],
        dividers && 'divide-y divide-(--ui-stroke-tertiary)/50',
        className
      )}
    >
      {children}
    </div>
  )
}

/* ============================================================================
   INLINE — Horizontal layout container for badges, controls, action clusters
   ============================================================================ */

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 6
  align?: 'center' | 'baseline' | 'start' | 'end'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
  children: ReactNode
  className?: string
}

const inlineAlignClassMap = {
  baseline: 'items-baseline',
  center: 'items-center',
  end: 'items-end',
  start: 'items-start',
} as const

export function Inline({
  align = 'center',
  children,
  className,
  gap = 2,
  justify = 'start',
  wrap = false,
  ...rest
}: InlineProps) {
  return (
    <div
      {...rest}
      className={cn(
        'flex flex-row',
        gapClassMap[gap],
        inlineAlignClassMap[align],
        justifyClassMap[justify],
        wrap ? 'flex-wrap' : 'flex-nowrap',
        className
      )}
    >
      {children}
    </div>
  )
}

/* ============================================================================
   TOOLBAR — Standard action and search bar for list and overview pages
   ============================================================================ */

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  start?: ReactNode
  end?: ReactNode
  children?: ReactNode
  className?: string
}

export function Toolbar({
  children,
  className,
  end,
  start,
  ...rest
}: ToolbarProps) {
  return (
    <div
      {...rest}
      className={cn(
        'mb-4 flex flex-wrap items-center justify-between gap-2.5',
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        {start}
        {children}
      </div>
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </div>
  )
}

/* ============================================================================
   ACTION BAR — Primary/Secondary/Destructive action bar for pages and dialogs
   ============================================================================ */

export interface ActionBarProps extends HTMLAttributes<HTMLDivElement> {
  primary?: ReactNode
  secondary?: ReactNode
  destructive?: ReactNode
  sticky?: boolean
  children?: ReactNode
  className?: string
}

export function ActionBar({
  children,
  className,
  destructive,
  primary,
  secondary,
  sticky = false,
  ...rest
}: ActionBarProps) {
  return (
    <div
      {...rest}
      className={cn(
        'mt-6 flex items-center justify-between gap-3 pt-3',
        sticky &&
          'sticky bottom-0 z-10 border-t border-(--ui-stroke-tertiary)/60 bg-(--ui-chat-surface-background)/95 py-3 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {destructive}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {secondary}
        {primary}
      </div>
    </div>
  )
}
