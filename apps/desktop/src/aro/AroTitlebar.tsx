/**
 * ARO TITLEBAR — Desktop Shell Header (Prototype Parity)
 *
 * Provides the unified top bar from the Aro Workbench prototype, fully wired
 * to the Hermes Electron application engine:
 *
 *  · Left:
 *      - Sidebar toggle (toggleLeftSide / $leftSideOpen)
 *      - Product mode switcher [Code | Agent]
 *      - Active Project / Session title + Bot identity badge + live Git branch
 *  · Center:
 *      - Global search pill (openCommandPalette / ⌘K)
 *  · Right:
 *      - Keyboard shortcuts (⌘/)
 *      - Quick Settings popover (5 Aro themes, Terminal toggle, Workspace toggle,
 *        Status bar toggle, Voice orb toggle, link to Settings)
 *      - Safe insets for native Windows/macOS titlebar controls & window dragging
 */

import './titlebar.css'

import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { toggleTerminalPane } from '@/app/right-sidebar/terminal/reveal-focus'
import { SETTINGS_ROUTE } from '@/app/routes'
import { useWindowControlsOverlayWidth } from '@/app/shell/hooks/use-window-controls-overlay-width'
import { titlebarControlsPosition, titlebarToolsRightCss } from '@/app/shell/titlebar'
import { $workspaceOwnerLabels } from '@/components/pane-shell/workspace-scope'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tip } from '@/components/ui/tooltip'
import { sessionTitle } from '@/lib/chat-runtime'
import { $openBotChat, $selectedBot } from '@/plugins/hermes-bots/bot-state'
import { $repoStatus, repoStatusForCwd } from '@/store/coding-status'
import { openCommandPalette } from '@/store/command-palette'
import { $fileBrowserOpen, $leftSideOpen, toggleLeftSide, toggleRightSide } from '@/store/layout'
import { $activeGatewayProfile, $profiles, profileLabel, selectProfile } from '@/store/profile'
import { $projectScope } from '@/store/project-scope'
import { $projectOwnerBySessionId, $projects, openFolderAsProject } from '@/store/projects'
import { $connection, $currentCwd, $selectedStoredSessionId, $sessions } from '@/store/session'
import { $botChatScopes } from '@/store/session-states'
import { $statusbarVisible } from '@/store/statusbar-prefs'

import {
  IconBranch,
  IconCheck,
  IconChevronDown,
  IconFolder,
  IconKeyboard,
  IconMic,
  IconPanelLeft,
  IconSearch,
  IconSettings,
  IconTerminal,
  LogoMark
} from './Icons'
import { $aroProductMode, setAroProductMode } from './mode'
import {
  $aroDraftProjectId,
  $aroSessionProjectMap,
  resolveAroDraftProjectId,
  resolveAroSessionProjectId
} from './project-session-map'
import { IconButton, Kbd } from './ui'

export interface AroThemeOption {
  id: string
  label: string
  swatch: [string, string, string]
}

export const ARO_THEMES: AroThemeOption[] = [
  { id: 'obsidian', label: 'Obsidian', swatch: ['#0b0d11', '#12151c', '#7c6bff'] },
  { id: 'daylight', label: 'Daylight', swatch: ['#f8f9fb', '#ffffff', '#6366f1'] },
  { id: 'nord', label: 'Nord', swatch: ['#242933', '#2e3440', '#88c0d0'] },
  { id: 'ember', label: 'Ember', swatch: ['#120d0a', '#1a130e', '#f97316'] },
  { id: 'paper', label: 'Paper', swatch: ['#f4efe6', '#faf7f2', '#d97706'] }
]

function getAvatarColor(name: string): string {
  const colors = ['#7c6bff', '#10b981', '#35d6c4', '#f97316', '#ec4899', '#3b82f6', '#8b5cf6']
  let hash = 0

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return (clean.slice(0, 2) || 'AR').toUpperCase()
}

export function AroTitlebar() {
  const navigate = useNavigate()

  // Hermes Layout & Session Stores
  const leftSideOpen = useStore($leftSideOpen)
  const fileBrowserOpen = useStore($fileBrowserOpen)
  const statusbarVisible = useStore($statusbarVisible)
  const selectedSessionId = useStore($selectedStoredSessionId)
  const sessions = useStore($sessions)
  const currentCwd = useStore($currentCwd)
  const repoStatus = useStore($repoStatus)
  const botChatScopes = useStore($botChatScopes)
  const connection = useStore($connection)

  // Hermes Agent/Bot Stores
  const profiles = useStore($profiles)
  const activeGatewayProfile = useStore($activeGatewayProfile)
  const selectedBot = useStore($selectedBot)
  const openBotChat = useStore($openBotChat)
  const workspaceOwnerLabels = useStore($workspaceOwnerLabels)

  // Shared product mode (Code = Sessions vs Bots = Agents)
  const product = useStore($aroProductMode)

  // Active theme
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    return (
      (typeof window !== 'undefined' && localStorage.getItem('aro.theme')) ||
      document.documentElement.dataset.theme ||
      'obsidian'
    )
  })

  const handleSetTheme = (themeId: string) => {
    setActiveTheme(themeId)
    document.documentElement.dataset.theme = themeId
    const isLight = themeId === 'daylight' || themeId === 'paper'
    document.documentElement.classList.toggle('dark', !isLight)
    document.documentElement.style.setProperty('color-scheme', isLight ? 'light' : 'dark')

    try {
      localStorage.setItem('aro.theme', themeId)
      window.dispatchEvent(new CustomEvent('aro:theme', { detail: themeId }))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const onThemeChange = () => {
      const current = localStorage.getItem('aro.theme') || document.documentElement.dataset.theme || 'obsidian'
      setActiveTheme(current)
    }

    window.addEventListener('aro:theme', onThemeChange)
    window.addEventListener('storage', onThemeChange)

    return () => {
      window.removeEventListener('aro:theme', onThemeChange)
      window.removeEventListener('storage', onThemeChange)
    }
  }, [])

  // Voice orb toggle state
  const [voiceOrbOn, setVoiceOrbOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('conductor.voice.orb') !== 'false'
    } catch {
      return true
    }
  })

  const toggleVoiceOrb = () => {
    const next = !voiceOrbOn
    setVoiceOrbOn(next)

    try {
      localStorage.setItem('conductor.voice.orb', String(next))
      window.dispatchEvent(new CustomEvent('conductor:voice:orb', { detail: next }))
    } catch {
      // ignore
    }
  }

  // Active session and bot recognition (Session + Agent = Bot)
  const activeSession = sessions.find(s => s.id === selectedSessionId)
  const isDraftSession = !activeSession || activeSession.id.startsWith('draft_')
  const sessionName = activeSession ? sessionTitle(activeSession) : ''
  const botScope = selectedSessionId ? botChatScopes[selectedSessionId] : undefined

  // Determine current active Bot identity:
  const currentProfileName = activeSession?.profile || activeGatewayProfile || selectedBot || 'default'
  const matchedProfile = profiles.find(p => p.name === currentProfileName || p.name === selectedBot)

  const profileDisplayName = matchedProfile
    ? profileLabel(matchedProfile)
    : currentProfileName !== 'default'
      ? currentProfileName
      : ''

  const activeBotKey = openBotChat?.key || selectedBot || 'default'

  const botDisplayName =
    workspaceOwnerLabels[activeBotKey] ||
    botScope?.workspaceTabTitle ||
    profileDisplayName ||
    (selectedBot && selectedBot !== 'default' ? selectedBot : '') ||
    'Aro Bot'

  const botName = botDisplayName
  const botInitials = getInitials(profileDisplayName || botName || 'Aro')
  const botAvatarColor = getAvatarColor(profileDisplayName || botName || 'default')

  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false)

  const projects = useStore($projects)
  const projectOwners = useStore($projectOwnerBySessionId)
  const aroSessionProjectMap = useStore($aroSessionProjectMap)
  const aroDraftProjectId = useStore($aroDraftProjectId)
  const projectScope = useStore($projectScope)

  const activeProject = useMemo(() => {
    const pId = activeSession
      ? activeSession.id.startsWith('draft_')
        ? aroSessionProjectMap[activeSession.id] || resolveAroDraftProjectId(aroDraftProjectId, projectScope)
        : resolveAroSessionProjectId(activeSession, projects, projectOwners, aroSessionProjectMap)
      : resolveAroDraftProjectId(aroDraftProjectId, projectScope)

    return pId ? projects.find(p => p.id === pId) : null
  }, [activeSession, aroDraftProjectId, aroSessionProjectMap, projectOwners, projectScope, projects])

  const projectRepoStatus = useStore(repoStatusForCwd(activeProject?.primary_path))
  const branchName = repoStatus?.branch || projectRepoStatus?.branch || activeSession?.git_branch || ''

  // Project directory name from cwd if available
  const projectName =
    activeProject?.name ||
    (currentCwd ? currentCwd.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'Aro' : 'Aro')

  const titleContext =
    product === 'bots'
      ? botName
      : isDraftSession
        ? activeProject?.name || ''
        : activeProject
          ? `${activeProject.name} · ${sessionName}`
          : sessionName

  // Platform Window Controls clearance
  const controlsPos = titlebarControlsPosition(connection?.windowButtonPosition, Boolean(connection?.isFullscreen))
  const measuredOverlayWidth = useWindowControlsOverlayWidth()
  const nativeOverlayWidth = measuredOverlayWidth ?? connection?.nativeOverlayWidth ?? 0

  const titlebarChrome = {
    darwinMajor: connection?.darwinMajor ?? 0,
    isFullscreen: Boolean(connection?.isFullscreen),
    windowButtonPosition: connection?.windowButtonPosition
  }

  const titlebarToolsRight = titlebarToolsRightCss(nativeOverlayWidth, titlebarChrome)

  // Quick settings open state
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false)

  const handleToggleTerminal = useCallback(() => {
    toggleTerminalPane()
  }, [])

  const handleToggleStatusbar = useCallback(() => {
    $statusbarVisible.set(!$statusbarVisible.get())
  }, [])

  return (
    <header
      className="app-titlebar minimal-titlebar"
      style={{
        paddingLeft: controlsPos.left > 14 ? `${controlsPos.left + 8}px` : '10px',
        paddingRight: titlebarToolsRight
      }}
    >
      {/* ── Left Area: Sidebar toggle + Logo + Product Switcher + Session/Bot info ── */}
      <div className="flex items-center gap-1.5 shrink-0" data-no-drag>
        {!leftSideOpen && (
          <Tip label="Show sidebar · ⇧⌘B" side="bottom">
            <IconButton icon={IconPanelLeft} label="Show sidebar" onClick={() => toggleLeftSide()} size={28} />
          </Tip>
        )}

        <LogoMark size={20} />

        {/* Product mode switcher (Code = Sessions vs Bots = Agents) */}
        <div aria-label="Workspace mode" className="product-switcher ml-1" role="group">
          <button
            aria-pressed={product === 'code'}
            className={`product-option ${product === 'code' ? 'selected' : ''}`}
            onClick={() => setAroProductMode('code')}
            type="button"
          >
            Code
          </button>
          <button
            aria-pressed={product === 'bots'}
            className={`product-option ${product === 'bots' ? 'selected' : ''}`}
            onClick={() => setAroProductMode('bots')}
            type="button"
          >
            Bots
          </button>
        </div>

        {/* Project & Active Session / Bot Name */}
        {(titleContext || (!isDraftSession && product === 'code')) && (
          <div className="selected-project-title flex items-center gap-2">
            <span
              className="size-2 rounded-full shrink-0 shadow-(--aro-shadow-e1)"
              style={{
                backgroundColor: product === 'bots' ? '#35d6c4' : activeProject?.color || '#10b981'
              }}
              title={product === 'bots' ? `Bot: ${botName}` : `Project: ${activeProject?.name || projectName}`}
            />
            <span className="truncate max-w-[200px] font-medium text-aro-ink" title={titleContext}>
              {titleContext}
            </span>

            {/* Bot / Agent Badge */}
            {product === 'bots' && botName && (
              <span
                className="titlebar-bot-pill cursor-pointer"
                onClick={() => setProfilePopoverOpen(true)}
                title={`Active Bot: ${botName} (Click to switch)`}
              >
                {botName.toUpperCase()}
              </span>
            )}

            {/* Git Branch Badge */}
            {!isDraftSession && branchName && (
              <span
                className="hidden items-center gap-1 font-mono text-aro-xs text-aro-ink-3 md:flex"
                title={`Git branch: ${branchName}`}
              >
                <IconBranch size={11} />
                <span className="max-w-[100px] truncate">{branchName}</span>
              </span>
            )}

            {/* Open Project Folder button */}
            <Tip label="Open folder as project · ⌘O" side="bottom">
              <button
                aria-label="Open project folder"
                className="hidden items-center gap-1.5 rounded-control border border-aro-line bg-aro-raise px-2 py-[2.5px] text-aro-ink-2 hover:border-aro-line-strong hover:bg-aro-hover transition-colors cursor-pointer text-xs sm:flex"
                onClick={() => void openFolderAsProject()}
                type="button"
              >
                <IconFolder className="shrink-0 text-aro-ink-4" size={12} />
                <span className="hidden md:inline font-medium text-aro-ink-3">Open folder</span>
              </button>
            </Tip>
          </div>
        )}
      </div>

      <div className="titlebar-spacer" />

      {/* ── Center Area: Global Search Pill (Command Palette) ── */}
      <div className="shrink-0 flex items-center" data-no-drag>
        <button
          aria-label="Search sessions and commands · ⌘K"
          className="titlebar-search"
          onClick={() => openCommandPalette()}
          type="button"
        >
          <IconSearch size={12} />
          <span className="titlebar-search-label">Search</span>
          <span className="titlebar-search-kbd">
            <Kbd>⌘K</Kbd>
          </span>
        </button>
      </div>

      <div className="titlebar-spacer" />

      {/* ── Right Area: Shortcuts + Profile/Bot + Quick Settings + Window Chrome Clearance ── */}
      <div className="flex items-center gap-1.5 shrink-0" data-no-drag>
        {/* Keyboard shortcuts */}
        <Tip label="Keyboard shortcuts · ⌘/" side="bottom">
          <IconButton icon={IconKeyboard} label="Keyboard shortcuts" onClick={() => openCommandPalette()} size={28} />
        </Tip>

        {/* Active Profile / Agent Bot Switcher */}
        <Popover onOpenChange={setProfilePopoverOpen} open={profilePopoverOpen}>
          <Tip label={`Agent Bot: ${profileDisplayName || botName} · Switch profile`} side="bottom">
            <PopoverTrigger asChild>
              <button
                aria-label={`Agent Bot: ${profileDisplayName || botName}`}
                className="titlebar-profile-btn"
                type="button"
              >
                <span className="titlebar-profile-avatar" style={{ backgroundColor: botAvatarColor }}>
                  {botInitials}
                  <span className="titlebar-profile-status" />
                </span>
                <span className="max-w-[85px] truncate font-medium text-aro-ink hidden sm:inline">
                  {profileDisplayName || botName}
                </span>
                <IconChevronDown className="text-aro-ink-4 shrink-0" size={10} />
              </button>
            </PopoverTrigger>
          </Tip>
          <PopoverContent
            align="end"
            className="w-68 p-1.5 bg-aro-overlay border border-aro-line text-aro-ink shadow-aro-e4 rounded-overlay"
            side="bottom"
            sideOffset={6}
          >
            {/* Identity Card */}
            <div className="flex items-center gap-2.5 rounded-panel bg-aro-sunken p-2">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-(--aro-shadow-e1)"
                style={{ backgroundColor: botAvatarColor }}
              >
                {botInitials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-aro-ink">
                    {profileDisplayName || botName}
                  </span>
                  <span className="rounded-control bg-aro-iris-soft/15 px-1 py-0.5 font-mono text-[8.5px] font-bold text-aro-iris uppercase">
                    Agent
                  </span>
                </div>
                <span className="block truncate text-xs text-aro-ink-4">
                  {matchedProfile?.role || 'Aro Agent Bot'}
                </span>
              </div>
            </div>

            {/* Profile / Bot Roster */}
            {profiles.length > 0 && (
              <>
                <div className="px-2 pt-2 pb-1 font-mono text-[var(--aro-text-2xs,9px)] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">
                  Switch Bot Profile
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {profiles.map(p => {
                    const isSelected = p.name === currentProfileName
                    const label = profileLabel(p)

                    return (
                      <button
                        className="quick-toggle-row"
                        key={p.name}
                        onClick={() => {
                          selectProfile(p.name)
                          setProfilePopoverOpen(false)
                        }}
                        type="button"
                      >
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: getAvatarColor(p.name) }}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {isSelected && <IconCheck className="text-aro-iris" size={12} />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="my-1 h-px bg-aro-line-soft" />

            {/* Manage Models & Agents */}
            <button
              className="quick-link-row"
              onClick={() => {
                setProfilePopoverOpen(false)
                navigate(SETTINGS_ROUTE)
              }}
              type="button"
            >
              <IconSettings className="shrink-0 text-aro-ink-4" size={13} />
              <span className="flex-1">Manage Models & Agents</span>
            </button>
          </PopoverContent>
        </Popover>

        {/* Quick Settings Popover Menu */}
        <Popover onOpenChange={setQuickSettingsOpen} open={quickSettingsOpen}>
          <PopoverTrigger asChild>
            <IconButton active={quickSettingsOpen} icon={IconSettings} label="Quick settings" size={28} />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-64 p-1.5 bg-aro-overlay border border-aro-line text-aro-ink shadow-aro-e4 rounded-overlay"
            side="bottom"
            sideOffset={6}
          >
            <div className="px-2 pt-1 pb-1 font-mono text-[var(--aro-text-2xs,9px)] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">
              Themes
            </div>

            {/* 5 Aro Themes Row */}
            <div aria-label="Theme switcher" className="quick-theme-row" role="group">
              {ARO_THEMES.map(t => (
                <button
                  aria-label={`Theme: ${t.label}`}
                  aria-pressed={activeTheme === t.id}
                  className={`quick-theme-dot ${activeTheme === t.id ? 'is-active' : ''}`}
                  key={t.id}
                  onClick={() => handleSetTheme(t.id)}
                  type="button"
                >
                  <i style={{ ['--dot' as string]: t.swatch[2] }} />
                </button>
              ))}
            </div>

            <div className="my-1 h-px bg-aro-line-soft" />

            {/* Toggles */}
            <button className="quick-toggle-row" onClick={() => toggleRightSide()} type="button">
              <span className="quick-toggle-box">{fileBrowserOpen && <IconCheck size={9} />}</span>
              <span className="flex-1">Workspace panel</span>
              <span className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">⌘L</span>
            </button>

            <button className="quick-toggle-row" onClick={handleToggleTerminal} type="button">
              <span className="quick-toggle-box">
                <IconTerminal size={9} />
              </span>
              <span className="flex-1">Terminal</span>
              <span className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">⌘J</span>
            </button>

            <button className="quick-toggle-row" onClick={handleToggleStatusbar} type="button">
              <span className="quick-toggle-box">{statusbarVisible && <IconCheck size={9} />}</span>
              <span className="flex-1">Status bar</span>
            </button>

            <button className="quick-toggle-row" onClick={toggleVoiceOrb} type="button">
              <span className="quick-toggle-box">{voiceOrbOn && <IconCheck size={9} />}</span>
              <span className="flex-1">Voice orb</span>
              <IconMic className="text-aro-ink-4" size={12} />
            </button>

            <div className="my-1 h-px bg-aro-line-soft" />

            {/* Full Settings Link */}
            <button
              className="quick-link-row"
              onClick={() => {
                setQuickSettingsOpen(false)
                navigate(SETTINGS_ROUTE)
              }}
              type="button"
            >
              <IconSettings className="shrink-0 text-aro-ink-4" size={13} />
              <span className="flex-1">Open full settings</span>
              <Kbd>⌘,</Kbd>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
