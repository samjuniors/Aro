import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "../utils/cn";
import { type ModeId, type Session, type Step } from "../data/catalog";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { useDictation } from "../lib/dictation";
import { ProjectChooser } from "./ProjectDialog";
import { DiffSideDrawer, RepoBar, repoStateFor } from "./RepoDock";
import { PlanTodoCorner } from "./PlanTodoCorner";
import { IconArrowUp, IconCheck, IconChevronDown, IconFile, IconFolder, IconList, IconMore, IconPaperclip, IconPlus, IconSearch, IconShield, IconStop, IconWave, IconX } from "./Icons";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSep, Tip, type Tone } from "./ui";
import { StepView, StreamingRow } from "./Transcript";

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

function Composer(props: WorkbenchProps) {
  const { product, providers, toast, setSettingsSection } = useApp();
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [effort, setEffort] = useState("Medium");
  const [modelQuery, setModelQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const permission = modeDefs(product).find((mode) => mode.id === props.mode)!;
  const selectedModel = providers.flatMap((p) => p.models.map((m) => ({ ...m, provider: p }))).find((m) => props.modelId === `provider:${m.provider.id}:${m.id}`);
  const appendDictation = useCallback((text: string) => { setValue((old) => `${old}${old && !old.endsWith(" ") ? " " : ""}${text}`); textarea.current?.focus(); }, []);
  const dictationError = useCallback((message: string) => toast(message, "amber"), [toast]);
  const dictation = useDictation(appendDictation, dictationError);
  const [diffOpen, setDiffOpen] = useState(false);
  const repoState = repoStateFor(props.project);

  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = "auto"; input.style.height = `${Math.max(60, Math.min(input.scrollHeight, 220))}px`;
  }, [value]);
  useEffect(() => {
    const toggle = () => { dictation.toggle(); textarea.current?.focus(); };
    window.addEventListener("conductor:voice:dictate", toggle);
    return () => window.removeEventListener("conductor:voice:dictate", toggle);
  }, [dictation.toggle]);
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
    <PlanTodoCorner session={props.session} mode={props.mode} />
    <ProjectChooser project={props.project} onChoose={props.onChooseProject} />
    <div className={cn("reference-composer", dictation.listening && "is-listening", props.streaming && "is-streaming")}>
      {dictation.listening && <div className="dictation-status" role="status"><IconWave size={13} className="animate-pulse" /><span>Listening</span><span className="min-w-0 flex-1 truncate italic text-ink-3">{dictation.interim || "Speak to type"}</span><button onClick={dictation.stop} className="text-[11px] text-ink-3 hover:text-ink">Done</button></div>}
      {files.length > 0 && <div className="flex flex-wrap gap-1.5 px-3.5 pt-3">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-well px-2 py-1 text-[11px] text-ink-2"><IconPaperclip size={10} />{file.name}<button onClick={() => setFiles((all) => all.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="text-ink-4 hover:text-ink"><IconX size={10} /></button></span>)}</div>}
      <textarea ref={textarea} data-composer="true" rows={2} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Do anything" aria-label="Message to the coding agent" spellCheck
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} className="reference-composer-input" />
      <div className="reference-composer-toolbar">
        <Menu side="top" width={225} trigger={() => <button className="composer-icon-button" aria-label="Add files or context"><IconPlus size={16} /></button>}>
          {(close) => <>
                <MenuItem icon={<IconPaperclip size={13} />} label="Attach text or code files" onClick={() => { close(); fileInput.current?.click(); }} />
            <MenuItem icon={<IconFolder size={13} />} label="Choose project" onClick={() => { close(); window.dispatchEvent(new CustomEvent("conductor:choose-project")); }} />
          </>}
        </Menu>
        <input ref={fileInput} type="file" multiple accept=".txt,.md,.js,.jsx,.ts,.tsx,.json,.py,.html,.css,.scss,.yaml,.yml,.toml,.rs,.go,.java,.c,.cpp,.sql,.sh" className="hidden" onChange={(e) => { const selected = Array.from(e.target.files ?? []); const readable = selected.filter((file) => file.size <= 128_000 && !/^(image|video|audio)\//.test(file.type)); if (readable.length < selected.length) toast("Attach text/code files smaller than 128 KB. Unsupported files were not added.", "amber"); setFiles((all) => [...all, ...readable].slice(0, 8)); e.target.value = ""; }} />
        <Menu side="top" width={310} trigger={() => <button className={cn("permission-control", props.mode === "full" && "full-permission")} aria-label={`Permissions: ${permission.label}`}><IconShield size={13} /><span>{permission.short}</span></button>}>
          {(close) => <>
            <MenuLabel>Permissions</MenuLabel>
            {modeDefs(product).map((mode) => <button key={mode.id} onClick={() => { props.setMode(mode.id); close(); }} className={cn("flex w-full items-start gap-2.5 rounded-[7px] px-2 py-2 text-left hover:bg-hover", mode.id === props.mode && "bg-hover/70")}>
              <mode.icon size={13} className="mt-0.5 shrink-0 text-ink-3" /><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium text-ink-2">{mode.label}</span><span className="block text-[10.5px] leading-relaxed text-ink-3">{mode.desc}</span></span>{mode.id === props.mode && <IconCheck size={12} className="mt-1 text-ink-2" />}
            </button>)}
            <p className="mt-1 border-t border-line-soft px-2 pt-2 pb-1 text-[10px] leading-relaxed text-ink-4">Shift+Tab cycles permissions. File editing and command execution require a connected agent runtime.</p>
          </>}
        </Menu>

        <div className="composer-right-controls">
          <Menu side="top" align="right" width={340} trigger={() => <button className="model-control" aria-label="Choose model and reasoning effort">{pickerIcon}<span className="model-label">{selectedModel?.label ?? "Choose model"}</span><span className="model-effort">{effort}</span><IconChevronDown size={10} className="text-ink-4" /></button>}>
            {(close) => <>
              <div className="relative px-1 py-1"><IconSearch size={11} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-4" /><input placeholder="Search models" value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} className="h-[30px] w-full rounded-[6px] border border-line bg-well pr-2 pl-7 text-[12px] outline-none" /></div>
              <div className="scroll-thin max-h-[300px] overflow-y-auto">
                {(["local", "cloud"] as const).map((kind) => <div key={kind}><MenuLabel>{kind === "local" ? "On-device providers" : "Cloud providers"}</MenuLabel>{providers.filter((p) => p.kind === kind).map((p) => {
                  const matches = p.models.filter((m) => `${p.name} ${m.label}`.toLowerCase().includes(modelQuery.toLowerCase()));
                  if (!matches.length && !modelQuery) return <MenuItem key={p.id} label={p.name} hint={p.status === "ready" ? "no models" : "not connected"} onClick={() => { close(); openProviders(); }} />;
                  return <div key={p.id}><div className="px-2 pt-1 font-mono text-[9px] text-ink-4">{p.name}</div>{matches.map((model) => <MenuItem key={model.id} label={model.label} hint={p.status === "ready" ? "available" : "catalog"} active={props.modelId === `provider:${p.id}:${model.id}`} onClick={() => { props.setModelId(`provider:${p.id}:${model.id}`); close(); }} />)}</div>;
                })}</div>)}
              </div>
              <MenuSep /><MenuLabel>Reasoning effort</MenuLabel><div className="flex gap-1 px-1 pb-1">{["Low", "Medium", "High"].map((item) => <button key={item} onClick={() => setEffort(item)} className={cn("flex-1 rounded-[6px] border px-2 py-1 text-[11px]", effort === item ? "border-line-strong bg-hover text-ink" : "border-line text-ink-3")}>{item}</button>)}</div>
              <MenuSep /><MenuItem icon={<IconPlus size={12} />} label="Configure providers" onClick={() => { close(); openProviders(); }} />
            </>}
          </Menu>
          <Tip label={dictation.listening ? "Stop speech-to-text" : "Speech to text · ⌘⇧V"}><button className={cn("composer-icon-button wave-button", dictation.listening && "recording")} onClick={dictation.toggle} aria-label={dictation.listening ? "Stop speech-to-text recording" : "Record speech to text"} aria-pressed={dictation.listening}><IconWave size={16} /></button></Tip>
          {props.streaming ? <button onClick={props.onStop} className="reference-send-button sending" aria-label="Stop response"><IconStop size={12} /></button> : <button disabled={!value.trim() || submitting} onClick={() => void submit()} className="reference-send-button" aria-label="Send message"><IconArrowUp size={15} /></button>}
        </div>
      </div>
    </div>
    {props.project && repoState && (
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

export function Workbench(props: WorkbenchProps) {
  const { providers } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const fresh = props.steps.length === 0;
  const route = (props.session.modelId ?? props.modelId).split(":");
  const provider = providers.find((p) => p.id === route[1]);
  const recordedModel = provider?.models.find((m) => m.id === route.slice(2).join(":"));
  const persona = { name: provider?.name ?? "Assistant", glyph: provider?.glyph ?? "AI", from: provider?.accent ?? "#9a9eaa", to: provider?.accent ?? "#9a9eaa", model: recordedModel?.label ?? "Selected model" };
  useEffect(() => { if (following) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: props.streaming ? "auto" : "smooth" }); }, [props.steps, following, props.streaming]);
  useEffect(() => {
    const choose = () => document.querySelector<HTMLButtonElement>(".composer-project-strip")?.click();
    window.addEventListener("conductor:choose-project", choose);
    return () => window.removeEventListener("conductor:choose-project", choose);
  }, []);
  if (fresh) return <div className="fresh-workbench">
    <div className="fresh-session-stage animate-fade">
      <div className="fresh-session-heading">
        {props.project?.id === "demo-sofia-ui" && <span className="fresh-demo-pill">REFERENCE DEMO · pre-filled so you can compare</span>}
        <h1>{props.project ? `Let's work on ${props.project.name}.` : "What would you like to build?"}</h1>
        {!props.project && <p className="fresh-sub">Pick a project above, or just start typing — you can attach one later.</p>}
      </div>
      <Composer {...props} />
      <p className="fresh-composer-hint">{props.project ? "Project, model and permissions stay with this session." : "Blank canvas — nothing is connected until you choose a project and model."}</p>
    </div>
  </div>;
  return <div className="flex h-full min-w-0 flex-1 flex-col bg-base">
    <SessionHeader session={props.session} sessions={props.sessions} onSelect={props.onSelect} onNew={props.onNew} />
    <div ref={scrollRef} onScroll={(e) => { const element = e.currentTarget; setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 100); }} className="scroll-thin relative min-h-0 flex-1 overflow-y-auto">
      <div className="app-transcript-inner mx-auto w-full space-y-5 py-6">{props.steps.map((step) => <div className="transcript-step" key={step.id}><StepView step={step} agentId={props.agentId} persona={persona} /></div>)}{props.streaming && <StreamingRow label={props.streamLabel} />}</div>
      {!following && <button onClick={() => { setFollowing(true); scrollRef.current?.scrollTo({ top: 1e8, behavior: "smooth" }); }} className="sticky bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-overlay px-3 py-1 text-[11px] text-ink-2 shadow-e2"><IconChevronDown size={11} />Latest</button>}
    </div>
    <div className="active-composer-area"><Composer {...props} /></div>
  </div>;
}
export { Button };