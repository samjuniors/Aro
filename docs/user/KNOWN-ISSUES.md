# Known Issues & Workarounds (v1 Beta)

This document tracks known limitations and practical workarounds for Aro Desktop v1 Beta.

---

## 1. Windows: SmartScreen Prompt on Initial MSIX Install
- **Symptom**: Windows SmartScreen may display an "Unrecognized app" banner when double-clicking the installer on clean installations.
- **Cause**: Windows SmartScreen requires reputation accumulation over time for newly issued certificates.
- **Workaround**: Click **More info**, then click **Run anyway**. Once the application reaches sufficient community install volume, the prompt disappears automatically.

---

## 2. Linux: AppImage Sandboxing & FUSE
- **Symptom**: On Ubuntu 24.04+, running the AppImage produces an error: `dlopen(): error loading libfuse.so.2`.
- **Cause**: Modern Ubuntu releases omit legacy libfuse2 by default in favor of libfuse3.
- **Workaround**:
  Install `libfuse2`:
  ```bash
  sudo apt install libfuse2
  ```
  Or run the AppImage with `--appimage-extract-and-run`.

---

## 3. High CPU Usage during Massive First Repository Indexing
- **Symptom**: Fans spin up briefly when opening a repository containing >50,000 files.
- **Cause**: Initial indexing runs AST parsing on untracked source trees.
- **Workaround**: Ensure that standard ignore directories (`node_modules`, `dist`, `target`, `.git`, `build`) are listed in your project `.gitignore`. Aro respects `.gitignore` rules automatically.

---

## 4. Voice Input (PTT) on macOS
- **Symptom**: Voice orb indicates "microphone unavailable".
- **Cause**: macOS requires explicit permission in System Settings.
- **Workaround**: Open **System Settings → Privacy & Security → Microphone** and toggle **Aro** to enabled.
