import { useStore } from '@nanostores/react'

import { ReviewPane } from '@/app/right-sidebar/review'
import { $focusedWorkspaceCwd } from '@/store/session-states'

export function ChangesSection() {
  const cwd = useStore($focusedWorkspaceCwd)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col [&>aside]:h-full [&>aside]:w-full [&>aside]:border-0 [&>aside]:pt-0 [&>aside]:shadow-none">
      <ReviewPane key={cwd || 'no-cwd'} />
    </div>
  )
}
