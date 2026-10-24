# Aro Installation Guide

Aro Desktop is a native, local-first AI coding agent application for Windows, macOS, and Linux.

## System Requirements
- **Windows**: Windows 11 (22H2+) 64-bit (x64) or Windows 10 (22H2+)
- **macOS**: macOS 13 (Ventura) or newer (Apple Silicon M-series or Intel x86_64)
- **Linux**: Ubuntu 22.04+, Debian 12+, Fedora 38+ (x86_64)
- **Hardware Baseline**: 4-core CPU, 8 GB RAM, 1 GB available disk space

---

## 1. Windows Installation
1. Download the latest installer package `Aro-Setup-<version>-win-x64.msix` from the [GitHub Releases](https://github.com/samjuniors/SamAgent/releases) page.
2. Double-click the `.msix` file to launch Windows App Installer.
3. Click **Install**.
4. Once completed, launch **Aro** from the Start Menu.

### Automatic Updates on Windows
Aro checks for verified updates automatically on startup and stages updates atomically in the background. You can manage or disable auto-updates under **Settings → Updates**.

---

## 2. macOS Installation
1. Download `Aro-<version>-darwin-arm64.dmg` (for Apple Silicon) or `Aro-<version>-darwin-x64.dmg` (for Intel).
2. Open the `.dmg` disk image.
3. Drag the **Aro** application icon into your `/Applications` folder.
4. Eject the disk image and launch **Aro** from Spotlight or Launchpad.

---

## 3. Linux Installation
1. Download `Aro-<version>-linux-x86_64.AppImage`.
2. Make the file executable:
   ```bash
   chmod +x Aro-*-linux-x86_64.AppImage
   ```
3. Run the AppImage:
   ```bash
   ./Aro-*-linux-x86_64.AppImage
   ```
   *(Optional: Use `appimaged` or `AppImageLauncher` for automatic desktop integration).*

---

## 4. Verification & Diagnostics
To verify that your installation is ready and runtime bridges are operational:
1. Launch Aro Desktop.
2. Navigate to **Aro Doctor** (`/aro-doctor`) from Settings or the onboarding strip.
3. All system health indicators (Python runtime, local bridge, and storage permissions) should show green checkmarks.
