import { useState } from "react";
import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useWorkspace } from "../lib/workspace";
import { useApp } from "../lib/app";
import { makeId } from "../lib/storage";
import { IconCheck, IconCopy, IconExternal, IconEye, IconFolder, IconGit, IconGlobe, IconList, IconMonitor, IconMore, IconPlus, IconRefresh, IconSmartphone, IconTablet, IconTrash, IconX } from "./Icons";
import { Button, EmptyState, Input, Menu, MenuItem, MenuSep, Modal, Tip } from "./ui";
import { PageHeader } from "./Titlebar";

export function TasksView({ onOpenSession: _onOpenSession }: { onOpenSession: (id: string) => void }) {
  const { tasks, setTasks, projects } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const add = () => { if (!title.trim()) return; setTasks((all) => [...all, { id: makeId("task"), title: title.trim(), status: "todo", projectId: projectId || undefined, createdAt: new Date().toISOString() }]); setTitle(""); setAdding(false); };
  return <div className="flex flex-1 flex-col overflow-auto"><PageHeader eyebrow="workspace" title="Tasks" sub="Your tasks, not example tickets. Create tasks and organize them under a project." right={<Button icon={IconPlus} onClick={() => setAdding(true)}>New task</Button>} />
    {!tasks.length ? <EmptyState icon={IconList} title="No tasks yet" body="Add your first task or let a connected coding runtime create a real plan." action={<Button size="sm" onClick={() => setAdding(true)}>Add a task</Button>} /> : <div className="divide-y divide-line-soft px-5">{tasks.map((task) => <div className="flex items-center gap-3 py-3" key={task.id}><button aria-label={`Mark ${task.title} ${task.status === "done" ? "incomplete" : "complete"}`} onClick={() => setTasks((all) => all.map((t) => t.id === task.id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))} className={cn("flex size-4 items-center justify-center rounded-[4px] border", task.status === "done" ? "border-mint bg-mint-tint text-mint" : "border-line-strong")}>{task.status === "done" && <IconCheck size={10} />}</button><div className="min-w-0 flex-1"><p className={cn("text-[12.5px] text-ink-2", task.status === "done" && "text-ink-4 line-through")}>{task.title}</p>{task.projectId && <p className="mt-1 text-[10px] text-ink-4">{projects.find((p) => p.id === task.projectId)?.name}</p>}</div><button aria-label="Delete task" onClick={() => setTasks((all) => all.filter((t) => t.id !== task.id))} className="text-ink-4 hover:text-rose"><IconTrash size={12} /></button></div>)}</div>}
    <Modal open={adding} onClose={() => setAdding(false)} title="New task" width={440}><form onSubmit={(e) => { e.preventDefault(); add(); }} className="space-y-3 p-5"><Input autoFocus placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} /><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 w-full rounded-[7px] border border-line bg-base px-2 text-[12px]"><option value="">No project</option>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select><div className="flex justify-end"><Button type="submit" disabled={!title.trim()}>Create task</Button></div></form></Modal>
  </div>;
}

export function GitView({ project, onReview }: { project?: Project; onReview: () => void }) {
  const { requestProject } = useWorkspace();
  const { toast } = useApp();
  const repositories = project?.sources?.filter((s) => s.kind === "git" || s.branch || s.remoteUrl) ?? [];
  const isDemo = project?.id === "demo-sofia-ui";
  return <div className="flex flex-1 flex-col overflow-auto"><PageHeader eyebrow="source control" title="Git" sub={isDemo ? "Reference demo repository with pre-filled branches, checks and pull-request state." : "Repository references are user-supplied. Commits, pull requests and merge status require a Git runtime."} right={<Button size="sm" icon={IconFolder} onClick={() => requestProject()}>Add project</Button>} />
    {isDemo ? <div className="space-y-4 px-5 py-4">
      <div className="rounded-[11px] border border-line-soft bg-raise p-4">
        <div className="flex items-center gap-2"><IconGit size={14} className="text-ink-3" /><span className="text-[13px] font-medium text-ink">samjuniors/SofiaUI</span><span className="rounded-[3px] bg-iris-tint px-1 font-mono text-[8px] font-bold text-iris-soft">DEMO</span></div>
        <div className="mt-3 space-y-1.5">{["arena/01a0ebb-sofiaui", "arena/01a0ebb-polish", "main"].map((b, i) => <div key={b} className="flex items-center gap-2 font-mono text-[11px]"><span className={i === 0 ? "text-mint" : "text-ink-4"}>{i === 0 ? "●" : "○"}</span><span className={i === 0 ? "text-ink" : "text-ink-3"}>{b}</span>{i === 0 && <span className="ml-auto text-[10px] text-ink-4">↑12 · +316,847 −2,083</span>}</div>)}</div>
      </div>
      <div className="rounded-[11px] border border-line-soft bg-raise p-4">
        <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium text-ink">PR #482 · SofiaUI polish</span><Button size="xs" onClick={() => toast("Demo: PR would merge now.", "mint")}>Merge PR</Button></div>
        <p className="mt-1 text-[11px] text-ink-3">arena/01a0ebb-sofiaui → main</p>
        <p className="mt-1.5 font-mono text-[10.5px] text-ink-4"><span className="text-mint">11/12 checks passing</span> · 1 approval needed</p>
        <Button size="xs" variant="ghost" className="mt-2" onClick={onReview}>Open changes</Button>
      </div>
    </div>
    : repositories.length ? <div className="px-5 py-4">{repositories.map((repository) => <div key={repository.id} className="border-b border-line-soft pb-4"><div className="flex items-center gap-2 text-[13px] text-ink-2"><IconGit size={14} />{repository.name}</div><p className="mt-1 font-mono text-[11px] text-ink-4">{repository.remoteUrl ?? repository.path}</p>{repository.branch && <p className="mt-1 text-[11px] text-ink-3">Detected branch: {repository.branch}</p>}<p className="mt-2 text-[11px] text-ink-4">Reference saved. Live synchronization is not connected.</p></div>)}<Button size="xs" className="mt-3" onClick={onReview}>Open changes</Button></div> : <EmptyState icon={IconGit} title="No repository selected" body="Choose a project with a local Git folder or repository URL from the composer." />}
  </div>;
}

/* --------------------------------- browser -------------------------------- */

type BrowserTab = { id: string; input: string; url: string; title: string; loading: boolean; nonce: number };
type ViewportId = "desktop" | "tablet" | "mobile";
const VIEWPORTS: { id: ViewportId; label: string; width: string; icon: typeof IconMonitor }[] = [
  { id: "desktop", label: "Desktop", width: "", icon: IconMonitor },
  { id: "tablet", label: "Tablet", width: "768px", icon: IconTablet },
  { id: "mobile", label: "Mobile", width: "390px", icon: IconSmartphone },
];
const freshTab = (): BrowserTab => ({ id: makeId("tab"), input: "", url: "", title: "New tab", loading: false, nonce: 0 });
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "New tab"; } };

export function BrowserView({ onAskAgent }: { onAskAgent: (text: string) => void }) {
  const { toast } = useApp();
  const [tabs, setTabs] = useState<BrowserTab[]>([freshTab()]);
  const [activeId, setActiveId] = useState<string>("");
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [error, setError] = useState("");
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const patch = (id: string, next: Partial<BrowserTab>) => setTabs((all) => all.map((t) => (t.id === id ? { ...t, ...next } : t)));
  const open = () => {
    try {
      const parsed = new URL(active.input.includes("://") ? active.input : `https://${active.input}`);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
      patch(active.id, { url: parsed.href, input: parsed.href, title: hostOf(parsed.href), loading: true });
      setError("");
    } catch { setError("Enter a valid HTTP or HTTPS URL."); }
  };
  const newTab = (url = "") => {
    const tab: BrowserTab = { ...freshTab(), input: url, url, title: url ? hostOf(url) : "New tab", loading: Boolean(url) };
    setTabs((all) => [...all, tab]);
    setActiveId(tab.id);
    setError("");
  };
  const closeTab = (id: string) => {
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const rest = tabs.filter((t) => t.id !== id);
    if (rest.length === 0) { const fresh = freshTab(); setTabs([fresh]); setActiveId(fresh.id); return; }
    setTabs(rest);
    if (id === active.id) setActiveId(rest[Math.min(Math.max(0, index - 1), rest.length - 1)].id);
  };
  const duplicateTab = (id = active.id) => {
    const source = tabs.find((t) => t.id === id);
    if (!source) return;
    const copy: BrowserTab = { ...source, id: makeId("tab") };
    const at = tabs.findIndex((t) => t.id === id);
    setTabs((all) => [...all.slice(0, at + 1), copy, ...all.slice(at + 1)]);
    setActiveId(copy.id);
    toast("Tab duplicated", "mint");
  };
  const reload = () => patch(active.id, { loading: true, nonce: active.nonce + 1 });

  return <div className="flex min-h-0 flex-1 flex-col">
    {/* tab strip — ONE “+” creates a new tab; everything else
        (duplicate · reload · close) hides behind a quiet actions ghost */}
    <div className="browser-tabstrip" role="tablist" aria-label="Browser tabs">
      {tabs.map((t) => (
        <div key={t.id} role="tab" aria-selected={t.id === active.id} className={cn("browser-tab", t.id === active.id && "is-active")}>
          <button type="button" className="browser-tab-main" onClick={() => { setActiveId(t.id); setError(""); }} title={t.url || "New tab"}>
            <span className="browser-tab-globe" aria-hidden>
              {t.loading ? <span className="browser-tab-spinner" /> : <IconGlobe size={11} />}
            </span>
            <span className="browser-tab-title">{t.title}</span>
          </button>
          <button type="button" className="browser-tab-close" onClick={() => closeTab(t.id)} aria-label={`Close ${t.title}`}><IconX size={10} /></button>
        </div>
      ))}
      <Tip label="New tab">
        <button type="button" className="browser-tab-new" onClick={() => newTab()} aria-label="New browser tab"><IconPlus size={12} /></button>
      </Tip>
      <span className="min-w-0 flex-1" />
      <Menu align="right" width={196} trigger={() => <button type="button" className="browser-tab-actions" aria-label="Tab actions" title="Tab actions"><IconMore size={11} /></button>}>
        {(close) => <>
          <MenuItem icon={<IconCopy size={12} />} label="Duplicate current tab" onClick={() => { close(); duplicateTab(); }} />
          <MenuItem icon={<IconRefresh size={12} />} label="Reload page" disabled={!active.url} onClick={() => { close(); reload(); }} />
          <MenuSep />
          <MenuItem icon={<IconX size={12} />} label="Close other tabs" disabled={tabs.length < 2} onClick={() => { close(); setTabs([active]); }} />
          <MenuItem icon={<IconTrash size={12} />} label="Close all tabs" danger onClick={() => { close(); const fresh = freshTab(); setTabs([fresh]); setActiveId(fresh.id); }} />
        </>}
      </Menu>
    </div>
    {/* url bar + viewport switcher */}
    <div className="browser-toolbar">
      <Input placeholder="Enter a preview URL" value={active.input} onChange={(e) => patch(active.id, { input: e.target.value })} onKeyDown={(e) => e.key === "Enter" && open()} className="min-w-[140px] flex-1 font-mono text-[11px]" aria-label="Preview URL" />
      <Button size="sm" disabled={!active.input.trim()} onClick={open}>Open</Button>
      {active.url && <Tip label="Reload"><button type="button" className="browser-tool-btn" onClick={reload} aria-label="Reload page"><IconRefresh size={13} /></button></Tip>}
      <div className="browser-viewport-group" role="group" aria-label="Viewport size">
        {VIEWPORTS.map((v) => <Tip key={v.id} label={v.label}><button type="button" className={cn("browser-viewport-btn", viewport === v.id && "is-active")} onClick={() => setViewport(v.id)} aria-label={`${v.label} viewport`} aria-pressed={viewport === v.id}><v.icon size={13} /></button></Tip>)}
      </div>
      {active.url && <Tip label="Open externally"><button type="button" className="browser-tool-btn" onClick={() => window.open(active.url, "_blank", "noopener,noreferrer")} aria-label="Open in external browser"><IconExternal size={13} /></button></Tip>}
    </div>
    {error && <p className="px-4 py-2 text-[11px] text-rose" role="alert">{error}</p>}
    {active.url ? <>
      <p className="browser-note">Some sites block embedded previews. If the pane stays blank, open it externally — browser automation is not connected.</p>
      <div className={cn("browser-stage", viewport !== "desktop" && "has-device")}>
        <div className={cn("browser-frame", viewport !== "desktop" && "is-device")} style={viewport !== "desktop" ? { width: VIEWPORTS.find((v) => v.id === viewport)!.width, maxWidth: "100%" } : undefined}>
          {active.loading && <div className="browser-loading" aria-hidden><span /></div>}
          <iframe key={`${active.id}-${active.nonce}`} title={`${active.title} preview`} src={active.url} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" className="browser-iframe" onLoad={() => patch(active.id, { loading: false })} />
        </div>
      </div>
      <div className="browser-footer"><Button size="xs" onClick={() => onAskAgent(`Help me understand this page: ${active.url}. I will provide any content you need.`)}>Discuss this URL</Button></div>
    </> : <EmptyState icon={IconEye} title="No page open" body="Enter a URL to open a real preview. Open several pages in tabs, duplicate them, or switch between desktop, tablet and mobile widths." />}
  </div>;
}