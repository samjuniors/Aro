#!/usr/bin/env node
// Context pack: what to read this session, and nothing else.
//
//   node .agent/aro-program/tools/context-pack.mjs [--since <ref>] [--path <prefix>] [--depth 1] [--limit 40]
//
// --since defaults to the newest tag `aro-gate/*` (set after every approved gate);
// if there is none it falls back to HEAD~20. Output = changed files, the files they
// import, and the files that import them (TS/TSX only, depth 1 by default), with
// rough token costs, plus a skip list. Python files are listed as changed only.
// Zero dependencies (node 18+, git).
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const argv = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = argv.indexOf(name)
  return i > -1 ? argv[i + 1] : dflt
}
const git = (...args) => spawnSync('git', args, { encoding: 'utf8' })
const top = git('rev-parse', '--show-toplevel')
if (top.status !== 0) {
  console.error('Run inside the git repository.')
  process.exit(2)
}
const ROOT = resolve(top.stdout.trim())
process.chdir(ROOT)

let since = opt('--since')
let sinceNote = ''
if (!since) {
  const tags = git('tag', '--list', 'aro-gate/*', '--sort=-creatordate').stdout.split('\n').filter(Boolean)
  if (tags.length) {
    since = tags[0]
    sinceNote = `latest gate tag`
  } else {
    since = 'HEAD~20'
    sinceNote = 'no gate tag yet; last 20 commits'
  }
}
const DEPTH = Number(opt('--depth', '1'))
const LIMIT = Number(opt('--limit', '40'))
const PATH_FILTER = opt('--path', '')

const diff = git('diff', '--name-status', '--no-renames', `${since}..HEAD`)
if (diff.status !== 0) {
  console.error(`git diff failed for "${since}": ${diff.stderr.trim()}`)
  process.exit(2)
}

const churn = new Map()
for (const line of git('diff', '--numstat', '--no-renames', `${since}..HEAD`).stdout.split('\n').filter(Boolean)) {
  const [a, d, f] = line.split('\t')
  churn.set(f, (Number(a) || 0) + (Number(d) || 0))
}

const SKIP = [
  /(^|\/)node_modules\//, /(^|\/)dist\//, /^locales\//, /^website\//, /^aro-patches\//,
  /package-lock\.json$/, /uv\.lock$/, /flake\.lock$/, /\.(woff2?|png|jpe?g|gif|ico|icns|zip|patch|snap)$/,
  /__snapshots__\//, /^docs\/archive\//, /^\.agent\/aro-program\/evidence\//
]
const skipped = []
const changed = []
for (const line of diff.stdout.split('\n').filter(Boolean)) {
  const [status, file] = line.split('\t')
  if (status === 'D') continue
  if (SKIP.some(re => re.test(file))) { skipped.push(file); continue }
  if (PATH_FILTER && !file.startsWith(PATH_FILTER)) continue
  changed.push(file)
}

// ---- TS/TSX import graph (apps/desktop only; alias "@/" -> apps/desktop/src) -------------
const TS_ROOTS = ['apps/desktop/src', 'apps/desktop/electron'].filter(existsSync)
const isTs = f => /\.(ts|tsx|mts|cts)$/.test(f)
function* walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'dist' || n === 'fonts') continue
    const p = join(dir, n)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (isTs(n)) yield p
  }
}
const files = TS_ROOTS.flatMap(r => [...walk(r)]).map(p => p.split(sep).join('/'))
const fileSet = new Set(files)
const IMPORT_RE = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g
const EXTS = ['', '.ts', '.tsx', '.mts', '/index.ts', '/index.tsx']
function resolveSpec(from, spec) {
  let base
  if (spec.startsWith('@/')) base = join('apps/desktop/src', spec.slice(2))
  else if (spec.startsWith('.')) base = join(dirname(from), spec)
  else return null
  base = base.split(sep).join('/')
  for (const e of EXTS) if (fileSet.has(base + e)) return base + e
  return null
}
const imports = new Map()
const importers = new Map()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const out = new Set()
  for (const m of src.matchAll(IMPORT_RE)) {
    const r = resolveSpec(f, m[1])
    if (r && r !== f) out.add(r)
  }
  imports.set(f, out)
  for (const r of out) {
    if (!importers.has(r)) importers.set(r, new Set())
    importers.get(r).add(f)
  }
}

const seed = changed.filter(f => fileSet.has(f))
const related = new Map() // file -> reason
let frontier = new Set(seed)
for (let d = 0; d < DEPTH; d++) {
  const next = new Set()
  for (const f of frontier) {
    for (const i of imports.get(f) ?? []) if (!seed.includes(i) && !related.has(i)) { related.set(i, `imported by ${basename(f)}`); next.add(i) }
    for (const i of importers.get(f) ?? []) if (!seed.includes(i) && !related.has(i)) { related.set(i, `imports ${basename(f)}`); next.add(i) }
  }
  frontier = next
}
function basename(p) { return p.split('/').pop() }

const tokens = f => { try { return Math.ceil(statSync(f).size / 4) } catch { return 0 } }
const fmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
const byChurn = (a, b) => (churn.get(b) ?? 0) - (churn.get(a) ?? 0)

const all = [...seed, ...changed.filter(f => !fileSet.has(f))]
const ranked = [...all].sort(byChurn)
const shown = ranked.slice(0, LIMIT)
const rel = [...related.keys()].sort((a, b) => tokens(a) - tokens(b)).slice(0, LIMIT)
const diffTokens = all.reduce((s, f) => s + Math.ceil(((churn.get(f) ?? 0) * 60) / 4), 0)

console.log(`# Context pack (since ${since}${sinceNote ? `, ${sinceNote}` : ''}${PATH_FILTER ? `, path ${PATH_FILTER}` : ''}, depth ${DEPTH})`)
console.log(`${all.length} files changed; reading only their diffs is ~${fmt(diffTokens)} tokens, whole files far more.`)
if (all.length > LIMIT) console.log(`Large change set: scope it with --path <dir> and work cluster by cluster (section A2).`)
console.log(`\n## A. Highest-churn changed files (top ${shown.length} of ${all.length}; read the diff, not the file)`)
for (const f of shown) console.log(`- ${f}  (±${churn.get(f) ?? 0} lines, file ~${fmt(tokens(f))} tok)`)

const clusters = new Map()
for (const f of all) {
  const key = dirname(f).split('/').slice(0, 5).join('/')
  const c = clusters.get(key) ?? { n: 0, lines: 0 }
  c.n++
  c.lines += churn.get(f) ?? 0
  clusters.set(key, c)
}
console.log(`\n## A2. Clusters (use with --path)`)
for (const [k, v] of [...clusters].sort((a, b) => b[1].lines - a[1].lines).slice(0, 12)) console.log(`- ${k}/  ${v.n} files, ±${v.lines} lines`)

console.log(`\n## B. Connected to the changed set, depth ${DEPTH} (${related.size}${related.size > rel.length ? `, ${rel.length} smallest shown` : ''}; read only if a step needs them)`)
for (const f of rel) console.log(`- ${f}  (~${fmt(tokens(f))})  [${related.get(f)}]`)
console.log(`\n## C. Skipped on purpose (${skipped.length})`)
console.log(skipped.length ? skipped.slice(0, 12).map(f => `- ${f}`).join('\n') + (skipped.length > 12 ? `\n- ... ${skipped.length - 12} more` : '') : '- none')
console.log('\nHunks only: git diff ' + since + '..HEAD -- <file>')
