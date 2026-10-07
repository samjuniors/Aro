import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { Session } from "../data/catalog";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { useWorkspace } from "../lib/workspace";
import { readStored, writeStored } from "../lib/storage";
import { IconArchive, IconBrain, IconCheck, IconChevronDown, IconClock, IconCopy, IconFolder, IconList, IconMore, IconPanelLeft, IconPencil, IconPin, IconPlug, IconPlus, IconPulse, IconSearch, IconSettings, IconSpark, IconTrash, LogoMark } from "./Icons";
import { Button, IconButton, Input, Kbd, Menu, MenuItem, MenuLabel, MenuSep, Modal, Tip } from "./ui";

export type ViewId = "workbench" | "tasks" | "skills" | "connectors" | "projects" | "automations" | "memory" | "artifacts" | "runs" | "agents" | "bridges" | "git" | "browser" | "review" | "design" | "settings";
export const NAV_CODE = [
  { id: "workbench" as ViewId, label: "Sessions", icon: IconPulse, key: "1" },
  { id: "tasks" as ViewId, label: "Tasks", icon: IconList, key: "2" },
  { id: "skills" as ViewId, label: "Skills", icon: IconSpark, key: "3" },
  { id: "connectors" as ViewId, label: "Connectors", icon: IconPlug, key: "4" },
  { id: "projects" as ViewId, label: "Projects", icon: IconFolder, key: "5" },
  { id: "automations" as ViewId, label: "Automations", icon: IconClock, key: "6" },
  { id: "memory" as ViewId, label: "Memory", icon: IconBrain, key: "7" },
  { id: "artifacts" as ViewId, label: "Artifacts", icon: IconPin, key: "8" },
];
export const NAV_AGENT = NAV_CODE;
export type SidebarProps = {
  view: ViewId; setView: (view: ViewId) => void; sessions: Session[]; activeId: string; onSelect: (id: string) => void;
  onNew: (projectId?: string) => void; projects: Project[]; onUpdateProject: (project: Project) => void; onCreateProject: (name: string) => string; onRequestProject: () => void;
  onArchive: (id: string, archived: boolean) => void; onDelete: (id: string) => void; onMoveProject: (id: string, projectId: string) => void;
  onDuplicate: (id: string) => void; onTogglePin: (id: string) => void; onRename: (id: string, title: string) => void; onCollapse: () => void;
};

export function Sidebar(props: SidebarProps) {
  const { product, todos, setTodoOpen } = useApp();
  const { demoEnabled, setDemoEnabled, isDemoProject } = useWorkspace();
  const [search, setSearch] = useState("");
  const [folds, setFolds] = useState<Record<string, boolean>>(() => readStored("conductor.sidebar.v3.folds", {}));
  const [archive, setArchive] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Session | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const visible = props.sessions.filter((s) => Boolean(s.archived) === archive && s.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = visible.filter((s) => s.favorite || s.pinned);
  const unassigned = visible.filter((s) => !s.projectId && !pinned.includes(s));
  const ordered = useMemo(() => [...pinned, ...props.projects.flatMap((p) => folds[p.id] ? [] : visible.filter((s) => s.projectId === p.id && !pinned.includes(s))), ...unassigned], [props.projects, folds, visible, pinned, unassigned]);
  useEffect(() => writeStored("conductor.sidebar.v3.folds", folds), [folds]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-session="${cursor}"]`)?.scrollIntoView({ block: "nearest" }); }, [cursor]);
  const handleKeyboard = (event: React.KeyboardEvent) => {
    if ((event.target as HTMLElement).closest("input,textarea,[role=menu]")) return;
    const current = Math.max(0, ordered.findIndex((s) => s.id === (cursor ?? props.activeId)));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setCursor(ordered[Math.max(0, Math.min(ordered.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)))]?.id ?? null); }
    else if (event.key === "Enter" && cursor) { event.preventDefault(); props.onSelect(cursor); }
    else if ((event.key === "Backspace" || event.key === "Delete") && cursor) { event.preventDefault(); props.onArchive(cursor, !archive); }
  };
  const renderSession = (session: Session) => <div key={session.id} data-session={session.id} draggable onDragStart={(e) => { setDragId(session.id); e.dataTransfer.setData("text/plain", session.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDragId(null); setDropId(null); }} className={cn("session-list-row group", props.activeId === session.id && props.view === "workbench" && "selected", cursor === session.id && "keyboard-selected", dragId === session.id && "opacity-40")}>
    <button onClick={() => { props.onSelect(session.id); setCursor(session.id); }} className="min-w-0 flex-1 truncate text-left text-[12px]" title={session.title}>{session.title}</button>
    {session.status === "running" && <i className="size-[5px] shrink-0 animate-breathe rounded-full bg-cyan" />}
    {session.status === "failed" && <i className="size-[5px] shrink-0 rounded-full bg-rose" />}
    {(session.favorite || session.pinned) && <IconPin size={9} className="shrink-0 text-ink-3" />}
    <Menu align="right" width={215} trigger={() => <button className="session-row-more" aria-label={`Actions for ${session.title}`}><IconMore size={12} /></button>}>
      {(close) => <>
        <MenuItem icon={<IconPencil size={12} />} label="Rename" onClick={() => { setRenaming(session); setName(session.title); close(); }} />
        <MenuItem icon={<IconPin size={12} />} label={session.favorite || session.pinned ? "Unpin" : "Pin"} onClick={() => { props.onTogglePin(session.id); close(); }} />
        <MenuItem icon={<IconCopy size={12} />} label="Duplicate" onClick={() => { props.onDuplicate(session.id); close(); }} />
        {props.projects.length > 0 && <><MenuSep /><MenuLabel>Move to project</MenuLabel>{props.projects.map((p) => <MenuItem key={p.id} icon={<IconFolder size={12} />} label={p.name} active={session.projectId === p.id} onClick={() => { props.onMoveProject(session.id, p.id); close(); }} />)}</>}
        <MenuSep /><MenuItem icon={<IconArchive size={12} />} label={archive ? "Restore session" : "Archive session"} onClick={() => { props.onArchive(session.id, !archive); close(); }} />
        <MenuItem danger icon={<IconTrash size={12} />} label="Delete session" onClick={() => { setDeleting(session); close(); }} />
      </>}
    </Menu>
  </div>;

  return <aside className="app-sidebar codex-sidebar">
    <div className="sidebar-brand"><LogoMark size={21} /><span className="font-display text-[14px] font-semibold tracking-[-.025em]">Aro</span><IconButton icon={IconPanelLeft} label="Collapse sidebar" className="ml-auto" size={25} onClick={props.onCollapse} /></div>
    <div className="sidebar-primary-actions"><button className="new-session-action" onClick={() => props.onNew()}><IconPlus size={15} />New session<span className="ml-auto text-[9px] text-ink-4">⌘N</span></button><div className="relative mt-1.5"><IconSearch size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-4" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions" className="sidebar-search" /></div></div>
    <nav className="sidebar-main-nav" aria-label="Workspace navigation">{NAV_CODE.filter((item) => item.id !== "workbench").map((item) => <button key={item.id} onClick={() => props.setView(item.id)} className={cn("sidebar-navigation-row", props.view === item.id && "active")} aria-current={props.view === item.id ? "page" : undefined}><item.icon size={14} />{item.label}</button>)}</nav>
    <div className="sidebar-projects-heading"><span>{archive ? "Archive" : "Projects"}</span>
      <button onClick={() => setDemoEnabled(!demoEnabled)} aria-pressed={demoEnabled} title={demoEnabled ? "Hide the reference demo to see a blank workspace" : "Show the reference demo project"}
        className={cn("demo-toggle", demoEnabled && "on")}><span className="demo-toggle-dot" />{demoEnabled ? "Demo on" : "Demo"}</button>
      <Tip label="Create project"><button onClick={props.onRequestProject} aria-label="Create project" className="ml-auto text-ink-4 hover:text-ink"><IconPlus size={13} /></button></Tip><Menu align="right" width={175} trigger={() => <button aria-label="Session list options" className="text-ink-4 hover:text-ink"><IconMore size={13} /></button>}>{(close) => <MenuItem icon={<IconArchive size={12} />} label={archive ? "Active sessions" : "Archived sessions"} onClick={() => { setArchive((value) => !value); close(); }} />}</Menu></div>
    <div ref={list} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2.5 pb-3" onKeyDown={handleKeyboard}>
      {pinned.length > 0 && <div className="mb-2"><p className="sidebar-section-label">Pinned</p>{pinned.map(renderSession)}</div>}
      {props.projects.map((project) => {
        const all = visible.filter((s) => s.projectId === project.id);
        const items = all.filter((s) => !pinned.includes(s));
        const attention = all.filter((s) => s.status === "waiting" || s.status === "failed").length;
        return <section key={project.id} onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setDropId(project.id); }} onDragLeave={() => setDropId(null)} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) props.onMoveProject(id, project.id); setDropId(null); setDragId(null); }} className={cn("sidebar-project-group", dropId === project.id && "drop-target")}>
          <div className="group flex items-center gap-1 py-1.5"><button onClick={() => setFolds((allFolds) => ({ ...allFolds, [project.id]: !allFolds[project.id] }))} className="flex min-w-0 flex-1 items-center gap-1.5 text-left"><IconChevronDown size={11} className={cn("shrink-0 text-ink-4 transition-transform", folds[project.id] && "-rotate-90")} /><IconFolder size={12} className="shrink-0 text-ink-3" /><span className="truncate text-[12px] font-medium text-ink-2">{project.name}</span>{isDemoProject(project.id) && <span className="rounded-[3px] bg-iris-tint px-1 py-px font-mono text-[8px] font-semibold tracking-wide text-iris-soft">DEMO</span>}{attention > 0 && <span className="rounded-full bg-amber-tint px-1.5 font-mono text-[9px] text-amber">{attention}</span>}</button><button onClick={() => props.onNew(project.id)} className="flex size-[22px] items-center justify-center rounded text-ink-4 opacity-0 hover:bg-hover hover:text-ink group-hover:opacity-100 group-focus-within:opacity-100" aria-label={`New session in ${project.name}`}><IconPlus size={12} /></button></div>
          {!folds[project.id] && <div className="pl-4">{items.map(renderSession)}{!items.length && <button onClick={() => props.onNew(project.id)} className="w-full py-1.5 pl-2 text-left text-[10.5px] text-ink-4 hover:text-ink-2">Start a session</button>}</div>}
        </section>;
      })}
      {!props.projects.length && !search && <div className="px-2 py-3"><p className="text-[11px] leading-relaxed text-ink-4">Projects keep your sources and sessions together.</p><button onClick={props.onRequestProject} className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink"><IconPlus size={11} />Create project</button></div>}
      {unassigned.length > 0 && <div className="mt-2"><p className="sidebar-section-label">Unassigned sessions</p>{unassigned.map(renderSession)}</div>}
      {search && !visible.length && <p className="py-5 text-center text-[11px] text-ink-4">No matching sessions.</p>}
    </div>
    <div className="sidebar-footer"><button onClick={() => setTodoOpen(true)} className="sidebar-navigation-row"><IconCheck size={14} />Todo{todos.length > 0 && <span className="ml-auto text-[10px] text-ink-4">{todos.filter((t) => t.state !== "done").length}</span>}</button><button onClick={() => props.setView("settings")} className={cn("sidebar-navigation-row", props.view === "settings" && "active")}><IconSettings size={14} />Settings<Kbd className="ml-auto">⌘,</Kbd></button><p className="mt-2.5 px-2 text-[9px] text-ink-4">{product === "code" ? "Code workspace" : "Agent workspace"} · saved on this device</p></div>
    <Modal open={Boolean(renaming)} onClose={() => setRenaming(null)} title="Rename session" width={400}><form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (renaming && name.trim()) props.onRename(renaming.id, name.trim()); setRenaming(null); }}><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /><div className="flex justify-end"><Button type="submit" disabled={!name.trim()}>Save</Button></div></form></Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete session?" sub="This permanently removes this conversation from this device." width={420}><div className="p-5"><p className="text-[12px] text-ink-2">{deleting?.title}</p><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (deleting) props.onDelete(deleting.id); setDeleting(null); }}>Delete</Button></div></div></Modal>
  </aside>;
}