import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { Session } from "../data/catalog";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { useWorkspace, PROJECT_COLORS } from "../lib/workspace";
import { readStored, writeStored } from "../lib/storage";
import { IconArchive, IconCheck, IconChevronDown, IconCopy, IconFolder, IconMore, IconPanelLeft, IconPencil, IconPin, IconPlug, IconPlus, IconPulse, IconSearch, IconSettings, IconSpark, IconTrash, IconUndo, LogoMark } from "./Icons";
import { Button, IconButton, Input, Kbd, Menu, MenuItem, MenuLabel, MenuSep, Modal, Tip } from "./ui";
import { ProfileControl } from "./Titlebar";

export type ViewId = "workbench" | "tasks" | "skills" | "connectors" | "projects" | "automations" | "memory" | "artifacts" | "runs" | "agents" | "bridges" | "git" | "browser" | "review" | "design" | "settings";
/* Navigation keeps only the surfaces that DON'T already live in the workspace
   panel's tool tabs (tasks, memory, artifacts, automations open there) —
   no duplicated destinations, one calm list. */
export const NAV_CODE = [
  { id: "workbench" as ViewId, label: "Sessions", icon: IconPulse, key: "1" },
  { id: "projects" as ViewId, label: "Projects", icon: IconFolder, key: "2" },
  { id: "skills" as ViewId, label: "Skills", icon: IconSpark, key: "3" },
  { id: "connectors" as ViewId, label: "Connectors", icon: IconPlug, key: "4" },
];
export const NAV_AGENT = NAV_CODE;
export type SidebarProps = {
  view: ViewId; setView: (view: ViewId) => void; sessions: Session[]; activeId: string; onSelect: (id: string) => void;
  onNew: (projectId?: string) => void; projects: Project[]; onUpdateProject: (project: Project) => void; onCreateProject: (name: string) => string; onRequestProject: () => void;
  onArchive: (id: string, archived: boolean) => void; onDelete: (id: string) => void; onMoveProject: (id: string, projectId: string) => void;
  onDuplicate: (id: string) => void; onTogglePin: (id: string) => void; onRename: (id: string, title: string) => void; onCollapse: () => void;
  onDeleteProject: (id: string) => void; onDuplicateProject: (id: string) => void;
};

export function Sidebar(props: SidebarProps) {
  const { product, toast } = useApp();
  const workspace = useWorkspace();
  const { demoEnabled, setDemoEnabled, userProjects } = workspace;
  const [search, setSearch] = useState("");
  const [folds, setFolds] = useState<Record<string, boolean>>(() => readStored("conductor.sidebar.v3.folds", {}));
  const [archive, setArchive] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Session | null>(null);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const visible = props.sessions.filter((s) => Boolean(s.archived) === archive && s.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = visible.filter((s) => s.favorite || s.pinned);
  const unassigned = visible.filter((s) => !s.projectId && !pinned.includes(s));
  /* pinned projects float to the top of the list; archived ones only render in the archive view */
  const sortedProjects = useMemo(() => [...props.projects].sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false)), [props.projects]);
  const archivedProjects = useMemo(() => [...(workspace.demoProject.archived ? [workspace.demoProject] : []), ...userProjects.filter((p) => p.archived)], [workspace.demoProject, userProjects]);
  const ordered = useMemo(() => [...pinned, ...sortedProjects.flatMap((p) => folds[p.id] ? [] : visible.filter((s) => s.projectId === p.id && !pinned.includes(s))), ...unassigned], [sortedProjects, folds, visible, pinned, unassigned]);
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
    <button onClick={() => { props.onSelect(session.id); setCursor(session.id); }} className="min-w-0 flex-1 truncate text-left text-[13px]" title={session.title}>{session.title}</button>
    {session.status === "running" && <i className="size-[5px] shrink-0 animate-breathe rounded-full bg-cyan" />}
    {session.status === "failed" && <i className="size-[5px] shrink-0 rounded-full bg-rose" />}
    {(session.favorite || session.pinned) && <IconPin size={9} className="shrink-0 text-ink-3" />}
    <Menu align="right" width={215} trigger={() => <button className="session-row-more" aria-label={`Actions for ${session.title}`}><IconMore size={13} /></button>}>
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

  return <aside className="app-sidebar codex-sidebar overflow-x-hidden">
    <div className="sidebar-brand"><LogoMark size={22} /><span className="rail-label font-display text-[15px] font-semibold tracking-[-.025em]">Aro</span><IconButton icon={IconPanelLeft} label="Collapse sidebar" className="ml-auto" size={25} onClick={props.onCollapse} /></div>
    <div className="sidebar-primary-actions"><button className="new-session-action" onClick={() => props.onNew()}><IconPlus size={16} /><span className="rail-label">New session</span><span className="rail-kbd ml-auto text-[9px] text-ink-4">⌘N</span></button><div className="sidebar-search-wrap relative mt-1.5"><IconSearch size={13} className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-ink-4" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions" className="sidebar-search" /></div></div>
    <nav className="sidebar-main-nav" aria-label="Workspace navigation">{NAV_CODE.filter((item) => item.id !== "workbench").map((item) => <button key={item.id} onClick={() => props.setView(item.id)} className={cn("sidebar-navigation-row", props.view === item.id && "active")} aria-current={props.view === item.id ? "page" : undefined}><item.icon size={16} /><span className="rail-label">{item.label}</span></button>)}</nav>
    <div className="sidebar-projects-heading"><span className="rail-label">{archive ? "Archive" : "Projects"}</span>
      <button onClick={() => setDemoEnabled(!demoEnabled)} aria-pressed={demoEnabled} title={demoEnabled ? "Hide the reference demo to see a blank workspace" : "Show the reference demo project"}
        className={cn("demo-toggle", demoEnabled && "on")}><span className="demo-toggle-dot" /><span className="rail-hide">{demoEnabled ? "Demo on" : "Demo"}</span></button>
      <Tip label="Create project"><button onClick={props.onRequestProject} aria-label="Create project" className="ml-auto text-ink-4 hover:text-ink"><IconPlus size={14} /></button></Tip><Menu align="right" width={175} trigger={() => <button aria-label="Session list options" className="text-ink-4 hover:text-ink"><IconMore size={14} /></button>}>{(close) => <MenuItem icon={<IconArchive size={12} />} label={archive ? "Active sessions" : "Archived sessions"} onClick={() => { setArchive((value) => !value); close(); }} />}</Menu></div>
    <div ref={list} className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3" onKeyDown={handleKeyboard}>
      {archive ? (
        /* ---------- archive view: archived projects + archived sessions ---------- */
        <>
          {archivedProjects.length > 0 && <div className="mb-2"><p className="sidebar-section-label">Archived projects</p>
            {archivedProjects.map((project) => {
              const count = props.sessions.filter((s) => s.projectId === project.id).length;
              return <div key={project.id} className="session-list-row group">
                <span className="flex min-w-0 flex-1 items-center gap-1.5"><IconFolder size={13} className="shrink-0 text-ink-4" /><span className="truncate text-[13px] text-ink-3">{project.name}</span>{count > 0 && <span className="font-mono text-[10px] text-ink-4">{count}</span>}</span>
                <button onClick={() => { workspace.archiveProject(project.id, false); toast("Project restored", "mint"); }} className="session-row-action" title="Restore project" aria-label={`Restore ${project.name}`}><IconUndo size={12} /></button>
                <button onClick={() => setDeletingProject(project)} className="session-row-action hover:text-rose" title="Delete project" aria-label={`Delete ${project.name}`}><IconTrash size={12} /></button>
              </div>;
            })}
          </div>}
          {visible.length > 0 && <div><p className="sidebar-section-label">Archived sessions</p>{visible.map(renderSession)}</div>}
          {!archivedProjects.length && !visible.length && <p className="py-5 text-center text-[11px] text-ink-4">Nothing archived yet.</p>}
        </>
      ) : (
        <>
      {pinned.length > 0 && <div className="mb-2"><p className="sidebar-section-label">Pinned</p>{pinned.map(renderSession)}</div>}
      {sortedProjects.map((project) => {
        const all = visible.filter((s) => s.projectId === project.id);
        const items = all.filter((s) => !pinned.includes(s));
        const attention = all.filter((s) => s.status === "waiting" || s.status === "failed").length;
        const isDemo = workspace.isDemoProject(project.id);
        return <section key={project.id} onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setDropId(project.id); }} onDragLeave={() => setDropId(null)} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) props.onMoveProject(id, project.id); setDropId(null); setDragId(null); }} className={cn("sidebar-project-group overflow-x-hidden", dropId === project.id && "drop-target", project.pinned && "is-pinned")}>
          <div
            className="group flex items-center gap-1 py-1.5 cursor-grab active:cursor-grabbing select-none"
            draggable
            title={`Drag ${project.name} to composer to attach`}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/aro-project", project.id);
              e.dataTransfer.setData("text/plain", project.name);
              e.dataTransfer.effectAllowed = "copyMove";
            }}
          >
            <button onClick={() => setFolds((allFolds) => ({ ...allFolds, [project.id]: !allFolds[project.id] }))} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[5px] px-0.5 py-0.5 text-left transition-colors hover:bg-hover/60 focus-visible:ring-focus" aria-label={`${folds[project.id] ? "Expand" : "Collapse"} ${project.name}`}>
              <IconChevronDown size={12} className={cn("shrink-0 text-ink-4 transition-transform duration-200", folds[project.id] && "-rotate-90")} />
              <IconFolder
                size={14}
                className="shrink-0 transition-transform duration-150 group-hover:scale-105"
                style={{
                  color: project.color || "#818cf8",
                  fill: `${project.color || "#818cf8"}25`,
                }}
              />
              <span className="rail-label truncate text-[13px] font-medium text-ink-2">{project.name}</span>
              {isDemo && <span className="rail-hide rounded-[3px] bg-iris-tint px-1 py-px font-mono text-[8px] font-semibold tracking-wide text-iris-soft">DEMO</span>}
              {attention > 0 && <span className="rounded-full bg-amber-tint px-1.5 font-mono text-[9px] text-amber">{attention}</span>}
              <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-4 opacity-0 transition-opacity group-hover:opacity-100">{all.length || ""}</span>
            </button>
            <Tip label={project.pinned ? "Unpin project" : "Pin project"}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  workspace.toggleProjectPin(project.id);
                  toast(project.pinned ? "Project unpinned" : "Project pinned — stays on top", "mint");
                }}
                className={cn(
                  "flex size-[22px] items-center justify-center rounded transition-all",
                  project.pinned
                    ? "text-iris-soft hover:bg-hover hover:text-ink"
                    : "text-ink-4 opacity-0 group-hover:opacity-100 hover:text-ink hover:bg-hover"
                )}
                aria-label={project.pinned ? "Unpin project" : "Pin project"}
              >
                <IconPin size={13} className={project.pinned ? "fill-current" : ""} />
              </button>
            </Tip>
            <Tip label={`New session in ${project.name}`}><button onClick={() => props.onNew(project.id)} className="flex size-[22px] items-center justify-center rounded text-ink-4 opacity-0 transition-all hover:bg-hover hover:text-ink focus-visible:ring-focus group-hover:opacity-100 group-focus-within:opacity-100" aria-label={`New session in ${project.name}`}><IconPlus size={13} /></button></Tip>
            <Menu align="right" width={220} trigger={() => <button className="session-row-more" aria-label={`Actions for ${project.name}`} title="Project actions"><IconMore size={13} /></button>}>
              {(close) => <>
                <MenuItem icon={<IconPin size={12} />} label={project.pinned ? "Unpin project" : "Pin project"} onClick={() => { workspace.toggleProjectPin(project.id); close(); toast(project.pinned ? "Project unpinned" : "Project pinned — it stays on top", "mint"); }} />
                <MenuItem icon={<IconPencil size={12} />} label="Rename project" onClick={() => { setRenamingProject(project); setProjectName(project.name); close(); }} />
                <MenuItem icon={<IconCopy size={12} />} label="Duplicate project" onClick={() => { props.onDuplicateProject(project.id); close(); }} />
                <MenuItem icon={<IconPlus size={12} />} label="New session here" onClick={() => { props.onNew(project.id); close(); }} />
                <MenuSep />
                <MenuLabel>Project Color</MenuLabel>
                <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => {
                        workspace.setProjectColor(project.id, c.value);
                        toast(`Project color set to ${c.label}`, "mint");
                        close();
                      }}
                      className={cn(
                        "relative flex size-[18px] cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-115",
                        (project.color || "#818cf8") === c.value && "ring-2 ring-ink ring-offset-1 scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                    >
                      {(project.color || "#818cf8") === c.value && <IconCheck size={9} className="text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>
                <MenuSep />
                <MenuItem icon={<IconArchive size={12} />} label="Archive project" onClick={() => { workspace.archiveProject(project.id, true); close(); toast("Project archived — restore it from the archive view", "mint"); }} />
                <MenuItem danger icon={<IconTrash size={12} />} label="Delete project" onClick={() => { setDeletingProject(project); close(); }} />
              </>}
            </Menu>
          </div>
          {!folds[project.id] && <div className="pl-4">{items.map(renderSession)}{!items.length && <button onClick={() => props.onNew(project.id)} className="w-full py-1.5 pl-2 text-left text-[11px] text-ink-4 transition-colors hover:text-ink-2">Start a session</button>}</div>}
        </section>;
      })}
      {!props.projects.length && !search && <div className="px-2 py-3"><p className="text-[11.5px] leading-relaxed text-ink-4">Projects keep your sources and sessions together.</p><button onClick={props.onRequestProject} className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-ink-3 hover:text-ink"><IconPlus size={12} />Create project</button></div>}
      {unassigned.length > 0 && <div className="mt-2"><p className="sidebar-section-label">Unassigned sessions</p>{unassigned.map(renderSession)}</div>}
      {search && !visible.length && <p className="py-5 text-center text-[11px] text-ink-4">No matching sessions.</p>}
        </>
      )}
    </div>
    <div className="sidebar-footer">
      <div className="mb-2 px-1">
        <ProfileControl onOpenSettings={() => props.setView("settings")} inSidebar />
      </div>
      <button onClick={() => props.setView("settings")} className={cn("sidebar-navigation-row", props.view === "settings" && "active")}><IconSettings size={16} /><span className="rail-label">Settings</span><Kbd className="rail-kbd ml-auto">⌘,</Kbd></button>
      <p className="rail-hide mt-2.5 px-2 text-[9.5px] text-ink-4">{product === "code" ? "Code workspace" : "Agent workspace"} · saved on this device</p>
    </div>
    <Modal open={Boolean(renaming)} onClose={() => setRenaming(null)} title="Rename session" width={400}><form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (renaming && name.trim()) props.onRename(renaming.id, name.trim()); setRenaming(null); }}><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /><div className="flex justify-end"><Button type="submit" disabled={!name.trim()}>Save</Button></div></form></Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete session?" sub="This permanently removes this conversation from this device." width={420}><div className="p-5"><p className="text-[12px] text-ink-2">{deleting?.title}</p><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (deleting) props.onDelete(deleting.id); setDeleting(null); }}>Delete</Button></div></div></Modal>
    <Modal open={Boolean(renamingProject)} onClose={() => setRenamingProject(null)} title="Rename project" width={400}><form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (renamingProject && projectName.trim()) { workspace.renameProject(renamingProject.id, projectName.trim()); toast("Project renamed", "mint"); } setRenamingProject(null); }}><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} autoFocus maxLength={60} /><div className="flex justify-end"><Button type="submit" disabled={!projectName.trim() || projectName.trim() === renamingProject?.name}>Save</Button></div></form></Modal>
    <Modal open={Boolean(deletingProject)} onClose={() => setDeletingProject(null)} title="Delete project?" sub="This removes the project, its sources and every session filed under it from this device." width={440}><div className="p-5">
      <p className="text-[12px] text-ink-2"><span className="font-medium">{deletingProject?.name}</span>{deletingProject && props.sessions.filter((s) => s.projectId === deletingProject.id).length > 0 && <span className="text-ink-4"> · {props.sessions.filter((s) => s.projectId === deletingProject.id).length} session{props.sessions.filter((s) => s.projectId === deletingProject.id).length === 1 ? "" : "s"} will be deleted</span>}</p>
      {deletingProject && workspace.isDemoProject(deletingProject.id) && <p className="mt-2 text-[11px] leading-relaxed text-ink-3">This is the reference demo — deleting it hides the pre-filled project. The <span className="font-medium">Demo</span> toggle in the sidebar brings it back anytime.</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeletingProject(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (deletingProject) props.onDeleteProject(deletingProject.id); setDeletingProject(null); }}>Delete project</Button></div>
    </div></Modal>
  </aside>;
}