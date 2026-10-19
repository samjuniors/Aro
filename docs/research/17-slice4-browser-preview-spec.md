# Slice 4 (13.S4) Specification: In-App Responsive Web & Dev-Server Preview

**Feature Flag**: `inAppBrowserPreview` (`$aroFeatures.inAppBrowserPreview`)  
**Target Surface**: `apps/desktop/src/aro/BrowserPreview.tsx`  
**Gallery Showcase**: `apps/desktop/src/aro/DesignSystemAro.tsx` (`#browser-preview`)  
**Status**: In Progress (Phase 13, Slice 4)

---

## 1. Problem & Context

When agents build, debug, or iteratively restyle full-stack web applications, landing pages, or HTML/SVG artifacts, developers are forced to context-switch away from Aro to an external browser window. This disjointed loop causes friction:
1. **Context Loss**: Switching away hides the agent's live reasoning, tool executions, and file review hunks.
2. **Missing Multi-Device Form Factors**: Testing responsive layouts across mobile, tablet, and desktop requires manual resizing of external browser devtools.
3. **Dev-Server Port Hunting**: Developers have to scan terminal logs to discover which port Vite, Next.js, or Astro booted on (e.g., `:5173`, `:3000`).

---

## 2. Architecture & Design Principles

### 2.1 Feature Flag Gating
- Controlled by the `$aroFeatures.inAppBrowserPreview` atom in `apps/desktop/src/aro/flags.ts`.
- When disabled, surfaces render a clean, honest placeholder banner (`SourceBadge demoLabel="disabled"`) informing the user how to re-enable in Aro Appearance Settings without crashing or leaking unrendered state.
- Accepts `forceEnabled` and `overrideTabs` / `overrideViewport` props for robust headless testing and design system demonstration.

### 2.2 Core Capabilities
1. **Multi-Tab Workspace**:
   - Persistent tab strip backed by `adapters.browserPreview` / NanoStores (`$previewTabs`).
   - Normalization invariant: tab strip is never empty (defaults to a fresh blank tab).
   - Tab title displays domain or page title with active status indicators.
2. **Responsive Device Presets**:
   - **Desktop**: Full width (`100%`).
   - **Tablet**: Fixed `768px` device frame with elevation shadow.
   - **Mobile**: Fixed `390px` device frame with simulated mobile aspect ratio.
   - Preserves active viewport in local storage (`conductor.workspace.v3.browser.viewport`).
3. **Dev-Server Quick Links**:
   - Direct launch chips for common local development servers (`:3000`, `:5173`, `:8080`, `:4321`).
   - Clicking a dev-server pill immediately normalizes the URL and commits navigation.
4. **Address Bar & Navigation**:
   - Validates input to HTTP/HTTPS only via `normalizePreviewUrl`. Rejects malicious schemes (`javascript:`, `file:`, `data:`).
   - Enter-to-navigate with loading state feedback.
   - Reload button (bumps reload nonce).
   - External browser breakout button (`window.open(url, '_blank', 'noopener,noreferrer')`).
   - Copy URL button.
5. **Security Sandbox**:
   - Iframe rendered with `sandbox="allow-scripts allow-forms allow-same-origin"`.
   - `referrerPolicy="no-referrer"`.
   - Honest warning regarding third-party `X-Frame-Options` restrictions.

---

## 3. Verification & Acceptance Criteria

1. **Gating**: Disabled flag renders disabled placeholder; enabling restores interactive preview.
2. **Viewport Switching**: Toggling Desktop, Tablet, and Mobile updates the wrapper styling and width constraints.
3. **Tab Operations**: New tab, switch tab, close tab, and URL updates correctly persist and never reduce the tab strip to 0.
4. **Dev-Server Quick Launch**: Clicking quick chips navigates to `http://localhost:<port>`.
5. **Security Constraints**: Disallowed protocols show an inline error message; iframe sandbox attributes are strictly applied.
6. **Zero Host Risk**: Complete typecheck cleanliness (`npm run typecheck`), zero ESLint warnings, and 100% test pass rate in Vitest.
