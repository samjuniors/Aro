import type { ComponentType, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode
  badge?: ReactNode
  description?: ReactNode
  disabled?: boolean
  icon?: ComponentType<{ className?: string; size?: number }> | ReactNode
  title: ReactNode
}

/**
 * Standard list row primitive for settings, preferences, and selection lists.
 * Follows the Cursor/Zed calm flat design contract with optical icon alignment,
 * subtle hover affordance, and role-based typography.
 */
export function ListRow({
  action,
  badge,
  className,
  description,
  disabled = false,
  icon: Icon,
  onClick,
  title,
  ...rest
}: ListRowProps) {
  const isInteractive = Boolean(onClick) && !disabled

  return (
    <div
      {...rest}
      aria-disabled={disabled || undefined}
      className={cn(
        'group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors duration-150',
        'rounded-panel border border-transparent',
        isInteractive && 'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={disabled ? undefined : onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-muted/60 text-muted-foreground group-hover:text-foreground">
            {typeof Icon === 'function' ? <Icon size={14} /> : Icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{title}</span>
            {badge}
          </div>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 pl-2">
          {action}
        </div>
      )}
    </div>
  )
}
