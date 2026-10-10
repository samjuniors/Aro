# Hermes Desktop WIRE BASELINE — @ merge-base `1cb25c3e335a`

**Commit:** `1cb25c3e335a1f9752d9008282f3f0e6ef825ec9` — "refactor(dashboard): single origin_mismatch return in WS origin guard" (fork `samjuniors/Aro` ∩ upstream `NousResearch/hermes-agent`)
**Scope:** Sections A–F are the ORIGINAL Hermes UI at the merge-base (the parity allow-list). Section G is fork-added wire from the branch `ui-port/2026-10-09` @ `6a5b698aad`, clearly separated.
**Method:** Read-only git plumbing (`git show` / `git grep` / `git ls-tree`) against the merge-base tree. All `file:line` refs are to the merge-base tree unless marked (CURRENT).
**Consumer contract:** the ported UI may ONLY call things in A–F (plus G where the fork surface is intentionally extended). This is the Phase 5 parity-gate document.

---

## A. Preload contextBridge API (`apps/desktop/electron/preload.ts`, 705 lines @ 1cb25c3e335a)

One exposed global: **`window.hermesDesktop`** via `contextBridge.exposeInMainWorld('hermesDesktop', {...})` (preload.ts:27). **155 top-level properties** (incl. 21 nested namespaces with ~110 additional members). 4 `ipcRenderer.sendSync` boot channels evaluated at preload time: `hermes:translucency:support` (:14), `hermes:hud:windowing` (:15), `hermes:feature-flags` (:19), `hermes:skin:local` (:24).

### A.1 Flat properties & methods (invoke/send)

| Property (signature) | Line | IPC channel | Notes / payload→return |
|---|---|---|---|
| `glassSupported`, `translucencySupported` | :30–31 | (sync facts) | booleans from sendSync answer |
| `localModelsEnabled`, `guestOnboardingEnabled` | :36,41 | (sync facts) | launch flags (`--local`, `--guest-onboarding`) |
| `localSkin` | :42 | (sync fact) | sanitized skin payload for first paint |
| `getConnection(profile?, opts?)` | :43 | `hermes:connection` | → HermesConnection {baseUrl, token, authMode, headers, wsUrl…} |
| `getEmbedHostOrigin()` | :45 | `hermes:embed-host:origin` | loopback origin for YouTube player host |
| `getConnectionFor({connectionId, profile})` | :47 | `hermes:connection:for` | registry-scoped backend descriptor |
| `getProfileRoutes(profiles: string[])` | :48 | `hermes:plugin-profile-routes` | → DesktopPluginProfileRoute[] |
| `revalidateConnection()` | :49 | `hermes:connection:revalidate` | |
| `touchBackend(profile?, {activeTurn?})` | :50 | `hermes:backend:touch` | pool keepalive → {ok} |
| `getPoolLimits()` / `setPoolLimits(limits)` | :51–52 | `hermes:pool-limits:get` / `:set` | |
| `getGatewayWsUrl(profile?)` | :53 | `hermes:gateway:ws-url` | fresh WS URL (mints OAuth ticket) |
| `getGatewayWsUrlFor({connectionId, profile})` | :55 | `hermes:gateway:ws-url-for` | registry-scoped WS URL |
| `getAgentRoster()` | :58 | `hermes:agents:roster` | union roster across connections |
| `openSessionWindow(sessionId, opts)` | :59 | `hermes:window:openSession` | opts {connectionId, profile, watch} |
| `openSessionInTerminal(sessionId, opts)` | :60 | `hermes:window:openInTerminal` | opts {cwd?, profile?} |
| `openWindow(options?: DesktopProfileRoute)` | :61 | `hermes:window:openInstance` | |
| `openBrowserWindow(tabId)` | :62 | `hermes:window:openBrowser` | |
| `claimAmbientCue(key)` | :81 | `hermes:ambient:claim` | → boolean |
| `onBrowserPopoutClosed(cb)` | :82–75 | on `hermes:browser-popout:closed` | arg tabId |
| `getBootProgress()` | :275 | `hermes:boot-progress:get` | |
| `getConnectionConfig(profile?)` | :276 | `hermes:connection-config:get` | |
| `saveConnectionConfig(payload)` | :277 | `hermes:connection-config:save` | |
| `applyConnectionConfig(payload)` | :278 | `hermes:connection-config:apply` | |
| `testConnectionConfig(payload)` | :279 | `hermes:connection-config:test` | |
| `getSecretStorageEncryption()` / `setSecretStorageEncryption(on)` | :282–283 | `hermes:secret-storage:get` / `:set` | → {on} |
| `sshConfigHosts()` | :307 | `hermes:ssh-config:hosts` | → {hosts} |
| `sshResolveHost(host)` | :308 | `hermes:ssh-config:resolve` | |
| `probeConnectionConfig(remoteUrl)` | :309 | `hermes:connection-config:probe` | |
| `oauthLoginConnectionConfig(remoteUrl, options?)` | :314 | `hermes:connection-config:oauth-login` | |
| `oauthLogoutConnectionConfig(remoteUrl)` | :316 | `hermes:connection-config:oauth-logout` | |
| `api(request: HermesApiRequest)` | :342 | `hermes:api` | THE REST proxy — see §D |
| `notify(payload: HermesNotification)` | :343 | `hermes:notify` | {title?, body?, silent?, kind?, sessionId?, focusSessionId?, tag?, icon?, activate?, notifyId?, actions?[]} (notification-types.ts:1–15) |
| `claimStartupLatency()` | :344 | `hermes:startup-latency:claim` | → ms \| null |
| `requestMicrophoneAccess()` | :345 | `hermes:requestMicrophoneAccess` | → boolean |
| `readWindowBelow()` | :346 | `hermes:window:readBelow` | window-underneath metadata (never pixels) |
| `readFileDataUrl(filePath)` | :347 | `hermes:readFileDataUrl` | |
| `readFileDataUrlForAttach(filePath)` | :348 | `hermes:readFileDataUrlForAttach` | |
| `dataUrlReadMax.get()` / `.set(maxMb)` | :349–352 | `hermes:data-url-read-max:get` / `:set` | |
| `readFileText(filePath)` | :353 | `hermes:readFileText` | |
| `readPluginSource(filePath)` | :354 | `hermes:readPluginSource` | |
| `selectPaths(options)` | :355 | `hermes:selectPaths` | dialog |
| `selectSavePath(options)` | :356 | `hermes:selectSavePath` | dialog |
| `writeClipboard(text)` / `readClipboard()` | :357–358 | `hermes:writeClipboard` / `hermes:readClipboard` | |
| `saveGatewayFile(payload)` | :359 | `hermes:saveGatewayFile` | drives /api/fs/download + read-data-url |
| `saveImageFromUrl(url)` | :360 | `hermes:saveImageFromUrl` | |
| `contextMenuEdit(command)` | :361 | `hermes:context-menu:edit` | |
| `contextMenuCopyImage()` | :362 | `hermes:context-menu:copy-image` | |
| `contextMenuSpellcheck(action)` | :363 | `hermes:context-menu:spellcheck` | |
| `contextMenuGuestAddWord(payload)` | :364 | `hermes:context-menu:guest-add-word` | |
| `onContextMenuSpellcheck(cb)` | :365–370 | on `hermes:context-menu-spellcheck` | |
| `saveImageBuffer({data, ext, name})` | :371 | `hermes:saveImageBuffer` | |
| `capturePreview(payload)` | :372 | `hermes:capturePreview` | |
| `savePastedText({text})` | :373 | `hermes:savePastedText` | |
| `saveClipboardImage()` | :374 | `hermes:saveClipboardImage` | |
| `getPathForFile(file)` | :375–381 | (webUtils, local) | |
| `normalizePreviewTarget(target, baseDir)` | :382 | `hermes:normalizePreviewTarget` | |
| `watchPreviewFile(url)` | :383 | `hermes:watchPreviewFile` | → watch id |
| `watchDirectory(dir)` | :384 | `hermes:watchDirectory` | |
| `stopPreviewFileWatch(id)` | :385 | `hermes:stopPreviewFileWatch` | |
| `setActiveWork(payload)` | :386 | send `hermes:active-work` | |
| `setTitleBarTheme(payload)` | :387 | send `hermes:titlebar-theme` | |
| `setNativeTheme(mode)` | :388 | send `hermes:native-theme` | |
| `setTranslucency(payload)` | :389 | send `hermes:translucency` | |
| `setKeepAwake(on)` | :390 | send `hermes:keep-awake` | |
| `setDisableF12(blocked)` | :401 | send `hermes:devtools:disable-f12` | |
| `setF12ShortcutActive(active)` | :402 | send `hermes:f12ShortcutActive` | |
| `onF12Shortcut(cb)` | :403–408 | on `hermes:f12-shortcut` | |
| `setPreviewShortcutActive(active)` | :409 | send `hermes:previewShortcutActive` | |
| `setPreviewGuestHidden(webContentsId, hidden)` | :410 | send `hermes:preview-guest-hidden` | |
| `openExternal(url)` | :412 | `hermes:openExternal` | |
| `openPreviewInBrowser(url)` | :421 | `hermes:openPreviewInBrowser` | |
| `reachPreviewUrl(url)` | :422 | `hermes:preview:reach` | |
| `setActiveConnectionRoute(route)` | :423 | send `hermes:connection:active-route` | |
| `fetchLinkTitle(url)` | :424 | `hermes:fetchLinkTitle` | |
| `resolveFavicon(url)` | :425 | `hermes:resolveFavicon` | |
| `sanitizeWorkspaceCwd(cwd)` | :426 | `hermes:workspace:sanitize` | |
| `revealLogs()` | :448 | `hermes:logs:reveal` | |
| `getRecentLogs()` | :449 | `hermes:logs:recent` | → {path, lines[]} |
| `reportRendererError(report)` | :452 | send `hermes:logs:renderer-error` | |
| `logLine(line)` | :453 | send `hermes:logs:renderer-line` | |
| `readDir(dirPath)` | :454 | `hermes:fs:readDir` | |
| `gitRoot(startPath)` | :455 | `hermes:fs:gitRoot` | |
| `revealPath(targetPath)` | :456 | `hermes:fs:reveal` | |
| `openDir(dirPath)` | :457 | `hermes:fs:openDir` | |
| `desktopPluginsRoot()` | :458 | `hermes:fs:desktopPluginsRoot` | |
| `reconcileDesktopPlugins()` | :459 | `hermes:fs:reconcileDesktopPlugins` | |
| `logsRoot(profile?)` | :460 | `hermes:fs:logsRoot` | |
| `renamePath(targetPath, newName)` | :461 | `hermes:fs:rename` | |
| `writeTextFile(filePath, content)` | :462 | `hermes:fs:writeText` | |
| `trashPath(targetPath)` | :463 | `hermes:fs:trash` | |
| `onClosePreviewRequested(cb)` | :514–519 | on `hermes:close-preview-requested` | |
| `onPreviewNav(cb)` | :520–525 | on `hermes:preview-nav` | arg command |
| `onOpenFolderRequested(cb)` | :526–531 | on `hermes:open-folder-requested` | |
| `onOpenUpdatesRequested(cb)` | :532–537 | on `hermes:open-updates` | |
| `onDeepLink(cb)` | :538–543 | on `hermes:deep-link` | |
| `signalDeepLinkReady()` | :544 | `hermes:deep-link-ready` | |
| `probePluginRepo(payload)` | :545 | `hermes:plugin:probe` | |
| `installDesktopPlugin(payload)` | :546 | `hermes:plugin:installDesktop` | |
| `removeDesktopPlugin(payload)` | :547 | `hermes:plugin:removeDesktop` | |
| `onWindowStateChanged(cb)` | :548–553 | on `hermes:window-state-changed` | |
| `onFocusSession(cb)` | :554–559 | on `hermes:focus-session` | |
| `onNotificationAction(cb)` | :560–565 | on `hermes:notification-action` | |
| `onNotificationActivate(cb)` | :566–571 | on `hermes:notification-activate` | |
| `onExternalOpenFailed(cb)` | :572–577 | on `hermes:external-open-failed` | |
| `onPreviewFileChanged(cb)` | :578–583 | on `hermes:preview-file-changed` | |
| `onBackendExit(cb)` | :584–589 | on `hermes:backend-exit` | |
| `onPoolBackendRetiring(cb)` | :593–598 | on `hermes:pool:retiring` | |
| `onConnectionApplied(cb)` | :601–606 | on `hermes:connection:applied` | |
| `onPowerResume(cb)` | :607–612 | on `hermes:power-resume` | |
| `getOnBattery()` | :614 | `hermes:power-battery:get` | |
| `onBatteryChanged(cb)` | :615–620 | on `hermes:power-battery` | |
| `onBootProgress(cb)` | :621–626 | on `hermes:boot-progress` | |
| `getBootstrapState()` | :632 | `hermes:bootstrap:get` | |
| `probeLocalBackend()` | :633 | `hermes:local-backend:probe` | |
| `continueBootstrapLocal()` | :634 | `hermes:bootstrap:continue-local` | |
| `recycleBackend(profile)` | :635 | `hermes:backend:recycle` | |
| `resetBootstrap()` | :636 | `hermes:bootstrap:reset` | |
| `repairBootstrap()` | :637 | `hermes:bootstrap:repair` | |
| `cancelBootstrap()` | :638 | `hermes:bootstrap:cancel` | |
| `onBootstrapEvent(cb)` | :639–644 | on `hermes:bootstrap:event` | |
| `getVersion(scope?)` | :645 | `hermes:version` | scope {connectionId?, profile?} |
| `relaunchApp()` | :646 | `hermes:app:relaunch` | |
| `getMachineProfile()` | :647 | `hermes:machine:profile` | |
| `getRemoteDisplayReason()` | :648 | `hermes:get-remote-display-reason` | |
| `findInPage(query, options)` | :688 | `hermes:find-in-page` | |
| `stopFindInPage()` | :689 | `hermes:stop-find-in-page` | |
| `onFoundInPage(cb)` | :690–695 | on `hermes:found-in-page` | |
| `onOpenFindBarRequested(cb)` | :699–704 | on `hermes:open-find-bar` | |

### A.2 Namespaces

| Namespace | Members (line) → channel |
|---|---|
| `windowRelay` (:63–79) | `send(payload)` → send `hermes:window:relay`; `onMessage(cb)` ← on `hermes:window:relay` |
| `windowControls` (:80–85) | `custom` (fact); `minimize()`/`toggleMaximize()`/`close()` → send `hermes:window-control` with 'minimize'\|'toggle-maximize'\|'close' |
| `wakeIndicator` (:86–96) | `getState()` → `hermes:wake-indicator:get`; `setState(state)` → send `hermes:wake-indicator:set`; `onState(cb)` ← `hermes:wake-indicator:state` |
| `chatOnboarding` (:97–100) | `grow(request)` → send `hermes:chat-onboarding:grow`; `soloBoot()` → send `hermes:chat-onboarding:solo-boot` |
| `petOverlay` (:101–122) | `open(request)`→`hermes:pet-overlay:open`; `close()`→`:close`; `setBounds`/`setIgnoreMouse`/`setFocusable`/`pushState`/`control` → send `:set-bounds`/`:ignore-mouse`/`:set-focusable`/`:state`/`:control`; `onState`/`onControl` ← on same |
| `hud` (:126–182) | facts `nativeDrag`, `windowing{clientPlacement, controlDrag, nativeDrag, solid, workspaceTransfer}`; `open(request)`→`hermes:hud:open`; `close()`→`:close`; `setIgnoreMouse`/`beginMove`/`endMove`/`moveBy`/`setWorkspaceTransfer`/`setBounds`/`setSession` → send `:ignore-mouse`/`:begin-move`/`:end-move`/`:move-by`/`:workspace-transfer`/`:set-bounds`/`:session`; `resetLayout()`→`:reset-layout`; `setFrost(showing)`→`:frost`; `onGoto`←`:goto`; `onChanged`←`:changed`; `onCursor`←`:cursor`; `onGameOverlay`←`:game-overlay` |
| `hudModifier` (:183–193) | `getSettings()`→`hermes:hud-modifier:settings:get`; `setEnabled(enabled)`→`:settings:set`; `openPermissionSettings()`→`:permission`; `onStatus(cb)`←`:status` |
| `screenshot` (:195–227, darwin) | `getSettings()`/`setEnabled(v)`/`openPermissionSettings(kind)`/`capture(requestId)` → `hermes:screenshot:settings:get`/`:settings:set`/`:permission`/`:capture`; `onStatus`←`:status`; `onRequest`←`:request` + refcounted send `hermes:screenshot:subscribe` true/false |
| `quickEntry` (:232–274) | `getSettings()`/`setSettings(patch)`/`submit(payload)` → `hermes:quick-entry:settings:get`/`:settings:set`/`:submit`; `ackSubmit(correlationId, result)`/`dismiss()`/`pushState(payload)` → send `:ack`/`:dismiss`/`:state`; `onState`←`:state`; `onSubmit`←`:submit`; `onShown`←`:shown`; `onLateResult`←`:late-result` |
| `connections` (:285–306) | `list()`/`save`/`remove(id)`/`setPrimary(id)`/`setLaunchMode(mode)`/`setLastUsed(id)`/`test(id)`/`updateManaged(id)`/`updateAll(options)` → `hermes:connections:list`/`:save`/`:remove`/`:set-primary`/`:set-launch-mode`/`:set-last-used`/`:test`/`:update-managed`/`:update-all`; `onChanged`←`:changed` |
| `cloud` (:319–325) | `status()`/`login()`/`logout()`/`discover(org)`/`agentSignIn(dashboardUrl)` → `hermes:cloud:status`/`:login`/`:logout`/`:discover`/`:agent-sign-in` |
| `profile` (:326–338) | `getDefault()`/`setDefault(route)`/`get()`/`remember(name)`/`set(name)` → `hermes:profile:default:get`/`:default:set`/`:get`/`:remember`/`:set`; `onDefaultChanged`←`:default:changed` |
| `dataUrlReadMax` (:349–352) | `get()`/`set(maxMb)` → `hermes:data-url-read-max:get`/`:set` |
| `settings` (:427–431) | `getDefaultProjectDir()`/`setDefaultProjectDir(dir)`/`pickDefaultProjectDir()` → `hermes:setting:defaultProjectDir:get`/`:set`/`:pick` |
| `zoom` (:432–447) | `get()`→`hermes:zoom:get`; `factor()`→webFrame.getZoomFactor() (local); `setPercent(percent)`→send `hermes:zoom:set-percent`; `onChanged`←`:changed` |
| `minimizeToTray` (:391–400) | `get()`/`set(on)` → `hermes:minimize-to-tray:get`/`:set`; `onChanged`←`:changed` |
| `mcpOauth` (:413–420) | `listen()`/`wait(id, timeoutMs)`/`cancel(id)` → `hermes:mcp-oauth:listen`/`:wait`/`:cancel` |
| `git` (:464–491) | `worktreeList(repoPath)`/`worktreeAdd(repoPath, options)`/`worktreeRemove(repoPath, worktreePath, options)`/`branchList(repoPath)`/`baseBranchList(repoPath)`/`repoStatus(repoPath)`/`fileDiff(repoPath, filePath)`/`scanRepos(roots, options)` → `hermes:git:worktreeList`/`:worktreeAdd`/`:worktreeRemove`/`:branchList`/`:baseBranchList`/`:repoStatus`/`:fileDiff`/`:scanRepos`; `branchSwitch(repoPath, branch)` → `:branchSwitch`; `review.*` → `hermes:git:review:list\|diff\|stage\|unstage\|revert\|revParse\|commit\|commitContext\|push\|shipInfo\|prList\|createPr` |
| `terminal` (:492–513) | `attach(id)`/`cwd(id)`/`dispose(id)`/`resize(id, size)`/`start(options)`/`write(id, data)` → `hermes:terminal:attach`/`:cwd`/`:dispose`/`:resize`/`:start`/`:write`; `onData(id, cb)`←`hermes:terminal:<id>:data`; `onExit(id, cb)`←`hermes:terminal:<id>:exit` |
| `uninstall` (:649–652) | `summary()`→`hermes:uninstall:summary`; `run(mode)`→`:run` body {mode} |
| `updates` (:653–672) | `check(opts)`/`apply(opts)`/`getBranch()`/`setBranch(name)` → `hermes:updates:check`/`:apply`/`:branch:get`/`:branch:set`; `takePendingRun()`/`ackPendingRun(sent)` → `:metric:take`/`:metric:ack`; `onProgress`←`:progress`; `onPendingRun`←`:metric:pending` |
| `desktopMetrics` (:673–677) | `setEnabled(on, profile)`/`takeRendererCrashes()`/`ackRendererCrashes(sent)` → `hermes:desktop-metrics:set-enabled`/`:crash:take`/`:crash:ack` |
| `themes` (:678–681) | `fetchMarketplace(id)`/`searchMarketplace(query)` → `hermes:vscode-theme:fetch`/`:search` |

**HermesApiRequest shape** (global.d.ts:1474–1492): `{ path: string; method?; body?; upload?: {filename, contentType?, bytes: ArrayBuffer}; timeoutMs?; profile?: string|null; connectionId?: string|null; priority?: 'foreground'|'background'; passive?: boolean }` — routes through `hermes:api` to the backend's HTTP origin.

**Dead-at-merge-base entry:** `getSyncStatus` declared in global.d.ts:620, `hermes:sync-status` handled (main.ts:18810), but preload.ts @ merge-base does **not** wire it (UNKNOWN whether upstream re-added later).

**Second preload (preview guest):** `preview-guest-preload.ts` exposes no API object — installs a click-capture forwarding trusted `_blank` clicks over channel **`preview-open-external`** (`src/lib/preview-external.ts` `PREVIEW_EXTERNAL_CHANNEL`).

## B. Electron IPC channels (apps/desktop/electron @ 1cb25c3e335a)

209 static `ipcMain.handle`/`ipcMain.on` registrations + 5 `ipc.handle` + dynamic families + 42 push channels.

### B.1 `sendSync` (preload boot)

| Channel | file:line | Payload |
|---|---|---|
| `hermes:translucency:support` | main.ts:18243 | → {glass, translucency} |
| `hermes:hud:windowing` | hud-ipc.ts:45 | → windowing flags |
| `hermes:feature-flags` | main.ts:18254 | → {localModels?, guestOnboarding?} |
| `hermes:skin:local` | main.ts:18613 | → skin payload |
| `hermes:hud:native-drag` | hud-ipc.ts:41 | (legacy answer; not in preload) |

### B.2 `ipcMain.handle` — invoke channels by domain

**Backend lifecycle / pool / gateway**
`hermes:connection` main.ts:15558 · `hermes:connection:for` :15623 · `hermes:connection:revalidate` :15671 · `hermes:backend:touch` :15770 · `hermes:backend:recycle` :15942 · `hermes:pool-limits:get`/`:set` :15778–79 · `hermes:gateway:ws-url` :15787 · `hermes:gateway:ws-url-for` :16660 · `hermes:agents:roster` :16629 · `hermes:local-backend:probe` :16058 · `hermes:boot-progress:get` :16056 · `hermes:plugin-profile-routes` :16068

**Connection config / registry / cloud / ssh / profile**
`hermes:connection-config:get` :16065 · `:save` :17023 · `:apply` :17030 · `:test` :16181 · `:probe` :16840 · `:oauth-login` :16841 · `:oauth-logout` :16977 · `hermes:secret-storage:get`/`:set` :16186–87 · `hermes:connections:list`/`:save`/`:remove`/`:set-primary`/`:set-launch-mode`/`:set-last-used`/`:test` :16193–16238 · `:update-managed` :16712 · `:update-all` :16719 · `hermes:ssh-config:hosts`/`:resolve` :16140–41 · `hermes:cloud:status`/`:login`/`:logout`/`:discover`/`:agent-sign-in` :16998–17017 · `hermes:profile:default:get`/`:default:set`/`:get`/`:remember`/`:set` :17104–13 · `hermes:embed-host:origin` :1180 · `hermes:get-remote-display-reason` :1179 · `hermes:machine:profile` machine-profile.ts:18 · `hermes:version` :18743 · `hermes:sync-status` :18810 (dead — no preload wire)

**Windows / shell chrome / zoom / power**
`hermes:window:openSession` :15790 · `:openInstance` :15803 · `:openBrowser` :15809 · `:openInTerminal` :15843 · `:readBelow` :17164 · `hermes:zoom:get` :15904 · `hermes:power-battery:get` :6662 · `hermes:minimize-to-tray:get`/`:set` minimize-to-tray.ts:337–38 · `hermes:find-in-page`/`:stop-find-in-page` :18500–15 · `hermes:app:relaunch` :18783 · `hermes:ambient:claim` :17776

**HUD / wake / screenshot / quick-entry / pet**
`hermes:hud:open`/`:frost`/`:reset-layout`/`:close` hud-ipc.ts:137/146/274/294 · `hermes:hud-modifier:settings:get`/`:settings:set`/`:permission` hud-modifier.ts:128 · `hermes:screenshot:settings:get`/`:settings:set`/`:capture`/`:permission` command-screenshot.ts:166 · `hermes:wake-indicator:get` :15896 · `hermes:quick-entry:settings:get`/`:settings:set`/`:submit` :18336–92 · `hermes:pet-overlay:open`/`:close` pet-overlay-ipc.ts:42/73

**fs / files / clipboard / dialogs / preview**
`hermes:fs:readDir`/`:gitRoot`/`:reveal`/`:openDir`/`:desktopPluginsRoot`/`:reconcileDesktopPlugins`/`:logsRoot`/`:rename`/`:writeText`/`:trash` fs-ipc.ts:39–236 · `hermes:plugin:probe`/`:installDesktop`/`:removeDesktop` fs-ipc.ts:149–176 · `hermes:readFileDataUrl`/`:ForAttach` :17832/17856 · `hermes:readFileText` :17874 · `hermes:readPluginSource` :17922 · `hermes:selectPaths`/`hermes:selectSavePath` :17936/17977 · `hermes:writeClipboard`/`:readClipboard` :17969/17995 · `hermes:saveGatewayFile`/`:saveImageFromUrl`/`:saveImageBuffer`/`:savePastedText`/`:saveClipboardImage`/`:capturePreview` :17997–18081 · `hermes:data-url-read-max:get`/`:set` :17815–22 · `hermes:normalizePreviewTarget`/`:watchPreviewFile`/`:watchDirectory`/`:stopPreviewFileWatch` :18102–10 · `hermes:preview:reach`/`:openPreviewInBrowser` :18527/29 · `hermes:fetchLinkTitle`/`:resolveFavicon` :18577/79 · `hermes:workspace:sanitize` :18545 · `hermes:setting:defaultProjectDir:get`/`:set`/`:pick` :18539–63 · `hermes:context-menu:edit`/`:copy-image`/`:spellcheck`/`:guest-add-word` :18003–44

**git** (git-ipc.ts)
`hermes:git:worktreeList` :42 · `worktreeAdd` :44 · `worktreeRemove` :48 · `branchSwitch` :52 · `branchList` :56 · `baseBranchList` :58 · `repoStatus` :65 · `review:list` :70 · `review:diff` :73 · `fileDiff` :77 · `review:stage` :80 · `review:unstage` :83 · `review:revert` :86 · `review:revParse` :89 · `review:commit` :92 · `review:commitContext` :95 · `review:push` :98 · `review:shipInfo` :99 · `review:prList` :100 · `review:createPr` :103 · `scanRepos` :109

**terminal** (terminal-ipc.ts)
`hermes:terminal:start` :306 (payload {cwd?, backend?, ssh?}) → session id · `attach` :374 · `write` :386 · `resize` :398 · `cwd` :412 · `dispose` :422

**notifications / mcp-oauth / updates / uninstall / metrics / misc**
`hermes:notify` notification-ipc.ts:26 · `hermes:mcp-oauth:listen`/`:wait`/`:cancel` mcp-oauth-callback-ipc.ts:98/148/182 · `hermes:updates:check`/`:apply`/`:branch:get`/`:branch:set` :18668–90 · `hermes:updates:metric:take`/`:ack` update-metrics.ts:254–55 · `hermes:uninstall:summary`/`:run` desktop-uninstall.ts:78/84 · `hermes:desktop-metrics:set-enabled`/`:crash:take`/`:crash:ack` renderer-crash-metrics.ts:191–97 · `hermes:vscode-theme:fetch`/`:search` :19101/04 · `hermes:startup-latency:claim` startup-latency-ipc.ts:24 · `hermes:logs:reveal`/`hermes:logs:recent` :18581/97 · `hermes:deep-link-ready` :19227 · `hermes:api` :17717 (THE REST proxy)

### B.3 `ipcMain.on` — fire-and-forget send channels

`hermes:window:relay` :15825 · `hermes:window-control` window-controls.ts:98 ('minimize'|'toggle-maximize'|'close') · `hermes:connection:active-route` :15662 · `hermes:wake-indicator:set` :15897 · `hermes:zoom:set-percent` :15911 · `hermes:previewShortcutActive` :17126 · `hermes:preview-guest-hidden` :17132 · `hermes:f12ShortcutActive` :17140 · `hermes:active-work` :18147 · `hermes:titlebar-theme` :18163 · `hermes:native-theme` :18182 · `hermes:translucency` :18264 · `hermes:keep-awake` :18319 · `hermes:quick-entry:ack`/`:state`/`:dismiss` :18418–37 · `hermes:devtools:disable-f12` :18452 · `hermes:logs:renderer-error` :18604 · `hermes:skin:local` :18613 (sendSync answer) · `hermes:logs:renderer-line` :18627 · `hermes:hud:ignore-mouse`/`:begin-move`/`:end-move`/`:move-by`/`:set-bounds`/`:session`/`:workspace-transfer` hud-ipc.ts:158–286 · `hermes:pet-overlay:set-bounds`/`:ignore-mouse`/`:set-focusable`/`:state`/`:control` pet-overlay-ipc.ts:84–153 · `hermes:chat-onboarding:grow`/`:solo-boot` chat-onboarding-window.ts:11/31 · `hermes:screenshot:subscribe` command-screenshot.ts:227 · `retirement-fixture:descriptor` (e2e fixture only)

### B.4 main→renderer push channels (`webContents.send`)

`hermes:backend-exit` · `hermes:boot-progress` · `hermes:bootstrap:event` · `hermes:browser-popout:closed` · `hermes:close-preview-requested` · `hermes:connection:applied` · `hermes:connections:changed` · `hermes:context-menu-spellcheck` · `hermes:deep-link` · `hermes:external-open-failed` · `hermes:f12-shortcut` · `hermes:focus-session` · `hermes:found-in-page` · `hermes:hud:changed` · `hermes:hud:cursor` · `hermes:hud:game-overlay` · `hermes:hud:goto` · `hermes:hud-modifier:status` · `hermes:minimize-to-tray:changed` · `hermes:notification-action` · `hermes:notification-activate` · `hermes:open-find-bar` · `hermes:open-folder-requested` · `hermes:open-updates` · `hermes:pet-overlay:state` · `hermes:pet-overlay:control` · `hermes:pool:retiring` · `hermes:power-battery` · `hermes:power-resume` · `hermes:preview-file-changed` · `hermes:preview-nav` · `hermes:profile:default:changed` · `hermes:quick-entry:state`/`:submit`/`:shown`/`:late-result` · `hermes:screenshot:status`/`:request` · `hermes:terminal:<id>:data`/`:<id>:exit` (terminal-ipc.ts:191,338) · `hermes:updates:progress` · `hermes:updates:metric:pending` · `hermes:wake-indicator:state` · `hermes:window-state-changed` · `hermes:window:relay` · `hermes:zoom:changed`

## C. JSON-RPC methods (renderer ↔ Python gateway over WS)

Client: `HermesGateway extends JsonRpcGatewayClient` (src/api/client.ts:31–47; constructed use-gateway-boot.ts:962). Request: `gateway.request<T>(method, params?, timeoutMs?, signal?)`. Scoping: `profileScoped`/`ownerScoped`/`capabilityScoped`/`connectionScoped` (client.ts:75/94/219/158), `requestGatewayForProfile`/`ForAgent` (store/gateway.ts), `createSessionRpcDispatcher` (app/contrib/session-rpc-dispatcher.ts:52).
**Server contract: 251 methods in `apps/shared/src/gateway-contract.openrpc.json`** (generated from `tui_gateway/contracts`; `gateway-contract.generated.ts` 5,915 lines) — authoritative superset.

### C.1 Client→server methods INVOKED by the renderer (~128, with call sites)

**session.\*** (20): `session.activate` use-session-actions/index.ts:1655 · `session.active_list` use-background-sync.ts:1256 · `session.branch`/`branch_stored`/`branch_whole` :2809–23 · `session.close` :895/1229/3286 · `session.compress` use-prompt-actions/slash.ts:721 · `session.context_breakdown` use-context-breakdown.ts:161 · `session.control` store/session-control.ts:826 · `session.control.read` (store) · `session.create` :1000 · `session.cwd.set` use-cwd-actions.ts:98 · `session.events.since` use-undelivered.ts:40 · `session.history` use-prompt-actions/rewind.ts:227 · `session.interrupt` :755 +6 · `session.list` onboarding-kickoff.ts:143 · `session.redirect` :843 · `session.resume` resolve-target-session.ts:104 +13 · `session.save` desktop-slash-commands.ts:307 · `session.status` :312 · `session.steer` :919 · `session.title` session-actions-menu.tsx:127 +5 · `session.usage` :1668 · `session.workspace.move` store/projects.ts:724

**prompt.\***: `prompt.submit` :1034 +11 (ack timeout 1800s) · `prompt.background` slash.ts:648 · `prompt.btw` :596

**config.\***: `config.get` approval-mode.ts:69, use-cwd-actions.ts:34/71, use-background-sync.ts:1113 · `config.set` model-presets.ts:91/95, display-toggles.ts:42, voice-live.ts:50, use-model-controls.ts:339, slash.ts:892, onboarding-kickoff.ts:93 — keys are dotted names (approvals.mode, reasoning, fast, voice.voice_chat_mode, …)

**completions/commands/slash**: `complete.path` use-at-completions.ts:218, use-context-suggestions.ts:37 · `complete.slash` use-slash-completions.ts:219 · `commands.catalog` :96/177, slash.ts:1126 · `command.dispatch` slash.ts:439 · `slash.exec` :403, store/goals.ts:174

**approvals/connection/clarify**: `approval.respond` group-turns.ts:814 (timeout 300s) · `approval.pending`/`approval.received` store/prompts.ts:283/256 (RPC result values) · `connection.respond` store/connection-request.ts:396–401

**model/llm/image/files**: `model.options` model-picker.tsx:92 · `llm.oneshot` lib/oneshot.ts:46, store/projects.ts:937 · `image.attach` :156 · `image.attach_bytes` :151 · `image.detach` use-composer-actions.ts:843 · `image.generate` avatar-image.ts:86, avatar-picker.tsx:100, group-chat-parts.tsx:75 · `file.attach` :176

**profiles.\***: `profiles.list` data.ts:341 · `profiles.configure` :402, soul.ts:130 · `profiles.set_asset` :476/487 · `profiles.create` profile-ops.ts:377 · `profiles.describe` create-dialog.tsx:312 · `profiles.get_asset` :183 · `profiles.remember_onboarding` onboarding-handoff.ts:156

**skills/plugins/mcp/reload**: `skills.manage` skills-hub.tsx:146/178 · `plugins.manage` store/agent-plugins.ts:412 · `mcp.catalog` create-dialog.tsx:315 · `mcp.servers.oauth.start|poll|callback|cancel` api/mcp.ts:60 · `reload.mcp` use-mcp-servers.ts:154, suggestion-providers/mcp.ts:208, repair.ts:49 · `reload.env` free-tier-sign-in.ts:285, onboarding.ts:439/1277

**pets.\*** (10): `pet.cancel`/`disable`/`export`/`gallery`/`generate`/`generate.status`/`hatch`/`info`/`info.meta`/`remove`/`rename`/`scale`/`select`/`thumb` (store/pet-gallery.ts, store/pet-generate.ts, floating-pet.tsx, plugins/hermes-bots/pet.tsx)

**wake.\***: `wake.start` wake-word.ts:294/329/398 · `wake.stop` :323, slash.ts:984 · `wake.status` :270, slash.ts:948 · `wake.pause` use-composer-voice.ts:363 · `wake.resume` wake-word.ts:361 · `wake.feed` wake-client-capture.ts:283

**billing/subscription/free_tier**: `billing.state`/`charge`/`charge_status`/`auto_reload`/`step_up` settings/billing/api.ts:148–173 · `subscription.state`/`change`/`preview`/`resume` :158–65 · `free_tier.status`/`provision`/`ack_notice` store/free-tier.ts:40/128/140

**vault.\***: `vault.list`/`add`/`remove`/`lock`/`unlock`/`sources`/`source.set` settings/vault-settings.tsx:206–371

**display.\***: `display.start` screen-pane.tsx:341 · `display.status` :116 · `display.observe` :211 · `display.thumbnail` screen-hero.tsx:68 · `display.install` screen-install.tsx:107 · `display.lease.acquire`/`release` :379/404

**handoff/subagent/process/setup/onboarding**: `handoff.request`/`state`/`fail` use-prompt-actions/index.ts:541/565/586 · `subagent.list` use-subagent-snapshot.ts:42 · `subagent.tail` subagent-transcript.tsx:37 · `process.kill` composer-status.ts:482/519 · `process.stop` slash.ts:560 · `setup.status`/`runtime_check` runtime-readiness.ts:104–05 · `onboarding.reset_setup_profile` onboarding-gate.ts:141 · `onboarding.ensure_setup_profile` (contract; onboarding flows)

**shared_metrics.\***: `set` shared-metrics.ts:49 · `status` :35 · `update_run` :108 · `startup_latency` report-startup-latency.ts:22 · `desktop_daily` desktop-metrics.ts:838 · `slash_command` slash.ts:1360 (+ desktop_dislike/desktop_feature_use/desktop_friction/desktop_onboarding in contract)

**bots/relay/misc**: `bot_relay.roster.sync` relay.ts:402/476 · `bot_relay.reply` :622 · `cli.exec` profile-ops.ts:449 +4 · `i18n.languages`/`i18n.catalog` i18n/backend-packs.ts:89–90 · `message.react` store/reactions.ts:100 · `clarify.lock` group-turns.ts:824 · `connectors.connect`/`operation.wake`/`accounts`/`accounts.remove`/`catalog`/`list`/`operation.status`/`policy.get`/`policy.set`/`tools` (capabilities/connectors/data/queries.ts, connector-tool.tsx:89) · `browser.manage` slash.ts:1229 · `preview.restart` use-preview-routing.ts:73 · `diagnostics.share_nous` send-diagnostics.ts:110 · `cron.manage` plugins/hermes-bots/cron.tsx:1013 · `ping` use-gateway-boot.ts:651/1215, gateway.ts:2141

**Channel-internal (auto)**: `client.capabilities` (json-rpc-channel.ts:511 — sent on every `gateway.ready` with `{server_requests: true}`; result `declines_not_shown`) · `gateway.ping` heartbeat (json-rpc-channel.ts:558)

### C.2 Server→client REQUESTS the renderer answers (13)

Registry `SERVER_REQUEST_HANDLERS` (server-requests.ts:661–675): `approval` · `clarify` · `display.install.sudo` · `preview.act` · `preview.read` · `secret` · `sudo` · `terminal.read` · `tour` · `vault.code` · `vault.save_login` · `vault.unlock_prompt` · `window.read`. Window-owned subset (`WINDOW_OWNED_REQUESTS` :107): `preview.act`, `preview.read`, `terminal.read`, `window.read`, `tour`. Unanswered → `-32601`; crash → `-32603`; decline code `4404`. `open_requests` ride back inside `session.resume`/`session.activate`/`session.events.since` results (json-rpc-channel.ts:413–426).

### C.3 Server→client EVENT notifications (`method: 'event'`)

**74 backend event types** (GATEWAY_EVENT_TYPES, generated): `agent.terminal.output`, `approval.cancelled`, `background.complete`, `billing.step_up.verification`, `bot_relay.outbox.pending`, `browser.controller.cancel`, `browser.controller.command`, `browser.progress`, `btw.complete`, `connection.request`, `connection.update`, `cron.changed`, `display.install.done`, `display.install.log`, `display.lease`, `display.status`, `error`, `gateway.ready`, `layout.apply`, `message.complete`, `message.delta`, `message.interim`, `message.reaction`, `message.start`, `moa.aggregating`, `moa.phase`, `moa.progress`, `moa.reference`, `notice`, `notification.clear`, `notification.show`, `pairing.changed`, `pane.reveal`, `pet.changed`, `pet.generate.progress`, `pet.hatch.progress`, `platforms.changed`, `preview.close`, `preview.open`, `preview.restart.complete`, `preview.restart.progress`, `projects.changed`, `reaction`, `reasoning.available`, `reasoning.delta`, `request.cancel`, `review.summary`, `session.control.update`, `session.info`, `session.reclaimed`, `session.resume_progress`, `session.title`, `session.usage`, `sessions.changed`, `setup.ready`, `skin.changed`, `status.update`, `subagent.complete`, `subagent.progress`, `subagent.spawn_requested`, `subagent.start`, `subagent.thinking`, `subagent.tool`, `terminal.close`, `thinking.delta`, `tip.show`, `todo.updated`, `tool.complete`, `tool.generating`, `tool.output_risk`, `tool.start`, `voice.interrupted`, `voice.status`, `voice.transcript`, `wake.detected`

**5 client-local synthetic** (apps/shared/src/gateway-events.ts:23–29): `dashboard.new_session_requested`, `gateway.protocol_error`, `gateway.reconnecting`, `gateway.start_timeout`, `gateway.stderr`

**Event envelope** (gateway-events.ts:36–54): `{ type, payload?, session_id?, seq?, replayed?, replayEpoch?, connectionId?, profile? }` — `seq` = per-session monotonic counter for lossless replay via `session.events.since`. Dispatch: `GatewayEventHub.on(type) / onAny('*')` (json-rpc-gateway.ts:80–110); renderer families in `use-message-stream/gateway-event/` (desktop-bridge, input-requests, lifecycle, message-stream, session-control, session-info, status, tools).

## D. REST routes (renderer → backend HTTP, via IPC `hermes:api`)

All renderer REST via `hermesApi(request)` → main fetch with pooling + verb-gated retry (electron/api-transport.ts). **108 unique route templates** in `src/api/*`:

| Domain | Route (method) — file:line (api/*.ts) |
|---|---|
| status/logs | `GET /api/status` config.ts:88 · `GET /api/logs?file&lines&level&component&search` :125 |
| config | `GET /api/config` :132/161/186 · `GET /api/config/defaults` :165 · `GET /api/config/schema` :173 · `PUT /api/config` (body {config}; `?preserve_language=true`) :179/195 |
| env | `GET /api/env` :204 · `PUT /api/env` ({key, value, provider_setup?}) :213 · `DELETE /api/env` :227 · `POST /api/env/reveal` :236 |
| providers | `POST /api/providers/validate` :245 · `GET/POST /api/providers/custom-endpoints` :265/272 · `POST .../custom-endpoints/validate` :284 · `POST .../custom-endpoints/:id/activate` :296 · `DELETE .../custom-endpoints/:id` :307 · `GET /api/providers/oauth` :315 · `DELETE .../oauth/:id` :322 · `POST .../oauth/:id/start` :333 · `POST .../oauth/:id/submit` ({session_id, code}) :342 · `GET .../oauth/:id/poll/:sessionId` :356 · `DELETE .../oauth/sessions/:sessionId` :367 |
| cron | `GET /api/cron/jobs?profile=` cron.ts:33 · `GET/PUT/DELETE /api/cron/jobs/:id` :42/92/130 · `POST /api/cron/jobs` :82 · `GET /api/cron/jobs/:id/runs?limit` :50 · `GET /api/cron/delivery-targets` :72 · `POST .../:id/pause`/`resume`/`trigger` :101/111/119 (trigger 24h) · `GET /api/cron/blueprints` :150 · `POST /api/cron/blueprints/instantiate?profile=` :162 |
| local-models | `GET /api/local-models/status\|hardware\|catalog\|jobs` :14/21/28/92 · `POST .../runtime/install\|quickstart\|download\|activate\|eject\|server\|sideload\|download-browsed` :38–207 · `DELETE .../models/:modelId` :77 · `GET .../jobs/:jobId` :85 · `POST .../download/pause\|resume` :103/111 · `GET .../search?q&limit` :172 · `GET .../search/files?repo` :179 |
| mcp | `GET /api/mcp/servers` mcp.ts:71 · `PUT /api/mcp/servers` (whole-map replace {servers}) :43 · `POST /api/mcp/servers` :90 · `DELETE /api/mcp/servers/:name` :100 · `PUT .../servers/:name/enabled` :108 · `POST .../servers/:name/test` :28 (60s) · `GET /api/mcp/catalog?detect_apps` :118 · `POST /api/mcp/catalog/install` :130 (60s) |
| messaging | `GET/PUT /api/messaging/platforms` + `/:platformId` + `/:platformId/test` messaging.ts:19/38/50 · `POST /api/messaging/telegram/onboarding/start` :66 · `GET/DELETE .../onboarding/:pairingId` :78/100 · `POST .../onboarding/:pairingId/apply` :91 · `GET /api/pairing` :115 · `POST /api/pairing/approve`/`revoke` :128/141 · `GET/POST /api/webhooks` + `/enable` + `/:name` DELETE + `/:name/enabled` PUT :155–195 |
| models | `GET /api/model/info` models.ts:21 (5s) · `GET /api/analytics/usage?days` :29 · `GET /api/model/options?refresh&include_unconfigured&explicit_only` :57 (60s) · `GET /api/model/recommended-default?provider` :75 · `POST /api/model/set` :85/127 · `GET /api/model/auxiliary` :98 · `GET/PUT /api/model/moa` :105/115 |
| plugins | `ANY /api/plugins/<pluginId>/<path>` plugins.ts:79 (namespace-enforced) + plugin WS `/api/plugins/<id>/<path>?token=` :113 |
| profiles | `GET/POST /api/profiles` profiles.ts:12/19 · `PATCH/DELETE /api/profiles/:name` :41/61 · `GET/PUT /api/profiles/:name/soul` :69/75 · `GET .../:name/setup-command` :85 · `POST .../:name/export` :97 · `POST /api/profiles/import` :112 |
| sessions | `GET /api/sessions?limit&offset&min_messages&archived&order` sessions.ts:108 · `GET /api/profiles/sessions?...&profile=&source=&exclude_sources=` :150 · `GET /api/profiles/sessions/sidebar?recents_profile&recents_limit&cron_limit&messaging_limit&recents_exclude&messaging_exclude` :334 · `POST /api/profiles/sessions/pull-requests` :299 · `PATCH /api/sessions/:id` ({archived\|pinned\|unread\|title, profile?}) :383/401/420/729 · `DELETE /api/sessions/:id?profile=` :715 · `GET /api/sessions/:id?profile=` :445 · `GET /api/sessions/:id/messages?profile&limit&offset&order&include_compacted` :488 (±`passive`) · `GET /api/sessions/search?q=` :429 |
| skills/learning | `GET /api/skills` skills.ts:15 · `GET /api/skills/content?name` :27 · `PUT /api/skills/toggle` :38 · `GET /api/learning/graph` :47 · `GET/PUT/DELETE /api/learning/node` :62/78/69 · `GET /api/skills/hub/official\|sources` :103/110 · `GET .../hub/search?q&source&limit` :125 · `GET .../hub/preview?identifier` :133 · `GET .../hub/scan?identifier` :141 · `POST .../hub/install\|uninstall\|update` :149/157/166 (45s) |
| system | `GET/PUT /api/memory/providers/:provider/config?surface=declared` system.ts:60/72 · `POST .../oauth/start` · `GET .../oauth/status` :82/97 · `GET /api/memory` :108 · `POST /api/memory/reset` :114 · `GET /api/curator` · `PUT /api/curator/paused` · `POST /api/curator/run` :123–45 · `POST /api/gateway/restart` :148 · `POST /api/hermes/update` · `GET /api/hermes/update/check?force` :156/167 · `GET /api/actions/:name/status?lines` :175 |
| audio | `POST /api/audio/transcribe` ({data_url, mime_type}; 180–600s) :183 · `POST /api/audio/speak` ({text}) :208 · `POST /api/audio/tts-lease` ({active, lease}) :231 · `POST /api/audio/stt-lease` :254 · `GET /api/audio/elevenlabs/voices` :263 |
| git | `GET /api/git/gh-auth?refresh` :273 |
| ops | `POST /api/ops/doctor` · `security-audit` · `backup` · `debug-share` :292–323 (debug-share 120s) |
| toolsets | `GET /api/tools/toolsets` toolsets.ts:17 · `PUT /api/tools/toolsets/:name` :29 · `GET .../:name/config` :38 · `GET .../:name/models?provider` :44 · `PUT .../:name/model` :57 · `PUT .../:name/provider` :85 · `POST .../:name/post-setup` :99 · `GET /api/tools/terminal/backends` :112 · `PUT /api/tools/terminal/backend` :119 · `GET /api/tools/computer-use/status` :131 · `POST /api/tools/computer-use/permissions/grant` :138 |

**Main-process-driven REST (part of the wire):** `POST /api/auth/ws-ticket` (connection-config.ts:17) · `GET /api/fs/read-data-url?path=&session=` and `GET /api/fs/download?path=&session=` (gateway-file-download.ts:109–10) · `GET /` token discovery (dashboard-token.ts:39). **Sibling WS endpoints:** `/api/audio/speak-stream` (voice PCM), `/api/display/ws` (RFB) beside `/api/ws`.

## E. Wire envelope & transport (apps/shared @ 1cb25c3e335a)

- **Protocol**: JSON-RPC 2.0, one text frame per WS message (UTF-8; binary ArrayBuffer/view decoded — json-rpc-channel.ts:158–174).
  - Request: `{jsonrpc:'2.0', id, method, params}` (:319). Desktop ids = incrementing integers (`createRequestId: nextId => nextId`, api/client.ts:36); heartbeat ids `heartbeat-<n>`.
  - Response: `{jsonrpc, id, result | error:{code, message, data?}}` (JsonRpcFrame :12–18). Error codes: `-32601` method not found, `-32603` internal, `4404` session-not-shown decline.
  - Server→client request: same frame with **string** `id` + `method` (≠ 'event'); answered via `respond(result)`/`fail(code,msg)`/`decline(msg)` (:30–56).
  - Event notification: `{method:'event', params: GatewayEvent}` where params = `{type, payload, session_id, seq, …}` (:489–95).
- **Endpoint**: `ws://127.0.0.1:<port>/api/ws?token=<authToken>` (main.ts:12451, 13439). OAuth remotes: `wss://<origin>/api/ws?ticket=<single-use>` minted at `POST /api/auth/ws-ticket` (websocket-url.ts:53–90).
- **Discovery**: `spawn-ledger.json` ({host, port, profile, pid, purpose}; backend-discovery.ts:36) + token from `GET /` (`window.__HERMES_SESSION_TOKEN__`, backend-discovery.ts:13). WS viability probed by gateway-ws-probe.ts.
- **Lifecycle**: 15s open timeout; `gateway.ping` heartbeat 15s, liveness deadline 45s; full-jitter reconnect; lossless replay via `session.events.since` + seq watermarks + `replay_epoch` from `gateway.ready`; `open_requests` re-delivery on resume.
- **Timeouts**: RPC default 120s (channel) / 30s (desktop client.ts:18); startup burst 60s (:17); `prompt.submit` 1800s (:27); `approval.respond` 300s.
- **Capabilities**: `client.capabilities {server_requests: true}` on `gateway.ready` (json-rpc-channel.ts:508); no numeric protocol version — probing via `-32601`/404 handling (`src/lib/gateway-rpc.ts:7/31`).

## F. Config & persisted storage keys

### F.1 Main process (plain JSON under `app.getPath('userData')`; NO electron-store)

`active-profile.json` main.ts:1216 · `connection.json` :1325 · `connections.json` :1330 (REGISTRY_VERSION=2; connection-registry.ts:40) · `desktop-installation.json` :1331 · `updates.json` :1332 · `window-state.json` :1333 · `backend-ownership.json` :1334 · `managed-ssh-update-recovery.json` :1335 · `native-theme.json` :1441 · `translucency.json` :1478 · `pool-limits.json` :1965 · `zoom-state.json` :3698 · `project-dir.json` :5262/65 · `native-oauth-tokens.json` :7927 · `desktop-backend-spawn.json` :12829 (HERMES_HOME) · `minimize-to-tray.json` :13776 · `hud-state.json` :14380 · `quick-entry.json` :14895 · `screenshot.json` command-screenshot.ts:17 · `hud-modifier.json` hud-modifier.ts:18 · `favicon-cache.json` link-metadata.ts:318 · `spawn-ledger.json` backend-discovery.ts:36 (machine root) · `data-url-read-max.json` / `disable-f12.json` / `keep-awake.json` (userData) · `install-stamp.json` bundle-swap.ts:48 / main.ts:5032 · `.hermes-update-result.json` handoff-result.ts:40 · update marker updater/relaunch.ts:24 · `linux-gpu-fallback.json` linux-gpu-fallback.ts:33 · `nvidia-egl-fallback.json` linux-nvidia-egl-fallback.ts:49 · secret-storage policy :8402

### F.2 Renderer localStorage (~190 keys @ merge-base)

**Session/session-list:** `hermes.desktop.lastSessionId` (+ `.profile.<p>`, `.remote.<url>.<p>`) · `hermes.desktop.lastRoute` (+ variants) · `hermes.desktop.freshDraftKey` · `hermes.desktop.pinnedSessions` · `hermes.desktop.sessionOrder`/`.manual` · `hermes.desktop.sessionTiles.v1`/`v2` · `hermes.desktop.sessionOwnerHints.v1` · `hermes.desktop.sessionPreviews.v1` · `hermes.desktop.sessionSeenCounts` · `hermes.desktop.unreadFinishedSessions` · `hermes.desktop.routeTiles.v1` · `hermes.desktop.prScannedSessions`/`prBranchBySession` · `hermes.desktop.botChatSessions.v1`
**Workspace/projects:** `hermes.desktop.workspace-cwd` (+ variants) · `hermes.desktop.projectOrder`/`projectScope`/`dismissedAutoProjects` · `hermes.desktop.workspaceCollapsed`/`workspaceNodeOpen`/`workspaceOrder`/`workspaceParentOrder` · `hermes.desktop.agentsGroupedByWorkspace`
**Sidebar:** `hermes.desktop.sidebarSortKey`/`sidebarGrouping` (+ `.allProfiles`)/`sidebarShowAllSessions`/`sidebarShowArchived`/`sidebarProfileFilter`/`sidebarProjectFilter`/`sidebarPrFilter`/`sidebarStatusFilter`/`sidebarCardRows`/`sidebarRowMeta`/`sidebarCronOpen`/`sidebarMessagingOpen`/`sidebar.gatewayGroups.v1` · `hermes.desktop.hiddenStripTabs.v1` · `sessionListDensity` · `showAllProfiles`
**Composer/voice:** `hermes.desktop.composer.provider`/`.model`/`.model-source`/`.fast`/`.reasoning-effort`/`.model.registry.<conn>.<profile>` · `hermes:composer-drafts:v3` (composer.ts:238) · `hermes.desktop.composerQueue.v1` · `hermes.desktop.composerPopout.{enabled,gesturesEnabled,position,window.v1,zones.v1}` · `hermes.desktop.autoSpeakReplies` · `hermes.desktop.completionSoundVariantId`
**Models:** `hermes.desktop.favorite-models`/`known-models`/`visible-models`/`custom-models`/`collapsed-providers`/`model-presets`/`model-pricing.v1`/`staleAuxDismissal.v1`
**Layout/panes:** `hermes.desktop.layoutTree.v1`/`v2` · `layoutPresets.v1`/`v2` · `layoutPreset.active` · `layoutModeScopes.v1` · `paneStates.v1`/`paneShare.v1`/`paneSharePartners.v1`/`userPlacedPanes.v1`/`floatingPanes.v1`/`paneDockHeals.v1`/`panesFlipped`/`dismissedPanes.v1`/`rightRailActiveTab`/`mdTableColumns.v1` · **Terminal:** `hermes.desktop.terminals.v1`/`terminalTakeover` · **Preview:** `hermes.desktop.previewTabs.v2`/`previewDismissals.v1`/`preview-annotate-handoff.v1`/`previewAnnotate.windowId`/`previewAnnotate.destination.v1:<…>` · **Review:** `hermes.desktop.reviewOpen`/`reviewScope`/`reviewSelectedPath`/`reviewTreeMode`/`reviewCommitDefault` · **Files:** `hermes.desktop.files.showIgnored`
**Theme/appearance:** `hermes-desktop-theme-v2` · `hermes-desktop-mode-v1` · `hermes-boot-background`/`hermes-boot-color-scheme` · `hermes-desktop-profile-themes-v1`/`profile-modes-v1` · `hermes-desktop-active-profile-v1` · `hermes-desktop-user-themes-v1` · `hermes-desktop-backend-themes-v1` · `hermes.desktop.profileColors`/`profileOrder` · `hermes.desktop.chat-text-scale.v1` · `user-bubble-transparency.v1` · `hermes.desktop.translucency.v1`/`v2` · `hermes.desktop.textDirection` · `hermes.desktop.hideThreadTimeline` · `hermes.desktop.reasoning.collapsedByDefault` · `hermes.desktop.toolDisclosure.v1`/`toolView.technical`/`toolView.hideCodeDiffs` · `hermes.desktop.interfaceMode.v1` · `hermes.desktop.backdrop.v1` · `hermes.desktop.intro-splash.v1`
**Statusbar/tabs:** `hermes.desktop.statusbarHidden`/`.v2`/`statusbarVisible.v2` · `hermes.desktop.tabStripDefault` · `hermes.desktop.titlebarAppActions` · `hermes.desktop.keybinds` · `hermes.desktop.disableF12.v1` · `hermes.desktop.keepAwake.v1` · `hermes.desktop.hapticsMuted`
**Onboarding/tips/tours:** `hermes-desktop-onboarded-v1` · `hermes-onboarding-skipped-v1`/`-phase-v1`/`-wizard-answers-v1`/`-show-all-v1` · `hermes.desktop.tips.{last,next,retired,rotation,shownAt}.v1` · `hermes.desktop.tours.v1` · `hermes.desktop.tutorials.lifetime.v1`
**Plugins/connectors:** `hermes.desktop.pluginDecisions.v2` · `hermes.desktop.disabledPlugins.v1` · `hermes.connectors.identity.v4`/`hermes.connectors.v4.<...>` · `hermes.desktop.capabilities.skillsSortDesc`/`toolsetsSortDesc`
**Pet:** `hermes.desktop.pet-position.v2`/`pet-overlay-active.v1`/`pet-overlay-bounds.v1`/`pet-roam.v1` · `hermes.desktop.petgen.provider`/`petgen.remixConfirmed`
**Misc:** `hermes:native-notifications` (native-notifications.ts:46) · `hermes.desktop.metrics.v1` · `hermes.desktop.gatewayRegistryState`/`gatewaySurvivor` · `hermes.desktop.inflightTurnJournal.v1`/`.v2.migrated` · `hermes.transcript-tail.v1`/`.v2:<sid>`/`.v2-index` · `hermes.desktop.threadScroll.v1` · `hermes.desktop.vibeHearts.v1` · `hermes.desktop.reactions.v1` · `hermes.desktop.videoPlaybackSpeed` · `hermes.desktop.embed-allowed`/`embed-mode` · `hermes.desktop.alwaysExternalLinks.v1` · `hermes.desktop.real-profile-prompt-dismissed` · `hermes.updates.last-passive-check` · snooze keys: `hermes:update-toast-snooze-until`, `hermes:backend-skew-toast-snooze-until`, `hermes:gui-skew-toast-snooze-until`, `hermes:install-method-toast-snooze-until`, `hermes:mcp-health-snooze-until:<...>`, `hermes:discontinued-notice-dismissed-for` · `desktop.settings.keys.show_advanced` (env-credentials.tsx:63) · terminal keys (terminals.ts) · profile/connection-scoped suffix pattern: `.profile.<enc>` / `.remote.<enc>.<p>`

**sessionStorage:** `hermes.desktop.inflightTurnJournal.v2:<encodeURIComponent(sid)>` (inflight-turn-journal.ts:27,97) · preview-annotate per-window id (:85–92).
**NOT storage (excluded):** TanStack queryKeys, postMessage types (`hermes-plugin-pick`, `hermes-skill-pick`, `hermes-inline-preview-intent`), DOM tags (`hermes-watch`, `hermes-annotate`), BroadcastChannels (`hermes:sessions`, `hermes:radio:playback`, `hermes:radio:artist-lookup`), DOM CustomEvents (`hermes:composer-focus/submit/insert/...`), CSS classes (`hermes-radio-*`).

## G. FORK-ADDED wire surface (CURRENT tree `ui-port/2026-10-09` @ 6a5b698aad — NOT part of the merge-base baseline)

Diff scope: `apps/desktop/electron/preload.ts` (+26/−1), `aro-ipc.ts` (new, 312 lines), `git-ipc.ts` (+4/−4), `git-worktree-ops.ts` (+8/−8), `main.ts` (+97), `quit-finalization.ts`. **`apps/desktop/src/api` and `src/sdk` UNCHANGED vs merge-base (verified empty diff).**

### G.1 `hermes:git:cloneRepository` (fork-added IPC + preload)
Preload (CURRENT :356): `cloneRepository(repositoryUrl)` → `invoke('hermes:git:cloneRepository', repositoryUrl)`; typed global.d.ts (CURRENT :321) → `Promise<null | {path: string; repositoryName: string}>`. Main: URL validation (HTTPS/SSH, no embedded creds, ≤2048 chars), safe folder name, parent-dir dialog, `git clone` 10-min timeout, cleanup on failure, `{path, repositoryName}` or null (cancelled). Consumer: `app/chat/composer/index.tsx:2021`.

### G.2 `hermes:git:branchSwitch` signature change
Preload (CURRENT :470): `branchSwitch(repoPath, branch, create)` — third param added; main runs `git switch -c` when `create` (git-ipc.ts:52, git-worktree-ops.ts:475–507).

### G.3 `window.hermesDesktop.aroBridge` (fork-added preload namespace)
| Member | Channel | Payload → result |
|---|---|---|
| `start(options?)` | invoke `hermes:aro:bridge:start` | AroBridgeStartOptions {engine?: 'demo'\|'openai', baseUrl?, model?, apiKey?} → {sessionId} (10s latch on session_start) |
| `send(sessionId, text)` | invoke `hermes:aro:bridge:send` | → boolean |
| `toolResult(sessionId, callId, ok, output)` | invoke `hermes:aro:bridge:toolResult` | → boolean |
| `interrupt(sessionId)` | invoke `hermes:aro:bridge:interrupt` | → boolean |
| `stop(sessionId)` | invoke `hermes:aro:bridge:stop` | → boolean |
| `onEvent(sessionId, cb)` | on `hermes:aro:bridge:<sessionId>:event` | AroBridgeEvent (main→renderer push) |
| `onExit(sessionId, cb)` | on `hermes:aro:bridge:<sessionId>:exit` | `{code}` |

Main (aro-ipc.ts, registered main.ts:18750): spawns checkout venv python as `python -m aro_bridge.daemon --engine <demo|openai>` with `PYTHONPATH=<repo root>`, JSONL stdio; per-session dynamic channels (aro-ipc.ts:96–102).

### G.4 `aro.jsonl/1` daemon protocol (aro_bridge/protocol.md + daemon.py)
**stdin→daemon:** `{"type":"user_message","text":…}` · `{"type":"tool_result","callId":…,"ok":…,"output":…}` · `{"type":"interrupt"}`. **stdout→host (AroEvent union):** `session_start{sessionId, model, tools[]}` · `thinking{label, ms}` · `tool_call{callId, tool: web_search|page_reader, args}` · `tool_result{callId, ok, ms, summary, lines[]}` · `assistant_delta{text}` · `reply_done{ms}` · `error{message}` · `done{ms, toolCalls}`. Rules: `session_start` first (once); `done` last per turn; tool_call↔tool_result paired on `callId`; host executes tools (daemon blocks on stdin); budget `--max-tool-calls` (default 3, give-up 7 rounds); engines demo/openai (default `http://localhost:8642/v1`, model `aro-4-70b`).

**Renderer consumers:** `src/aro/bridge.ts` (`useAroBridge`), `AroBridgeView.tsx`; Aro components also use existing wire: `hermesDesktop.git.repoStatus` (AroProjectDialog.tsx:143/168, AroRepoBar.tsx:76), `cloneRepository` (composer). **No other new RPC/REST beyond §G.1–G.4; fork-added renderer storage is recorded in §G.5.** Note: `hermes:selectDirectory` / project-ownership / active-project / git-status-live-update RPCs mentioned in early task notes do NOT exist in this fork — prototype-only concepts (NOT-PRESENT).

### G.5 Fork-added renderer localStorage keys (`hermes.desktop.*` namespace)

Recorded by the pre-A0 wire-inventory confirmation (code + git history, DECISIONS D-0028/D-0030). Both families were introduced by fork commit `93ff2d2910` (2026-10-08), before the contract existed; they are renderer-side presentation state deliberately kept in the Hermes `hermes.desktop.*` namespace so a future Hermes-native counterpart would collide visibly rather than duplicate. No new keys have been added since.

| Key | File : symbol (CURRENT tree) | Shape / semantics |
|---|---|---|
| `hermes.desktop.external-ide.preferred` | `src/adapters/editors.ts:62` `PREFERRED_IDE_KEY` (Phase 3 boundary; originally `shell/external-ide-control.tsx`) | editor-id string from the fork catalog (`cursor` \| `vscode` \| `windsurf` \| `zed`) — preferred external IDE consumed by the composer/statusbar control; round-trip live-verified 2026-10-10 (Phase 3 report) |
| `hermes.desktop.voice.orb.visible` | `src/app/chat/voice-agent-orb.tsx:17` `ORB_VISIBLE_KEY` (via `persistBoolean`, `lib/storage` choke point) | boolean string, default `true` — floating voice-orb visibility. Distinct from the SETTINGS_MERGE `voice-orb` row (`conductor.voice.orb`), which is the prototype-namespace toggle |
| `hermes.desktop.voice.orb.open` | `voice-agent-orb.tsx:21` `ORB_OPEN_KEY` | boolean string, default `false` — orb panel open state |
| `hermes.desktop.voice.orb.position` | `voice-agent-orb.tsx:25–34,94–100` | JSON `{x, y}` (default `{0, 0}`) — orb drag position, persisted on drag |

`aro.*` / `conductor.*` fork keys are excluded from this baseline by design (renderer-internal presentation namespace, D-0011 — GLOSSARY "Storage").

## Totals (parity gate counts)

| Section | Count |
|---|---|
| A. Preload API | 1 global, 155 top-level props, ~110 nested members, 4 sendSync boot channels |
| B. Electron IPC | ~170 invoke channels (incl. 5 ipc.handle + 8 dynamic) + 45 `ipcMain.on` + 4 sendSync + 42 push channels + 2 terminal dynamic patterns |
| C. JSON-RPC | 251 contract methods; ~128 client→server invoked; 13 server→client request methods; 74 backend + 5 local event types; 2 channel-internal RPCs |
| D. REST | 108 renderer route templates + 3 main-side routes + 2 sibling WS endpoints |
| E. Transport | JSON-RPC 2.0 text frames over `/api/ws`; token/ticket auth; spawn-ledger + `GET /` discovery; ping heartbeat; seq replay |
| F. Persistence | ~27 main userData JSON files; ~190 renderer localStorage keys; 2 sessionStorage families |
| G. Fork-added | 1 new invoke channel (`hermes:git:cloneRepository`), 1 channel signature change (`branchSwitch` +`create`), `aroBridge` namespace (5 invokes + 2 per-session pushes), `aro.jsonl/1` daemon protocol (3 stdin types, 8 stdout events), 4 fork-added renderer localStorage keys (`hermes.desktop.*` namespace, §G.5) |

**UNKNOWN / caveats:** (1) `hermes:sync-status`/`getSyncStatus` dead at merge-base (handler + type exist; preload wire absent). (2) `hermes:hud:native-drag` sendSync registered but not called by preload at merge-base. (3) Renderer-invoked RPC subset derived from string-literal correlation — the 251-method contract JSON is the authoritative superset. (4) `preview-open-external` is a guest→host send channel, not part of `hermesDesktop`.
