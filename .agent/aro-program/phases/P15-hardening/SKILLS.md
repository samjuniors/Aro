# SKILLS P15
Research questions: current Electron security checklist and fuses guidance; CSP recipes for Electron renderers that load local fonts and local scripts; WCAG 2.2 AA criteria that most often fail in desktop web UIs; how to observe all network traffic from Electron (proxy, `webRequest`).
Tools to prefer: Electron's official docs, axe-core via Playwright, NVDA or VoiceOver, OSV-Scanner, gitleaks, `npm audit`, a local proxy (mitmproxy or similar), Chromium traces.
Read map: `apps/desktop/electron/` (list, then window creation and IPC files), `apps/desktop/index.html`, `NOTICE`, `SECURITY.md`, `apps/desktop/LAYOUT-UX.md` journeys section.
Never read: `AGENTS.md` whole, `locales/` whole (sample 2 files).
Evidence: checklist with pass/fail, scanner outputs, network capture summary, a11y reports, perf tables.
Attack focus: malicious markdown or tool output in the transcript (XSS, link and image handling), a hostile link opened from chat, file drop from untrusted paths, IPC called from an injected frame, secrets in screenshots and logs.
