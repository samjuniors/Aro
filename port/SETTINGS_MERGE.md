# Hermes UI Port — SETTINGS MERGE (Phase 1)

Case values: `proto-only` (local adapter, persisted locally), `hermes-only` (placed in the nearest prototype settings section, restyled), `both` (prototype control, Hermes key and value shape; Hermes stored user value preserved; prototype default applies only to fresh installs).

Rules honored (skill contract-templates): never drop a Hermes setting the backend reads; conflicting defaults → Hermes's stored value wins.

**Live verification (2026-10-10)**: the settings surface of the port is the **Hermes settings overlay** rendered under the Aro skin (verified live: full schema tree — Model [Main/Fallback/Auxiliary/MoA], Chat [Behavior/Attachments], Appearance [General/Theme/Typography/Window & layout/Chat display/Pet], Workspace [Projects & discovery/Shell environment/Files & execution], Safety [Approvals/Privacy & network/Checkpoints], Browser, Memory & Context, Voice, Advanced, Notifications, Billing, Providers [Accounts/API keys/Custom Endpoints/Gateways], Keyboard Shortcuts). Prototype settings that survived as UI concepts are folded in per the table; prototype rows with no Hermes counterpart become local adapter settings.

## Prototype settings (17 sections → disposition)

| Setting id | Prototype UI | Hermes key | Case | Resolution |
|---|---|---|---|---|
| `theme` | Appearance — theme (`conductor.theme`) | `hermes-desktop-theme-v2` + theme stores | both | Aro token layer (`--aro-*`/`host-theme.css`) is presentation over the Hermes theme system; Hermes theme store remains the persisted source; Aro mode keys (`data-theme` on wrapper) coexist. Stored Hermes values preserved. |
| `design` | Appearance — design profile (`conductor.design`, 5 `--d-*` profiles) | — | proto-only | Aro structural tokens; local adapter (presentation). No Hermes migration. |
| `density` | Appearance — density (`conductor.density`) | — (Hermes has text-scale/zoom, different axis) | proto-only | Local adapter; maps to Aro `data-density`. Hermes text-scale/zoom kept separately in Appearance. |
| `motion` | Appearance — motion (`conductor.motion`) | — | proto-only | Local adapter (`data-motion`); OS reduced-motion respected by host. |
| `keyboard` | Keyboard — shortcut list (SHORTCUT_GROUPS) | keybinds registry + settings page | both | Hermes keybinds win (rebindable, persisted); prototype list is display/reference for Aro chrome shortcuts not in the host registry. |
| `voice-engine` | Voice — recognition engine (`conductor.voice.engine`: aro-cloud/browser/whisper-local) | STT via `/api/audio/transcribe` + voice prefs | both | Hermes STT/TTS primary (Task 7 wiring); browser engine = client-side fallback kept; `whisper-local` advertised but unimplemented in prototype (UNKNOWN backend) — do not expose as working until implemented. |
| `voice-language` | Voice — recognition language (`conductor.voice.language`) | Hermes STT language | both | Hermes value shape wins; prototype list (en-US…ja-JP) becomes the picker options. |
| `voice-orb` | Voice — show orb (`conductor.voice.orb`) | voice conversation UI | both | Orb = Aro presentation over Hermes voice engine; visibility pref stays local (`conductor.*` namespace). |
| `reply-backend` | Reply backend — demo/agent/live (`aro.backend`) | gateway (single path) | both | Collapsed to the real gateway (D-0008). Prototype's agent-mode bridge = the Aro Bridge page's engine switch (demo/openai) on fork wire. No settings row in the port. |
| `agents` | Agent adapters view | — (subagents are runtime) | proto-only | Local adapter (BACKEND-TODO(agents)); Hermes Subagents settings kept separately (Advanced). |
| `permissions` | Permissions — default (`conductor.pref.permission`: agent/readonly/plan/full) | `approvals.mode` (smart/manual/off/yolo) | both | Hermes key + values win. Aro pill: smart/manual/off (live-verified round-trip). `readonly`/`plan` have no Hermes approval-mode value → dropped from the pill (D-0015); `yolo` reachable via palette only (parity gap logged). Prototype default `agent` maps to `smart` on fresh installs. |
| `ask-destructive` | General — ask before destructive actions (`conductor.pref.askDestructive`) | `approvals.*` policy + Safety page | both | Hermes Safety settings win (backend-enforced); prototype toggle was a write-only record with no consumer (INVENTORY §10.7) — not carried as a live control. |
| `checkpoints` | Permissions — checkpoint before changes (`conductor.pref.checkpoints`) | Safety → Checkpoints | both | Hermes checkpoints subsystem wins (always-on rewind journal); prototype toggle had no runtime consumer — display note only. |
| `network` | Permissions — network access (`conductor.pref.network`: ask/block/allow) | Safety → Privacy & network | both | Hermes key wins. Prototype value shape differs; on migration `ask→ask`, `block→deny-list behavior is Hermes-defined` — exact mapping UNKNOWN (proto row was write-only); Hermes setting is authoritative. |
| `rules` | Rules — global instructions (workspace store) | — (SOUL/profile is a different concept) | proto-only | Local adapter (BACKEND-TODO(rules)); Hermes Profiles (SOULs) kept as its own surface. Medium-confidence pair NOT merged (D-0017). |
| `skills` | Skills view/settings | `/api/skills` + capabilities | both | Hermes hub wins (live ✓ 53 skills). |
| `connectors` | Connectors view (MCP config) | `/api/mcp/*` + capabilities tab | both | Hermes wins. |
| `editors` | External editors (INSTALLED_IDES + BridgesView) | IDE open IPC (open action) | both | List = local adapter; open action = Hermes IPC. |
| `git-merge` | Git — merge strategy (`conductor.pref.merge`) | — (no Hermes merge-strategy config) | proto-only | Inert preference record; kept in local adapter for future git settings. |
| `terminal-sandbox` | Terminal — preferred sandbox (`conductor.pref.sandbox`: local/docker/ssh) | Connections (local pool/remote/SSH/cloud) | both (separate surfaces) | Medium-confidence pair NOT merged (D-0017): proto pref had no consumer; Hermes Connections is the real feature (kept). Proto row not carried. |
| `terminal-timeout` | Terminal — command timeout (`conductor.pref.timeout`) | Advanced → Agent limits / runtime timeouts | both | Hermes config wins; proto row was write-only — not carried. |
| `gateway` | Messaging gateway settings (empty state) | `/api/messaging/*` + Messaging page | both | Hermes wins (sidebar live ✓ "Messaging Gateways 0 open"). |
| `usage` | Usage — sessions + tokens (`conductor.workspace.v3.sessions`) | `session.usage` + Context tab | both | Hermes analytics win (live ✓ 0/200k); proto token sum was demo-only. |
| `design-system` | Design system view | — | proto-only | Aro design reference; stays local. |
| `effort-thinking` | composer effort 0–4 + Thinking (Workbench) | reasoning effort (`config.set reasoning`, `REASONING_EFFORTS` minimal…ultra) | both | Wired (live ✓). 5-stop slider over Hermes levels; Thinking toggle = effort ≠ none. Hermes stored value wins; prototype default = `medium`. |
| `model-provider` | ProviderSettings (probes, catalogs) | Model settings + `/api/providers/*` + local-models + custom endpoints | both | Hermes wins (model control live ✓ `z-ai/glm-5.2`; "Configure providers" → Hermes provider pages). Prototype probe logic (client-side `/api/tags` probes) remains as local validation helper only. |

## Hermes settings (kept, restyled — never dropped)

All Hermes config-schema sections + hand-built pages listed in WIRE_BASELINE §C/§F are preserved and rendered by the port's settings overlay (verified live). The ones the Python backend reads directly (record-don't-assume):

| Hermes key | Read by backend | Surface in port | Case |
|---|---|---|---|
| `approvals.mode` (+ `cron_mode`, `single_query_mode`, `unattended_mode`, `smart_policy`, `deny`, …) | yes (approval gating) | Aro composer pill + Safety → Approvals | both (live round-trip ✓) |
| `reasoning` | yes (effort sent per turn) | Aro model menu slider + settings | both (live ✓) |
| `display.message_reactions`, `display.in_app_tips`, `display.in_app_tours` | yes (`tools/desktop_ui.py:43`) | settings (mirrored UI config) | hermes-only (wire) |
| `toolsets` | yes (tool registry) | capabilities + Advanced → Tool access | hermes-only |
| `voice.voice_chat_mode` | yes | Voice settings | hermes-only |
| `fast` (model fast-tier) | yes | model menu | hermes-only |
| providers/API keys/accounts, custom endpoints, gateways | yes | Providers pages | hermes-only |
| cron schedules / messaging channels | yes (scheduler/relay) | Cron + Messaging pages | hermes-only |
| memory providers | yes | Memory & Context | hermes-only |
| browser profile / URLs / passwords | yes (browser tool) | Browser settings | hermes-only |
| terminal backend | yes (PTY spawn) | Advanced | hermes-only |
| subagents/aux models/MoA/fallback | yes (agent runtime) | Model/Advanced | hermes-only |
| notifications/sounds, updates, tray, zoom/translucency/text-scale/RTL, i18n, keybinds, HUD gesture | main-process or renderer prefs | settings tree (live ✓ render) | hermes-only |

## Migration notes (fresh-install vs existing users)

- Hermes stored values always win on conflict (skill rule). Prototype `conductor.*` defaults apply only where no Hermes counterpart exists (proto-only rows).
- `conductor.pref.permission` → `approvals.mode`: `agent→smart`, `full→off`; `readonly`/`plan` have no target (logged D-0015).
- No prototype key ever overwrites a `hermes.desktop.*` / `hermes:desktop:*` key (namespaces disjoint, D-0011).
- `hermes:desktop:zoomLevel` localStorage mirror stays as-is (D-0005).
