import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { requestComposerFocus, requestComposerInsert } from '@/app/chat/composer/focus'
import { IconFolder, IconList, IconPulse, IconSpark } from '@/aro/Icons'
import { Codicon } from '@/components/ui/codicon'
import { useI18n } from '@/i18n'
import { capitalize, normalize } from '@/lib/text'
import { $projectScope, ALL_PROJECTS } from '@/store/project-scope'
import { $projectTree, openProjectCreate } from '@/store/projects'

import introCopyJsonl from './intro-copy.jsonl?raw'
import { Wordmark } from './wordmark'

type IntroCopy = {
  headline: string
  body: string
}

type IntroCopyRecord = IntroCopy & {
  personality: string
}

export type IntroProps = {
  personality?: string
  seed?: number
}

const NEUTRAL_PERSONALITIES = new Set(['', 'default', 'none', 'neutral'])

const FALLBACK_COPY: IntroCopy[] = [
  {
    headline: 'What are we moving today?',
    body: "Send a bug, branch, plan, or rough idea. I'll inspect the repo and turn it into the next concrete step."
  },
  {
    headline: "What's on your mind?",
    body: "Bring the code, question, or stuck part. I'll read the room before making changes."
  },
  {
    headline: 'What should Aro look at?',
    body: "Send the task, failing path, or half-formed plan. I'll help turn it into action."
  },
  {
    headline: 'Where should we start?',
    body: "Bring the problem, goal, or file. I'll inspect first and keep the next step concrete."
  },
  {
    headline: 'What needs attention?',
    body: "Send the context you have. I'll help sort it into a plan or a fix."
  }
]

function normalizeKey(value?: string): string {
  return normalize(value)
}

function titleize(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ')
}

function isIntroCopyRecord(value: unknown): value is IntroCopyRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.personality === 'string' &&
    typeof record.headline === 'string' &&
    typeof record.body === 'string' &&
    Boolean(record.personality.trim()) &&
    Boolean(record.headline.trim()) &&
    Boolean(record.body.trim())
  )
}

function parseIntroCopy(raw: string): Record<string, IntroCopy[]> {
  const byPersonality: Record<string, IntroCopy[]> = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    try {
      const parsed: unknown = JSON.parse(trimmed)

      if (!isIntroCopyRecord(parsed)) {
        continue
      }

      const key = normalizeKey(parsed.personality)
      byPersonality[key] ??= []
      byPersonality[key].push({
        headline: parsed.headline.trim(),
        body: parsed.body.trim()
      })
    } catch {
      // Bad generated copy should not break the whole desktop app.
    }
  }

  return byPersonality
}

const INTRO_COPY_BY_PERSONALITY = parseIntroCopy(introCopyJsonl)

function neutralCopy(): IntroCopy[] {
  return INTRO_COPY_BY_PERSONALITY.none || INTRO_COPY_BY_PERSONALITY.default || FALLBACK_COPY
}

function fallbackCopyForPersonality(personalityKey: string): IntroCopy[] {
  if (NEUTRAL_PERSONALITIES.has(personalityKey)) {
    return neutralCopy()
  }

  const label = titleize(personalityKey)

  return [
    {
      headline: `${label} mode is on. What should we work on?`,
      body: "Send the task, file, or rough idea. I'll use your configured voice and keep the work grounded in this repo."
    },
    {
      headline: `What does ${label} Hermes need to see?`,
      body: "Bring the context or the stuck part. I'll adapt to your configured personality."
    },
    {
      headline: `${label} mode is ready.`,
      body: "Send the problem, file, or idea. I'll follow the personality you've configured."
    },
    {
      headline: `What should ${label} Hermes tackle?`,
      body: "Drop the task here. I'll keep the work grounded in the repo."
    },
    {
      headline: 'Where should we begin?',
      body: `Give me the context and I'll answer in ${label} mode.`
    }
  ]
}

function pickCopy(copies: IntroCopy[], seed = 0): IntroCopy {
  return copies[Math.abs(seed) % copies.length] || FALLBACK_COPY[0]
}

const WORDMARK = 'ARO AGENT'

function resolveCopy(personality?: string, seed?: number): IntroCopy {
  const personalityKey = normalizeKey(personality)

  const copies = NEUTRAL_PERSONALITIES.has(personalityKey)
    ? INTRO_COPY_BY_PERSONALITY[personalityKey] || neutralCopy()
    : INTRO_COPY_BY_PERSONALITY[personalityKey] || fallbackCopyForPersonality(personalityKey)

  return pickCopy(copies, seed)
}

export const FRESH_IDEAS = [
  {
    icon: 'sparkle',
    label: 'Build a landing page',
    prompt:
      'Draft and build a minimal, well-typographed landing page for a developer tool — one hero, three feature cards, no clutter.'
  },
  {
    icon: 'tools',
    label: 'Refactor this module',
    prompt:
      'Plan a refactor of this module so flushes are throttled and the state machine is cleanly separated. Start with a plan, no edits yet.'
  },
  {
    icon: 'book',
    label: 'Explain this architecture',
    prompt:
      'Walk through the architecture of this repository — the main pieces, how they connect, and where the tricky parts live.'
  }
] as const

const ARO_FRESH_IDEAS = [
  {
    chooseProject: true,
    icon: IconFolder,
    label: 'Attach a project',
  },
  {
    icon: IconPulse,
    label: 'Explain a repository',
    prompt:
      'Walk through the architecture of this repository — the main pieces, how they connect, and where the tricky parts live.',
  },
  {
    icon: IconList,
    label: 'Plan a refactor',
    prompt:
      'Plan a refactor of this module so flushes are throttled and the state machine is cleanly separated. Start with a plan, no edits yet.',
  },
  {
    icon: IconSpark,
    label: 'Build a landing page',
    prompt:
      'Draft and build a minimal, well-typographed landing page for a developer tool — one hero, three feature cards, no clutter.',
  },
] as const

export function Intro({ personality, seed }: IntroProps) {
  const [mountSeed] = useState(() => Math.floor(Math.random() * 100000))
  const { t } = useI18n()
  const rotationSeed = mountSeed + (seed ?? 0)
  const copy = resolveCopy(personality, rotationSeed)
  const key = normalizeKey(personality)

  const bodies =
    t.intro.stock[key] ?? (NEUTRAL_PERSONALITIES.has(key) ? t.intro.stock.none : t.intro.custom(personality || ''))

  const body = bodies?.[Math.abs(rotationSeed) % bodies.length] ?? copy.body

  const isAro = typeof document !== 'undefined' && document.documentElement.dataset.aroUi === 'true'
  const projectScope = useStore($projectScope)
  const projects = useStore($projectTree)

  const activeProject =
    isAro && projectScope && projectScope !== ALL_PROJECTS
      ? (projects.find(p => p.id === projectScope && !p.isNoProject) ?? null)
      : null

  return (
    <div
      className="pointer-events-none flex w-full min-w-0 flex-col items-center justify-center px-0.5 py-6 text-center text-muted-foreground sm:px-6 lg:px-8"
      data-slot="aui_intro"
    >
      <div className="w-full min-w-0">
        {isAro ? (
          <>
            <h1 className="m-0 font-display text-[26px] sm:text-[32px] font-medium tracking-tight text-aro-ink">
              {activeProject ? `Let's work on ${activeProject.label}.` : 'What would you like to build?'}
            </h1>
            {!activeProject && (
              <p className="mt-2 text-center text-xs text-aro-ink-3 max-w-md mx-auto leading-relaxed">
                {t.composer.projectAttachHint}
              </p>
            )}
          </>
        ) : (
          <>
            <Wordmark className="mb-1" text={WORDMARK} />
            <p className="m-0 text-center leading-normal tracking-tight">{body}</p>
          </>
        )}
      </div>

      <div
        className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-2"
        data-slot="fresh-suggestions"
      >
        {isAro ? (
          ARO_FRESH_IDEAS.map((idea, index) => {
            const Icon = idea.icon

            return (
              <button
                className="fresh-suggestion animate-aro-rise"
                data-slot="fresh-suggestion-chip"
                key={idea.label}
                onClick={() => {
                  if ('chooseProject' in idea && idea.chooseProject) {
                    openProjectCreate()
                  } else if ('prompt' in idea && idea.prompt) {
                    requestComposerInsert(idea.prompt, { mode: 'block', target: 'active' })
                    requestComposerFocus('active')
                  }
                }}
                style={{ animationDelay: `${120 + index * 70}ms` }}
                type="button"
              >
                <Icon size={12} />
                <span>{idea.label}</span>
              </button>
            )
          })
        ) : (
          FRESH_IDEAS.map(idea => (
            <button
              className="group inline-flex items-center gap-1.5 rounded-full border border-aro-line bg-aro-raise/80 px-3.5 py-1.5 text-xs font-medium text-aro-ink-2 shadow-sm backdrop-blur-md transition-all hover:border-aro-iris/50 hover:bg-aro-hover hover:text-aro-ink active:scale-[0.98]"
              data-slot="fresh-suggestion-chip"
              key={idea.label}
              onClick={() => {
                requestComposerInsert(idea.prompt, { mode: 'block', target: 'active' })
                requestComposerFocus('active')
              }}
              type="button"
            >
              <Codicon
                className="size-3 text-aro-iris-soft transition-colors group-hover:text-aro-cyan"
                name={idea.icon}
              />
              <span>{idea.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

