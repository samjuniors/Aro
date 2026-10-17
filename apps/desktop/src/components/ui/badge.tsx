import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/lib/utils'

// Small status/metadata tag. App radius (not a full pill); tones map to the
// shared accent/muted/destructive surfaces so badges read consistently.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-(--radius-aro-xs) font-medium leading-none whitespace-nowrap [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        muted: 'bg-muted text-muted-foreground',
        // Status variants use Aro status roles with token-derived tints (DESIGN.md §3.4)
        success:
          'bg-[color-mix(in_srgb,var(--aro-status-success)_14%,transparent)] text-(--aro-status-success)',
        warn: 'bg-[color-mix(in_srgb,var(--aro-status-warn)_14%,transparent)] text-(--aro-status-warn)',
        destructive:
          'bg-[color-mix(in_srgb,var(--aro-status-danger)_14%,transparent)] text-(--aro-status-danger)',
        outline: 'border border-(--ui-stroke-tertiary) text-muted-foreground',
        // Solid fill — icon-corner counts (titlebar unread, etc.).
        solid: 'bg-primary text-primary-foreground'
      },
      size: {
        default: 'px-1.5 py-0.5 text-[0.65rem] [&_svg]:size-3',
        xs: 'px-1 py-px text-[0.6rem] [&_svg]:size-2.5',
        // Count badge overlay uses rounded-full per DESIGN.md §3.1
        overlay: 'h-2 min-w-2 justify-center rounded-full px-px text-[0.5rem] font-semibold tabular-nums'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

export function Badge({ asChild = false, className, size, variant, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span'

  return <Comp className={cn(badgeVariants({ size, variant }), className)} data-slot="badge" {...props} />
}

export { badgeVariants }
