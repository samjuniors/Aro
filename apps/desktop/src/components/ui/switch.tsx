import { cva, type VariantProps } from 'class-variance-authority'
import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

const switchVariants = cva(
  'peer inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-(--aro-dur-fast) ease-(--aro-ease-standard) outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-(--aro-line-strong) data-[state=checked]:bg-primary disabled:data-[state=checked]:bg-(--ui-text-tertiary)',
  {
    variants: {
      size: {
        default: 'h-6 w-10',
        xs: 'h-6 w-8'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-(--aro-switch-thumb) shadow-(--aro-shadow-thumb) ring-0 transition-transform duration-(--aro-dur-base) ease-(--aro-ease-out) data-[state=unchecked]:translate-x-0',
  {
    variants: {
      size: {
        default: 'size-5 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4',
        xs: 'size-4 data-[state=checked]:translate-x-3 rtl:data-[state=checked]:-translate-x-3'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

function Switch({
  className,
  size,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root className={cn(switchVariants({ size }), className)} data-slot="switch" {...props}>
      <SwitchPrimitive.Thumb className={switchThumbVariants({ size })} data-slot="switch-thumb" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
