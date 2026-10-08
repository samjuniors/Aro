import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { DiffFile, DiffLine, Step } from "../data/catalog";
import { agentById } from "../data/catalog";
import { useApp } from "../lib/app";
import { IconBrain, IconBranch, IconCheck, IconChevronDown, IconChevronUp, IconCopy, IconFile, IconMcp, IconPencil, IconPlay, IconRefresh, IconSearch, IconShield, IconSpark, IconTerminal, IconUndo, IconWarning, IconList, IconEye, IconX, IconGrid } from "./Icons";
import { Badge, Button, Kbd, Segmented } from "./ui";

/* ===================== inline markdown-ish ===================== */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return <>{parts.map((p, i) => p.startsWith("`") ? <code key={i} className="rounded-[4px] border border-line-soft bg-well px-[4px] py-[1px] font-mono text-[11.5px] text-cyan">{p.slice(1, -1)}</code>
    : p.startsWith("**") ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}</>;
}

/* fenced code block — ```lang … ``` gets its own surface + copy button */
function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1400); toast("Code copied", "mint"); }).catch(() => { });
  };
  const runInTerminal = () => {
    window.dispatchEvent(new CustomEvent("conductor:terminal:run", { detail: code }));
    toast("Command sent to terminal", "iris");
  };
  return (
    <div className="prose-code group/code">
      <div className="prose-code-head">
        <span>{lang || "code"}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={runInTerminal} aria-label="Run in terminal" title="Run in terminal" className="prose-code-copy hover:text-ink"><IconTerminal size={11} /></button>
          <button type="button" onClick={copy} aria-label="Copy code" title="Copy code" className="prose-code-copy">{copied ? <IconCheck size={11} /> : <IconCopy size={11} />}</button>
        </div>
      </div>
      <pre className="scroll-thin overflow-x-auto">{code.replace(/\n$/, "")}</pre>
    </div>
  );
}

export function Prose({ text, className }: { text: string; className?: string }) {
  /* split on fenced blocks first — odd segments are code, even ones are prose */
  const segments = text.split("```");
  return (
    <div className={cn("ds-body space-y-2.5 text-ink-2", className)}>
      {segments.map((segment, si) => si % 2 === 1
        ? <CodeBlock key={si} lang={segment.match(/^\s*(\w[\w+.-]*)[ \t]*\n/)?.[1]} code={segment.replace(/^\s*\w[\w+.-]*[ \t]*\n/, "")} />
        : segment.split("\n\n").map((b, i) => {
          if (!b.trim()) return null;
          const lines = b.split("\n");
          if (b.startsWith("## ")) return <h4 key={`${si}-${i}`} className="pt-1 text-[13.5px] font-semibold text-ink">{b.slice(3)}</h4>;
          if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l)))
            return <ul key={`${si}-${i}`} className="space-y-1.5 pl-0.5">{lines.map((l, j) => <li key={j} className="flex gap-2"><span className="mt-[8px] size-[4px] shrink-0 rounded-full bg-iris-soft/70" /><span><Inline text={l.replace(/^\s*([-*]|\d+\.)\s/, "")} /></span></li>)}</ul>;
          return <p key={`${si}-${i}`}><Inline text={b} /></p>;
        }))}
    </div>
  );
}

/* ===================== message hover actions ===================== */
function MessageActions({ text, onEdit, onRetry, onFork }: { text: string; onEdit?: () => void; onRetry?: () => void; onFork?: () => void }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1300); toast("Message copied", "mint"); }).catch(() => { });
  };
  const fork = () => {
    if (onFork) onFork();
    else {
      window.dispatchEvent(new CustomEvent("conductor:session:fork", { detail: { text } }));
      toast("Branched new session from this turn", "mint");
    }
  };
  return (
    <span className="msg-actions" role="toolbar" aria-label="Message actions">
      <button type="button" className="msg-action-btn" onClick={copy} aria-label="Copy message" title="Copy">{copied ? <IconCheck size={11} /> : <IconCopy size={11} />}</button>
      <button type="button" className="msg-action-btn" onClick={fork} aria-label="Fork session from here" title="Fork branch from here"><IconBranch size={11} /></button>
      {onEdit && <button type="button" className="msg-action-btn" onClick={onEdit} aria-label="Edit and resend" title="Edit & resend"><IconPencil size={11} /></button>}
      {onRetry && <button type="button" className="msg-action-btn" onClick={onRetry} aria-label="Retry this response" title="Retry"><IconRefresh size={11} /></button>}
    </span>
  );
}

/* ============================== DIFF VIEW ============================== */
function pairLines(lines: DiffLine[]) {
  const rows: { l?: DiffLine; r?: DiffLine; hunk?: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.t === "hunk") { rows.push({ hunk: ln.text }); i++; continue; }
    if (ln.t === "ctx") { rows.push({ l: ln, r: ln }); i++; continue; }
    const dels: DiffLine[] = [], adds: DiffLine[] = [];
    while (i < lines.length && lines[i].t === "del") dels.push(lines[i++]);
    while (i < lines.length && lines[i].t === "add") adds.push(lines[i++]);
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) rows.push({ l: dels[k], r: adds[k] });
  }
  return rows;
}
export function DiffView({ file, maxLines = 22, mode: forced, showToggle, wrap = false }: { file: DiffFile; maxLines?: number; mode?: "unified" | "split"; showToggle?: boolean; wrap?: boolean }) {
  const { toast } = useApp();
  const [all, setAll] = useState(false);
  const [mode, setMode] = useState<"unified" | "split">(forced ?? "unified");
  const [stagedHunks, setStagedHunks] = useState<Record<number, boolean>>({});
  const shown = all ? file.lines : file.lines.slice(0, maxLines);
  const Cell = ({ l, side }: { l?: DiffLine; side: "l" | "r" }) => (
    <div className={cn("flex min-w-0 flex-1 items-start", l?.t === "add" && "diff-add", l?.t === "del" && "diff-del", !l && "bg-well/40")}>
      <span className="w-8 shrink-0 py-[1px] pr-2 text-right text-ink-4/70 select-none">{l ? (side === "l" ? l.o ?? "" : l.n ?? "") : ""}</span>
      <span className={cn("py-[1px] pr-3", wrap ? "whitespace-pre-wrap break-all flex-1 min-w-0" : "truncate whitespace-pre", l?.t === "add" ? "text-mint" : l?.t === "del" ? "text-rose" : "text-ink-2")}>{l?.text || " "}</span>
    </div>
  );
  return (
    <div className="overflow-hidden rounded-[8px] border border-line-soft bg-sunken">
      <div className="flex items-center justify-between gap-2 border-b border-line-soft bg-well px-2.5 py-[6px]">
        <div className="flex min-w-0 items-center gap-1.5"><IconFile size={11} className="shrink-0 text-ink-4" /><span className="truncate font-mono text-[11px] text-ink-2">{file.path}</span></div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
          <span className="text-mint">+{file.adds}</span><span className="text-rose">−{file.dels}</span>
          {showToggle && <Segmented value={mode} onChange={setMode} items={[{ value: "unified", label: "Unified" }, { value: "split", label: "Split" }]} className="ml-1 scale-90" />}
        </div>
      </div>
      <div className={cn("scroll-thin font-mono text-[11.5px] leading-[1.65]", wrap ? "overflow-x-hidden" : "overflow-x-auto")}>
        {mode === "unified" ? shown.map((l, i) => (
          <div key={i} className={cn("flex items-start", wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre", l.t === "add" && "diff-add", l.t === "del" && "diff-del", l.t === "hunk" && "bg-iris-tint/30")}>
            {l.t !== "hunk" ? (<>
              <span className="w-8 shrink-0 py-[1px] pr-2 text-right text-ink-4/70 select-none">{l.o ?? ""}</span>
              <span className="w-8 shrink-0 py-[1px] pr-2 text-right text-ink-4/70 select-none">{l.n ?? ""}</span>
              <span className="w-3 shrink-0 py-[1px] text-ink-4/60 select-none">{l.t === "add" ? "+" : l.t === "del" ? "−" : " "}</span>
              <span className={cn("py-[1px] pr-3", wrap ? "whitespace-pre-wrap break-all flex-1 min-w-0" : "", l.t === "add" ? "text-mint" : l.t === "del" ? "text-rose" : "text-ink-2")}>{l.text || " "}</span>
            </>) : (
              <div className="flex w-full items-center justify-between py-[2px] px-2 text-ink-3 text-[10.5px]">
                <span className="truncate">{l.text}</span>
                <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
                  {stagedHunks[i] ? (
                    <span className="flex items-center gap-1 text-[9.5px] text-mint font-semibold">
                      <IconCheck size={10} /> Staged
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStagedHunks((p) => ({ ...p, [i]: true }));
                          toast("Hunk accepted & staged", "mint");
                        }}
                        className="flex items-center gap-1 rounded bg-mint/15 px-1.5 py-0.5 text-[9.5px] font-medium text-mint hover:bg-mint/25 transition-colors"
                        title="Accept this hunk"
                      >
                        <IconCheck size={9} /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => toast("Hunk reverted", "amber")}
                        className="flex items-center gap-1 rounded bg-rose/15 px-1.5 py-0.5 text-[9.5px] font-medium text-rose hover:bg-rose/25 transition-colors"
                        title="Discard this hunk"
                      >
                        <IconX size={9} /> Discard
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )) : pairLines(shown).map((r, i) => r.hunk ? (
          <div key={i} className="flex items-center justify-between bg-iris-tint/30 py-[2px] px-2 text-ink-3 text-[10.5px]">
            <span>{r.hunk}</span>
            <span className="text-[9.5px] text-ink-4">split mode</span>
          </div>
        ) : <div key={i} className="flex divide-x divide-line-soft"><Cell l={r.l} side="l" /><Cell l={r.r} side="r" /></div>)}
      </div>
      {file.lines.length > maxLines && (
        <button onClick={() => setAll((a) => !a)} className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-line-soft py-[6px] text-[11px] text-ink-3 transition-colors hover:bg-hover hover:text-ink">
          {all ? "Collapse" : `Show ${file.lines.length - maxLines} more lines`}<IconChevronDown size={11} className={cn("transition-transform", all && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

/* ============================== TOOL CARD ============================== */
type ToolKind = "read" | "edit" | "write" | "bash" | "grep" | "mcp" | "browser" | "test" | "plan";
const toolMeta: Record<ToolKind, { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; label: string }> = {
  read: { icon: IconFile, tone: "text-sky", label: "read" }, edit: { icon: IconSpark, tone: "text-iris-soft", label: "edit" }, write: { icon: IconSpark, tone: "text-iris-soft", label: "write" },
  bash: { icon: IconTerminal, tone: "text-cyan", label: "shell" }, grep: { icon: IconSearch, tone: "text-plum", label: "search" }, mcp: { icon: IconMcp, tone: "text-mint", label: "tool" },
  browser: { icon: IconEye, tone: "text-sky", label: "browser" }, test: { icon: IconCheck, tone: "text-mint", label: "test" }, plan: { icon: IconList, tone: "text-amber", label: "plan" },
};
export function ToolCard({ step }: { step: Extract<Step, { type: "tool" }> }) {
  const meta = toolMeta[step.tool]; const Icon = meta.icon;
  const [open, setOpen] = useState(step.status === "running" || step.status === "error" || Boolean(step.diff));
  const hasBody = Boolean(step.lines?.length || step.output?.length || step.diff);
  return (
    <div className="animate-rise overflow-hidden rounded-[9px] border border-line-soft bg-well">
      <button onClick={() => hasBody && setOpen((o) => !o)} className={cn("flex w-full items-center gap-2 px-2.5 py-[8px] text-left", hasBody && "cursor-pointer hover:bg-hover/60")}>
        <span className={cn("flex size-[20px] shrink-0 items-center justify-center rounded-[5px] border border-line-soft bg-raise", meta.tone)}><Icon size={11} /></span>
        <span className="shrink-0 font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink-4 uppercase">{meta.label}</span>
        {step.target && <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-2">{step.target}</span>}
        {step.status === "running" && <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] text-cyan"><i className="size-[5px] animate-breathe rounded-full bg-cyan" />running</span>}
        {step.status === "done" && !!step.ms && <span className="shrink-0 font-mono text-[10px] text-ink-4">{step.ms}ms</span>}
        {step.status === "error" && <Badge tone="rose" mono>failed</Badge>}
        {hasBody && <IconChevronDown size={12} className={cn("shrink-0 text-ink-4 transition-transform duration-200", open && "rotate-180")} />}
      </button>
      {open && hasBody && (
        <div className="animate-slide-down border-t border-line-soft">
          {step.lines && <pre className="scroll-thin overflow-x-auto px-3 py-2 font-mono text-[11px] leading-[1.7] text-ink-3">{step.lines.map((l, i) => <div key={i}>{l || " "}</div>)}</pre>}
          {step.diff && <div className="p-2"><DiffView file={step.diff} /></div>}
          {step.output && (
            <div className="border-t border-line-soft/70 bg-code">
              <div className="px-3 pt-2 pb-1 font-mono text-[9px] tracking-[.14em] text-ink-4 uppercase">stdout</div>
              <pre className="scroll-thin overflow-x-auto px-3 pb-2.5 font-mono text-[11px] leading-[1.7] text-ink-3">
                {step.output.map((l, i) => <div key={i} className={cn(l.trim().startsWith("✓") && "text-mint", l.trim().startsWith("✗") && "text-rose")}>{l}</div>)}
                {step.status === "running" && <div className="text-cyan"><span className="animate-caret">▊</span></div>}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================== APPROVAL ============================== */
/* live card: the 18s countdown actually ticks, Esc denies, timeout auto-denies */
export function ApprovalCard({ step }: { step: Extract<Step, { type: "approval" }> }) {
  const [state, setState] = useState(step.state);
  const [left, setLeft] = useState(18);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (state !== "open") return;
    const tick = window.setInterval(() => setLeft((l) => {
      if (l <= 1) { window.clearInterval(tick); setTimedOut(true); setState("denied"); return 0; }
      return l - 1;
    }), 1000);
    return () => window.clearInterval(tick);
  }, [state]);
  useEffect(() => {
    if (state !== "open") return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setState("denied"); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [state]);
  const riskTone = step.risk === "high" ? "rose" : step.risk === "medium" ? "amber" : "mint";
  return (
    <div className={cn("animate-rise overflow-hidden rounded-[10px] border bg-well", state === "denied" ? "border-rose/30" : state === "allowed" ? "border-mint/25" : "border-amber/40")}>
      <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
        <IconShield size={13} className={state === "allowed" ? "text-mint" : state === "denied" ? "text-rose" : "text-amber"} />
        <span className="text-[12.5px] font-semibold text-ink">Approval required</span>
        <Badge tone={riskTone} mono className="capitalize">{step.risk} risk</Badge>
        <span className="ml-auto font-mono text-[10px] text-ink-4">rule: ask-before-publish</span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <pre className="scroll-thin overflow-x-auto rounded-[6px] border border-line-soft bg-code px-2.5 py-2 font-mono text-[11.5px] text-ink-2">{step.command}</pre>
        <p className="text-[12px] text-ink-3">{step.reason}</p>
        {state === "open" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="success" icon={IconCheck} onClick={() => setState("allowed")}>Allow once</Button>
            <Button variant="outline" onClick={() => setState("allowed")}>Always in <span className="ml-1 font-mono text-[10.5px] text-ink-3">packages/**</span></Button>
            <Button variant="danger" icon={IconX} onClick={() => setState("denied")}>Deny</Button>
            <span className={cn("ml-auto flex items-center text-[10.5px] text-ink-4", left <= 5 && "text-amber")}>auto-deny in <Kbd className="ml-1">{left}s</Kbd></span>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 text-[12px]", state === "denied" ? "text-rose" : "text-mint")}>
            <IconCheck size={12} />{state === "denied" ? (timedOut ? "Denied — timed out · agent will try a different approach" : "Denied — agent will try a different approach") : "Allowed for this session"}
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking({ step }: { step: Extract<Step, { type: "thinking" }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[9px] border border-dashed border-line bg-well/60">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-[7px] text-left">
        <IconBrain size={12} className="shrink-0 text-plum" />
        <span className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink-4 uppercase">reasoning</span>
        {!open && <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3 italic">{step.text}</span>}
        <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-4">{(step.ms / 1000).toFixed(1)}s</span>
        <IconChevronDown size={12} className={cn("shrink-0 text-ink-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="animate-slide-down border-t border-dashed border-line px-3 py-2.5 text-[12.5px] leading-[1.65] text-ink-3 italic">{step.text}</p>}
    </div>
  );
}
function Checkpoint({ step, onRestore }: { step: Extract<Step, { type: "checkpoint" }>; onRestore?: () => void }) {
  return (
    <div className="group flex items-center gap-2 px-1 py-0.5">
      <span className="h-px flex-1 bg-line-soft" />
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-4"><IconUndo size={10} />checkpoint <span className="text-ink-3">{step.hash}</span> · {step.label}</span>
      {onRestore && <button onClick={onRestore} className="cursor-pointer rounded px-1 text-[10px] text-iris-soft opacity-0 transition-opacity group-hover:opacity-100 hover:underline" title="Rewind the session to this checkpoint">restore</button>}
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

/* ============================ STEP ROUTER ============================ */
export function StepView({ step, agentId = "claude-code", persona, onEditMessage, onRetry, onRestore }: {
  step: Step; agentId?: string; persona?: { name: string; glyph: string; from: string; to: string; model: string };
  onEditMessage?: (stepId: string, text: string) => void; onRetry?: () => void; onRestore?: (stepId: string) => void;
}) {
  const a = agentById(agentId);
  const who = persona ?? { name: a.name, glyph: a.glyph, from: a.from, to: a.to, model: a.models[0].id };
  if (step.type === "user") {
    return <UserMessage step={step} onEditMessage={onEditMessage} />;
  }
  if (step.type === "text") return (
    <div className="animate-rise group/msg flex gap-3">
      <div className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] font-mono text-[10px] font-bold" style={{ color: who.to, background: `linear-gradient(135deg, ${who.from}26, ${who.to}1a)`, boxShadow: `inset 0 0 0 1px ${who.to}55` }}>{who.glyph}</div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1.5 flex items-center gap-2"><span className="text-[12.5px] font-semibold text-ink">{who.name}</span><Badge tone="iris" mono className="text-[9.5px]">{who.model}</Badge>
          <MessageActions text={step.text} onRetry={onRetry} />
        </div>
        <Prose text={step.text} />
      </div>
    </div>
  );
  if (step.type === "thinking") return <Thinking step={step} />;
  if (step.type === "tool") return <div className="pl-[40px]"><ToolCard step={step} /></div>;
  if (step.type === "approval") return <div className="pl-[40px]"><ApprovalCard step={step} /></div>;
  if (step.type === "checkpoint") return <Checkpoint step={step} onRestore={onRestore ? () => onRestore(step.id) : undefined} />;
  return <div className="flex items-center gap-2 rounded-[8px] border border-line-soft bg-raise px-3 py-2 text-[12px] text-ink-3"><IconWarning size={12} className="text-amber" />{step.text}</div>;
}

/* user message — hover actions include edit & resend (rewinds the turn) */
function UserMessage({ step, onEditMessage }: { step: Extract<Step, { type: "user" }>; onEditMessage?: (stepId: string, text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.text);
  const save = () => { const text = draft.trim(); if (!text || !onEditMessage) return; setEditing(false); onEditMessage(step.id, text); };
  return (
    <div className="animate-rise group/msg flex gap-3">
      <div className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-hover font-mono text-[10.5px] font-bold text-ink-2 shadow-e1">Y</div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-semibold text-ink">You</span><span className="font-mono text-[10px] text-ink-4">{step.at}</span>
          {step.attachments?.map((x) => <span key={x} className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-raise px-1.5 py-[1px] font-mono text-[10px] text-ink-3"><IconFile size={9} /> {x}</span>)}
          <MessageActions text={step.text} onEdit={onEditMessage ? () => { setDraft(step.text); setEditing(true); } : undefined} />
        </div>
        {editing ? (
          <div className="msg-edit">
            <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(10, Math.max(2, draft.split("\n").length + 1))} onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } }} aria-label="Edit your message" />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="xs" icon={IconRefresh} disabled={!draft.trim()} onClick={save}>Save & resend</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[10px] rounded-tl-[3px] border border-line-soft bg-raise px-3.5 py-2.5"><Prose text={step.text} /></div>
        )}
      </div>
    </div>
  );
}

export function StreamingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pl-[40px]">
      <span className="flex size-[26px] items-center justify-center rounded-[8px] border border-iris/30 bg-iris-tint text-iris-soft"><IconSpark size={12} className="animate-breathe" /></span>
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="size-[4px] rounded-full bg-iris-soft" style={{ animation: `breathe 1.2s ease-in-out ${i * 0.16}s infinite` }} />)}</span>
    </div>
  );
}

/* ============================ FIND IN TRANSCRIPT ============================ */
export function FindBar({
  open,
  onClose,
  searchQuery,
  setSearchQuery,
  matchCount,
  currentMatchIndex,
  onNext,
  onPrev,
}: {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="sticky top-2 right-4 ml-auto z-40 flex w-fit items-center gap-1.5 rounded-[9px] border border-line-strong bg-raise/95 p-1.5 shadow-e3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
      <IconSearch size={13} className="text-ink-4 ml-1 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Find in conversation…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter") {
            if (e.shiftKey) onPrev();
            else onNext();
          }
        }}
        className="h-[26px] w-[180px] bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-4"
      />
      <span className="font-mono text-[10px] text-ink-4 shrink-0 px-1 border-r border-line-soft select-none">
        {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : searchQuery ? "0/0" : ""}
      </span>
      <button
        type="button"
        onClick={onPrev}
        disabled={matchCount === 0}
        title="Previous match (Shift+Enter)"
        className="flex size-[22px] items-center justify-center rounded text-ink-3 hover:text-ink hover:bg-hover disabled:opacity-40"
      >
        <IconChevronUp size={12} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={matchCount === 0}
        title="Next match (Enter)"
        className="flex size-[22px] items-center justify-center rounded text-ink-3 hover:text-ink hover:bg-hover disabled:opacity-40"
      >
        <IconChevronDown size={12} />
      </button>
      <button
        type="button"
        onClick={onClose}
        title="Close (Esc)"
        className="flex size-[22px] items-center justify-center rounded text-ink-4 hover:text-ink hover:bg-hover ml-0.5"
      >
        <IconX size={12} />
      </button>
    </div>
  );
}

export { IconGrid };
