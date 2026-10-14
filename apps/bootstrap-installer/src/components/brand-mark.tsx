import { cn } from '../lib/utils'

export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span className={cn('inline-flex size-14 shrink-0 items-center justify-center', className)} {...props}>
      <svg className="size-full" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aro-brand-mark-installer" x1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        <rect fill="#101214" height="30" rx="8" width="30" x="1" y="1" />
        <rect fill="none" height="30" rx="8" stroke="#27272a" strokeWidth="1" width="30" x="1" y="1" />
        <path d="M16 7.2 L24 25" stroke="url(#aro-brand-mark-installer)" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M16 7.2 L8 25" stroke="url(#aro-brand-mark-installer)" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M11.6 19.6 L20.4 19.6" stroke="url(#aro-brand-mark-installer)" strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    </span>
  )
}

