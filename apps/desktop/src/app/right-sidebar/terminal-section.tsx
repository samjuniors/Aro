import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { IconTerminal } from '@/aro/Icons'
import { Button, Panel } from '@/aro/ui'
import { $terminalTakeover, runInTerminal, setTerminalTakeover } from '@/app/right-sidebar/store'
import { TerminalSlot } from '@/app/right-sidebar/terminal/persistent'

export function TerminalSection() {
  const terminalTakeover = useStore($terminalTakeover)

  useEffect(() => {
    // When the terminal section is mounted, activate the terminal takeover
    setTerminalTakeover(true)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col p-2.5">
      <Panel className="mb-2 shrink-0 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IconTerminal size={13} className="text-aro-cyan" />
            <span className="font-aro-display text-[12px] font-semibold text-aro-ink">Embedded Terminal</span>
          </div>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => runInTerminal('clear')}
          >
            Clear
          </Button>
        </div>
        <p className="mt-1 text-[10.5px] leading-relaxed text-aro-ink-3">
          Interactive shell in the workspace root. Commands and outputs persist across view switches.
        </p>
      </Panel>

      <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-[8px] border border-aro-line-soft bg-aro-sunken">
        <TerminalSlot className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  )
}
