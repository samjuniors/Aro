import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp, THEMES } from "../lib/app";
import { IconBranch, IconBrain, IconCheck, IconChevron, IconKeyboard, IconMic, IconPanelBottom, IconPanelLeft, IconSearch, IconSettings } from "./Icons";
import { IconButton, Kbd, Menu, MenuLabel, MenuSep, Tip } from "./ui";
import { LayoutControl, type LayoutState } from "./LayoutControl";
import type { ViewId } from "./Sidebar";

/* Titlebar — minimal, state-aware, honest about what a session can do.
   A first-launch user (no project attached, no terminal) sees exactly
   three affordances: the centered search pill, keyboard shortcuts and
   settings. The project title and the layout control appear only once
   there is something to work on, so the chrome grows with the session.
   The workspace tools (changes · browse · terminal) live ONLY in the
   workspace panel's own tab strip — the titlebar never duplicates them.

   The titlebar Settings opens a QUICK menu — theme, panels and deep
   links — while the sidebar's bottom Settings row stays the doorway to
   the full settings panel. Same role, two different depths. */
export function Titlebar({ onOpenCmdk, setView, layout, setLayout, layoutOpen, setLayoutOpen, onHelp, project }: {
  onOpenCmdk: () => void; onNew: () => void; setView: (view: ViewId) => void; layout: LayoutState; setLayout: (layout: LayoutState) => void;
  panelLabel: string; layoutOpen: boolean; setLayoutOpen: (open: boolean) => void; onHelp: () => void; project?: Project;
}) {
  const { product, setProduct, theme, setTheme, termOpen, setTermOpen, setSettingsSection } = useApp();
  const source = project?.sources?.[0];
  const isDemo = project?.id === "demo-sofia-ui";
  /* state-wise chrome: the layout control arrives with the first project
     (or the first terminal) — a new session keeps the bar almost empty */
  const hasWork = Boolean(project) || layout.terminal;
  const orbOn = () => localStorage.getItem("conductor.voice.orb") !== "false";
  const setOrb = (on: boolean) => { localStorage.setItem("conductor.voice.orb", String(on)); window.dispatchEvent(new CustomEvent("conductor:voice:orb", { detail: on })); };
  const goto = (section: string) => { setSettingsSection(section); setView("settings"); };
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
    {project && <LayoutControl state={layout} setState={setLayout} panelLabel="Workspace" open={layoutOpen} setOpen={setLayoutOpen} />}
    <span className="titlebar-divider-v" />
    <Tip label="Keyboard shortcuts · ⌘/" side="bottom"><IconButton icon={IconKeyboard} label="Keyboard shortcuts" onClick={onHelp} size={28} /></Tip>
    {/* quick settings — theme, panels and deep links without leaving the workbench */}
    <Menu align="right" width={264} trigger={() => <IconButton icon={IconSettings} label="Quick settings" size={28} />}>
      {(close) => <>
        <MenuLabel>Quick settings</MenuLabel>
        <div className="quick-theme-row" role="group" aria-label="Theme">
          {THEMES.map((t) => <button key={t.id} type="button" className={cn("quick-theme-dot", theme === t.id && "is-active")} onClick={() => setTheme(t.id)} title={t.label} aria-label={`Theme: ${t.label}`} aria-pressed={theme === t.id}><i style={{ ["--dot" as string]: t.swatch[2] }} /></button>)}
        </div>
        <MenuSep />
        <button type="button" className={cn("quick-toggle-row", termOpen && "is-on")} onClick={() => setTermOpen(!termOpen)}>
          <span className="quick-toggle-box">{termOpen && <IconCheck size={9} />}</span>
          <span className="flex-1">Terminal</span>
          <span className="font-mono text-[10px] text-ink-4">⌘J</span>
        </button>
        <button type="button" className={cn("quick-toggle-row", layout.status && "is-on")} onClick={() => setLayout({ ...layout, status: !layout.status })}>
          <span className="quick-toggle-box">{layout.status && <IconCheck size={9} />}</span>
          <span className="flex-1">Status bar</span>
        </button>
        <button type="button" className={cn("quick-toggle-row", orbOn() && "is-on")} onClick={() => setOrb(!orbOn())}>
          <span className="quick-toggle-box">{orbOn() && <IconCheck size={9} />}</span>
          <span className="flex-1">Voice orb</span>
          <IconMic size={12} className="text-ink-4" />
        </button>
        <MenuSep />
        <button type="button" className="quick-link-row" onClick={() => { close(); goto("appearance"); }}><IconPanelBottom size={13} className="shrink-0 text-ink-4" /><span className="flex-1">Appearance</span><IconChevron size={10} className="text-ink-4" /></button>
        <button type="button" className="quick-link-row" onClick={() => { close(); goto("providers"); }}><IconBrain size={13} className="shrink-0 text-ink-4" /><span className="flex-1">Providers &amp; models</span><IconChevron size={10} className="text-ink-4" /></button>
        <button type="button" className="quick-link-row" onClick={() => { close(); goto("voice"); }}><IconMic size={13} className="shrink-0 text-ink-4" /><span className="flex-1">Voice &amp; audio</span><IconChevron size={10} className="text-ink-4" /></button>
        <button type="button" className="quick-link-row" onClick={() => { close(); onHelp(); }}><IconKeyboard size={13} className="shrink-0 text-ink-4" /><span className="flex-1">Keyboard shortcuts</span><IconChevron size={10} className="text-ink-4" /></button>
        <MenuSep />
        <button type="button" className="quick-link-row" onClick={() => { close(); setView("settings"); }}>
          <IconSettings size={13} className="shrink-0 text-ink-4" />
          <span className="flex-1">Open full settings</span>
          <Kbd>⌘,</Kbd>
        </button>
      </>}
    </Menu>
  </header>;
}

export function PageHeader({ title, sub, eyebrow, right }: { title: string; sub: string; eyebrow: string; right?: React.ReactNode }) {
  return <div className="page-header flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-line-soft bg-base">
    <div className="min-w-0"><span className="text-[10px] font-medium tracking-[.08em] text-ink-4 uppercase">{eyebrow}</span><h1 className="ds-display mt-1 font-display font-semibold tracking-[-.03em] text-ink">{title}</h1><p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-ink-3">{sub}</p></div>
    {right && <div className="page-header-actions flex flex-wrap items-center gap-2">{right}</div>}
  </div>;
}
export function Grid({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("grid gap-3", className)}>{children}</div>; }
