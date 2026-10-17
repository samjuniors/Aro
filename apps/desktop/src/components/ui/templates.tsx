import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

import { Button } from './button'
import {
  ActionBar,
  FormRow,
  Inline,
  ListRow,
  type ListRowProps,
  OverlayMain,
  OverlaySidebar,
  OverlaySplitLayout,
  PageHeader,
  PageShell,
  Section,
  Stack,
  Toolbar,
} from './layout'
import { Loader } from './loader'

/* ============================================================================
   ZERO-SHIFT STATE BOX (Empty / Loading / Error)
   Ensures empty, loading, and error states reserve identical geometry.
   ============================================================================ */

export interface StateBoxProps {
  state: 'idle' | 'loading' | 'empty' | 'error'
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  minHeight?: string | number
  className?: string
  children?: ReactNode
}

export function StateBox({
  action,
  children,
  className,
  description,
  minHeight = '14rem',
  state,
  title,
}: StateBoxProps) {
  if (state === 'idle') {
    return <>{children}</>
  }

  return (
    <div
      className={cn(
        'grid w-full place-items-center rounded-panel border border-(--ui-stroke-tertiary)/50 bg-(--ui-bg-secondary)/40 p-6 text-center transition-opacity duration-150',
        className
      )}
      style={{ minHeight }}
    >
      <div className="flex max-w-sm flex-col items-center gap-2">
        {state === 'loading' && (
          <>
            <Loader className="size-8" />
            <p className="text-xs font-medium text-muted-foreground">
              {title ?? 'Loading content…'}
            </p>
          </>
        )}
        {state === 'empty' && (
          <>
            <div className="size-8 rounded-control bg-muted/60 text-muted-foreground flex items-center justify-center">
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              {title ?? 'Nothing here yet'}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
            {action && <div className="mt-2">{action}</div>}
          </>
        )}
        {state === 'error' && (
          <>
            <div className="size-8 rounded-control bg-destructive/15 text-destructive flex items-center justify-center">
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-destructive">
              {title ?? 'Something went wrong'}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
            {action && <div className="mt-2">{action}</div>}
          </>
        )}
      </div>
    </div>
  )
}

/* ============================================================================
   1. PAGE TEMPLATE
   ============================================================================ */

export interface PageTemplateProps {
  title: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string; size?: number }> | ReactNode
  meta?: ReactNode
  actions?: ReactNode
  breadcrumb?: ReactNode
  children: ReactNode
  variant?: 'default' | 'narrow' | 'wide' | 'full'
  className?: string
}

export function PageTemplate({
  actions,
  breadcrumb,
  children,
  className,
  description,
  icon,
  meta,
  title,
  variant = 'default',
}: PageTemplateProps) {
  return (
    <PageShell className={cn('@container', className)} variant={variant}>
      <PageHeader
        actions={actions}
        breadcrumb={breadcrumb}
        description={description}
        icon={icon}
        meta={meta}
        title={title}
      />
      <div className="flex flex-col gap-6">{children}</div>
    </PageShell>
  )
}

/* ============================================================================
   2. LIST PAGE TEMPLATE
   ============================================================================ */

export interface ListPageTemplateProps {
  title: ReactNode
  description?: ReactNode
  icon?: ComponentType<{ className?: string; size?: number }> | ReactNode
  meta?: ReactNode
  actions?: ReactNode
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (val: string) => void
  toolbarStart?: ReactNode
  toolbarEnd?: ReactNode
  state?: 'idle' | 'loading' | 'empty' | 'error'
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  items?: ListRowProps[]
  children?: ReactNode
  className?: string
}

export function ListPageTemplate({
  actions,
  children,
  className,
  description,
  emptyAction,
  emptyDescription,
  emptyTitle,
  icon,
  items,
  meta,
  onSearchChange,
  searchPlaceholder = 'Search items…',
  searchValue,
  state = 'idle',
  title,
  toolbarEnd,
  toolbarStart,
}: ListPageTemplateProps) {
  return (
    <PageShell className={cn('@container', className)}>
      <PageHeader
        actions={actions}
        description={description}
        icon={icon}
        meta={meta}
        title={title}
      />
      <Toolbar
        end={toolbarEnd}
        start={
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <input
                className="desktop-input-chrome h-8 rounded-control border px-2.5 text-xs outline-none placeholder:text-muted-foreground"
                onChange={e => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={searchValue}
              />
            )}
            {toolbarStart}
          </div>
        }
      />
      <StateBox
        action={emptyAction}
        description={emptyDescription}
        state={state}
        title={emptyTitle}
      >
        {items ? (
          <Stack dividers gap={1}>
            {items.map((item, idx) => (
              <ListRow key={idx} {...item} />
            ))}
          </Stack>
        ) : (
          children
        )}
      </StateBox>
    </PageShell>
  )
}

/* ============================================================================
   3. FORM PAGE TEMPLATE
   ============================================================================ */

export interface FormPageTemplateProps {
  title: ReactNode
  description?: ReactNode
  breadcrumb?: ReactNode
  icon?: ComponentType<{ className?: string; size?: number }> | ReactNode
  primaryActionLabel?: string
  secondaryActionLabel?: string
  isSubmitting?: boolean
  onSubmit?: (e: FormEvent) => void
  onReset?: () => void
  destructiveAction?: ReactNode
  children: ReactNode
  className?: string
}

export function FormPageTemplate({
  breadcrumb,
  children,
  className,
  description,
  destructiveAction,
  icon,
  isSubmitting = false,
  onReset,
  onSubmit,
  primaryActionLabel = 'Save changes',
  secondaryActionLabel = 'Reset',
  title,
}: FormPageTemplateProps) {
  return (
    <PageShell className={cn('@container', className)} variant="narrow">
      <form onSubmit={onSubmit}>
        <PageHeader
          breadcrumb={breadcrumb}
          description={description}
          icon={icon}
          title={title}
        />
        <div className="flex flex-col gap-6">{children}</div>
        <ActionBar
          destructive={destructiveAction}
          primary={
            <Button disabled={isSubmitting} type="submit" variant="default">
              {isSubmitting ? 'Saving…' : primaryActionLabel}
            </Button>
          }
          secondary={
            onReset && (
              <Button
                disabled={isSubmitting}
                onClick={onReset}
                type="button"
                variant="secondary"
              >
                {secondaryActionLabel}
              </Button>
            )
          }
          sticky
        />
      </form>
    </PageShell>
  )
}

/* ============================================================================
   4. MASTER / DETAIL OVERLAY TEMPLATE
   ============================================================================ */

export interface MasterDetailOverlayTemplateProps {
  navItems: {
    id: string
    label: string
    icon: ComponentType<{ size?: number; className?: string }>
    active: boolean
    onClick: () => void
  }[]
  detailTitle: ReactNode
  detailDescription?: ReactNode
  detailActions?: ReactNode
  children: ReactNode
  className?: string
}

export function MasterDetailOverlayTemplate({
  children,
  className,
  detailActions,
  detailDescription,
  detailTitle,
  navItems,
}: MasterDetailOverlayTemplateProps) {
  return (
    <OverlaySplitLayout className={cn('@container', className)}>
      <OverlaySidebar>
        <div className="flex flex-col gap-1 p-2">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <button
                className={cn(
                  'flex items-center gap-2.5 rounded-control px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-(--chrome-action-hover) hover:text-foreground text-start',
                  item.active &&
                    'bg-(--ui-bg-tertiary) text-foreground font-semibold shadow-xs'
                )}
                key={item.id}
                onClick={item.onClick}
                type="button"
              >
                <Icon size={14} />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </OverlaySidebar>
      <OverlayMain>
        <PageHeader
          actions={detailActions}
          description={detailDescription}
          title={detailTitle}
        />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </OverlayMain>
    </OverlaySplitLayout>
  )
}

/* ============================================================================
   5. SETTINGS SUBPAGE TEMPLATE
   ============================================================================ */

export interface SettingsSubpageTemplateProps {
  breadcrumb: ReactNode
  title: string
  description?: string
  children: ReactNode
  onSave?: () => void
  onReset?: () => void
  isDirty?: boolean
  className?: string
}

export function SettingsSubpageTemplate({
  breadcrumb,
  children,
  className,
  description,
  isDirty = false,
  onReset,
  onSave,
  title,
}: SettingsSubpageTemplateProps) {
  return (
    <div className={cn('@container flex flex-col gap-6 p-1', className)}>
      <PageHeader
        breadcrumb={breadcrumb}
        description={description}
        title={title}
      />
      <div className="flex flex-col gap-6">{children}</div>
      {isDirty && onSave && (
        <ActionBar
          primary={
            <Button onClick={onSave} variant="default">
              Save changes
            </Button>
          }
          secondary={
            onReset && (
              <Button onClick={onReset} variant="secondary">
                Discard
              </Button>
            )
          }
          sticky
        />
      )}
    </div>
  )
}

/* ============================================================================
   6. DIALOG TEMPLATE
   ============================================================================ */

export interface DialogTemplateProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  destructiveAction?: ReactNode
  onClose?: () => void
  className?: string
}

export function DialogTemplate({
  children,
  className,
  description,
  destructiveAction,
  onClose,
  primaryAction,
  secondaryAction,
  title,
}: DialogTemplateProps) {
  return (
    <div
      className={cn(
        'flex max-w-lg flex-col overflow-hidden rounded-overlay border border-(--ui-stroke-tertiary) bg-(--ui-chat-surface-background) shadow-menu',
        className
      )}
    >
      <div className="flex items-start justify-between border-b border-(--ui-stroke-tertiary)/60 p-4">
        <div>
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground leading-normal">
              {description}
            </p>
          )}
        </div>
        {onClose && (
          <Button
            aria-label="Close dialog"
            className="size-7 p-0"
            onClick={onClose}
            size="xs"
            variant="ghost"
          >
            ✕
          </Button>
        )}
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      {(primaryAction || secondaryAction || destructiveAction) && (
        <div className="flex items-center justify-between border-t border-(--ui-stroke-tertiary)/60 bg-(--ui-bg-secondary)/30 px-4 py-3">
          <div>{destructiveAction}</div>
          <div className="flex items-center gap-2">
            {secondaryAction}
            {primaryAction}
          </div>
        </div>
      )}
    </div>
  )
}
