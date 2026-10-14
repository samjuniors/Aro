/**
 * PROTOTYPE → DESKTOP DESIGN-SYSTEM PARITY (source-of-truth guard)
 *
 * The Aro Workbench prototype (`prototype/src/app/globals.css`) is the visual
 * source of truth. The desktop port mirrors its tokens under the `--aro-*`
 * namespace in `src/aro/tokens.css` (prefix swap `--t-` → `--aro-`, with ONE
 * rename: the prototype's `--t-base` surface is the desktop's `--aro-bg`).
 *
 * This suite is a CONTRACT test, not a snapshot: it parses BOTH live stylesheets
 * and asserts that every prototype theme token is present on the desktop with an
 * identical computed value, and that all six prototype themes exist. It exists
 * because the port previously copied token values by hand and silently dropped
 * the font loading — this is the invariant that stops the next such drift.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const PROTOTYPE_CSS = resolve(here, '../../../../prototype/src/app/globals.css')
const DESKTOP_CSS = resolve(here, './tokens.css')

/** The six themes the prototype defines. */
const THEMES = ['obsidian', 'daylight', 'nord', 'ember', 'paper', 'ink'] as const

/** Token rename applied by the port: prototype surface `base` → desktop `bg`. */
const rename = (protoToken: string): string =>
  protoToken === '--t-base' ? '--aro-bg' : protoToken.replace(/^--t-/, '--aro-')

/** Pull one `html[data-theme="X"] { … }` block's `--token: value` pairs. */
function themeTokens(css: string, theme: string): Record<string, string> {
  // Prototype uses double quotes, desktop uses single; match either.
  const re = new RegExp(`html\\[data-theme=["']${theme}["']\\][^{]*\\{([^}]*)\\}`, 'm')
  const body = css.match(re)?.[1] ?? ''
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1].trim()] = normalize(m[2])
  }
  return out
}

/** Normalize a CSS value so rgba spacing / case don't cause false negatives. */
function normalize(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/rgba\(\s*/g, 'rgba(')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\)\s*/g, ')')
    .replace(/(?<=[ ,(])0\.(\d+)/g, '.$1')
    .toLowerCase()
}

describe('prototype design-system parity (tokens.css vs prototype globals.css)', () => {
  const protoCss = readFileSync(PROTOTYPE_CSS, 'utf8')
  const desktopCss = readFileSync(DESKTOP_CSS, 'utf8')

  it('defines every prototype theme on the desktop', () => {
    for (const theme of THEMES) {
      expect(
        Object.keys(themeTokens(desktopCss, theme)).length,
        `desktop is missing the "${theme}" theme block`
      ).toBeGreaterThan(0)
    }
  })

  it.each(THEMES)('theme "%s" matches the prototype token-for-token', theme => {
    const proto = themeTokens(protoCss, theme)
    const desktop = themeTokens(desktopCss, theme)

    // The prototype block must actually exist (guards a broken parser path).
    expect(Object.keys(proto).length, `prototype "${theme}" block empty`).toBeGreaterThan(20)

    for (const [protoToken, protoValue] of Object.entries(proto)) {
      const desktopToken = rename(protoToken)
      expect(
        desktop[desktopToken],
        `theme "${theme}": desktop lacks ${desktopToken} (prototype ${protoToken})`
      ).toBeDefined()
      expect(
        desktop[desktopToken],
        `theme "${theme}": ${desktopToken} diverges from prototype ${protoToken}`
      ).toBe(protoValue)
    }
  })

  it('keeps the full surface/ink/signal token vocabulary on every theme', () => {
    // A representative slice across each token family — asserts the port kept
    // the whole vocabulary, not just the handful we diffed above.
    const required = [
      '--aro-void', '--aro-sunken', '--aro-bg', '--aro-raise', '--aro-hover',
      '--aro-overlay', '--aro-well', '--aro-code', '--aro-track',
      '--aro-line', '--aro-line-soft', '--aro-line-strong',
      '--aro-ink', '--aro-ink-2', '--aro-ink-3', '--aro-ink-4',
      '--aro-iris', '--aro-iris-soft', '--aro-iris-deep', '--aro-on-iris',
      '--aro-cyan', '--aro-mint', '--aro-amber', '--aro-rose', '--aro-sky', '--aro-plum',
      '--aro-shadow-a', '--aro-shadow-b', '--aro-shadow-c', '--aro-shadow-d'
    ]
    for (const theme of THEMES) {
      const desktop = themeTokens(desktopCss, theme)
      for (const token of required) {
        expect(desktop[token], `theme "${theme}" missing ${token}`).toBeDefined()
      }
    }
  })
})

describe('prototype webfont parity (identity faces are actually shipped)', () => {
  const desktopCss = readFileSync(DESKTOP_CSS, 'utf8')
  const FONTS_DIR = resolve(here, '../fonts')

  // The five families prototype/src/app/layout.tsx loads via next/font.
  const FACES: Array<{ family: string; file: string }> = [
    { family: 'Space Grotesk', file: 'SpaceGrotesk-Variable.woff2' },
    { family: 'Inter', file: 'Inter-Variable.woff2' },
    { family: 'Newsreader', file: 'Newsreader-Variable.woff2' },
    { family: 'DM Sans', file: 'DMSans-Variable.woff2' },
    { family: 'JetBrains Mono', file: 'JetBrainsMono-Regular.woff2' }
  ]

  it.each(FACES)('declares an @font-face for $family and ships the woff2', ({ family, file }) => {
    // @font-face present in the token layer (loads via styles.css @import).
    expect(desktopCss, `tokens.css missing @font-face for "${family}"`).toContain(
      `font-family: '${family}'`
    )
    // The referenced woff2 is actually on disk.
    expect(
      existsSync(resolve(FONTS_DIR, file)),
      `bundled font missing: src/fonts/${file}`
    ).toBe(true)
  })

  it('binds the prototype next/font --f-* variables so the fallback chain resolves', () => {
    // Without these, `var(--f-grotesk, "Space Grotesk")` fell through to the
    // system font — the exact drift this suite exists to prevent.
    for (const v of ['--f-grotesk', '--f-inter', '--f-newsreader', '--f-dmsans', '--f-jbmono']) {
      expect(desktopCss, `tokens.css missing ${v} binding`).toContain(`${v}:`)
    }
  })
})
