/**
 * ARO DESIGN SYSTEM — REFERENCE PAGE (desktop port)
 *
 * `/aro-design` — a live gallery of the Aro token layer + primitive kit,
 * adapted from the prototype's DesignSystemView. The page themes ITSELF:
 * the root wrapper carries `data-theme`, so the aro token layer resolves
 * only inside this subtree and the rest of the desktop app (its theme,
 * its scrollbars, its surfaces) is completely untouched while the page is
 * open — and reverts the moment it unmounts.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  ActionBar,
  FormRow,
  Inline,
  PageHeader,
  PageShell,
  Section as LayoutSection,
  Stack,
  Toolbar,
} from '@/components/ui/layout'
import {
  DialogTemplate,
  FormPageTemplate,
  ListPageTemplate,
  MasterDetailOverlayTemplate,
  PageTemplate,
  SettingsSubpageTemplate,
  StateBox,
} from '@/components/ui/templates'

import { AgentMark, IconAt, IconBolt, IconBrain, IconCheck, IconGit, IconPlug, IconSearch, IconShield, IconSpark, IconTerminal, IconWarning, LogoMark } from './Icons'
import {
  Badge,
  Bar,
  Button,
  Checkbox,
  ConfirmDialog,
  Divider,
  EmptyState,
  ErrorState,
  FieldMessage,
  IconButton,
  Input,
  Kbd,
  ListRow,
  Loader,
  LogView,
  Modal,
  Ring,
  SectionLabel,
  Segmented,
  Select,
  Skeleton,
  Sparkline,
  Stat,
  Tabs,
  Textarea,
  Tip,
  Toasts,
  Toggle,
  toneBg,
} from './ui'

/* ------------------------------ theme registry ---------------------------- */
type ThemeId = 'obsidian' | 'daylight' | 'nord' | 'ember' | 'paper' | 'ink'

const THEMES: { id: ThemeId; label: string; desc: string; swatch: string[] }[] = [
  { id: 'obsidian', label: 'Obsidian', desc: 'Deep neutral dark · violet accent', swatch: ['#0c0e14', '#12151d', '#7c6bff', '#35d6c4'] },
  { id: 'daylight', label: 'Daylight', desc: 'Clean light · high legibility', swatch: ['#ffffff', '#f4f5f8', '#5b4ce6', '#0f9f90'] },
  { id: 'nord', label: 'Nord', desc: 'Arctic blue-grey · frost accent', swatch: ['#2a303b', '#313845', '#88c0d0', '#a3be8c'] },
  { id: 'ember', label: 'Ember', desc: 'Warm charcoal · copper accent', swatch: ['#171210', '#1f1815', '#ff8a4c', '#4fd1b5'] },
  { id: 'paper', label: 'Paper', desc: 'Warm light · ink on paper', swatch: ['#faf7f0', '#f4f0e6', '#8a5cf6', '#0f8f86'] },
  { id: 'ink', label: 'Ink', desc: 'Monochrome dark · high contrast', swatch: ['#000000', '#0a0a0a', '#ffffff', '#22c55e'] },
]

/* ------------------------------ inline catalogue -------------------------- */
const DS_COLORS: { group: string; swatches: { name: string; cssVar: string; usage: string }[] }[] = [
  {
    group: 'Surface',
    swatches: [
      { name: 'void', cssVar: '--aro-void', usage: 'App chrome, gutters' },
      { name: 'sunken', cssVar: '--aro-sunken', usage: 'Inputs, wells' },
      { name: 'bg', cssVar: '--aro-bg', usage: 'Panels, modals' },
      { name: 'raise', cssVar: '--aro-raise', usage: 'Cards, bars, rows' },
      { name: 'hover', cssVar: '--aro-hover', usage: 'Hover target' },
      { name: 'line', cssVar: '--aro-line', usage: 'Hairline borders' },
    ],
  },
  {
    group: 'Ink',
    swatches: [
      { name: 'ink', cssVar: '--aro-ink', usage: 'Primary text' },
      { name: 'ink-2', cssVar: '--aro-ink-2', usage: 'Secondary text' },
      { name: 'ink-3', cssVar: '--aro-ink-3', usage: 'Meta, labels' },
      { name: 'ink-4', cssVar: '--aro-ink-4', usage: 'Placeholders, ticks' },
    ],
  },
  {
    group: 'Signal',
    swatches: [
      { name: 'iris', cssVar: '--aro-iris', usage: 'Brand, primary action, agent' },
      { name: 'cyan', cssVar: '--aro-cyan', usage: 'Streaming / active work' },
      { name: 'mint', cssVar: '--aro-mint', usage: 'Success, additions' },
      { name: 'amber', cssVar: '--aro-amber', usage: 'Caution, approvals' },
      { name: 'rose', cssVar: '--aro-rose', usage: 'Destructive, deletions' },
      { name: 'sky', cssVar: '--aro-sky', usage: 'Informational' },
    ],
  },
]

const DS_TYPE: { token: string; cls: string; spec: string }[] = [
  { token: 'display', cls: 'font-aro-display text-2xl leading-[1.12] font-semibold tracking-[-.028em]', spec: 'Space Grotesk · 26/29 · 600' },
  { token: 'title', cls: 'text-base leading-[1.3] font-semibold tracking-[-.01em]', spec: '15 / 20 · 600 · -1%' },
  { token: 'body', cls: 'text-xs leading-[1.6] font-normal', spec: '13 / 21 · 400' },
  { token: 'label', cls: 'text-xs leading-[1.4] font-medium', spec: '12 / 17 · 500' },
  { token: 'meta', cls: 'text-xs leading-[1.4] font-normal text-aro-ink-3', spec: '11 / 15 · 400' },
  { token: 'mono', cls: 'font-aro-mono text-xs leading-[1.55]', spec: 'JetBrains Mono 11.5' },
  { token: 'overline', cls: 'font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold tracking-[.14em] uppercase text-aro-ink-4', spec: '9.5 · 600 · +14%' },
]

const DS_RADII: { token: string; px: number; usage: string }[] = [
  { token: 'xs', px: 3, usage: 'kbd, tiny chips' },
  { token: 'sm', px: 5, usage: 'badges, small buttons' },
  { token: 'md', px: 7, usage: 'buttons, inputs' },
  { token: 'lg', px: 10, usage: 'cards, panels' },
  { token: 'xl', px: 14, usage: 'modals, popovers' },
  { token: '2xl', px: 18, usage: 'hero surfaces' },
]

const DS_MOTION: { token: string; curve: string; dur: string; usage: string }[] = [
  { token: 'rise', curve: 'cubic-bezier(.22,1,.36,1)', dur: '320ms', usage: 'Rows and cards entering' },
  { token: 'pop', curve: 'cubic-bezier(.34,1.56,.64,1)', dur: '220ms', usage: 'Modals, popovers' },
  { token: 'slide-down', curve: 'cubic-bezier(.22,1,.36,1)', dur: '200ms', usage: 'Menus, disclosures' },
  { token: 'shimmer', curve: 'linear', dur: '2.2s', usage: 'Loading skeletons' },
  { token: 'breathe', curve: 'ease-in-out', dur: '2.6s', usage: 'Live agent pulse' },
  { token: 'sweep', curve: 'ease-in-out', dur: '1.6s', usage: 'Indeterminate progress' },
]

const DS_SPACING = [2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40]

/* ============================ section frame ============================ */
function DS({ id, eyebrow, title, body, children }: { id: string; eyebrow: string; title: string; body: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-16 border-t border-aro-line-soft py-8 first:border-0" id={id}>
      <div className="mb-5">
        <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold tracking-[.16em] text-aro-iris-soft uppercase">{eyebrow}</span>
        <h2 className="mt-1.5 text-xl leading-tight font-semibold tracking-[-.02em] text-aro-ink">{title}</h2>
        <p className="mt-1.5 max-w-[680px] text-xs leading-[1.65] text-aro-ink-3">{body}</p>
      </div>
      {children}
    </section>
  )
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-panel border border-aro-line-soft bg-aro-sunken p-3">
      <div className="mb-2.5 font-aro-mono text-[var(--aro-text-2xs,10px)] tracking-[.14em] text-aro-ink-4 uppercase">{label}</div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-aro-line-soft/60 py-2.5 last:border-0">
      <span className="w-[110px] shrink-0 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{label}</span>
      {children}
    </div>
  )
}

/* ============================ color swatch ============================ */
function Swatch({ name, cssVar, usage }: { name: string; cssVar: string; usage: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-panel border border-aro-line-soft bg-aro-raise text-left transition-[box-shadow,border-color] hover:border-aro-line-strong hover:shadow-aro-e2"
      onClick={() => {
        navigator.clipboard?.writeText(`var(${cssVar})`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1100)
      }}
    >
      <div className="relative h-[62px] w-full" style={{ background: `var(${cssVar})` }}>
        <div
          className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.12),transparent)' }}
        />
        <span
          className={cn(
            'absolute top-2 right-2 rounded-control px-1.5 py-[1px] font-aro-mono text-[var(--aro-text-2xs,10px)] transition-opacity',
            copied ? 'bg-black/50 text-white opacity-100' : 'bg-black/35 text-white/80 opacity-0 group-hover:opacity-100',
          )}
        >
          {copied ? 'copied' : cssVar}
        </span>
      </div>
      <div className="px-2.5 py-2">
        <div className="font-aro-mono text-xs text-aro-ink">{name}</div>
        <div className="mt-0.5 text-[var(--aro-text-2xs,10px)] leading-[1.4] text-aro-ink-3">{usage}</div>
      </div>
    </button>
  )
}

/* ============================ main view ============================ */
export function AroDesignSystemPage() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aro.theme') as ThemeId
      if (['obsidian', 'daylight', 'nord', 'ember', 'paper', 'ink'].includes(saved)) {
        return saved
      }
    }
    return 'obsidian'
  })
  const [glass, setGlass] = useState(false)
  const [rtl, setRtl] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [checkboxVal, setCheckboxVal] = useState(true)
  const [demoTab, setDemoTab] = useState<'a' | 'b' | 'c'>('a')
  const [seg, setSeg] = useState<'plan' | 'agent'>('plan')
  const [sel, setSel] = useState('opus-4.6')
  const [tog, setTog] = useState(true)
  const [tog2, setTog2] = useState(false)
  const [modal, setModal] = useState(false)
  const [layoutWidth, setLayoutWidth] = useState<'narrow' | 'standard' | 'wide'>('standard')
  const [layoutState, setLayoutState] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const [layoutTemplate, setLayoutTemplate] = useState<'list' | 'form' | 'overlay' | 'dialog' | 'page'>('list')
  const [demoSearch, setDemoSearch] = useState('')
  const [demoNav, setDemoNav] = useState('models')
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: string }[]>([])

  const toast = (msg: string, tone = 'iris') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }

  return (
    // data-theme on the WRAPPER: the aro token layer resolves only inside
    // this subtree. Unmounting the page removes the attribute with it.
    <div
      className={cn(
        'aro-scroll-thin h-full overflow-y-auto bg-aro-void text-aro-ink transition-colors duration-200',
        glass && 'bg-aro-void/85 backdrop-blur-md',
      )}
      data-glass={glass ? 'true' : 'false'}
      data-theme={theme}
      dir={rtl ? 'rtl' : 'ltr'}
      style={
        reducedMotion
          ? ({
              '--aro-dur-instant': '0ms',
              '--aro-dur-fast': '0ms',
              '--aro-dur-mid': '0ms',
              '--aro-dur-base': '0ms',
              '--aro-dur-slow': '0ms',
            } as any)
          : undefined
      }
    >
      {/* hero */}
      <div className="relative overflow-hidden border-b border-aro-line-soft">
        <div className="aro-grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div
          className="pointer-events-none absolute -top-24 -right-10 size-[420px] rounded-full opacity-[0.18] blur-[80px]"
          style={{ background: 'radial-gradient(circle,var(--aro-iris),transparent 70%)' }}
        />
        <div className="relative px-6 py-8">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <Badge className="text-aro-xs" mono tone="iris">
              aro/primitives · desktop port
            </Badge>
            <Badge className="text-[var(--aro-text-2xs,10px)]" mono tone="neutral">
              additive · namespaced · zero host risk
            </Badge>
          </div>
          <h1 className="mt-3 max-w-[760px] font-aro-display text-3xl leading-[1.08] font-semibold tracking-[-.03em] text-aro-ink">
            A design system for{' '}
            <span className="relative whitespace-nowrap text-aro-iris-soft">
              agent control surfaces
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-linear-to-r from-aro-iris via-aro-cyan to-transparent opacity-70" />
            </span>
          </h1>
          <p className="mt-2.5 max-w-[640px] text-xs leading-[1.7] text-aro-ink-3">
            Ported additively into the desktop renderer: every token is namespaced <span className="font-aro-mono text-xs">--aro-*</span> and
            gated behind <span className="font-aro-mono text-xs">data-theme</span>, so this page themes itself without touching a single
            existing screen.
          </p>
          <div className="mt-5 grid max-w-[860px] grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { t: 'Provenance first', d: 'Every artefact carries an agent mark, a model badge and a timestamp.', i: IconShield },
              { t: 'Intent is a mode', d: 'Plan / Agent / Read-only / Full-access is a persistent, colour-coded state.', i: IconBolt },
              { t: 'Nothing silent', d: 'Tool calls, approvals and checkpoints are first-class, not log lines.', i: IconTerminal },
              { t: 'Density with air', d: '11–13px type, 4px rhythm, hairlines instead of heavy chrome.', i: IconSpark },
            ].map((p) => (
              <div className="rounded-panel border border-aro-line-soft bg-aro-raise/70 p-3" key={p.t}>
                <p.i className="text-aro-iris-soft" size={14} />
                <p className="mt-2 text-xs font-semibold text-aro-ink">{p.t}</p>
                <p className="mt-1 text-xs leading-[1.55] text-aro-ink-3">{p.d}</p>
              </div>
            ))}
          </div>

          {/* Interactive display controls (Gate A contract) */}
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-panel border border-aro-line-soft bg-aro-raise/40 px-4 py-3">
            <span className="text-xs font-semibold text-aro-ink">Live Controls:</span>
            <div className="flex items-center gap-2">
              <Toggle checked={glass} onChange={setGlass} size="sm" />
              <span className="text-xs text-aro-ink-2">Glass Surface</span>
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={rtl} onChange={setRtl} size="sm" />
              <span className="text-xs text-aro-ink-2">RTL Layout</span>
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={reducedMotion} onChange={setReducedMotion} size="sm" />
              <span className="text-xs text-aro-ink-2">Reduced Motion</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-16">
        {/* ---------------- THEMES ---------------- */}
        <DS
          body="Five themes share one token contract. Signal colours are re-tuned per theme for contrast; tints are derived with color-mix so every badge, diff and approval card adapts automatically. Click to switch live — the whole page retints."
          eyebrow="foundation 00"
          id="themes"
          title="Themes"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {THEMES.map((t) => (
              <button
                className={cn(
                  'group cursor-pointer overflow-hidden rounded-panel border text-left transition-[box-shadow,border-color] hover:shadow-aro-e3',
                  theme === t.id ? 'border-aro-iris/60 shadow-aro-glow' : 'border-aro-line-soft hover:border-aro-line-strong',
                )}
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  try {
                    localStorage.setItem('aro.theme', t.id)
                    localStorage.setItem('conductor.theme', t.id)
                    window.dispatchEvent(new CustomEvent('aro:theme', { detail: t.id }))
                  } catch {}
                }}
              >
                <div className="relative h-[92px] p-2.5" style={{ background: t.swatch[0] }}>
                  <div className="h-full rounded-control p-2" style={{ background: t.swatch[1], boxShadow: `inset 0 0 0 1px ${t.swatch[2]}33` }}>
                    <div className="h-[6px] w-1/2 rounded-full" style={{ background: t.swatch[2] }} />
                    <div className="mt-1.5 h-[4px] w-3/4 rounded-full opacity-40" style={{ background: t.swatch[3] }} />
                    <div className="mt-1 h-[4px] w-2/3 rounded-full opacity-25" style={{ background: t.swatch[3] }} />
                    <div className="mt-2.5 flex gap-1">
                      <i className="h-[12px] w-[34px] rounded-control" style={{ background: t.swatch[2] }} />
                      <i className="h-[12px] w-[24px] rounded-control opacity-50" style={{ background: t.swatch[3] }} />
                    </div>
                  </div>
                  {theme === t.id && (
                    <span className="absolute top-2 right-2 flex size-[18px] items-center justify-center rounded-full bg-aro-iris text-aro-on-iris">
                      <IconCheck size={10} />
                    </span>
                  )}
                </div>
                <div className="bg-aro-raise px-3 py-2.5">
                  <div className="text-aro-sm font-semibold text-aro-ink">{t.label}</div>
                  <div className="text-aro-xs text-aro-ink-3">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </DS>

        {/* ---------------- COLOR ---------------- */}
        <DS
          body="Three families only: surfaces for depth, ink for hierarchy, signal for meaning. Swatches read the live tokens — they retint with the theme above. Click a swatch to copy its CSS variable."
          eyebrow="foundation 01"
          id="color"
          title="Colour"
        >
          <div className="space-y-4">
            {DS_COLORS.map((g) => (
              <div key={g.group}>
                <SectionLabel className="px-0">{g.group}</SectionLabel>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  {g.swatches.map((s) => (
                    <Swatch key={s.name} {...s} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <Spec label="semantic mapping">
              <div className="space-y-2">
                {[
                  { c: 'iris', m: 'Agent identity · primary action · selection' },
                  { c: 'cyan', m: 'Streaming / actively working' },
                  { c: 'mint', m: 'Success · additions · approvals granted' },
                  { c: 'amber', m: 'Caution · approval required · partial support' },
                  { c: 'rose', m: 'Destructive · deletions · halted runs' },
                  { c: 'sky', m: 'Informational · reads · file access' },
                ].map((x) => (
                  <div className="flex items-center gap-2" key={x.c}>
                    <i className={cn('size-[10px] shrink-0 rounded-control', toneBg[x.c as keyof typeof toneBg])} />
                    <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-2">{x.c}</span>
                    <span className="min-w-0 flex-1 truncate text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{x.m}</span>
                  </div>
                ))}
              </div>
            </Spec>
            <Spec label="elevation ladder">
              <div className="space-y-2">
                {[
                  { n: 'e1', d: 'buttons, small chips', cls: 'shadow-aro-e1 bg-aro-raise' },
                  { n: 'e2', d: 'cards, raised rows', cls: 'shadow-aro-e2 bg-aro-raise' },
                  { n: 'e3', d: 'menus, sticky bars', cls: 'shadow-aro-e3 bg-aro-overlay' },
                  { n: 'e4', d: 'modals, command palette', cls: 'shadow-aro-e4 bg-aro-overlay' },
                ].map((x) => (
                  <div className={cn('rounded-control px-2.5 py-2', x.cls)} key={x.n}>
                    <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink">{x.n}</span>
                    <span className="ml-2 text-[var(--aro-text-2xs,10px)] text-aro-ink-3">{x.d}</span>
                  </div>
                ))}
              </div>
            </Spec>
            <Spec label="brand accent — aro emerald">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <LogoMark size={30} />
                  <div>
                    <div className="text-xs font-semibold text-aro-ink">Aro mark</div>
                    <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">#10B981 · #6EE7B7 · #0D9488</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge mono tone="neutral">
                    <span className="text-aro-emerald">●</span> text-aro-emerald
                  </Badge>
                  <Badge mono tone="neutral">
                    <span className="text-aro-emerald-soft">●</span> text-aro-emerald-soft
                  </Badge>
                  <Badge mono tone="neutral">
                    bg-aro-emerald-tint
                  </Badge>
                </div>
                <div className="flex items-end gap-2 rounded-control border border-aro-emerald/25 bg-aro-emerald-tint px-2.5 py-2 text-xs text-aro-emerald">
                  <AgentMark from="#10b981" glyph="A" size={18} to="#0d9488" /> agent tone — the mark's emerald, usable as a live/ok accent
                </div>
              </div>
            </Spec>
          </div>
        </DS>

        {/* ---------------- TYPE ---------------- */}
        <DS
          body="Three faces, one job each. Space Grotesk carries identity — the wordmark, page titles, empty-state headlines. Inter does all reading. JetBrains Mono is reserved for machine-authored text: paths, commands, hashes, diffs, counts. A path in a proportional face is the fastest way to lose a developer."
          eyebrow="foundation 02"
          id="type"
          title="Typography & spacing"
        >
          <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
            <Spec label="type scale">
              <div className="space-y-3">
                {DS_TYPE.map((t) => (
                  <div className="border-b border-aro-line-soft/60 pb-3 last:border-0 last:pb-0" key={t.token}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="font-aro-mono text-aro-xs text-aro-iris-soft">{t.token}</span>
                      <span className="font-aro-mono text-aro-xs text-aro-ink-4">{t.spec}</span>
                    </div>
                    <p className={cn('truncate text-aro-ink', t.cls)}>
                      {t.token === 'mono'
                        ? 'packages/bridge/src/server.ts'
                        : t.token === 'display'
                          ? 'Agent workbench'
                          : t.token === 'overline'
                            ? 'implementation plan'
                            : t.token === 'meta'
                              ? '148.2k tokens · $3.41 · 2m ago'
                              : t.token === 'label'
                                ? 'Aro · opus-4.6'
                                : 'The bridge now survives a mid-stream disconnect.'}
                    </p>
                  </div>
                ))}
              </div>
            </Spec>

            <div className="space-y-3">
              <Spec label="spacing — 4px rhythm">
                <div className="space-y-1.5">
                  {DS_SPACING.map((s) => (
                    <div className="flex items-center gap-2.5" key={s}>
                      <span className="w-6 shrink-0 font-aro-mono text-aro-xs text-aro-ink-4">{s}</span>
                      <div className="h-[7px] rounded-control bg-linear-to-r from-aro-iris to-aro-iris-soft" style={{ width: s * 4 }} />
                      <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{s % 4 === 0 ? `${s}px` : 'avoid'}</span>
                    </div>
                  ))}
                </div>
              </Spec>
              <Spec label="radius">
                <div className="grid grid-cols-3 gap-2">
                  {DS_RADII.map((r) => (
                    <div className="text-center" key={r.token}>
                      <div className="mx-auto h-9 w-full border border-aro-iris/35 bg-aro-iris-tint" style={{ borderRadius: r.px }} />
                      <div className="mt-1 font-aro-mono text-aro-xs text-aro-ink-3">aro-{r.token}</div>
                      <div className="font-aro-mono text-[8.5px] text-aro-ink-4">{r.usage}</div>
                    </div>
                  ))}
                </div>
              </Spec>
            </div>
          </div>
        </DS>

        {/* ---------------- MOTION ---------------- */}
        <DS
          body="Motion exists to explain provenance and continuity. Streams animate forever; finished work never does. Anything under 200ms is a state change, anything over 300ms is a transition. Keyframes ship aro- prefixed so they can never collide with the host's."
          eyebrow="foundation 03"
          id="motion"
          title="Motion"
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DS_MOTION.map((m) => (
              <div className="rounded-panel border border-aro-line-soft bg-aro-raise p-3" key={m.token}>
                <div className="flex items-center justify-between">
                  <span className="font-aro-mono text-xs text-aro-iris-soft">aro-{m.token}</span>
                  <span className="font-aro-mono text-aro-xs text-aro-ink-4">{m.dur}</span>
                </div>
                <div className="mt-2.5 flex h-[26px] items-center gap-2 overflow-hidden rounded-control border border-aro-line-soft bg-aro-sunken px-2">
                  {m.token === 'shimmer' ? (
                    <div className="aro-skeleton h-[8px] w-full rounded-full" />
                  ) : m.token === 'breathe' ? (
                    <i className="size-[8px] animate-aro-breathe rounded-full bg-aro-cyan" />
                  ) : m.token === 'sweep' ? (
                    <div className="relative h-[4px] w-full overflow-hidden rounded-full bg-aro-track">
                      <div className="absolute inset-y-0 left-0 w-1/4 animate-aro-sweep rounded-full bg-aro-iris" />
                    </div>
                  ) : (
                    <span
                      className="rounded-control bg-aro-iris px-1.5 py-[2px] font-aro-mono text-[var(--aro-text-2xs,10px)] text-white"
                      style={{ animation: `aro-${m.token} 2.4s ${m.curve} infinite` }}
                    >
                      {m.token}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-aro-xs text-aro-ink-3">{m.usage}</p>
                <p className="mt-1 truncate font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{m.curve}</p>
              </div>
            ))}
          </div>
        </DS>

        {/* ---------------- COMPONENTS ---------------- */}
        <DS
          body="Every primitive is keyboard-reachable, has a hover and a focus-visible state, and consumes only namespaced aro tokens. These are the exact components exported from src/aro/ui.tsx."
          eyebrow="primitives"
          id="components"
          title="Components"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <Spec label="buttons">
              <Row label="primary">
                <Button icon={IconBolt} variant="primary">
                  Build plan
                </Button>
                <Button size="xs" variant="primary">
                  Xs
                </Button>
                <Button size="lg" variant="primary">
                  Lg
                </Button>
              </Row>
              <Row label="secondary">
                <Button icon={IconPlug} variant="secondary">
                  Attach editor
                </Button>
                <Button size="xs" variant="secondary">
                  Xs
                </Button>
              </Row>
              <Row label="outline / ghost">
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <IconButton icon={IconSearch} label="search" />
                <IconButton active icon={IconBrain} label="thinking" />
              </Row>
              <Row label="semantic">
                <Button icon={IconCheck} variant="success">
                  Allow once
                </Button>
                <Button icon={IconWarning} variant="danger">
                  Deny
                </Button>
                <Button disabled variant="secondary">
                  Disabled
                </Button>
              </Row>
            </Spec>

            <Spec label="badges, pills & keys">
              <Row label="tones">
                {(['neutral', 'iris', 'cyan', 'mint', 'amber', 'rose', 'sky', 'plum'] as const).map((t) => (
                  <Badge dot key={t} mono tone={t}>
                    {t}
                  </Badge>
                ))}
              </Row>
              <Row label="status">
                <Badge dot tone="cyan">
                  running
                </Badge>
                <Badge dot tone="amber">
                  awaiting approval
                </Badge>
                <Badge dot tone="mint">
                  landed
                </Badge>
                <Badge dot tone="rose">
                  halted
                </Badge>
              </Row>
              <Row label="keyboard">
                <Kbd>⌘</Kbd> <Kbd>K</Kbd> <Kbd>⇧⌘P</Kbd> <Kbd>esc esc</Kbd> <Kbd>⏎</Kbd>
              </Row>
              <Row label="icon + text">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-aro-line bg-aro-raise py-[3px] pr-2.5 pl-2 text-xs text-aro-ink-3">
                  <IconAt className="text-aro-iris-soft" size={11} /> @file
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-control border border-aro-line bg-aro-raise px-1.5 py-[1px] font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-3">
                  <IconGit size={9} /> feat/ide-bridge
                </span>
              </Row>
            </Spec>

            <Spec label="inputs & selection">
              <div className="space-y-2.5">
                <Input placeholder="Filter sessions…" />
                <div className="flex gap-2">
                  <Select
                    className="flex-1"
                    onChange={setSel}
                    options={[
                      { value: 'opus-4.6', label: 'Opus 4.6', hint: '200k' },
                      { value: 'sonnet-4.6', label: 'Sonnet 4.6', hint: '200k' },
                      { value: 'haiku-4.6', label: 'Haiku 4.6', hint: '200k' },
                    ]}
                    value={sel}
                  />
                  <Select align="right" className="flex-1" onChange={setSel} options={[{ value: sel, label: 'Right aligned' }]} value={sel} />
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 text-aro-sm text-aro-ink-2">
                    <Toggle checked={tog} onChange={setTog} /> auto-approve
                  </span>
                  <span className="flex items-center gap-2 text-aro-sm text-aro-ink-2">
                    <Toggle checked={tog2} onChange={setTog2} size="sm" /> network
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Segmented
                    items={[
                      { value: 'plan', label: 'Plan', icon: IconBrain },
                      { value: 'agent', label: 'Agent', icon: IconBolt },
                    ]}
                    onChange={setSeg}
                    value={seg}
                  />
                  <Tabs
                    items={[
                      { value: 'a', label: 'Plan' },
                      { value: 'b', label: 'Context', count: 4 },
                      { value: 'c', label: 'Bridge' },
                    ]}
                    onChange={setDemoTab}
                    value={demoTab}
                  />
                </div>
              </div>
            </Spec>

            <Spec label="data display">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Stat chart={[22, 31, 28, 44, 51, 63, 72, 96]} label="tokens" sub="62% of window" value="148.2k" />
                  <Stat label="spend" sub="this session" tone="iris" value="$3.41" />
                </div>
                <div className="flex items-center gap-4 rounded-panel border border-aro-line-soft bg-aro-sunken p-3">
                  <Ring size={54} stroke={5} value={62}>
                    <span className="font-aro-mono text-xs font-semibold text-aro-ink">62%</span>
                  </Ring>
                  <Ring size={54} stroke={5} tone="var(--aro-mint)" value={91}>
                    <span className="font-aro-mono text-xs font-semibold text-aro-mint">91%</span>
                  </Ring>
                  <Ring size={54} stroke={5} tone="var(--aro-amber)" value={38}>
                    <span className="font-aro-mono text-xs font-semibold text-aro-amber">38%</span>
                  </Ring>
                  <div className="ml-auto space-y-2">
                    <Bar tone="iris" value={62} />
                    <Bar tone="mint" value={91} />
                    <Bar tone="amber" value={38} />
                    <Bar indeterminate tone="cyan" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-panel border border-aro-line-soft bg-aro-sunken px-3 py-2.5">
                  <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">sparkline · 12 buckets</span>
                  <div className="flex items-end gap-3">
                    <Sparkline color="var(--aro-mint)" data={[4, 8, 6, 12, 9, 14, 11, 18]} h={22} w={70} />
                    <Sparkline color="var(--aro-rose)" data={[18, 14, 16, 9, 11, 6, 8, 4]} h={22} w={70} />
                  </div>
                </div>
              </div>
            </Spec>

            <Spec label="feedback">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 rounded-control border border-aro-amber/25 bg-aro-amber-tint/60 px-2.5 py-2 text-xs text-aro-amber">
                  <IconWarning size={12} /> Approval required — <span className="font-aro-mono">gh pr create</span>
                </div>
                <div className="flex items-center gap-2 rounded-control border border-aro-rose/25 bg-aro-rose-tint/60 px-2.5 py-2 text-xs text-aro-rose">
                  <IconWarning size={12} /> Spend cap reached — run halted at 44%
                </div>
                <div className="flex items-center gap-2 rounded-control border border-aro-mint/25 bg-aro-mint-tint/60 px-2.5 py-2 text-xs text-aro-mint">
                  <IconCheck size={12} /> 14 tests passed in 284ms
                </div>
                <div className="flex items-center gap-2 rounded-control border border-aro-emerald/25 bg-aro-emerald-tint px-2.5 py-2 text-xs text-aro-emerald">
                  <AgentMark from="#10b981" glyph="A" size={14} to="#0d9488" /> aro · brand accent — live and healthy
                </div>
              </div>
            </Spec>

            <Spec label="overlay, empty & toasts">
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  <Button icon={IconBolt} onClick={() => setModal(true)} variant="secondary">
                    Open modal
                  </Button>
                  <Button icon={IconWarning} onClick={() => setConfirmOpen(true)} variant="outline">
                    Confirm dialog
                  </Button>
                  <Button
                    onClick={() => {
                      toast('Patch applied · 3 files', 'mint')
                      setTimeout(() => toast('Approval required', 'amber'), 700)
                    }}
                    variant="secondary"
                  >
                    Fire toasts
                  </Button>
                </div>
                <div className="rounded-panel border border-dashed border-aro-line">
                  <EmptyState
                    action={
                      <Button size="xs" variant="secondary">
                        Clear filter
                      </Button>
                    }
                    body="Try clearing the query, or start a new session with a different agent."
                    icon={IconSearch}
                    title="No sessions match that filter"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Tip label="tooltip · 150ms fade">
                    <Button size="xs" variant="ghost">
                      Hover me
                    </Button>
                  </Tip>
                  <Tip label="⌘B">
                    <Button size="xs" variant="ghost">
                      With shortcut
                    </Button>
                  </Tip>
                </div>
              </div>
            </Spec>

            <Spec label="forms & field feedback">
              <div className="space-y-3">
                <Textarea placeholder="Multi-line reasoning or system instructions…" rows={2} />
                <div className="space-y-1.5">
                  <FieldMessage tone="error">Branch has uncommitted changes that would be overwritten</FieldMessage>
                  <FieldMessage tone="warn">Rate limit threshold reached for Anthropic tier</FieldMessage>
                  <FieldMessage tone="success">Runtime verified with zero regressions</FieldMessage>
                  <FieldMessage tone="info">Press Shift+Tab to move focus back to prompt composer</FieldMessage>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <Checkbox checked={checkboxVal} label="Include commit history in context" onChange={setCheckboxVal} />
                  <Checkbox checked={false} disabled label="Auto-compact disabled" onChange={() => {}} />
                </div>
              </div>
            </Spec>

            <Spec label="list rows & items">
              <div className="space-y-1 rounded-panel border border-aro-line-soft bg-aro-sunken/40 p-1.5">
                <ListRow
                  action={<Badge dot tone="mint">active</Badge>}
                  description="Primary autonomous reasoning loop with tools"
                  icon={IconBolt}
                  onClick={() => toast('Row clicked: Autonomous agent')}
                  title="Aro Core Turn Loop"
                />
                <ListRow
                  action={<Toggle checked={tog} onChange={setTog} size="sm" />}
                  description="Pre-checks tool permissions before dispatching"
                  icon={IconShield}
                  title="Approval Gate"
                />
                <ListRow
                  action={<Kbd>⌥⌘T</Kbd>}
                  description="Direct subshell inside workspace container"
                  disabled
                  icon={IconTerminal}
                  title="Pty Terminal Bridge"
                />
              </div>
            </Spec>

            <Spec label="diagnostics, loaders & logs">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-aro-ink-3">
                    <Loader size={16} /> <span>Thinking…</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-aro-ink-3">
                    <Loader size={20} /> <span>Executing bash command</span>
                  </div>
                  <Skeleton className="h-6 w-32" />
                </div>
                <LogView
                  lines={[
                    '[2026-10-17 10:00:12] INFO  aro_bridge.engine: connecting to local runtime',
                    '[2026-10-17 10:00:13] INFO  model_switch: resolved model to ornith-1.5:9b',
                    '[2026-10-17 10:00:14] WARN  rate_limit: bucket at 85% capacity (cooldown 12s)',
                    '[2026-10-17 10:00:15] PASS  vitest: 14 test files passed, 0 errors'
                  ]}
                />
                <div className="rounded-panel border border-aro-line-soft bg-aro-raise/30">
                  <ErrorState
                    description="Could not establish websocket connection to backend RPC daemon."
                    retry={() => toast('Retrying connection…', 'cyan')}
                    title="Gateway Daemon Offline"
                  />
                </div>
              </div>
            </Spec>
          </div>
        </DS>

        <ConfirmDialog
          danger
          description="This will cancel the active background turn and roll back any unstaged file edits."
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => toast('Turn cancelled', 'rose')}
          open={confirmOpen}
          title="Cancel Active Turn?"
        />

        {/* ---------------- TOKENS ---------------- */}
        <DS
          body="The namespaced contract this port ships. Utilities are generated by Tailwind from the @theme bridge in src/aro/tokens.css; the raw values resolve per theme at the element that carries data-theme."
          eyebrow="reference"
          id="tokens"
          title="Token export"
        >
          <div className="overflow-hidden rounded-panel border border-aro-line-soft bg-aro-code">
            <div className="flex items-center gap-1.5 border-b border-aro-line-soft px-3 py-2">
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <i className="size-[7px] rounded-full" key={c} style={{ background: c }} />
              ))}
              <span className="ml-1.5 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">src/aro/tokens.css</span>
              <span className="ml-auto font-aro-mono text-aro-xs text-aro-ink-4">namespaced</span>
            </div>
            <pre className="aro-scroll-thin overflow-x-auto px-4 py-3 font-aro-mono text-xs leading-[1.8] text-aro-ink-3">
              {`@theme inline {
  /* surfaces — utilities: bg-aro-void … bg-aro-track */
  --color-aro-void: var(--aro-void);
  --color-aro-bg:   var(--aro-bg);
  --color-aro-raise: var(--aro-raise);
  --color-aro-line: var(--aro-line);

  /* ink */
  --color-aro-ink: var(--aro-ink);
  --color-aro-ink-2: var(--aro-ink-2);

  /* signal */
  --color-aro-iris: var(--aro-iris);
  --color-aro-cyan: var(--aro-cyan);
  --color-aro-mint: var(--aro-mint);
  --color-aro-amber: var(--aro-amber);
  --color-aro-rose: var(--aro-rose);
  --color-aro-sky:  var(--aro-sky);

  /* brand accent */
  --color-aro-emerald: #10b981;
  --color-aro-emerald-soft: #6ee7b7;

  /* radius + elevation + motion */
  --radius-aro-md: 7px;  --radius-aro-lg: 10px;
  --shadow-aro-e1: 0 1px 2px var(--aro-shadow-a);
  --animate-aro-rise: aro-rise .32s cubic-bezier(.22,1,.36,1) both;
}

/* five themes, gated — inert until an element opts in */
html[data-theme='obsidian'], [data-theme='obsidian'] { … }
html[data-theme='daylight'], [data-theme='daylight'] { … }
html[data-theme='nord'],      [data-theme='nord']      { … }
html[data-theme='ember'],     [data-theme='ember']     { … }
html[data-theme='paper'],     [data-theme='paper']     { … }`}
            </pre>
          </div>
          <Divider className="my-6" />
          <div className="flex flex-wrap items-center gap-3">
            <Badge mono tone="neutral">
              a11y: full keyboard map
            </Badge>
            <Badge mono tone="neutral">
              additive: zero existing files restyled
            </Badge>
            <Badge mono tone="neutral">
              reduced-motion: host blanket rule applies
            </Badge>
            <Badge mono tone="neutral">
              min target 22×22px
            </Badge>
          </div>
        </DS>

        <DS
          body="Standard page templates, layout primitives, and zero-shift state boxes on the 4px spacing scale with container query collapse."
          eyebrow="Phase 9 UX-ASM"
          id="layout-templates"
          title="Layout & Templates"
        >
          {/* Interactive controls: Width preview, template selector, and state toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-aro-line-soft bg-aro-sunken p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold uppercase text-aro-ink-4">
                Container width:
              </span>
              <Segmented
                items={[
                  { value: 'narrow', label: 'Narrow (420px)' },
                  { value: 'standard', label: 'Standard (768px)' },
                  { value: 'wide', label: 'Wide (1024px)' },
                ]}
                onChange={setLayoutWidth as any}
                value={layoutWidth}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold uppercase text-aro-ink-4">
                State:
              </span>
              <Segmented
                items={[
                  { value: 'idle', label: 'Idle' },
                  { value: 'loading', label: 'Loading' },
                  { value: 'empty', label: 'Empty' },
                  { value: 'error', label: 'Error' },
                ]}
                onChange={setLayoutState as any}
                value={layoutState}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold uppercase text-aro-ink-4">
                Template:
              </span>
              <Segmented
                items={[
                  { value: 'list', label: 'List Page' },
                  { value: 'form', label: 'Form Page' },
                  { value: 'overlay', label: 'Master/Detail' },
                  { value: 'page', label: 'Standard Page' },
                  { value: 'dialog', label: 'Dialog' },
                ]}
                onChange={setLayoutTemplate as any}
                value={layoutTemplate}
              />
            </div>
          </div>

          {/* Interactive container preview box */}
          <div className="mt-4 flex justify-center rounded-panel border border-dashed border-aro-line-soft bg-aro-sunken/40 p-4 overflow-hidden">
            <div
              className={cn(
                'w-full transition-[max-width] duration-200 border border-aro-line rounded-panel bg-aro-bg overflow-hidden shadow-aro-e2',
                layoutWidth === 'narrow' && 'max-w-[420px]',
                layoutWidth === 'standard' && 'max-w-[768px]',
                layoutWidth === 'wide' && 'max-w-[1024px]'
              )}
            >
              {layoutTemplate === 'list' && (
                <ListPageTemplate
                  actions={<Button size="xs" variant="primary">New item</Button>}
                  description="Container queries collapse filters to drawer at narrow widths."
                  emptyAction={<Button size="xs" variant="primary">Add item</Button>}
                  emptyDescription="No search results matching your query"
                  emptyTitle="No results found"
                  items={[
                    {
                      title: 'Project Aro Desktop',
                      description: 'Native Electron client with calm, keyboard-first workbench',
                      badge: <Badge mono tone="mint">Active</Badge>,
                    },
                    {
                      title: 'Aro Harness & Runner',
                      description: 'Orchestration for autonomous subagents and cron tasks',
                      badge: <Badge mono tone="iris">Runner</Badge>,
                    },
                    {
                      title: 'Design System Primitives',
                      description: 'Role-based tokens and zero-shift layout components',
                      badge: <Badge mono tone="neutral">Ready</Badge>,
                    },
                  ]}
                  onSearchChange={setDemoSearch}
                  searchValue={demoSearch}
                  state={layoutState}
                  title="Projects List"
                />
              )}

              {layoutTemplate === 'form' && (
                <FormPageTemplate
                  breadcrumb={<span>Preferences / Workspace</span>}
                  description="Form fields align horizontally at standard width and stack on narrow."
                  onReset={() => toast('Form reset to defaults', 'neutral')}
                  onSubmit={(e) => {
                    e.preventDefault()
                    toast('Workspace settings saved', 'mint')
                  }}
                  primaryActionLabel="Save Workspace"
                  title="Workspace Configuration"
                >
                  <LayoutSection title="Repository Settings" variant="card">
                    <FormRow
                      description="Root directory for local project discovery and git operations"
                      label="Workspace Path"
                      required
                    >
                      <Input defaultValue="E:/Projects/Aro" />
                    </FormRow>
                    <FormRow
                      description="Automatically reload changed files and skills"
                      label="Auto-watch file changes"
                    >
                      <Checkbox checked={checkboxVal} onChange={setCheckboxVal} />
                    </FormRow>
                    <FormRow
                      description="Controls when terminal tools require explicit confirmation"
                      label="Tool execution safety"
                    >
                      <Select
                        onChange={setSel}
                        options={[
                          { value: 'opus-4.6', label: 'Strict manual approvals' },
                          { value: 'gpt-5.4', label: 'Smart checkpoint verification' },
                        ]}
                        value={sel}
                      />
                    </FormRow>
                  </LayoutSection>
                </FormPageTemplate>
              )}

              {layoutTemplate === 'overlay' && (
                <div className="h-[460px]">
                  <MasterDetailOverlayTemplate
                    detailActions={<Button size="xs" variant="primary">Add key</Button>}
                    detailDescription="Provider API keys are securely stored in your local vault."
                    detailTitle={demoNav === 'models' ? 'Provider Keys' : 'Global Settings'}
                    navItems={[
                      { id: 'models', label: 'Provider Keys', icon: IconBolt, active: demoNav === 'models', onClick: () => setDemoNav('models') },
                      { id: 'settings', label: 'Global Settings', icon: IconPlug, active: demoNav === 'settings', onClick: () => setDemoNav('settings') },
                    ]}
                  >
                    <StateBox state={layoutState}>
                      <Stack dividers gap={2}>
                        <ListRow description="Key configured · valid through 2027" title="Nous Portal API Key" />
                        <ListRow description="Key configured · local hardware acceleration" title="Local LM Studio Server" />
                      </Stack>
                    </StateBox>
                  </MasterDetailOverlayTemplate>
                </div>
              )}

              {layoutTemplate === 'page' && (
                <PageTemplate
                  actions={<Button size="xs" variant="secondary">Refresh</Button>}
                  description="Standard PageShell with structured Section and FormRow primitives."
                  title="Diagnostics & Health"
                >
                  <StateBox state={layoutState}>
                    <LayoutSection title="System Resources" variant="card">
                      <FormRow label="Memory Usage"><Badge mono tone="mint">142 MB</Badge></FormRow>
                      <FormRow label="Process Latency"><Badge mono tone="cyan">12 ms</Badge></FormRow>
                    </LayoutSection>
                  </StateBox>
                </PageTemplate>
              )}

              {layoutTemplate === 'dialog' && (
                <div className="p-6 flex justify-center">
                  <DialogTemplate
                    description="This operation cannot be undone. Workspace files will not be deleted."
                    destructiveAction={<Button size="sm" variant="danger">Delete session</Button>}
                    onClose={() => toast('Dialog dismissed', 'neutral')}
                    primaryAction={<Button onClick={() => toast('Session archived', 'mint')} size="sm" variant="primary">Archive</Button>}
                    secondaryAction={<Button size="sm" variant="ghost">Cancel</Button>}
                    title="Archive Conversation"
                  >
                    <p className="text-xs text-aro-ink-2 leading-relaxed">
                      Archiving will move this session from your active sidebar into history storage.
                    </p>
                  </DialogTemplate>
                </div>
              )}
            </div>
          </div>
        </DS>
      </div>

      <Modal
        onClose={() => setModal(false)}
        open={modal}
        sub="e4 elevation · 14px radius · Escape closes · backdrop blur 3px"
        title="Modal surface"
        width={520}
      >
        <div className="space-y-3 p-4">
          <p className="text-xs leading-[1.65] text-aro-ink-2">
            Modals are used for decisions that change what the agent is allowed to do — never for information the transcript already shows. This
            one renders inside the themed wrapper, so it keeps the active Aro theme while the rest of the window keeps the host theme.
          </p>
          <div className="rounded-panel border border-aro-line-soft bg-aro-sunken p-3">
            <SectionLabel className="px-0">example content</SectionLabel>
            <div className="space-y-2">
              <Input placeholder="Session name" />
              <Select
                onChange={() => {}}
                options={[
                  { value: 'opus-4.6', label: 'Opus 4.6', hint: '$25 / 1M' },
                  { value: 'gpt-5.4', label: 'GPT-5.4-Codex', hint: '$14 / 1M' },
                ]}
                value="opus-4.6"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModal(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              icon={IconCheck}
              onClick={() => {
                setModal(false)
                toast('Confirmed', 'mint')
              }}
              variant="primary"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Toasts items={toasts} />
    </div>
  )
}

export default AroDesignSystemPage
