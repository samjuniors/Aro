/**
 * BROWSER PREVIEW SECTION — in-app preview tab strip and viewports.
 *
 * Contract refs:
 * - Feature id: `browser-preview` (port/FEATURE_MAP.md — local, 13.S4).
 * - Surfaces AroBrowserPreview (`@/aro/BrowserPreview`) as a right-rail panel tab.
 * - Tab strip and viewport state persist under `conductor.workspace.v3.browser.*` (survives reload).
 * - Gated behind `$aroFeatures.inAppBrowserPreview`.
 * - BACKEND-TODO(browser-preview): [D-10, research/11 §3] tabs/viewports over future preview.* events.
 */

import { AroBrowserPreview } from '@/aro/BrowserPreview'

export function BrowserSection() {
  return <AroBrowserPreview />
}

export default BrowserSection
