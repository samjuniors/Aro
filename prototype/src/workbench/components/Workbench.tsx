import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { cn } from "../utils/cn";
import { type ModeId, type Session, type Step } from "../data/catalog";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { readStored, writeStored } from "../lib/storage";
import { useDictation, engineMeta } from "../lib/dictation";
import { formatSeconds } from "../lib/speak";
import { ProjectPickerPanel } from "./ProjectDialog";
import { DiffSideDrawer, RepoBar, repoStateFor } from "./RepoDock";
import { PlanTodoCorner } from "./PlanTodoCorner";
import { IconArrowUp, IconBrain, IconBranch, IconCheck, IconChevronDown, IconChevronUp, IconFile, IconFolder, IconGit, IconGlobe, IconKeyboard, IconList, IconMic, IconMore, IconPaperclip, IconPlus, IconPulse, IconSearch, IconShield, IconSpark, IconStop, IconTerminal, IconTrash, IconX } from "./Icons";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSep, Tip, Toggle, type Tone } from "./ui";
import { FindBar, StepView, StreamingRow } from "./Transcript";
import { usePrototypeConfig } from "../config/prototypeConfig";

type ModeDefinition = { id: ModeId; label: string; short: string; desc: string; tone: Tone; icon: ComponentType<{ size?: number; className?: string }> };
export function modeDefs(product: "code" | "agent"): ModeDefinition[] {
  return [
    { id: "agent", label: product === "code" ? "Approve for me" : "Ask before acting", short: product === "code" ? "Approve for me" : "Ask first", desc: "Ask before risky actions. Work is scoped to the selected project.", tone: "neutral", icon: IconShield },
    { id: "readonly", label: "Read only", short: "Read only", desc: "Read and explain without changing files or running commands.", tone: "neutral", icon: IconFile },
    { id: "plan", label: "Plan first", short: "Plan first", desc: "Propose an approach before making changes.", tone: "neutral", icon: IconList },
    { id: "full", label: "Full access", short: "Full access", desc: "Allow a connected agent runtime to edit and execute in this project.", tone: "amber", icon: IconShield },
  ];
}

export type WorkbenchProps = {
  session: Session; sessions: Session[]; onSelect: (id: string) => void; onNew: () => void;
  steps: Step[]; streaming: boolean; streamLabel: string; mode: ModeId; setMode: (mode: ModeId) => void;
  agentId: string; setAgentId: (id: string) => void; modelId: string; setModelId: (id: string) => void;
  onSend: (text: string, files?: File[]) => boolean | Promise<boolean>; onStop: () => void;
  project?: Project; onChooseProject: (id?: string, createdProject?: Project) => void; compact?: boolean;
  /* transcript affordances — edit & resend a turn, retry the last reply, rewind to a checkpoint */
  onEditMessage?: (stepId: string, text: string) => void;
  onRetry?: () => void;
  onRestoreCheckpoint?: (stepId: string) => void;
};

function SessionHeader({ session, sessions, onSelect, onNew }: Pick<WorkbenchProps, "session" | "sessions" | "onSelect" | "onNew">) {
  const [query, setQuery] = useState("");
  const exportTranscript = () => {
    const content = session.steps.filter((s): s is Extract<Step, { type: "user" | "text" }> => s.type === "user" || s.type === "text").map((s) => `## ${s.type === "user" ? "You" : "Assistant"}\n\n${s.text}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
    const link = document.createElement("a"); link.href = url; link.download = `${session.title.replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 50) || "session"}.md`; link.click(); URL.revokeObjectURL(url);
  };
  return <header className="app-thread-header flex shrink-0 items-center gap-2 border-b border-line-soft px-4">
    <Menu width={340} trigger={() => <button className="flex min-w-0 items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-left hover:bg-hover"><span className="max-w-[500px] truncate text-[13px] font-medium text-ink">{session.title}</span><IconChevronDown size={11} className="shrink-0 text-ink-4" /></button>}>
      {(close) => <>
        <div className="relative p-1"><IconSearch size={12} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sessions" className="h-8 w-full rounded-[6px] bg-well pr-2 pl-7 text-[12px] outline-none" /></div>
        {sessions.filter((s) => !s.archived && s.title.toLowerCase().includes(query.toLowerCase())).map((s) => <MenuItem key={s.id} label={s.title} active={s.id === session.id} onClick={() => { onSelect(s.id); close(); }} />)}
        <MenuSep /><MenuItem icon={<IconPlus size={12} />} label="New session" hint="⌘N" onClick={() => { onNew(); close(); }} />
      </>}
    </Menu>
    <Menu width={210} align="right" className="ml-auto" trigger={() => <IconButton icon={IconMore} label="Session actions" size={28} />}>
      {(close) => <MenuItem icon={<IconFile size={12} />} label="Export conversation" onClick={() => { exportTranscript(); close(); }} />}
    </Menu>
  </header>;
}

/* Reasoning-effort levels — Codex-style strength ramp: the further right,
   the hotter the accent color (neutral → cyan → iris → amber → rose). */
const EFFORTS = [
  { id: "minimal", label: "Minimal", color: "var(--color-ink-3)", desc: "Straight to the point — no visible reasoning. Fastest and cheapest for lookups." },
  { id: "low", label: "Low", color: "var(--color-cyan)", desc: "Light reasoning for small edits, renames and quick fixes." },
  { id: "medium", label: "Medium", color: "var(--color-iris-soft)", desc: "Balanced thinking for everyday coding — the sensible default." },
  { id: "high", label: "High", color: "var(--color-amber)", desc: "Deep multi-step reasoning for tricky bugs and cross-file refactors." },
  { id: "ultra", label: "Ultra", color: "var(--color-rose)", desc: "Maximum reasoning power — architecture, migrations, hard proofs." },
] as const;

const SLASH_COMMANDS_LIST = [
  { cmd: "/plan", label: "Plan first", desc: "Plan an approach before making file edits", icon: IconList },
  { cmd: "/compact", label: "Compact context", desc: "Compress and summarize chat history", icon: IconSpark },
  { cmd: "/model", label: "Switch model", desc: "Change active model and reasoning level", icon: IconBrain },
  { cmd: "/project", label: "Switch project", desc: "Attach or change current project", icon: IconFolder },
  { cmd: "/terminal", label: "Open terminal", desc: "Open shell terminal in workspace dock", icon: IconTerminal },
  { cmd: "/diff", label: "Review diffs", desc: "Inspect working git tree changes", icon: IconBranch },
  { cmd: "/clear", label: "Clear draft", desc: "Reset the current composer prompt", icon: IconTrash },
  { cmd: "/help", label: "Keyboard shortcuts", desc: "View all shortcuts and hotkeys", icon: IconKeyboard },
];

const CONTEXT_MENTIONS_LIST = [
  { tag: "@file", label: "Project file", desc: "Reference a specific code file in context", icon: IconFile },
  { tag: "@folder", label: "Folder", desc: "Reference a directory path", icon: IconFolder },
  { tag: "@diff", label: "Git diff", desc: "Attach working git uncommitted changes", icon: IconBranch },
  { tag: "@git", label: "Git log", desc: "Include recent commits & repository state", icon: IconGit },
  { tag: "@web", label: "Web search", desc: "Search online docs and internet", icon: IconGlobe },
  { tag: "@docs", label: "Documentation", desc: "Attach library or framework docs", icon: IconSearch },
  { tag: "@terminal", label: "Terminal log", desc: "Include recent shell console output", icon: IconTerminal },
];

function Composer(props: WorkbenchProps) {
  const { product, providers, toast, setSettingsSection } = useApp();
  const { config } = usePrototypeConfig();
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [effort, setEffort] = useState(() => Math.min(EFFORTS.length - 1, Math.max(0, readStored<number>("conductor.pref.effort", 2))));
  const effortLevel = EFFORTS[effort];
  const setEffortIdx = (index: number) => { setEffort(index); writeStored("conductor.pref.effort", index); window.dispatchEvent(new CustomEvent("conductor:effort", { detail: index })); };
  const [modelQuery, setModelQuery] = useState("");
  /* model menu starts collapsed on the effort slider; the model name slides the list up */
  const [modelExpanded, setModelExpanded] = useState(false);
  const [thinking, setThinking] = useState(() => readStored("conductor.pref.thinking", true));
  const setThinkingOn = (on: boolean) => { setThinking(on); writeStored("conductor.pref.thinking", on); window.dispatchEvent(new CustomEvent("conductor:thinking", { detail: on })); };
  const [submitting, setSubmitting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const permission = modeDefs(product).find((mode) => mode.id === props.mode)!;
  const selectedModel = providers.flatMap((p) => p.models.map((m) => ({ ...m, provider: p }))).find((m) => props.modelId === `provider:${m.provider.id}:${m.id}`);
  const appendDictation = useCallback((text: string) => { setValue((old) => `${old}${old && !old.endsWith(" ") ? " " : ""}${text}`); textarea.current?.focus(); }, []);
  const dictationError = useCallback((message: string) => toast(message, "amber"), [toast]);
  const dictation = useDictation(appendDictation, dictationError);
  const [diffOpen, setDiffOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const repoState = repoStateFor(props.project);

  const isFresh = props.steps.length === 0;
  const [typewriterText, setTypewriterText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // User prompt history for Up / Down arrows
  const userPromptHistory = useMemo(() => {
    return props.steps
      .filter((s): s is Extract<Step, { type: "user" }> => s.type === "user")
      .map((s) => s.text);
  }, [props.steps]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Slash commands popover
  const isSlashActive = value.startsWith("/") && !value.includes(" ") && value.length < 15;
  const filteredSlash = useMemo(() => {
    if (!isSlashActive) return [];
    const q = value.slice(1).toLowerCase();
    return SLASH_COMMANDS_LIST.filter(
      (item) => item.cmd.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
    );
  }, [isSlashActive, value]);
  const [slashSelectIdx, setSlashSelectIdx] = useState(0);

  // Mention popover
  const mentionMatch = value.match(/@([a-zA-Z0-9_-]*)$/);
  const isMentionActive = Boolean(mentionMatch);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : "";
  const filteredMentions = useMemo(() => {
    if (!isMentionActive) return [];
    return CONTEXT_MENTIONS_LIST.filter(
      (m) => m.tag.toLowerCase().includes(mentionQuery) || m.label.toLowerCase().includes(mentionQuery)
    );
  }, [isMentionActive, mentionQuery]);
  const [mentionSelectIdx, setMentionSelectIdx] = useState(0);

  const executeSlash = (cmd: string) => {
    if (cmd === "/plan") {
      props.setMode("plan");
      setValue("");
      toast("Switched mode to Plan first", "mint");
    } else if (cmd === "/compact") {
      setValue("");
      toast("Context compacted (32% reduction)", "mint");
    } else if (cmd === "/model") {
      setValue("");
      setModelExpanded(true);
    } else if (cmd === "/project") {
      setValue("");
      setProjectMenuOpen(true);
    } else if (cmd === "/terminal") {
      setValue("");
      window.dispatchEvent(new CustomEvent("conductor:pane", { detail: "terminal" }));
      toast("Opened Terminal dock", "iris");
    } else if (cmd === "/diff") {
      setValue("");
      window.dispatchEvent(new CustomEvent("conductor:pane", { detail: "changes" }));
    } else if (cmd === "/clear") {
      setValue("");
      toast("Draft cleared", "amber");
    } else if (cmd === "/help") {
      setValue("");
      window.dispatchEvent(new CustomEvent("conductor:help"));
    }
    textarea.current?.focus();
  };

  const selectMention = (tag: string) => {
    const updated = value.replace(/@[a-zA-Z0-9_-]*$/, `${tag} `);
    setValue(updated);
    toast(`Attached context: ${tag}`, "iris");
    textarea.current?.focus();
  };

  useEffect(() => {
    if (!isFresh || value.trim().length > 0) {
      setTypewriterText("");
      return;
    }
    const TYPEWRITER_PHRASES = [
      "Ask Aro anything or describe what you want to build…",
      "Drag a project from the sidebar to connect…",
      "Plan a refactor, fix a bug, or write tests…",
      "Explain code architecture and design patterns…",
    ];
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timer: any = null;

    const tick = () => {
      const phrase = TYPEWRITER_PHRASES[phraseIdx];
      if (!isDeleting) {
        charIdx++;
        setTypewriterText(phrase.slice(0, charIdx));
        if (charIdx >= phrase.length) {
          isDeleting = true;
          timer = setTimeout(tick, 2400);
          return;
        }
        timer = setTimeout(tick, 36);
      } else {
        charIdx -= 2;
        if (charIdx <= 0) {
          charIdx = 0;
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % TYPEWRITER_PHRASES.length;
          timer = setTimeout(tick, 450);
          return;
        }
        setTypewriterText(phrase.slice(0, charIdx));
        timer = setTimeout(tick, 22);
      }
    };

    timer = setTimeout(tick, 350);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isFresh, value]);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/aro-project") || e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragOver) setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    const projectId = e.dataTransfer.getData("application/aro-project");
    if (projectId) {
      e.preventDefault();
      props.onChooseProject(projectId);
      toast("Connected project to session", "mint");
      return;
    }
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      e.preventDefault();
      const readable = droppedFiles.filter((f) => f.size <= 128_000 && !/^(image|video|audio)\//.test(f.type));
      if (readable.length > 0) {
        setFiles((prev) => [...prev, ...readable].slice(0, 8));
        toast(`Attached ${readable.length} file(s)`, "mint");
      }
    }
  };

  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = "auto"; input.style.height = `${Math.max(60, Math.min(input.scrollHeight, 220))}px`;
  }, [value]);
  /* fresh-stage suggestion chips prefill the composer (never send on their own) */
  useEffect(() => {
    const prefill = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      setValue((old) => old || text);
      textarea.current?.focus();
    };
    window.addEventListener("conductor:composer-prefill", prefill);
    return () => window.removeEventListener("conductor:composer-prefill", prefill);
  }, []);
  useEffect(() => {
    const toggle = () => { dictation.toggle(); textarea.current?.focus(); };
    window.addEventListener("conductor:voice:dictate", toggle);
    return () => window.removeEventListener("conductor:voice:dictate", toggle);
  }, [dictation.toggle]);
  /* open the project picker from anywhere (e.g. external "choose project" hooks) */
  useEffect(() => {
    const choose = () => setProjectMenuOpen(true);
    window.addEventListener("conductor:choose-project", choose);
    return () => window.removeEventListener("conductor:choose-project", choose);
  }, []);
  /* Esc stops dictation without sending */
  useEffect(() => {
    if (!dictation.listening) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); dictation.stop(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [dictation.listening, dictation.stop]);
  const submit = async () => {
    if (!value.trim() || submitting || props.streaming) return;
    if (dictation.listening) dictation.stop();
    setSubmitting(true);
    try { if (await props.onSend(value.trim(), files)) { setValue(""); setFiles([]); } }
    finally { setSubmitting(false); }
  };
  const openProviders = () => { setSettingsSection("providers"); window.dispatchEvent(new CustomEvent("conductor:settings")); };
  const pickerIcon = <span className="model-monogram" aria-hidden>{selectedModel?.provider.glyph ?? "AI"}</span>;

  return <div className="reference-composer-container">
    {/* agent plan — slim strip directly above the composer */}
    {config.layout.planCorner && <PlanTodoCorner fresh={props.steps.length === 0} />}
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "reference-composer relative transition-all duration-200",
        dictation.listening && "is-listening",
        props.streaming && "is-streaming",
        isDragOver && "ring-2 ring-iris ring-offset-2 scale-[1.01] border-iris shadow-glow-iris"
      )}
    >
      {/* Drop overlay highlight when dragging project or file */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[12px] bg-sunken/85 backdrop-blur-xs border-2 border-dashed border-iris pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 rounded-[8px] bg-raise px-3.5 py-2 shadow-lg text-[13px] font-medium text-iris-soft border border-line-strong">
            <IconFolder size={17} className="animate-bounce" />
            <span>Drop project to attach to this session</span>
          </div>
        </div>
      )}
      {/* Wispr Flow-style dictation bubble floating above the voice button */}
      {dictation.listening && (
        <div className="dictation-bubble animate-pop" role="status" aria-live="polite">
          <span className="dictation-wave" aria-hidden style={{ ["--mic-level" as string]: dictation.level }}>
            {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 110}ms` }} />)}
          </span>
          <span className="dictation-timer font-mono">{formatSeconds(dictation.elapsed)}</span>
          <span className="dictation-text min-w-0 flex-1">{dictation.interim === "…" ? "Transcribing…" : dictation.interim || (engineMeta(dictation.engine).short === "browser" ? "Speak to type…" : "Listening…")}</span>
          <button type="button" onClick={dictation.stop} className="dictation-done"><IconCheck size={12} /><span>Done</span></button>
        </div>
      )}
      {/* Slash command popover */}
      {isSlashActive && filteredSlash.length > 0 && (
        <div className="absolute bottom-[calc(100%+8px)] left-2 z-40 w-[280px] overflow-hidden rounded-[10px] border border-line-strong bg-raise/95 p-1 shadow-e3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-4">Slash Commands</div>
          <div className="scroll-thin max-h-[220px] overflow-y-auto">
            {filteredSlash.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === slashSelectIdx;
              return (
                <button
                  key={item.cmd}
                  type="button"
                  onClick={() => executeSlash(item.cmd)}
                  onMouseEnter={() => setSlashSelectIdx(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition-colors",
                    isSelected ? "bg-hover text-ink" : "text-ink-2 hover:bg-hover/60"
                  )}
                >
                  <Icon size={13} className={cn("shrink-0", isSelected ? "text-iris" : "text-ink-3")} />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11.5px] font-medium text-ink">{item.cmd}</span>
                    <span className="ml-2 text-[11px] text-ink-4">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Context mention popover */}
      {isMentionActive && filteredMentions.length > 0 && (
        <div className="absolute bottom-[calc(100%+8px)] left-2 z-40 w-[280px] overflow-hidden rounded-[10px] border border-line-strong bg-raise/95 p-1 shadow-e3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-4">Add Context</div>
          <div className="scroll-thin max-h-[220px] overflow-y-auto">
            {filteredMentions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === mentionSelectIdx;
              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => selectMention(item.tag)}
                  onMouseEnter={() => setMentionSelectIdx(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition-colors",
                    isSelected ? "bg-hover text-ink" : "text-ink-2 hover:bg-hover/60"
                  )}
                >
                  <Icon size={13} className={cn("shrink-0", isSelected ? "text-iris" : "text-ink-3")} />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11.5px] font-medium text-ink">{item.tag}</span>
                    <span className="ml-2 text-[11px] text-ink-4">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {files.length > 0 && <div className="flex flex-wrap gap-1.5 px-3.5 pt-3">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-well px-2 py-1 text-[11px] text-ink-2"><IconPaperclip size={10} />{file.name}<button onClick={() => setFiles((all) => all.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="text-ink-4 hover:text-ink"><IconX size={10} /></button></span>)}</div>}
      <textarea
        ref={textarea}
        data-composer="true"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={dictation.listening ? "Listening — speak or press Esc to stop" : (isFresh && typewriterText ? `${typewriterText}▍` : "Do anything")}
        aria-label="Message to the coding agent"
        spellCheck
        onKeyDown={(e) => {
          if (isSlashActive && filteredSlash.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSlashSelectIdx((prev) => (prev + 1) % filteredSlash.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSlashSelectIdx((prev) => (prev - 1 + filteredSlash.length) % filteredSlash.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              executeSlash(filteredSlash[slashSelectIdx].cmd);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setValue("");
              return;
            }
          }

          if (isMentionActive && filteredMentions.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setMentionSelectIdx((prev) => (prev + 1) % filteredMentions.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setMentionSelectIdx((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              selectMention(filteredMentions[mentionSelectIdx].tag);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setValue(value.replace(/@[a-zA-Z0-9_-]*$/, ""));
              return;
            }
          }

          if (value === "" && userPromptHistory.length > 0) {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const nextIdx = historyIdx === -1 ? userPromptHistory.length - 1 : Math.max(0, historyIdx - 1);
              setHistoryIdx(nextIdx);
              setValue(userPromptHistory[nextIdx]);
              return;
            }
            if (e.key === "ArrowDown" && historyIdx !== -1) {
              e.preventDefault();
              if (historyIdx < userPromptHistory.length - 1) {
                const nextIdx = historyIdx + 1;
                setHistoryIdx(nextIdx);
                setValue(userPromptHistory[nextIdx]);
              } else {
                setHistoryIdx(-1);
                setValue("");
              }
              return;
            }
          }

          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            setHistoryIdx(-1);
            void submit();
          }
        }}
        className="reference-composer-input"
      />
      <div className="reference-composer-toolbar">
        {config.composer.attachments && (
          <Menu side="top" width={225} trigger={() => <button className="composer-icon-button" aria-label="Add files or context"><IconPlus size={15} /></button>}>
            {(close) => <>
              <MenuItem icon={<IconPaperclip size={13} />} label="Attach text or code files" onClick={() => { close(); fileInput.current?.click(); }} />
              <MenuItem icon={<IconFolder size={13} />} label="Choose project" onClick={() => { close(); window.setTimeout(() => setProjectMenuOpen(true), 16); }} />
            </>}
          </Menu>
        )}
        {/* project attach / switch — the only project control in the composer */}
        {config.composer.projectPicker && (
          <Menu side="top" width={340} open={projectMenuOpen} onOpenChange={setProjectMenuOpen} trigger={() => (
            <button className={cn("composer-icon-button", props.project && "has-project")} aria-label={props.project ? `Switch project — ${props.project.name}` : "Attach a project"} title={props.project ? `Project: ${props.project.name}` : "Attach a project"}>
              <IconFolder size={15} />
            </button>
          )}>
            {(close) => <ProjectPickerPanel project={props.project} onChoose={(id, created) => { props.onChooseProject(id, created); close(); }} />}
          </Menu>
        )}
        <input ref={fileInput} type="file" multiple accept=".txt,.md,.js,.jsx,.ts,.tsx,.json,.py,.html,.css,.scss,.yaml,.yml,.toml,.rs,.go,.java,.c,.cpp,.sql,.sh" className="hidden" onChange={(e) => { const selected = Array.from(e.target.files ?? []); const readable = selected.filter((file) => file.size <= 128_000 && !/^(image|video|audio)\//.test(file.type)); if (readable.length < selected.length) toast("Attach text/code files smaller than 128 KB. Unsupported files were not added.", "amber"); setFiles((all) => [...all, ...readable].slice(0, 8)); e.target.value = ""; }} />
        {config.composer.permissions && (
          <Menu side="top" width={310} trigger={() => <button className={cn("permission-control", props.mode === "full" && "full-permission")} aria-label={`Permissions: ${permission.label}`}><IconShield size={14} /><span>{permission.short}</span></button>}>
            {(close) => <>
              <MenuLabel>Permissions</MenuLabel>
              {modeDefs(product).map((mode) => <button key={mode.id} onClick={() => { props.setMode(mode.id); close(); }} className={cn("flex w-full items-start gap-2.5 rounded-[7px] px-2 py-2 text-left hover:bg-hover", mode.id === props.mode && "bg-hover/70")}>
                <mode.icon size={13} className="mt-0.5 shrink-0 text-ink-3" /><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium text-ink-2">{mode.label}</span><span className="block text-[10.5px] leading-relaxed text-ink-3">{mode.desc}</span></span>{mode.id === props.mode && <IconCheck size={12} className="mt-1 text-ink-2" />}
              </button>)}
              <p className="mt-1 border-t border-line-soft px-2 pt-2 pb-1 text-[10px] leading-relaxed text-ink-4">Shift+Tab cycles permissions. File editing and command execution require a connected agent runtime.</p>
            </>}
          </Menu>
        )}

        <div className="composer-right-controls">
          {config.composer.modelSelector && (
            <Menu side="top" align="right" width={330} onOpenChange={(v) => { if (!v) setModelExpanded(false); }} trigger={() => <button className="model-control" aria-label="Choose model and reasoning effort">{pickerIcon}<span className="model-label">{selectedModel?.label ?? "Choose model"}</span><span className="model-effort" data-level={effortLevel.id} style={{ ["--effort-color" as string]: effortLevel.color }}><i className="model-effort-dot" aria-hidden />{effortLevel.label}</span><IconChevronDown size={11} className="text-ink-4" /></button>}>
              {(close) => <>
                {/* model head — clicking it slides the full model list up */}
                <button type="button" className="model-menu-head" onClick={() => setModelExpanded((v) => !v)} aria-expanded={modelExpanded}>
                  {pickerIcon}
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{selectedModel?.label ?? "Choose a model"}</span>
                    <span className="block truncate font-mono text-[9.5px] text-ink-4">{selectedModel ? `${selectedModel.provider.name} · ${selectedModel.provider.kind === "local" ? "on-device" : "cloud"}` : "not connected"}</span>
                  </span>
                  <IconChevronDown size={12} className={cn("shrink-0 text-ink-4 transition-transform duration-200", modelExpanded && "rotate-180")} />
                </button>
                {modelExpanded ? (
                  <div className="model-menu-list">
                    <div className="relative px-1 py-1"><IconSearch size={11} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-4" /><input placeholder="Search models" value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} className="h-[30px] w-full rounded-[6px] border border-line bg-well pr-2 pl-7 text-[12px] outline-none" /></div>
                    <div className="scroll-thin max-h-[280px] overflow-y-auto">
                      {(["local", "cloud"] as const).map((kind) => <div key={kind}><MenuLabel>{kind === "local" ? "On-device providers" : "Cloud providers"}</MenuLabel>{providers.filter((p) => p.kind === kind).map((p) => {
                        const matches = p.models.filter((m) => `${p.name} ${m.label}`.toLowerCase().includes(modelQuery.toLowerCase()));
                        if (!matches.length && !modelQuery) return <MenuItem key={p.id} label={p.name} hint={p.status === "ready" ? "no models" : "not connected"} onClick={() => { close(); openProviders(); }} />;
                        return <div key={p.id}><div className="px-2 pt-1 font-mono text-[9px] text-ink-4">{p.name}</div>{matches.map((model) => <MenuItem key={model.id} label={model.label} hint={p.status === "ready" ? "available" : "catalog"} active={props.modelId === `provider:${p.id}:${model.id}`} onClick={() => { props.setModelId(`provider:${p.id}:${model.id}`); setModelExpanded(false); }} />)}</div>;
                      })}</div>)}
                    </div>
                  </div>
                ) : (
                  <div className="model-menu-compact">
                    <div className="effort-slider" style={{ ["--effort-color" as string]: effortLevel.color }}>
                      <div className="effort-slider-head">
                        <span className="effort-level-name"><i className="effort-level-dot" aria-hidden />{effortLevel.label}</span>
                        <span className="effort-bars" aria-hidden>
                          {EFFORTS.map((_, i) => <i key={i} className={cn(i <= effort && "is-on")} style={{ height: 4 + i * 2 }} />)}
                        </span>
                      </div>
                      <input type="range" min={0} max={EFFORTS.length - 1} step={1} value={effort} onChange={(e) => setEffortIdx(Number(e.target.value))} className="effort-range" aria-label={`Reasoning effort — ${effortLevel.label}`} aria-valuetext={effortLevel.label} style={{ ["--effort-fill" as string]: `${(effort / (EFFORTS.length - 1)) * 100}%` }} />
                      <div className="effort-slider-scale"><span>Minimal</span><span>Ultra</span></div>
                      <p className="effort-slider-desc">{effortLevel.desc}</p>
                    </div>
                    <div className="model-thinking-row">
                      <IconBrain size={13} className="shrink-0 text-plum" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium text-ink-2">Thinking</span>
                        <span className="block text-[10px] leading-tight text-ink-4">Show the model's reasoning before it replies</span>
                      </span>
                      <Toggle size="sm" checked={thinking} onChange={setThinkingOn} />
                    </div>
                    <MenuItem icon={<IconPlus size={12} />} label="Configure providers" onClick={() => { close(); openProviders(); }} />
                  </div>
                )}
              </>}
            </Menu>
          )}
          {config.composer.voiceButton && (
            <Tip label={dictation.listening ? "Stop dictation · Esc" : "Talk to type · ⌘⇧V"}>
              <button className={cn("composer-icon-button wave-button", dictation.listening && "recording")} onClick={dictation.toggle} aria-label={dictation.listening ? "Stop speech-to-text recording" : "Record speech to text"} aria-pressed={dictation.listening}>
                {dictation.listening ? <IconStop size={14} /> : <IconMic size={15} />}
              </button>
            </Tip>
          )}
          {props.streaming ? <button onClick={props.onStop} className="reference-send-button sending" aria-label="Stop response"><IconStop size={12} /></button> : <button disabled={!value.trim() || submitting} onClick={() => void submit()} className="reference-send-button" aria-label="Send message"><IconArrowUp size={16} /></button>}
        </div>
      </div>
    </div>
    {config.layout.repoBar && props.project && repoState && (
      <RepoBar project={props.project} state={repoState}
        onOpenDiff={() => { setDiffOpen(false); window.dispatchEvent(new CustomEvent("conductor:pane", { detail: "changes" })); }}
        onOpenSettings={() => window.dispatchEvent(new CustomEvent("conductor:settings"))} />
    )}
    {props.project && repoState && (
      <DiffSideDrawer open={diffOpen} onClose={() => setDiffOpen(false)} project={props.project} state={repoState}
        onMerge={() => toast(repoState.isDemo ? "Demo: PR #482 would merge now." : "Merge needs a connected Git runtime.", repoState.isDemo ? "mint" : "amber")} />
    )}
  </div>;
}

/* Fresh-session suggestion chips — the quiet “what would you like to build?”
   answers. One taps straight into the project picker; the others prefill
   the composer so the user can edit before sending. */
const FRESH_IDEAS: { icon: ComponentType<{ size?: number; className?: string }>; label: string; prompt?: string; chooseProject?: boolean }[] = [
  { icon: IconFolder, label: "Attach a project", chooseProject: true },
  { icon: IconPulse, label: "Explain a repository", prompt: "Walk through the architecture of this repository — the main pieces, how they connect, and where the tricky parts live." },
  { icon: IconList, label: "Plan a refactor", prompt: "Plan a refactor of the channel layer so flushes are throttled and the cursor is resumable. Start with a plan, no edits yet." },
  { icon: IconSpark, label: "Build a landing page", prompt: "Draft and build a minimal, well-typographed landing page for a developer tool — one hero, three feature cards, no clutter." },
];

export function Workbench(props: WorkbenchProps) {
  const { providers } = useApp();
  const { config } = usePrototypeConfig();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  const matchingStepIds = useMemo(() => {
    if (!findQuery.trim()) return [];
    const q = findQuery.toLowerCase();
    const ids: string[] = [];
    for (const s of props.steps) {
      if (s.type === "user" && s.text.toLowerCase().includes(q)) {
        ids.push(s.id);
      } else if (s.type === "text" && s.text.toLowerCase().includes(q)) {
        ids.push(s.id);
      } else if (s.type === "thinking" && s.text.toLowerCase().includes(q)) {
        ids.push(s.id);
      } else if (s.type === "tool") {
        const titleMatch = s.title.toLowerCase().includes(q);
        const targetMatch = s.target ? s.target.toLowerCase().includes(q) : false;
        const outputMatch = s.output ? s.output.some((line) => line.toLowerCase().includes(q)) : false;
        if (titleMatch || targetMatch || outputMatch) ids.push(s.id);
      } else if (s.type === "approval" && (s.command.toLowerCase().includes(q) || s.reason.toLowerCase().includes(q))) {
        ids.push(s.id);
      } else if (s.type === "notice" && s.text.toLowerCase().includes(q)) {
        ids.push(s.id);
      }
    }
    return ids;
  }, [findQuery, props.steps]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollToMatch = (idx: number) => {
    if (matchingStepIds.length === 0) return;
    const targetId = matchingStepIds[idx];
    if (!targetId) return;
    const el = scrollRef.current?.querySelector(`[data-step-id="${targetId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-iris", "transition-all");
      setTimeout(() => el.classList.remove("ring-2", "ring-iris"), 1800);
    }
  };

  const handleNextMatch = () => {
    if (matchingStepIds.length === 0) return;
    const next = (currentMatchIdx + 1) % matchingStepIds.length;
    setCurrentMatchIdx(next);
    scrollToMatch(next);
  };

  const handlePrevMatch = () => {
    if (matchingStepIds.length === 0) return;
    const prev = (currentMatchIdx - 1 + matchingStepIds.length) % matchingStepIds.length;
    setCurrentMatchIdx(prev);
    scrollToMatch(prev);
  };

  const fresh = props.steps.length === 0;
  const route = (props.session.modelId ?? props.modelId).split(":");
  const provider = providers.find((p) => p.id === route[1]);
  const recordedModel = provider?.models.find((m) => m.id === route.slice(2).join(":"));
  const persona = { name: provider?.name ?? "Assistant", glyph: provider?.glyph ?? "AI", from: provider?.accent ?? "#9a9eaa", to: provider?.accent ?? "#9a9eaa", model: recordedModel?.label ?? "Selected model" };
  useEffect(() => { if (following) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: props.streaming ? "auto" : "smooth" }); }, [props.steps, following, props.streaming]);
  if (fresh) return <div className="fresh-workbench">
    <div className="fresh-session-stage animate-fade">
      {/* heading centers itself in the free space; the composer stays
          anchored to the BOTTOM on every viewport — desktop, tablet and
          mobile — exactly like an active session */}
      <div className="fresh-session-heading">
        {props.project?.id === "demo-sofia-ui" && <span className="fresh-demo-pill">REFERENCE DEMO · pre-filled so you can compare</span>}
        <h1>{props.project ? `Let's work on ${props.project.name}.` : "What would you like to build?"}</h1>
        {!props.project && <p className="fresh-sub">Attach a project with the folder button in the composer toolbar, or just start typing — you can attach one later.</p>}
      </div>
      {config.composer.freshSuggestions && (
        <div className="fresh-suggestions">
          {FRESH_IDEAS.map((idea, index) => (
            <button key={idea.label} type="button" className="fresh-suggestion" style={{ animationDelay: `${120 + index * 70}ms` }}
              onClick={() => { if (idea.chooseProject) window.dispatchEvent(new CustomEvent("conductor:choose-project")); else window.dispatchEvent(new CustomEvent("conductor:composer-prefill", { detail: idea.prompt })); }}>
              <idea.icon size={12} />{idea.label}
            </button>
          ))}
        </div>
      )}
      <Composer {...props} />
      <p className="fresh-composer-hint">{props.project ? "Project, model and permissions stay with this session." : "Blank canvas — nothing is connected until you choose a project and model."}</p>
    </div>
  </div>;
  return <div className="flex h-full min-w-0 flex-1 flex-col bg-base">
    <SessionHeader session={props.session} sessions={props.sessions} onSelect={props.onSelect} onNew={props.onNew} />
    <div ref={scrollRef} onScroll={(e) => { const element = e.currentTarget; setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 100); }} className="scroll-thin relative min-h-0 flex-1 overflow-y-auto">
      <FindBar
        open={findOpen}
        onClose={() => setFindOpen(false)}
        searchQuery={findQuery}
        setSearchQuery={(q) => {
          setFindQuery(q);
          setCurrentMatchIdx(0);
        }}
        matchCount={matchingStepIds.length}
        currentMatchIndex={currentMatchIdx}
        onNext={handleNextMatch}
        onPrev={handlePrevMatch}
      />
      <div className="app-transcript-inner mx-auto w-full space-y-5 py-6">{props.steps.map((step, index) => {
        const isLast = index === props.steps.length - 1;
        return <div className="transcript-step" key={step.id} data-step-id={step.id}><StepView step={step} agentId={props.agentId} persona={persona}
          onEditMessage={props.onEditMessage}
          onRetry={props.onRetry && isLast && step.type === "text" && !props.streaming ? props.onRetry : undefined}
          onRestore={props.onRestoreCheckpoint} /></div>;
      })}{props.streaming && <StreamingRow label={props.streamLabel} />}</div>
      {!following && <button onClick={() => { setFollowing(true); scrollRef.current?.scrollTo({ top: 1e8, behavior: "smooth" }); }} className="sticky bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-overlay px-3 py-1 text-[11px] text-ink-2 shadow-e2"><IconChevronDown size={11} />Latest</button>}
    </div>
    <div className="active-composer-area"><Composer {...props} /></div>
  </div>;
}
export { Button };