/**
 * ARO PRODUCT MODE STORE
 *
 * Synchronizes the primary workspace mode across the Titlebar and Sidebar:
 *  - 'code' (= Sessions / Coding workspace)
 *  - 'bots' (= Agents / AI Bot companions)
 */

import { atom } from 'nanostores'

import { findGroupOfPane } from '@/components/pane-shell/tree/model'
import { $layoutTree, activateTreePane } from '@/components/pane-shell/tree/store'
import { $workspaceMode } from '@/components/pane-shell/workspace-scope'
import { $botsPaneVisible } from '@/plugins/hermes-bots/bot-state'

export type AroProductMode = 'code' | 'bots'

const getInitialMode = (): AroProductMode => {
  try {
    const val = localStorage.getItem('aro.productMode')
    return val === 'bots' || val === 'agent' ? 'bots' : 'code'
  } catch {
    return 'code'
  }
}

export const $aroProductMode = atom<AroProductMode>(getInitialMode())

export function setAroProductMode(mode: AroProductMode): void {
  $aroProductMode.set(mode)
  try {
    localStorage.setItem('aro.productMode', mode)
    window.dispatchEvent(new CustomEvent('aro:product-mode-changed', { detail: mode }))
  } catch {
    // ignore
  }

  // 1. Switch Hermes Left Pane between 'sessions' and 'hermes-bots:pane'
  const targetPaneId = mode === 'bots' ? 'hermes-bots:pane' : 'sessions'
  const tree = $layoutTree.get()
  if (tree) {
    const group =
      findGroupOfPane(tree, targetPaneId) ||
      findGroupOfPane(tree, 'sessions') ||
      findGroupOfPane(tree, 'hermes-bots:pane')

    if (group) {
      activateTreePane(group.id, targetPaneId)
    }
  }

  // 2. Synchronize workspace mode in Hermes
  $workspaceMode.set(mode === 'bots' ? 'bots' : 'sessions')
}

// Keep $aroProductMode in bidirectional sync with Hermes pane and workspace states
if (typeof window !== 'undefined') {
  let hasAppliedInitial = false

  // Listen for Hermes workspace mode changes
  $workspaceMode.listen(mode => {
    const targetAroMode = mode === 'bots' ? 'bots' : 'code'
    if ($aroProductMode.get() !== targetAroMode) {
      $aroProductMode.set(targetAroMode)
    }
  })

  // Listen for Bots pane visibility changes
  $botsPaneVisible.listen(visible => {
    const targetAroMode = visible ? 'bots' : 'code'
    if ($aroProductMode.get() !== targetAroMode) {
      $aroProductMode.set(targetAroMode)
    }
  })

  // Listen for layout tree changes (e.g. tab switches in sidebar group)
  $layoutTree.listen(tree => {
    if (!tree) return

    // Apply restored mode on initial tree boot
    if (!hasAppliedInitial) {
      hasAppliedInitial = true
      const initialMode = $aroProductMode.get()
      if (initialMode === 'bots') {
        const group = findGroupOfPane(tree, 'hermes-bots:pane')
        if (group && group.active !== 'hermes-bots:pane') {
          activateTreePane(group.id, 'hermes-bots:pane')
          $workspaceMode.set('bots')
        }
        return
      }
    }

    const group = findGroupOfPane(tree, 'hermes-bots:pane') || findGroupOfPane(tree, 'sessions')
    if (group) {
      if (group.active === 'hermes-bots:pane' && $aroProductMode.get() !== 'bots') {
        $aroProductMode.set('bots')
      } else if (group.active === 'sessions' && $aroProductMode.get() !== 'code') {
        $aroProductMode.set('code')
      }
    }
  })
}
