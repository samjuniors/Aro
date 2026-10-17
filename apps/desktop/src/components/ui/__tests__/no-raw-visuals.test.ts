import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import baseline from './no-raw-visuals.baseline.json' with { type: 'json' }

// Static-analysis ratchet guard: prevents addition of raw/arbitrary visual values
// in the desktop renderer. As screens and host primitives are migrated to the
// unified Aro design system, counts in baseline.json are ratcheted down and must
// never grow.
//
// Ignored:
// - Lines containing `design-allow:` comments for intentional, documented exceptions
// - Theme definition files and token bridges

const SRC_ROOT = resolve(__dirname, '../../..')

const EXCLUDED_RELATIVE_PATHS = [
  'aro/tokens.css',
  'aro/host-theme.css',
  'themes/presets.ts',
  'themes/palettes.ts'
]

function collectSourceFiles(dir: string): string[] {
  const results: string[] = []

  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '__tests__' || entry === 'build') {
      continue
    }

    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      results.push(...collectSourceFiles(fullPath))
    } else if (
      (entry.endsWith('.tsx') || entry.endsWith('.ts') || entry.endsWith('.css')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      const rel = fullPath.slice(SRC_ROOT.length + 1).replace(/\\/g, '/')

      if (!EXCLUDED_RELATIVE_PATHS.includes(rel)) {
        results.push(fullPath)
      }
    }
  }

  return results
}

describe('no-raw-visuals ratchet test', () => {
  it('enforces that raw visual counts do not exceed the recorded baseline', () => {
    const files = collectSourceFiles(SRC_ROOT)

    let roundedArbitrary = 0
    let textArbitrary = 0
    let transitionAll = 0
    let rawShadows = 0

    const violations: string[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      const lines = content.split(/\r?\n/)
      const rel = file.slice(SRC_ROOT.length + 1).replace(/\\/g, '/')

      lines.forEach((line, lineIdx) => {
        if (line.includes('design-allow:')) {
          return
        }

        const rMatches = line.match(/\brounded-\[\d+px\]/g)

        if (rMatches) {
          roundedArbitrary += rMatches.length
          violations.push(`${rel}:${lineIdx + 1} arbitrary radius: ${rMatches.join(', ')}`)
        }

        const tMatches = line.match(/\btext-\[\d+px\]/g)

        if (tMatches) {
          textArbitrary += tMatches.length
          violations.push(`${rel}:${lineIdx + 1} arbitrary text: ${tMatches.join(', ')}`)
        }

        const trMatches = line.match(/\btransition-all\b/g)

        if (trMatches) {
          transitionAll += trMatches.length
          violations.push(`${rel}:${lineIdx + 1} transition-all`)
        }

        const shMatches = line.match(/\bshadow-(sm|md|lg|xl|2xl|inner|\[[^\]]+\])\b/g)

        if (shMatches) {
          rawShadows += shMatches.length
          violations.push(`${rel}:${lineIdx + 1} raw shadow: ${shMatches.join(', ')}`)
        }
      })
    }

    const current = {
      roundedArbitrary,
      textArbitrary,
      transitionAll,
      rawShadows
    }

    const { ratchet } = baseline

    expect(
      current.roundedArbitrary,
      `rounded-[Npx] count grew (${current.roundedArbitrary} > ${ratchet.roundedArbitrary}). Migrations must only reduce arbitrary radii.`
    ).toBeLessThanOrEqual(ratchet.roundedArbitrary)

    expect(
      current.textArbitrary,
      `text-[Npx] count grew (${current.textArbitrary} > ${ratchet.textArbitrary}). Migrations must only reduce arbitrary text sizes.`
    ).toBeLessThanOrEqual(ratchet.textArbitrary)

    expect(
      current.transitionAll,
      `transition-all count grew (${current.transitionAll} > ${ratchet.transitionAll}). Use targeted transitions with --aro-dur/ease.`
    ).toBeLessThanOrEqual(ratchet.transitionAll)

    expect(
      current.rawShadows,
      `raw shadow count grew (${current.rawShadows} > ${ratchet.rawShadows}). Use --aro-shadow-* tokens.`
    ).toBeLessThanOrEqual(ratchet.rawShadows)
  })
})
