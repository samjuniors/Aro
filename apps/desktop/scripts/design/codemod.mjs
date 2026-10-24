#!/usr/bin/env node
// Design-contract codemods for apps/desktop/src (class strings in .ts/.tsx only).
//
//   node scripts/design/codemod.mjs <radius|type|all> [--write]
//
// Dry run by default. Idempotent: if a patch no longer applies cleanly, re-run
// this on the current tree instead of resolving conflicts by hand.
//
//   radius  legacy / arbitrary radii -> role classes (DESIGN.md 3.1)
//             xs sm md (and bare `rounded`) -> rounded-control   (7px)
//             lg                            -> rounded-panel     (10px)
//             xl 2xl 3xl                    -> rounded-overlay   (14px)
//             rounded-aro-xs|sm|md -> control, -lg -> panel, -xl -> overlay
//             rounded-[Npx|Nrem] -> nearest role (<=8.5px control, <=12px panel, else overlay)
//           rounded-full, rounded-none and rounded-[inherit] are left alone.
//   type    text-[Npx|Nrem] between 9 and 18px -> text-aro-xs|sm|md|lg|xl
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'src')
const WRITE = process.argv.includes('--write')
const RULE = process.argv[2] ?? 'all'

const SKIP_DIR = new Set(['node_modules', 'fonts', '__tests__'])
const isSource = f =>
  /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts')

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIR.has(name)) yield* walk(p)
    } else if (isSource(name)) yield p
  }
}

const toPx = (n, unit) => (unit === 'rem' ? Number(n) * 16 : Number(n))
const roleForPx = px => (px <= 8.5 ? 'control' : px <= 12 ? 'panel' : 'overlay')
const LEGACY = { xs: 'control', sm: 'control', md: 'control', lg: 'panel', xl: 'overlay', '2xl': 'overlay', '3xl': 'overlay' }
const SIDE = '(?:-(?:t|r|b|l|tl|tr|bl|br|s|e|ss|se|es|ee))?'

const RULES = {
  radius: [
    // rounded-md, rounded-t-lg, ...
    {
      re: new RegExp(`\\brounded(${SIDE})-(xs|sm|md|lg|xl|2xl|3xl)(?![\\w-])`, 'g'),
      fn: (_m, side, size) => `rounded${side}-${LEGACY[size]}`
    },
    // rounded-aro-md ...
    {
      re: new RegExp(`\\brounded(${SIDE})-aro-(xs|sm|md|lg|xl|2xl)(?![\\w-])`, 'g'),
      fn: (_m, side, size) => `rounded${side}-${size === 'lg' ? 'panel' : size === 'xl' || size === '2xl' ? 'overlay' : 'control'}`
    },
    // rounded-[6px] / rounded-t-[0.25rem]
    {
      re: new RegExp(`\\brounded(${SIDE})-\\[(\\d*\\.?\\d+)(px|rem)\\]`, 'g'),
      fn: (_m, side, n, unit) => `rounded${side}-${roleForPx(toPx(n, unit))}`
    },
    // the one token-with-fallback form in the tree
    {
      re: /\brounded-\[var\(--aro-radius-sm,\s*4px\)\]/g,
      fn: () => 'rounded-control'
    },
    // Bare `rounded`: Tailwind v4 makes it a fixed 0.25rem that ignores the theme.
    // Only on lines that contain a quote and are not comments.
    {
      re: /(^|[\s"'`:{(])rounded(?=[\s"'`})\]]|$)/g,
      fn: (_m, pre) => `${pre}rounded-control`,
      skipLine: line => /^\s*(\/\/|\*|\/\*)/.test(line) || !/["'`]/.test(line)
    }
  ],
  type: [
    {
      re: /\btext-\[(\d*\.?\d+)(px|rem)\]/g,
      fn: (m, n, unit) => {
        const px = toPx(n, unit)
        if (px < 9 || px > 18.5) return m
        if (px <= 11.3) return 'text-aro-xs'
        if (px <= 12.75) return 'text-aro-sm'
        if (px <= 13.75) return 'text-aro-md'
        if (px >= 14.25 && px <= 15.5) return 'text-aro-lg'
        if (px >= 17.5) return 'text-aro-xl'
        return m // 13.76–14.24 (text-sm territory) and 15.51–17.49 stay as written
      }
    }
  ]
}

const names = RULE === 'all' ? Object.keys(RULES) : [RULE]
if (names.some(n => !RULES[n])) {
  console.error('usage: codemod.mjs <radius|type|all> [--write]')
  process.exit(2)
}

const totals = Object.fromEntries(names.map(n => [n, 0]))
let files = 0
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  let out = src
  for (const n of names) {
    for (const rule of RULES[n]) {
      const apply = chunk =>
        chunk.replace(rule.re, (...a) => {
          const r = rule.fn(...a)
          if (r !== a[0]) totals[n]++
          return r
        })
      out = rule.skipLine
        ? out.split('\n').map(l => (rule.skipLine(l) ? l : apply(l))).join('\n')
        : apply(out)
    }
  }
  if (out !== src) {
    files++
    if (WRITE) writeFileSync(file, out)
  }
}
console.log(`${WRITE ? 'wrote' : 'would change'} ${files} files`, totals, relative(process.cwd(), ROOT).split(sep).join('/'))
