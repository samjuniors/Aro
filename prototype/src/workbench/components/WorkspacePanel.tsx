"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { makeId, readStored, writeStored } from "../lib/storage";
import { DEMO_FILES, flattenFiles, type FileNode } from "../data/files";
import { IconBrain, IconCheck, IconChevron, IconChevronDown, IconChevronRight, IconClock, IconFolder, IconGit, IconGlobe, IconGrid, IconList, IconMaximize, IconMinimize, IconPanelClose, IconPin, IconPlay, IconPlus, IconPuzzle, IconSearch, IconSliders, IconStop, IconTerminal, IconTrash, IconX } from "./Icons";
import { Menu, MenuLabel, MenuSep, Tip } from "./ui";
import { usePrototypeConfig } from "../config/prototypeConfig";
import { BrowserView } from "./views2";
import { FleetView, ReviewView } from "./views";
import { TasksView } from "./views2";
import { AutomationsView } from "./views4";
import { ArtifactsView } from "./views5";
import { MemoryView } from "./MemoryView";

/* =====================================================================
   WORKSPACE PANEL — Codex-style docked workspace with real tabs.
   Every tool (browse / changes / artifacts / terminal / memory / files /
   search / tasks / runs / automations) opens as its own tab; tabs can be
   added with "+", closed individually, and the whole panel snaps away only
   when the divider is dragged well toward the screen edge. The focused tab
   fills the strip (a lone tab reads as the panel's single header); when
   many tabs overflow, titles ellipsize and the strip scrolls with soft
   edge fades. Any tab can go full-screen from the strip's corner (Esc
   restores). The layout (width, tabs, active tab) persists across
   reloads; a fresh user starts with just the chat, the single corner
   icon, and a "connect more tools" path in the picker.
   ===================================================================== */

export type WorkspaceTool = "browse" | "changes" | "artifacts" | "terminal" | "memory" | "files" | "search" | "tasks" | "runs" | "automations";
type ToolGroup = "Workspace" | "Project" | "Autonomy";
export const WORKSPACE_TOOLS: { id: WorkspaceTool; label: string; icon: ComponentType<{ size?: number; className?: string }>; desc: string; group: ToolGroup }[] = [
  { id: "browse", label: "Browse", icon: IconGlobe, desc: "Live page previews at any device width", group: "Workspace" },
  { id: "changes", label: "Changes", icon: IconGit, desc: "Review the working diff before committing", group: "Workspace" },
  { id: "terminal", label: "Terminal", icon: IconTerminal, desc: "Shell output streamed next to chat", group: "Workspace" },
  { id: "artifacts", label: "Artifacts", icon: IconPin, desc: "Pinned outputs from agent sessions", group: "Workspace" },
  { id: "memory", label: "Memory", icon: IconBrain, desc: "Everything the agent remembers", group: "Workspace" },
  { id: "files", label: "Files", icon: IconFolder, desc: "The attached project's file tree", group: "Project" },
  { id: "search", label: "Search", icon: IconSearch, desc: "Ripgrep-style search across the project", group: "Project" },
  { id: "tasks", label: "Tasks", icon: IconList, desc: "The workspace task queue", group: "Autonomy" },
  { id: "runs", label: "Runs", icon: IconGrid, desc: "Parallel agent runs across projects", group: "Autonomy" },
  { id: "automations", label: "Automations", icon: IconClock, desc: "Cron jobs and scheduled workflows", group: "Autonomy" },
];
export const toolMeta = (tool: WorkspaceTool) => WORKSPACE_TOOLS.find((t) => t.id === tool)!;

export type PanelTab = { id: string; tool: WorkspaceTool };
type PersistedPanel = { tabs: PanelTab[]; activeId: string | null; size: number };
const PANEL_KEY = "conductor.workspace.panel.v1";
const DEFAULT_SIZE = 540;
const MIN_SIZE = 224;
/* the panel only releases when the divider is dragged well toward the
   screen edge — small-but-open stays open (both chat and workspace visible) */
const SNAP_CLOSE_AT = 240;

export function WorkspacePanel({ open, onOpenChange, project, onAskAgent, onOpenSession, onConnectTools }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onAskAgent: (text: string) => void;
  onOpenSession?: (id: string) => void;
  onConnectTools?: () => void;
}) {
  const { toast } = useApp();
  const { config } = usePrototypeConfig();
  const enabledToolIds = config.workspace.enabledTools ?? [];
  const filteredTools = useMemo(
    () => WORKSPACE_TOOLS.filter((t) => enabledToolIds.includes(t.id)),
    [enabledToolIds]
  );
  const [panel, setPanel] = useState<PersistedPanel>(() => {
    const saved = readStored<PersistedPanel>(PANEL_KEY, { tabs: [], activeId: null, size: DEFAULT_SIZE });
    return { tabs: Array.isArray(saved.tabs) ? saved.tabs.filter((t) => WORKSPACE_TOOLS.some((tool) => tool.id === t.tool)) : [], activeId: saved.activeId, size: Math.max(MIN_SIZE, Math.min(1100, saved.size || DEFAULT_SIZE)) };
  });
  const [dragging, setDragging] = useState(false);
  const [snapHint, setSnapHint] = useState(false);
  /* full-screen for the focused tool tab — Esc leaves, width is restored.
     Render-phase reset (no effect) keeps it from surviving a panel close. */
  const [fullscreen, setFullscreen] = useState(false);
  if (!open && fullscreen) setFullscreen(false);
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const snapRef = useRef(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const active = panel.tabs.find((t) => t.id === panel.activeId) ?? panel.tabs[panel.tabs.length - 1] ?? null;

  /* edge fades appear only while the tab strip actually overflows */
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const check = () => setTabsOverflow(el.scrollWidth > el.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panel.tabs.length]);

  /* persist the layout + announce the tab count (footer listens) */
  useEffect(() => {
    writeStored(PANEL_KEY, panel);
    window.dispatchEvent(new CustomEvent("conductor:workspace-tabs", { detail: panel.tabs.length }));
  }, [panel]);

  const addTab = useCallback((tool: WorkspaceTool) => {
    const tab: PanelTab = { id: makeId("wtab"), tool };
    setPanel((p) => ({ ...p, tabs: [...p.tabs, tab], activeId: tab.id }));
  }, []);

  const closeTab = (id: string) => {
    const index = panel.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const tabs = panel.tabs.filter((t) => t.id !== id);
    if (tabs.length === 0) {
      setPanel((p) => ({ ...p, tabs, activeId: null }));
      onOpenChange(false); /* closing the last tab hides the panel */
      return;
    }
    setPanel((p) => ({ ...p, tabs, activeId: p.activeId === id ? (tabs[Math.max(0, index - 1)]?.id ?? tabs[0].id) : p.activeId }));
  };

  /* external "open this tool here" requests — focus an existing tab or
     create one (App opens the panel itself from the same event) */
  useEffect(() => {
    const pane = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "cycle") {
        setPanel((p) => {
          if (p.tabs.length < 2) return p;
          const index = p.tabs.findIndex((t) => t.id === (p.activeId ?? p.tabs[0].id));
          return { ...p, activeId: p.tabs[(index + 1) % p.tabs.length].id };
        });
        return;
      }
      const tool: WorkspaceTool = detail === "browser" || detail === "browse" ? "browse" : detail === "files" ? "files" : detail === "search" ? "search" : "changes";
      setPanel((p) => {
        const existing = p.tabs.find((t) => t.tool === tool);
        if (existing) return { ...p, activeId: existing.id };
        const id = makeId("wtab");
        return { ...p, tabs: [...p.tabs, { id, tool }], activeId: id };
      });
    };
    window.addEventListener("conductor:pane", pane as EventListener);
    return () => window.removeEventListener("conductor:pane", pane as EventListener);
  }, []);

  /* full-screen for the focused tool tab — Esc leaves, width is restored */
  useEffect(() => {
    if (!fullscreen) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setFullscreen(false); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [fullscreen]);

  /* ------- resizable split: drag to adjust, drag to the edge to close ------- */
  const onResizeDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const s0 = panel.size;
    setDragging(true);
    snapRef.current = false;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: MouseEvent) => {
      const next = Math.max(MIN_SIZE, Math.min(1100, s0 - (ev.clientX - x0)));
      snapRef.current = next <= SNAP_CLOSE_AT;
      setSnapHint(snapRef.current);
      setPanel((p) => ({ ...p, size: next }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDragging(false);
      setSnapHint(false);
      if (snapRef.current) {
        setPanel((p) => ({ ...p, size: s0 })); /* restore width for next open */
        onOpenChange(false);
        toast("Workspace hidden — ⌘L or the corner icon brings it back", "iris");
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (!open) return null;
  return <>
    {!fullscreen && <button className="mobile-pane-scrim workspace-scrim" aria-label="Close workspace panel" onClick={() => onOpenChange(false)} />}
    {!fullscreen && (
      <div
        onMouseDown={onResizeDown}
        onDoubleClick={() => setPanel((p) => ({ ...p, size: DEFAULT_SIZE }))}
        data-active={dragging}
        className={cn("resizer workspace-resizer", snapHint && "will-snap")}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize workspace — drag to the edge to hide"
        title="Drag to resize · double-click to reset"
      />
    )}
    <section style={fullscreen ? undefined : { width: panel.size }} className={cn("app-workspace-panel shrink-0", snapHint && "is-snapping", fullscreen && "is-fullscreen")} aria-label="Workspace panel">
      <div className="workspace-tabstrip" role="tablist" aria-label="Workspace tools">
        <div ref={tabsScrollRef} className={cn("workspace-tabs-scroll", tabsOverflow && "is-overflowing")}>
          {panel.tabs.map((tab) => {
            const meta = toolMeta(tab.tool);
            const on = tab.id === active?.id;
            return (
              <div key={tab.id} role="tab" aria-selected={on} className={cn("workspace-tab", on && "is-active")}>
                <button type="button" className="workspace-tab-main" onClick={() => setPanel((p) => ({ ...p, activeId: tab.id }))} title={meta.label}>
                  <meta.icon size={11} />
                  <span className="workspace-tab-title">{meta.label}</span>
                </button>
                <button type="button" className="workspace-tab-close" onClick={() => closeTab(tab.id)} aria-label={`Close ${meta.label} tab`}><IconX size={9} /></button>
              </div>
            );
          })}
          <div className="shrink-0 inline-flex items-center">
            <Menu align="left" width={252} trigger={() => <Tip label="Add a tool tab" side="bottom"><button type="button" className="workspace-tab-new" aria-label="Add a tool tab"><IconPlus size={13} /></button></Tip>}>
              {(close) => <>
                {(["Workspace", "Project", "Autonomy"] as ToolGroup[]).map((group, gi) => {
                  const groupTools = filteredTools.filter((tool) => tool.group === group);
                  if (groupTools.length === 0) return null;
                  return (
                    <div key={group}>
                      {gi > 0 && <div className="mt-1 border-t border-line-soft" />}
                      <MenuLabel>{group}</MenuLabel>
                      {groupTools.map((tool) => (
                        <button key={tool.id} onClick={() => { addTab(tool.id); close(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-ink-2 transition-colors hover:bg-hover hover:text-ink">
                          <span className="flex w-4 shrink-0 items-center justify-center text-ink-3"><tool.icon size={13} /></span>
                          <span className="min-w-0 flex-1"><span className="block text-[12.5px]">{tool.label}</span><span className="block text-[10.5px] leading-tight text-ink-4">{tool.desc}</span></span>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {config.workspace.showConnectTools && (
                  <>
                    <MenuSep />
                    <button onClick={() => { close(); if (onConnectTools) onConnectTools(); else toast("Connectors live in Settings → Connectors", "iris"); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-[12.5px] text-iris-soft transition-colors hover:bg-iris-tint">
                      <span className="flex w-4 shrink-0 items-center justify-center"><IconPuzzle size={13} /></span>
                      <span className="min-w-0 flex-1"><span className="block">Connect more tools</span><span className="block text-[10.5px] leading-tight text-ink-4">MCP connectors, channels and skills</span></span>
                    </button>
                  </>
                )}
                {config.workspace.showCloseAll && (
                  <button disabled={panel.tabs.length === 0} onClick={() => { setPanel((p) => ({ ...p, tabs: [], activeId: null })); onOpenChange(false); close(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-[12.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">
                    <span className="flex w-4 shrink-0 items-center justify-center"><IconX size={12} /></span>Close all tabs
                  </button>
                )}
              </>}
            </Menu>
          </div>
        </div>
        {/* Browser-style Toolbar Icon — Quick tools shelf & view settings */}
        <Menu
          align="right"
          width={264}
          trigger={() => (
            <Tip label="Workspace Toolbar & Tools" side="bottom">
              <button
                type="button"
                className="workspace-tab-toolbar"
                aria-label="Workspace tools and toolbar options"
              >
                <IconGrid size={13} />
              </button>
            </Tip>
          )}
        >
          {(close) => (
            <div className="p-1">
              <MenuLabel>Tools Shelf</MenuLabel>
              <div className="grid grid-cols-2 gap-1 py-1">
                {filteredTools.map((t) => {
                  const isOpen = panel.tabs.some((tab) => tab.tool === t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        addTab(t.id);
                        close();
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-left text-[11.5px] transition-colors",
                        isOpen
                          ? "bg-iris-tint text-iris-soft font-medium"
                          : "text-ink-2 hover:bg-hover hover:text-ink"
                      )}
                    >
                      <t.icon size={12} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <MenuSep />
              <MenuLabel>View & Layout</MenuLabel>
              <button
                type="button"
                onClick={() => {
                  setFullscreen((v) => !v);
                  close();
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px] text-ink-2 hover:bg-hover hover:text-ink"
              >
                <span className="flex size-4 items-center justify-center text-ink-4">
                  {fullscreen ? <IconMinimize size={12} /> : <IconMaximize size={12} />}
                </span>
                <span className="flex-1">{fullscreen ? "Exit full screen" : "Full screen tool"}</span>
                <span className="font-mono text-[10px] text-ink-4">Esc</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  window.dispatchEvent(new CustomEvent("aro:open-studio"));
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px] text-ink-2 hover:bg-hover hover:text-ink"
              >
                <span className="flex size-4 items-center justify-center text-ink-4">
                  <IconSliders size={12} />
                </span>
                <span className="flex-1">Customize in Prototype Studio</span>
              </button>
              {panel.tabs.length > 0 && (
                <>
                  <MenuSep />
                  <button
                    type="button"
                    onClick={() => {
                      setPanel((p) => ({ ...p, tabs: [], activeId: null }));
                      onOpenChange(false);
                      close();
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px] text-rose hover:bg-rose-tint"
                  >
                    <span className="flex size-4 items-center justify-center">
                      <IconX size={11} />
                    </span>
                    <span className="flex-1">Close all workspace tabs</span>
                  </button>
                </>
              )}
            </div>
          )}
        </Menu>
        {panel.tabs.length > 0 && config.workspace.showFullscreen && (
          <Tip label={fullscreen ? "Exit full screen · Esc" : "Full screen this tool"} side="bottom">
            <button type="button" className={cn("workspace-panel-full", fullscreen && "is-on")} onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? "Exit full screen" : "Full screen the workspace tool"} aria-pressed={fullscreen}>
              {fullscreen ? <IconMinimize size={12} /> : <IconMaximize size={12} />}
            </button>
          </Tip>
        )}
        <Tip label="Close workspace panel · ⌘L">
          <button type="button" className="workspace-panel-close text-ink-3 hover:text-ink hover:bg-hover" onClick={() => onOpenChange(false)} aria-label="Close workspace panel" title="Close workspace panel · ⌘L"><IconChevronRight size={15} /></button>
        </Tip>
      </div>
      <div className="workspace-body">
        {panel.tabs.map((tab) => (
          <div key={tab.id} role="tabpanel" aria-hidden={tab.id !== active?.id} className={cn("workspace-tabpane", tab.id === active?.id && "is-active")}>
            {tab.tool === "browse" && <BrowserView onAskAgent={onAskAgent} />}
            {tab.tool === "changes" && <ReviewView project={project} />}
            {tab.tool === "artifacts" && <ArtifactsView />}
            {tab.tool === "terminal" && <PanelTerminal onAskAgent={onAskAgent} />}
            {tab.tool === "memory" && <MemoryView />}
            {tab.tool === "files" && <FilesView project={project} />}
            {tab.tool === "search" && <CodeSearchView project={project} />}
            {tab.tool === "tasks" && <TasksView onOpenSession={onOpenSession ?? (() => {})} />}
            {tab.tool === "runs" && <FleetView />}
            {tab.tool === "automations" && <AutomationsView />}
          </div>
        ))}
        {panel.tabs.length === 0 && (
          <div className="workspace-picker">
            <p className="workspace-picker-eyebrow">workspace</p>
            <h3 className="workspace-picker-title">Add a tool</h3>
            <p className="workspace-picker-sub">Every tool opens as its own tab — combine them however you work. Drag the panel's left edge to the screen to hide it again.</p>
            <div className="workspace-picker-grid">
              {WORKSPACE_TOOLS.map((tool) => (
                <button key={tool.id} onClick={() => addTab(tool.id)} className="workspace-picker-card">
                  <span className="workspace-picker-icon"><tool.icon size={16} /></span>
                  <span className="workspace-picker-name">{tool.label}</span>
                  <span className="workspace-picker-desc">{tool.desc}</span>
                </button>
              ))}
              <button onClick={() => onConnectTools?.()} className="workspace-picker-card workspace-picker-connect">
                <span className="workspace-picker-icon"><IconPuzzle size={16} /></span>
                <span className="workspace-picker-name">Connect tools</span>
                <span className="workspace-picker-desc">MCP connectors, channels and skills</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  </>;
}

/* ------------------------------ files tab ------------------------------ */

const LANG_GLYPH: Record<string, string> = { tsx: "TS", ts: "TS", css: "CSS", json: "{}", md: "MD" };

function FilesView({ project }: { project?: Project }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openFile, setOpenFile] = useState<string | null>(null);
  const open = useMemo(() => flattenFiles().find((f) => f.path === openFile), [openFile]);
  const toggle = (key: string) => setCollapsed((all) => ({ ...all, [key]: !all[key] }));

  const renderNode = (node: FileNode, depth: number, path: string) => {
    if (node.kind === "dir") {
      const isCollapsed = collapsed[path];
      return (
        <div key={path}>
          <button type="button" onClick={() => toggle(path)} className="files-row files-dir" style={{ paddingInlineStart: 6 + depth * 14 }}>
            {isCollapsed ? <IconChevron size={10} /> : <IconChevronDown size={10} />}
            <span className="files-name">{node.name}</span>
          </button>
          {!isCollapsed && (node.children ?? []).map((child) => renderNode(child, depth + 1, `${path}/${child.name}`))}
        </div>
      );
    }
    const selected = openFile === path;
    return (
      <button type="button" key={path} onClick={() => setOpenFile(selected ? null : path)} className={cn("files-row files-file", selected && "is-open")} style={{ paddingInlineStart: 22 + depth * 14 }}>
        <span className="files-lang" data-lang={node.lang ?? ""}>{LANG_GLYPH[node.lang ?? ""] ?? "·"}</span>
        <span className="files-name">{node.name}</span>
        {node.lines != null && <span className="files-lines">{node.lines}</span>}
      </button>
    );
  };

  if (!project) return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
    <span className="flex size-10 items-center justify-center rounded-[12px] border border-line bg-raise text-ink-3"><IconList size={17} /></span>
    <p className="text-[13px] font-semibold text-ink">No project attached</p>
    <p className="max-w-[280px] text-[12px] leading-relaxed text-ink-3">Attach a project with the folder button in the composer — its file tree appears here.</p>
  </div>;

  return <div className="flex min-h-0 flex-1">
    <div className="scroll-thin min-h-0 w-[46%] max-w-[300px] shrink-0 overflow-y-auto border-r border-line-soft py-2">
      <p className="files-tree-root"><IconList size={10} /> {project.name}</p>
      {DEMO_FILES.map((node) => renderNode(node, 0, node.name))}
    </div>
    <div className="scroll-thin min-h-0 flex-1 overflow-auto">
      {open ? (
        <div className="p-3">
          <p className="files-open-path font-mono">{open.path}</p>
          <pre className="files-open-body"><code>{open.node.body}</code></pre>
        </div>
      ) : <p className="files-empty-hint">Select a file to preview it.</p>}
    </div>
  </div>;
}

/* ------------------------------ search tab ------------------------------ */

type Hit = { path: string; line: number; text: string };

function CodeSearchView({ project }: { project?: Project }) {
  const [query, setQuery] = useState("");
  const files = useMemo(() => flattenFiles(), []);
  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Hit[] = [];
    for (const file of files) {
      if (file.node.name.toLowerCase().includes(q)) out.push({ path: file.path, line: 0, text: `— filename match —` });
      for (const [i, line] of (file.node.body ?? "").split("\n").entries()) {
        if (line.toLowerCase().includes(q)) out.push({ path: file.path, line: i + 1, text: line.trim() });
      }
    }
    return out.slice(0, 60);
  }, [query, files]);
  const byFile = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of hits) map.set(hit.path, [...(map.get(hit.path) ?? []), hit]);
    return [...map.entries()];
  }, [hits]);

  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
      <IconSearch size={12} className="shrink-0 text-ink-4" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={project ? `Search ${project.name}…` : "Search the project…"} className="h-[26px] min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none" aria-label="Search across project files" />
      {query.length > 0 && <span className="shrink-0 font-mono text-[9px] text-ink-4">{hits.length} hit{hits.length === 1 ? "" : "s"}</span>}
    </div>
    <div className="scroll-thin min-h-0 flex-1 overflow-auto p-2">
      {query.trim().length < 2 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-[12px] border border-line bg-raise text-ink-3"><IconSearch size={16} /></span>
          <p className="text-[12px] text-ink-3">Ripgrep-style search — matches stream in by file and line as you type.</p>
        </div>
      ) : hits.length === 0 ? (
        <p className="py-8 text-center font-mono text-[11px] text-ink-4">no matches for “{query.trim()}”</p>
      ) : byFile.map(([path, fileHits]) => (
        <div key={path} className="mb-2">
          <p className="files-hit-path font-mono">{path}<span className="files-hit-count">{fileHits.length}</span></p>
          {fileHits.map((hit, i) => (
            <div key={i} className="files-hit">
              <span className="files-hit-line font-mono">{hit.line || "·"}</span>
              <code className="files-hit-text">{hit.text}</code>
            </div>
          ))}
        </div>
      ))}
    </div>
    {!project && <p className="border-t border-line-soft px-3 py-2 font-mono text-[9px] text-ink-4">no project — attach one to search real files</p>}
    {project && <p className="border-t border-line-soft px-3 py-2 font-mono text-[9px] text-ink-4">demo corpus — the prototype ships a sample tree</p>}
  </div>;
}

/* --------------------------- terminal tab body --------------------------- */
interface TermLine {
  t: string;
  k?: "cmd" | "ok" | "err" | "warn" | "dim" | "info" | "regular";
}

interface TermTab {
  id: string;
  label: string;
  status: "running" | "idle";
  lines: TermLine[];
}

const INITIAL_TABS: TermTab[] = [
  {
    id: "term-1",
    label: "zsh (local)",
    status: "idle",
    lines: [
      { t: "Aro Terminal Environment v1.5.0", k: "info" },
      { t: "Workspace attached to local branch 'main'.", k: "dim" },
      { t: "Type 'help' for built-in commands or run shell tools.", k: "dim" },
    ],
  },
  {
    id: "term-2",
    label: "Aro Agent PTY",
    status: "idle",
    lines: [
      { t: "Aro Background Agent PTY bridge initialized.", k: "info" },
      { t: "Ready to accept delegated shell executions.", k: "dim" },
    ],
  },
  {
    id: "term-3",
    label: "dev server",
    status: "running",
    lines: [
      { t: "▲ Next.js 15.3.0 (turbo)", k: "ok" },
      { t: "  - Local:        http://localhost:3000", k: "ok" },
      { t: "  - Environments: .env.local", k: "dim" },
      { t: "✓ Compiled / in 420ms (124 modules)", k: "ok" },
    ],
  },
];

function PanelTerminal({ onAskAgent }: { onAskAgent: (text: string) => void }) {
  const { toast } = useApp();
  const [tabs, setTabs] = useState<TermTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>("term-1");
  const [cmdInput, setCmdInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const outputEndRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const appendLines = useCallback((tabId: string, newLines: TermLine[]) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, lines: [...tab.lines, ...newLines] } : tab))
    );
  }, []);

  // Listen to cross-app run command events (e.g. from CodeBlock in chat)
  useEffect(() => {
    const handleRun = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (!code) return;
      executeCommand(code.trim());
    };
    window.addEventListener("conductor:terminal:run", handleRun);
    return () => window.removeEventListener("conductor:terminal:run", handleRun);
  }, [activeTabId]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab?.lines.length]);

  const executeCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    const clean = cmd.trim();
    setCmdHistory((prev) => [...prev, clean]);
    setHistIndex(-1);

    const echoLine: TermLine = { t: `$ ${clean}`, k: "cmd" };

    if (clean === "clear") {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, lines: [] } : t))
      );
      setCmdInput("");
      return;
    }

    if (clean === "help") {
      appendLines(activeTabId, [
        echoLine,
        { t: "Available terminal shortcuts:", k: "info" },
        { t: "  ls / dir       - List project files", k: "dim" },
        { t: "  git status     - Show working tree status", k: "dim" },
        { t: "  git branch     - Display current branch", k: "dim" },
        { t: "  npm test       - Run test suite verification", k: "dim" },
        { t: "  npm run build  - Build production artifacts", k: "dim" },
        { t: "  clear          - Clear terminal output", k: "dim" },
      ]);
      setCmdInput("");
      return;
    }

    if (clean === "ls" || clean === "dir") {
      appendLines(activeTabId, [
        echoLine,
        { t: "package.json      tsconfig.json      README.md", k: "dim" },
        { t: "src/              prototype/         apps/            tools/", k: "ok" },
      ]);
      setCmdInput("");
      return;
    }

    if (clean.startsWith("git status")) {
      appendLines(activeTabId, [
        echoLine,
        { t: "On branch main", k: "info" },
        { t: "Your branch is up to date with 'origin/main'.", k: "dim" },
        { t: "Changes to be committed:", k: "dim" },
        { t: "  modified:   src/workbench/components/Transcript.tsx", k: "ok" },
        { t: "  modified:   src/workbench/components/Workbench.tsx", k: "ok" },
      ]);
      setCmdInput("");
      return;
    }

    if (clean === "npm test" || clean === "test") {
      appendLines(activeTabId, [
        echoLine,
        { t: "RUNS  tests/workbench.test.ts", k: "warn" },
        { t: "PASS  tests/workbench.test.ts (24 tests, 1.8s)", k: "ok" },
        { t: "✓ All 24 tests passed in 1.84s", k: "ok" },
      ]);
      setCmdInput("");
      return;
    }

    // Default simulation response
    appendLines(activeTabId, [
      echoLine,
      { t: `[Process completed with exit code 0]`, k: "dim" },
    ]);
    setCmdInput("");
  };

  const clearCurrentTab = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, lines: [] } : t))
    );
    toast("Terminal cleared", "mint");
  };

  const killCurrentProcess = () => {
    appendLines(activeTabId, [{ t: "^C [Process terminated by user]", k: "err" }]);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, status: "idle" } : t))
    );
    toast("Process stopped", "amber");
  };

  const toneFor = (k?: string) =>
    k === "cmd"
      ? "text-ink font-semibold"
      : k === "ok"
      ? "text-mint font-medium"
      : k === "err"
      ? "text-rose"
      : k === "warn"
      ? "text-amber"
      : k === "dim"
      ? "text-ink-4"
      : k === "info"
      ? "text-cyan"
      : "text-ink-2";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-well/70 font-mono text-[11px]">
      {/* Terminal sub-tab strip */}
      <div className="flex items-center gap-1 border-b border-line-soft bg-raise/50 px-2 py-1 select-none">
        <div className="flex items-center gap-1 overflow-x-auto scroll-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[11px] transition-colors",
                tab.id === activeTabId
                  ? "bg-hover text-ink font-medium shadow-sm"
                  : "text-ink-3 hover:text-ink hover:bg-hover/60"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  tab.status === "running" ? "bg-mint animate-pulse" : "bg-ink-4"
                )}
              />
              <span className="truncate max-w-[110px]">{tab.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const newId = `term-${tabs.length + 1}`;
              setTabs((p) => [
                ...p,
                { id: newId, label: `zsh (${tabs.length + 1})`, status: "idle", lines: [{ t: "New shell session started.", k: "info" }] },
              ]);
              setActiveTabId(newId);
            }}
            className="flex size-[22px] items-center justify-center rounded text-ink-4 hover:bg-hover hover:text-ink"
            title="New terminal tab"
          >
            <IconPlus size={11} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <Tip label="Clear terminal">
            <button
              type="button"
              onClick={clearCurrentTab}
              className="flex size-[22px] items-center justify-center rounded text-ink-4 hover:bg-hover hover:text-ink"
            >
              <IconTrash size={12} />
            </button>
          </Tip>
          <Tip label="Stop / Kill process">
            <button
              type="button"
              onClick={killCurrentProcess}
              className="flex size-[22px] items-center justify-center rounded text-ink-4 hover:bg-rose-tint hover:text-rose"
            >
              <IconStop size={12} />
            </button>
          </Tip>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="scroll-thin min-h-0 flex-1 overflow-auto p-3 font-mono leading-[1.65]">
        {activeTab.lines.map((line, index) => (
          <div key={index} className={toneFor(line.k)}>
            {line.t}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>

      {/* Interactive Command Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeCommand(cmdInput);
        }}
        className="flex items-center gap-2 border-t border-line-soft bg-raise/30 px-3 py-2"
      >
        <span className="shrink-0 text-cyan select-none font-semibold">~/repo $</span>
        <input
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && cmdHistory.length > 0) {
              e.preventDefault();
              const nextIdx = histIndex === -1 ? cmdHistory.length - 1 : Math.max(0, histIndex - 1);
              setHistIndex(nextIdx);
              setCmdInput(cmdHistory[nextIdx]);
            } else if (e.key === "ArrowDown" && histIndex >= 0) {
              e.preventDefault();
              if (histIndex < cmdHistory.length - 1) {
                setHistIndex(histIndex + 1);
                setCmdInput(cmdHistory[histIndex + 1]);
              } else {
                setHistIndex(-1);
                setCmdInput("");
              }
            }
          }}
          placeholder="Type shell command or 'help'…"
          className="h-[26px] min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ink outline-none placeholder:text-ink-4"
        />
        <span className="font-mono text-[9px] tracking-[.12em] text-ink-4 uppercase select-none">⏎ run</span>
      </form>
    </div>
  );
}
