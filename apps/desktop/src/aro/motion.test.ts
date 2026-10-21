/**
 * ARO MOTION & INTERACTION TEST SUITE (Phase 14, Gate 14.1)
 *
 * Enforces the Aro motion language invariants, token contract,
 * compositor-only animation rules, and strict reduced-motion parity.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const TOKENS_CSS_PATH = resolve(here, './tokens.css')
const tokensCss = readFileSync(TOKENS_CSS_PATH, 'utf8')

describe('Aro Motion Token Contract (Phase 14)', () => {
  it('defines all required duration tokens with exact values', () => {
    const expectedDurations: Record<string, string> = {
      '--aro-dur-instant': '0ms',
      '--aro-dur-fast': '100ms',
      '--aro-dur-mid': '150ms',
      '--aro-dur-base': '160ms',
      '--aro-dur-slow': '220ms',
      '--aro-dur-panel': '260ms',
      '--aro-dur-hero': '450ms',
      '--aro-dur-ambient': '2200ms',
    }

    for (const [token, value] of Object.entries(expectedDurations)) {
      const regex = new RegExp(`${token}\\s*:\\s*([^;]+);`)
      const match = tokensCss.match(regex)
      expect(match, `Missing duration token: ${token}`).toBeTruthy()
      expect(match?.[1].trim(), `Token ${token} has divergent value`).toBe(value)
    }
  })

  it('defines all required easing curve tokens', () => {
    const requiredEasings = [
      '--aro-ease-standard',
      '--aro-ease-out',
      '--aro-ease-in',
      '--aro-ease-out-quint',
      '--aro-ease-spring',
    ]

    for (const easeToken of requiredEasings) {
      const regex = new RegExp(`${easeToken}\\s*:\\s*cubic-bezier\\([^)]+\\);`)
      expect(tokensCss, `Missing easing token: ${easeToken}`).toMatch(regex)
    }
  })

  it('defines all required spatial distance tokens with exact values', () => {
    const expectedDistances: Record<string, string> = {
      '--aro-dist-xs': '2px',
      '--aro-dist-sm': '4px',
      '--aro-dist-md': '8px',
      '--aro-dist-lg': '16px',
      '--aro-dist-xl': '28px',
    }

    for (const [token, value] of Object.entries(expectedDistances)) {
      const regex = new RegExp(`${token}\\s*:\\s*([^;]+);`)
      const match = tokensCss.match(regex)
      expect(match, `Missing distance token: ${token}`).toBeTruthy()
      expect(match?.[1].trim(), `Token ${token} has divergent value`).toBe(value)
    }
  })

  it('wires duration and easing tokens into @theme inline utilities', () => {
    const requiredBridges = [
      '--duration-aro-instant: var(--aro-dur-instant);',
      '--duration-aro-fast: var(--aro-dur-fast);',
      '--duration-aro-base: var(--aro-dur-base);',
      '--duration-aro-slow: var(--aro-dur-slow);',
      '--duration-aro-hero: var(--aro-dur-hero);',
      '--ease-aro-standard: var(--aro-ease-standard);',
      '--ease-aro-out: var(--aro-ease-out);',
      '--ease-aro-out-quint: var(--aro-ease-out-quint);',
    ]

    for (const bridge of requiredBridges) {
      expect(tokensCss).toContain(bridge)
    }
  })
})

describe('Compositor Animation Budget & Layout Invariant', () => {
  it('strictly animates only compositor properties in @keyframes aro-*', () => {
    // Extract all @keyframes aro-* blocks
    const keyframeBlocks = tokensCss.matchAll(/@keyframes\s+(aro-[\w-]+)\s*\{([^}]+(?:\{[^}]+\}[^}]*)*)\}/g)

    const forbiddenLayoutProperties = [
      /\bwidth\s*:/i,
      /\bheight\s*:/i,
      /\bmargin(?:-(?:top|bottom|left|right))?\s*:/i,
      /\bpadding(?:-(?:top|bottom|left|right))?\s*:/i,
      /\btop\s*:/i,
      /\bbottom\s*:/i,
      /\bleft\s*:/i,
      /\bright\s*:/i,
      /\bborder-width\s*:/i,
    ]

    let foundKeyframes = 0

    for (const match of keyframeBlocks) {
      foundKeyframes++
      const name = match[1]
      const body = match[2]

      for (const forbidden of forbiddenLayoutProperties) {
        expect(
          forbidden.test(body),
          `Keyframe "${name}" violates frame budget by animating layout property: ${forbidden}`
        ).toBe(false)
      }
    }

    expect(foundKeyframes, 'Expected to audit multiple aro-* keyframes').toBeGreaterThan(5)
  })
})

describe('Reduced-Motion Parity Guard', () => {
  it('clamps all animations and transitions under html[data-motion="reduced"]', () => {
    const dataMotionBlock = tokensCss.match(/html\[data-motion=['"]reduced['"]\][^{]*\{([^}]+)\}/)
    expect(dataMotionBlock, 'Missing html[data-motion="reduced"] block').toBeTruthy()
    const content = dataMotionBlock?.[1] ?? ''

    expect(content).toContain('animation-duration: .001ms !important;')
    expect(content).toContain('transition-duration: .001ms !important;')
    expect(content).toContain('animation-iteration-count: 1 !important;')
    expect(content).toContain('scroll-behavior: auto !important;')
  })

  it('clamps all animations and transitions under @media (prefers-reduced-motion: reduce)', () => {
    // Extract nested @media (prefers-reduced-motion: reduce) { ... } block
    const mediaIndex = tokensCss.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(mediaIndex, 'Missing @media (prefers-reduced-motion: reduce) block').toBeGreaterThan(-1)

    const openBrace = tokensCss.indexOf('{', mediaIndex)
    expect(openBrace).toBeGreaterThan(-1)

    let depth = 1
    let i = openBrace + 1

    while (i < tokensCss.length && depth > 0) {
      if (tokensCss[i] === '{') {depth++}
      else if (tokensCss[i] === '}') {depth--}

      i++
    }

    const content = tokensCss.slice(openBrace + 1, i - 1)

    // Token zeroing
    expect(content).toContain('--aro-dur-hero: 0ms;')
    expect(content).toContain('--aro-dur-ambient: 0ms;')

    // Universal animation/transition clamp
    expect(content).toContain('animation-duration: .001ms !important;')
    expect(content).toContain('transition-duration: .001ms !important;')
    expect(content).toContain('animation-iteration-count: 1 !important;')
    expect(content).toContain('scroll-behavior: auto !important;')
  })
})
