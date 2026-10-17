/**
 * ARO BRIDGE VIEW (R4) — the live daemon session page at /aro-agent.
 *
 * One column, one story: the aro_bridge daemon's own event stream. The hook
 * (`bridge.ts`) starts a session through the preload surface (Electron main
 * owns the python child), and this page renders the aro.jsonl/1 timeline —
 * thinking rows, tool cards with args + result lines, the streamed reply —
 * plus the composer. Tools are delegated to the host: a pending tool card
 * (openai engine) resolves through `toolResult`. The demo engine runs a
 * deterministic think → search → compose sequence with no endpoint.
 */

import { useState } from 'react'

import { type AroBridgeStep, useAroBridge } from './bridge'
import { IconBolt, IconBrain, IconRefresh, IconSearch, IconStop, IconWarning, IconX, IconZap } from './Icons'
import { Badge, Button, EmptyState, Input, Panel, Segmented } from './ui'

/* ============================== timeline ============================== */

function ThinkingRow({ step }: { step: Extract<AroBridgeStep, { kind: 'thinking' }> }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <IconBrain className="shrink-0 text-aro-plum" size={12} />
      <span className="text-[12.5px] text-aro-ink-3 italic">{step.label}</span>
      <span className="font-aro-mono text-[10px] text-aro-ink-4">{(step.ms / 1000).toFixed(1)}s</span>
    </div>
  )
}

function ToolCard({ step, onResolve }: { step: Extract<AroBridgeStep, { kind: 'tool' }>; onResolve: (callId: string, ok: boolean, output: string) => void }) {
  const [output, setOutput] = useState('')
  const pending = step.ok === undefined

  return (
    <div className="overflow-hidden rounded-[9px] border border-aro-line-soft bg-aro-well">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-aro-line-soft bg-aro-raise text-aro-cyan">
          <IconSearch size={11} />
        </span>
        <span className="shrink-0 font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-ink-4 uppercase">{step.tool}</span>
        <span className="min-w-0 flex-1 truncate font-aro-mono text-[11.5px] text-aro-ink-2">{JSON.stringify(step.args)}</span>
        {pending && <span className="flex shrink-0 items-center gap-1.5 font-aro-mono text-[10.5px] text-aro-cyan"><i className="size-[5px] animate-aro-breathe rounded-full bg-aro-cyan" />host</span>}
        {step.ok === false && <Badge mono tone="rose">failed</Badge>}
        {!pending && step.ok && step.ms !== undefined && <span className="shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{step.ms}ms</span>}
      </div>
      {step.lines && step.lines.length > 0 && (
        <pre className="aro-scroll-thin overflow-x-auto border-t border-aro-line-soft px-3 py-2 font-aro-mono text-[11px] leading-[1.7] text-aro-ink-3">
          {step.summary && <div className="pb-1 text-aro-ink-2">{step.summary}</div>}
          {step.lines.map((line, i) => <div key={i}>{line || ' '}</div>)}
        </pre>
      )}
      {pending && (
        <div className="flex items-center gap-2 border-t border-aro-line-soft px-2.5 py-2">
          <Input
            aria-label={`tool result for ${step.callId}`}
            onChange={e => setOutput(e.target.value)}
            placeholder="tool runs in the host — paste its output (or send empty)"
            value={output}
          />
          <Button onClick={() => onResolve(step.callId, true, output)} size="xs" variant="success">Resolve</Button>
          <Button onClick={() => onResolve(step.callId, false, output || 'tool failed')} size="xs" variant="danger">Fail</Button>
        </div>
      )}
    </div>
  )
}

function ReplyBlock({ step }: { step: Extract<AroBridgeStep, { kind: 'reply' }> }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-[8px] border border-aro-iris/30 bg-aro-iris-tint text-aro-iris-soft">
        <IconZap size={12} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[12.5px] font-semibold text-aro-ink">Aro</span>
          {!step.closed && <span className="font-aro-mono text-[10px] text-aro-cyan"><span className="animate-aro-caret">▊</span></span>}
          {step.ms !== undefined && <span className="font-aro-mono text-[10px] text-aro-ink-4">{step.ms}ms</span>}
        </div>
        <p className="text-[13px] leading-[1.65] whitespace-pre-wrap text-aro-ink-2">{step.text}</p>
      </div>
    </div>
  )
}

function ErrorRow({ step }: { step: Extract<AroBridgeStep, { kind: 'error' }> }) {
  return (
    <div className="flex items-center gap-2 rounded-[8px] border border-aro-rose/25 bg-aro-rose-tint/60 px-3 py-2 text-[12px] text-aro-rose">
      <IconWarning size={12} />
      {step.message}
    </div>
  )
}

/* ================================ page ================================ */

export function AroBridgeView() {
  const { status, sessionId, activeSessionId, startError, steps, busy, send, toolResult, interrupt, stop, restart } = useAroBridge()
  const [engine, setEngine] = useState<'demo' | 'openai'>('demo')
  const [baseUrl, setBaseUrl] = useState('http://localhost:8642/v1')
  const [model, setModel] = useState('aro-4-70b')
  const [apiKey, setApiKey] = useState('')
  const [draft, setDraft] = useState('')

  const chip =
    status === 'ready' ? <Badge dot mono tone="mint">ready</Badge>
    : status === 'starting' ? <Badge dot mono tone="amber">starting</Badge>
    : status === 'idle' ? <Badge dot mono tone="neutral">idle</Badge>
    : <Badge dot mono tone="rose">exited</Badge>

  const handleEngineChange = (newEngine: 'demo' | 'openai') => {
    setEngine(newEngine)

    if (status !== 'idle') {
      restart({ engine: newEngine, ...(newEngine === 'openai' ? { baseUrl, model, apiKey } : {}) })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-theme="obsidian">
      <header className="flex flex-wrap items-center gap-3 border-b border-aro-line-soft px-5 py-3">
        <div className="min-w-0">
          <div className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">aro bridge · aro.jsonl/1</div>
          <h1 className="text-[15px] font-semibold text-aro-ink">Bridge session</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {chip}
          <Badge mono tone="neutral">{sessionId ? `bridge ${sessionId.slice(0, 10)}` : 'bridge —'}</Badge>
          {activeSessionId && <Badge mono tone="iris">{`session ${activeSessionId.slice(0, 8)}`}</Badge>}
          {engine === 'demo' ? (
            <Badge dot mono tone="amber">demo mode (synthetic)</Badge>
          ) : (
            <Badge dot mono tone="cyan">openai engine</Badge>
          )}
          <Segmented
            items={[{ label: 'Demo', value: 'demo' }, { label: 'OpenAI', value: 'openai' }]}
            onChange={handleEngineChange}
            value={engine}
          />
          <Button
            icon={status === 'idle' ? IconBolt : IconRefresh}
            onClick={() => restart({ engine, ...(engine === 'openai' ? { baseUrl, model, apiKey } : {}) })}
            variant={status === 'idle' ? 'primary' : 'outline'}
          >
            {status === 'idle' ? 'Start bridge' : 'Restart'}
          </Button>
        </div>
      </header>

      {engine === 'demo' && (
        <div className="flex items-center gap-2 border-b border-aro-amber/20 bg-aro-amber-tint/40 px-5 py-2 text-[11.5px] text-aro-ink-3">
          <IconWarning className="shrink-0 text-aro-amber" size={12} />
          <span>Running in <strong>demo / test mode</strong> (canned responses). Switch to <strong>OpenAI</strong> above to run against a real model engine.</span>
        </div>
      )}

      {engine === 'openai' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-aro-line-soft bg-aro-sunken/40 px-5 py-2">
          <span className="font-aro-mono text-[9.5px] font-semibold tracking-[.14em] text-aro-ink-4 uppercase">endpoint</span>
          <Input aria-label="base url" className="w-[200px]" onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" value={baseUrl} />
          <Input aria-label="model" className="w-[140px]" onChange={e => setModel(e.target.value)} placeholder="model name" value={model} />
          <Input aria-label="api key" className="w-[140px]" onChange={e => setApiKey(e.target.value)} placeholder="API key (optional)" type="password" value={apiKey} />
          <Button
            onClick={() => restart({ engine: 'openai', baseUrl, model, apiKey })}
            size="xs"
            variant="outline"
          >
            Apply
          </Button>
        </div>
      )}

      <div className="aro-scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-3.5 px-5 py-6">
          {startError && (
            <div className="flex items-start gap-2 rounded-[9px] border border-aro-rose/25 bg-aro-rose-tint/60 px-3 py-2.5 text-[12px] leading-relaxed text-aro-rose">
              <IconWarning className="mt-0.5 shrink-0" size={13} />
              <div className="flex-1">
                <div>{startError}</div>
                <div className="mt-1 text-[11px] opacity-80">
                  {engine === 'openai'
                    ? 'Real-engine verification requires an active OpenAI-compatible endpoint and credentials. No silent demo fallback will be substituted.'
                    : "The daemon requires the checkout's venv python (HERMES_DESKTOP_PYTHON overrides it)."}
                </div>
              </div>
              <Button icon={IconRefresh} onClick={() => restart({ engine, ...(engine === 'openai' ? { baseUrl, model, apiKey } : {}) })} size="xs" variant="outline">Retry</Button>
            </div>
          )}

          {steps.length === 0 && !startError && (
            <EmptyState
              body={
                status === 'idle'
                  ? 'The bridge daemon runs in an isolated child process. Click Start bridge to begin.'
                  : 'Send a prompt below — the daemon streams its thinking, tool calls and reply here.'
              }
              icon={IconBolt}
              title={
                status === 'starting'
                  ? 'Starting the bridge daemon…'
                  : status === 'idle'
                    ? 'Bridge daemon idle'
                    : 'No events yet'
              }
            />
          )}

          {steps.map((step, i) => {
            if (step.kind === 'thinking') {return <ThinkingRow key={i} step={step} />}

            if (step.kind === 'tool') {return <div className="pl-10" key={i}><ToolCard onResolve={toolResult} step={step} /></div>}

            if (step.kind === 'reply') {return <ReplyBlock key={i} step={step} />}

            return <ErrorRow key={i} step={step} />
          })}

          {busy && (
            <div className="flex items-center gap-2.5 pl-10">
              <span className="flex size-[26px] items-center justify-center rounded-[8px] border border-aro-iris/30 bg-aro-iris-tint text-aro-iris-soft"><IconZap className="animate-aro-breathe" size={12} /></span>
              <span className="text-[12.5px] text-aro-ink-3">Aro is working — events stream in as they run</span>
            </div>
          )}
          {status === 'exited' && !startError && steps.length > 0 && (
            <Panel className="flex items-center gap-2 px-3 py-2 text-[12px] text-aro-ink-3">
              <IconX className="text-aro-rose" size={12} />
              Daemon session ended — Restart to start a new one.
            </Panel>
          )}
        </div>
      </div>

      <footer className="border-t border-aro-line-soft px-5 py-3">
        <div className="mx-auto flex max-w-[760px] items-center gap-2">
          <Input
            aria-label="prompt"
            disabled={status !== 'ready'}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && draft.trim() && status === 'ready') {
                send(draft)
                setDraft('')
              }
            }}
            placeholder={
              status === 'ready'
                ? 'Ask the bridge…'
                : status === 'starting'
                  ? 'Starting the daemon…'
                  : status === 'idle'
                    ? 'Bridge daemon idle — click Start bridge first'
                    : 'Session ended — Restart first'
            }
            value={draft}
          />
          <Button
            disabled={status !== 'ready' || !draft.trim()}
            icon={IconBolt}
            onClick={() => {
              send(draft)
              setDraft('')
            }}
            variant="primary"
          >
            Send
          </Button>
          <Button disabled={!busy} icon={IconStop} onClick={interrupt} variant="danger">
            Interrupt
          </Button>
          <Button disabled={status === 'exited'} onClick={stop} variant="ghost">
            Stop
          </Button>
        </div>
      </footer>
    </div>
  )
}
