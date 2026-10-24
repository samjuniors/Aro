# Research 09: Clean-Machine Test Matrix & Smoke Strategy

Date: 2026-10-19
Author: Aro Program
Reference: D-4 (Platform Order), D-6 (Data Directory), D-7 (Update Model)

## 1. Clean-Machine Reference Matrix

| Platform / Tier | Reference Machine Spec | Target Format | Primary Validation Focus |
| --- | --- | --- | --- |
| **Tier 1 (Primary)** | Windows 11 Pro 64-bit, 16GB+ RAM, NVMe SSD | NSIS installer / MSIX / unpack dir | Physical hardware, Windows Store python stub handling, native conpty |
| **Tier 2** | macOS 14/15 (Apple Silicon / Intel VM), 8GB+ RAM | DMG / ZIP | Gatekeeper notarization, App sandbox, local permissions |
| **Tier 3** | Ubuntu 22.04 / 24.04 LTS (Container/VM), 4GB+ RAM | AppImage / DEB | POSIX permissions, system python / uv linkage, Wayland/X11 |

## 2. 5-Stage Smoke Journey Lifecycle

1. **Install Stage**
   - Fresh machine without pre-existing Python, Git, or Node.js.
   - Installer runs without elevated administrator privileges where feasible.
   - Installs desktop executable, unpacks ASAR, and stamps desktop launch shortcuts.

2. **First Run Stage (Online & Offline)**
   - Initial application launch takes under 5 seconds to renderer ready.
   - **No Network Execution**: Zero network egress required to render UI and reach onboarding screen.
   - Google Fonts / CDN dependencies fully eliminated (verified in P10.5).

3. **Data Directory Initialization & Migration**
   - Initializes `~/.aro` data directory (`config.yaml`, session SQLite DB, logs).
   - If `~/.hermes` exists from prior usage, safely copies configuration and credentials non-destructively.

4. **Upgrade Stage (N-1 -> N)**
   - Simulates install of prior build followed by in-place upgrade.
   - Verifies all user state, tokens, conversation histories, and skills remain intact without schema corruption.

5. **Uninstall Stage**
   - Uninstaller cleanly removes binary artifacts, start menu entries, and desktop shortcuts.
   - Leaves user workspace data in `~/.aro` intact by default (prevents accidental data loss).

## 3. Automated Validation Tooling
- Tool: `.agent/aro-program/tools/smoke-matrix.mjs`
- Automated checks:
  - Packaged artifact presence (`release/win-unpacked/Aro.exe`)
  - ASAR archive and native prebuild integrity (`node-pty`, `conpty`, `hud-modifier-monitor`)
  - Sandbox `~/.aro` initialization
  - Non-destructive `~/.hermes` copy migration
