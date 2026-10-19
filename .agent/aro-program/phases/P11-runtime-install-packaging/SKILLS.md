# SKILLS P11
Research questions: how do comparable Electron apps ship a Python backend (embedded runtime vs managed env vs system)? What are the code-signing and antivirus implications of each? How does `electron-builder` handle per-OS targets and data migration on upgrade? Which Electron auto-update mechanism fits each OS?
Tools to prefer: the repo's packaging scripts, `electron-builder` (already configured in `apps/desktop/electron-builder.config.cjs`), VMs or containers for clean machines, the agent's shell for timing (`Measure-Command` / `time`).
Read map: `apps/desktop/electron-builder.config.cjs`, `apps/desktop/scripts/` (names, then the packaging ones), `activate.ps1`, `setup-hermes.ps1`, `setup-hermes.sh`, `port/RELEASE_AUDIT_REPORT.md` section 7 and 8, `.github/workflows/desktop-bundled-release.yml` (read, do not run).
Never read: signing secrets, anything under `.github/` secrets, `AGENTS.md` whole.
Evidence: per-machine run logs and screenshots, size table, timing table, ADRs.
Attack focus: a user without admin rights, a path with spaces, corporate proxy, antivirus quarantine, interrupted install, two Aro versions installed, running from a read-only location.
