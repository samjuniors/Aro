import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Per-file ratchet for raw visual values in the desktop renderer (DESIGN.md 13).
//
//  - A file may never gain a hit for any metric.
//  - A count that drops MUST be lowered in no-raw-visuals.baseline.json in the
//    same change (so the baseline can only shrink and never hides new debt).
//  - `UPDATE_RATCHET=1 npx vitest run no-raw-visuals` rewrites the baseline, but
//    only when nothing grew (or on the very first run, `generated: false`).
//  - A line carrying `design-allow: <reason>` is not counted.
//
// The patterns are deliberately broad (px, rem, decimals, any side variant):
// an earlier version only matched `text-[10px]`-style integers and reported 0
// while hundreds of `text-[0.6875rem]` uses went unseen.

const SRC_ROOT = resolve(__dirname, '../../..')
const BASELINE_PATH = resolve(__dirname, 'no-raw-visuals.baseline.json')

const EXCLUDED_RELATIVE_PATHS = new Set([
  'aro/tokens.css',
  'aro/host-theme.css',
  'styles.css',
  'themes/presets.ts',
  'themes/palettes.ts',
  'components/brand-mark.tsx'
])

const SIDE = '(?:-(?:t|r|b|l|tl|tr|bl|br|s|e|ss|se|es|ee))?'

type Metric =
  | 'hexLiterals'
  | 'rawShadows'
  | 'roundedArbitrary'
  | 'roundedLegacy'
  | 'textArbitrary'
  | 'transitionAll'
  | 'zArbitrary'

interface Counter {
  codeOnly?: boolean
  hint: string
  line?: (line: string) => boolean
  re: RegExp
}

const COUNTERS: Record<Metric, Counter> = {
  roundedLegacy: {
    // Stock sizes resolve to the legacy 0.2 scalar (2 to 5px), and bare `rounded`
    // is a fixed 0.25rem: both are a different shape language from the roles.
    re: new RegExp(`\\brounded${SIDE}-(?:xs|sm|md|lg|xl|2xl|3xl|aro-[a-z0-9]+)(?![\\w-])`, 'g'),
    hint: 'use rounded-control / rounded-panel / rounded-overlay (DESIGN.md 3.1)'
  },
  roundedArbitrary: {
    re: new RegExp(`\\brounded${SIDE}-\\[(?!inherit\\])[^\\]]+\\]`, 'g'),
    hint: 'use a role radius, never rounded-[...]'
  },
  textArbitrary: {
    re: /\btext-\[\d*\.?\d+(?:px|rem)\]/g,
    hint: 'use text-aro-xs|sm|md|lg|xl (DESIGN.md 3.6)'
  },
  transitionAll: {
    re: /\btransition-all\b/g,
    hint: 'name the properties; use --aro-dur-* / --aro-ease-*'
  },
  rawShadows: {
    re: /\bshadow-(?:sm|md|lg|xl|2xl|inner|\[[^\]]+\])(?![\w-])/g,
    hint: 'use --aro-shadow-* / shadow-nous roles'
  },
  zArbitrary: {
    re: /\bz-\[[^\]]+\]/g,
    hint: 'use the z ladder (DESIGN.md 3.8)'
  },
  hexLiterals: {
    codeOnly: true,
    re: /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/g,
    line: line => !/^\s*(\/\/|\*|\/\*)/.test(line),
    hint: 'use a color token'
  }
}

const METRICS = Object.keys(COUNTERS) as Metric[]

type FileCounts = Partial<Record<Metric, number>>

function collectSourceFiles(dir: string): string[] {
  const results: string[] = []

  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '__tests__', 'build', 'fonts'].includes(entry)) {
      continue
    }

    const fullPath = join(dir, entry)

    if (statSync(fullPath).isDirectory()) {
      results.push(...collectSourceFiles(fullPath))
    } else if (/\.(ts|tsx|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
      const rel = fullPath.slice(SRC_ROOT.length + 1).replace(/\\/g, '/')

      if (!EXCLUDED_RELATIVE_PATHS.has(rel)) {
        results.push(fullPath)
      }
    }
  }

  return results
}

function scan(): Record<string, FileCounts> {
  const out: Record<string, FileCounts> = {}

  for (const file of collectSourceFiles(SRC_ROOT)) {
    const rel = file.slice(SRC_ROOT.length + 1).replace(/\\/g, '/')
    const isCode = /\.tsx?$/.test(file)
    const counts: FileCounts = {}

    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (line.includes('design-allow:')) {
        continue
      }

      for (const metric of METRICS) {
        const counter = COUNTERS[metric]

        if (counter.codeOnly && !isCode) {
          continue
        }

        if (counter.line && !counter.line(line)) {
          continue
        }

        const hits = line.match(counter.re)

        if (hits) {
          counts[metric] = (counts[metric] ?? 0) + hits.length
        }
      }

      // Tailwind v4's bare `rounded` is a fixed 0.25rem. Class-string lines only.
      if (isCode && !/^\s*(\/\/|\*|\/\*)/.test(line) && /["'`]/.test(line)) {
        const bare = line.match(/(?:^|[\s"'`:{(])rounded(?=[\s"'`})\]]|$)/g)

        if (bare) {
          counts.roundedLegacy = (counts.roundedLegacy ?? 0) + bare.length
        }
      }
    }

    if (Object.keys(counts).length > 0) {
      out[rel] = counts
    }
  }

  return out
}

interface Baseline {
  description: string
  files: Record<string, FileCounts>
  // false only for the first run after the file is created; then
  // `UPDATE_RATCHET=1` may record the starting counts. Always true afterwards.
  generated: boolean
  version: number
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline
}

function sortedFiles(files: Record<string, FileCounts>): Record<string, FileCounts> {
  return Object.fromEntries(
    Object.keys(files)
      .sort()
      .map(path => [
        path,
        Object.fromEntries(Object.keys(files[path]!).sort().map(m => [m, files[path]![m as Metric]]))
      ])
  )
}

describe('no-raw-visuals ratchet', () => {
  it('never grows, and the baseline never hides shrinkage', () => {
    const current = scan()
    const baseline = readBaseline()

    if (!baseline.generated && process.env.UPDATE_RATCHET === '1') {
      writeFileSync(
        BASELINE_PATH,
        `${JSON.stringify({ ...baseline, generated: true, files: sortedFiles(current) }, null, 2)}\n`
      )

      return
    }

    const grew: string[] = []
    const shrank: string[] = []

    for (const path of new Set([...Object.keys(current), ...Object.keys(baseline.files)])) {
      for (const metric of METRICS) {
        const now = current[path]?.[metric] ?? 0
        const before = baseline.files[path]?.[metric] ?? 0

        if (now > before) {
          grew.push(`${path}: ${metric} ${before} -> ${now} (${COUNTERS[metric].hint})`)
        } else if (now < before) {
          shrank.push(`${path}: ${metric} ${before} -> ${now}`)
        }
      }
    }

    expect(grew, `Raw visual values grew:\n${grew.join('\n')}`).toEqual([])

    if (shrank.length > 0 && process.env.UPDATE_RATCHET === '1') {
      writeFileSync(
        BASELINE_PATH,
        `${JSON.stringify({ ...baseline, files: sortedFiles(current) }, null, 2)}\n`
      )

      return
    }

    expect(
      shrank,
      `Counts dropped. Lower the baseline in this change: UPDATE_RATCHET=1 npx vitest run no-raw-visuals\n${shrank.join('\n')}`
    ).toEqual([])
  })
})
