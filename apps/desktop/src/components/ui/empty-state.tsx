import { cn } from '@/lib/utils'

// Canonical centered empty state (title + description). The default for "no
// results / nothing here yet" page bodies. For richer master-detail lists that
// want an icon + action, use PanelEmpty (overlays/panel); the file-tree's
// inline uppercase error state is its own deliberately-distinct treatment.
export function EmptyState({
  title,
  description,
  className
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('grid min-h-48 place-items-center p-6 text-center', className)}>
      <div className="max-w-prose">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="mt-2 text-aro-md leading-relaxed text-muted-foreground">{description}</div>}
      </div>
    </div>
  )
}
