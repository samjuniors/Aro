import { cva, type VariantProps } from 'class-variance-authority'
import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

const switchVariants = cva(
  'peer inline-flex shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-black/15 dark:data-[state=unchecked]:bg-white/15 data-[state=unchecked]:border data-[state=unchecked]:border-black/5 dark:data-[state=unchecked]:border-white/10 data-[state=checked]:border-transparent data-[state=checked]:bg-primary disabled:data-[state=checked]:bg-(--ui-text-tertiary)',
  {
    variants: {
      size: {
        default: 'h-[22px] w-[38px]',
        xs: 'h-[18px] w-[30px]'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.22),0_1px_1px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=unchecked]:translate-x-0',
  {
    variants: {
      size: {
        default: 'size-[18px] data-[state=checked]:translate-x-[16px]',
        xs: 'size-[14px] data-[state=checked]:translate-x-[12px]'
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
