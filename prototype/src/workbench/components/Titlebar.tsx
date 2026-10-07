import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { IconBranch, IconEye, IconGit, IconKeyboard, IconPanelLeft, IconSearch, IconSettings, IconTerminal } from "./Icons";
import { IconButton, Kbd, Tip } from "./ui";
import { LayoutControl, type LayoutState } from "./LayoutControl";
import type { ViewId } from "./Sidebar";

/* Titlebar — minimal, state-aware, honest about what a session can do.
   A first-launch user (no project attached, no terminal) sees exactly
   three affordances: the centered search pill, keyboard shortcuts and
   settings. The project title, the workspace tool icons and the layout
   control appear only once there is something to work on, so the chrome
   grows with the session instead of front-loading it. */
export function Titlebar({ onOpenCmdk, setView, layout, setLayout, layoutOpen, setLayoutOpen, onHelp, project }: {
  onOpenCmdk: () => void; onNew: () => void; setView: (view: ViewId) => void; layout: LayoutState; setLayout: (layout: LayoutState) => void;
  panelLabel: string; layoutOpen: boolean; setLayoutOpen: (open: boolean) => void; onHelp: () => void; project?: Project;
}) {
  const { product, setProduct, setTermOpen } = useApp();
  const source = project?.sources?.[0];
  const isDemo = project?.id === "demo-sofia-ui";
  const openWorkspace = (tool: "changes" | "browse") => window.dispatchEvent(new CustomEvent("conductor:pane", { detail: tool }));
  /* state-wise chrome: workspace tools + layout arrive with the first project
     (or the first terminal) — a new session keeps the bar almost empty */
  const hasWork = Boolean(project) || layout.terminal;
  return <header className="app-titlebar minimal-titlebar" data-minimal={hasWork ? undefined : "true"}>
    {!layout.list && <Tip label="Show sidebar · ⇧⌘B" side="bottom"><IconButton icon={IconPanelLeft} label="Show sidebar" size={28} onClick={() => setLayout({ ...layout, list: true })} /></Tip>}
    <div className="product-switcher" role="group" aria-label="Workspace mode">
      {(["code", "agent"] as const).map((item) => <button key={item} onClick={() => setProduct(item)} aria-pressed={product === item} className={cn("product-option", product === item && "selected")}>{item === "code" ? "Code" : "Agent"}</button>)}
    </div>
    {project && <div className="selected-project-title"><span className="truncate">{project.name}</span>{isDemo && <span className="titlebar-demo">DEMO</span>}{source?.branch && <span className="hidden items-center gap-1 font-mono text-[10px] text-ink-4 lg:flex"><IconBranch size={10} />{source.branch}</span>}</div>}
    <div className="titlebar-spacer" />
    {/* centered search — the one global affordance a new user actually needs */}
    <button type="button" className="titlebar-search" onClick={onOpenCmdk} title="Search sessions and commands · ⌘K" aria-label="Search sessions and commands">
      <IconSearch size={12} />
      <span className="titlebar-search-label">Search</span>
      <span className="titlebar-search-kbd"><Kbd>⌘K</Kbd></span>
    </button>
    <Tip label="Search · ⌘K" side="bottom">
      <button type="button" className="titlebar-search-compact" onClick={onOpenCmdk} aria-label="Search sessions and commands"><IconSearch size={14} /></button>
    </Tip>
    <div className="titlebar-spacer" />
    {hasWork && <div className="titlebar-optional-controls contents">
      <Tip label="Changes — workspace tab" side="bottom"><IconButton icon={IconGit} label="Open changes in the workspace" size={28} onClick={() => openWorkspace("changes")} /></Tip>
      <Tip label="Browse — workspace tab" side="bottom"><IconButton icon={IconEye} label="Open a browser tab in the workspace" size={28} onClick={() => openWorkspace("browse")} /></Tip>
      <Tip label="Terminal · ⌘J" side="bottom"><IconButton icon={IconTerminal} label="Toggle terminal" size={28} active={layout.terminal} onClick={() => setTermOpen(!layout.terminal)} /></Tip>
    </div>}
    {project && <LayoutControl state={layout} setState={setLayout} panelLabel="Workspace" open={layoutOpen} setOpen={setLayoutOpen} />}
    <span className="titlebar-divider-v" />
    <Tip label="Keyboard shortcuts · ⌘/" side="bottom"><IconButton icon={IconKeyboard} label="Keyboard shortcuts" onClick={onHelp} size={28} /></Tip>
    <Tip label="Settings · ⌘," side="bottom"><IconButton icon={IconSettings} label="Settings" onClick={() => setView("settings")} size={28} /></Tip>
  </header>;
}

export function PageHeader({ title, sub, eyebrow, right }: { title: string; sub: string; eyebrow: string; right?: React.ReactNode }) {
  return <div className="page-header flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-line-soft bg-base">
    <div className="min-w-0"><span className="text-[10px] font-medium tracking-[.08em] text-ink-4 uppercase">{eyebrow}</span><h1 className="ds-display mt-1 font-display font-semibold tracking-[-.03em] text-ink">{title}</h1><p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-ink-3">{sub}</p></div>
    {right && <div className="page-header-actions flex flex-wrap items-center gap-2">{right}</div>}
  </div>;
}
export function Grid({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("grid gap-3", className)}>{children}</div>; }
