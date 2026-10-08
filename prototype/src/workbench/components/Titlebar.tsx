import { useState, useEffect } from "react";
import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp, THEMES } from "../lib/app";
import {
  IconBranch,
  IconBrain,
  IconCheck,
  IconChevron,
  IconChevronDown,
  IconKeyboard,
  IconMic,
  IconPalette,
  IconPanelLeft,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSliders,
  IconUser,
  IconX,
} from "./Icons";
import { IconButton, Kbd, Menu, MenuLabel, MenuSep, Tip } from "./ui";
import type { LayoutState } from "./LayoutControl";
import { usePrototypeConfig } from "../config/prototypeConfig";
import type { ViewId } from "./Sidebar";
import { PROJECT_COLORS } from "../lib/workspace";
import { readStored, writeStored, makeId } from "../lib/storage";

/* Titlebar — minimal, state-aware, modular prototype header.
   All slots are toggleable via Prototype Studio or config. */
export function Titlebar({
  onOpenCmdk,
  setView,
  layout,
  setLayout,
  layoutOpen,
  setLayoutOpen,
  onHelp,
  project,
  onOpenStudio,
}: {
  onOpenCmdk: () => void;
  onNew: () => void;
  setView: (view: ViewId) => void;
  layout: LayoutState;
  setLayout: (layout: LayoutState) => void;
  panelLabel: string;
  layoutOpen: boolean;
  setLayoutOpen: (open: boolean) => void;
  onHelp: () => void;
  project?: Project;
  onOpenStudio?: () => void;
}) {
  const { product, setProduct, theme, setTheme, termOpen, setTermOpen, setSettingsSection } = useApp();
  const { config } = usePrototypeConfig();
  const source = project?.sources?.[0];
  const isDemo = project?.id === "demo-sofia-ui";
  const hasWork = Boolean(project) || layout.terminal;
  const orbOn = () => localStorage.getItem("conductor.voice.orb") !== "false";
  const setOrb = (on: boolean) => {
    localStorage.setItem("conductor.voice.orb", String(on));
    window.dispatchEvent(new CustomEvent("conductor:voice:orb", { detail: on }));
  };
  const goto = (section: string) => {
    setSettingsSection(section);
    setView("settings");
  };

  return (
    <header className="app-titlebar minimal-titlebar" data-minimal={hasWork ? undefined : "true"}>
      {/* Show sidebar button when sidebar is hidden */}
      {!layout.list && (
        <Tip label="Show sidebar · ⇧⌘B" side="bottom">
          <IconButton icon={IconPanelLeft} label="Show sidebar" size={28} onClick={() => setLayout({ ...layout, list: true })} />
        </Tip>
      )}

      {/* Product mode switcher (Code vs Agent) */}
      {config.titlebar.productSwitcher && (
        <div className="product-switcher" role="group" aria-label="Workspace mode">
          {(["code", "agent"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setProduct(item)}
              aria-pressed={product === item}
              className={cn("product-option", product === item && "selected")}
            >
              {item === "code" ? "Code" : "Agent"}
            </button>
          ))}
        </div>
      )}

      {/* Project title and branch */}
      {config.titlebar.projectTitle && project && (
        <div className="selected-project-title flex items-center gap-1.5">
          <span
            className="size-2 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: project.color || "#818cf8" }}
            title={`Project color: ${project.color || "#818cf8"}`}
          />
          <span className="truncate">{project.name}</span>
          {isDemo && <span className="titlebar-demo">DEMO</span>}
          {source?.branch && (
            <span className="hidden items-center gap-1 font-mono text-[10px] text-ink-4 lg:flex">
              <IconBranch size={10} />
              {source.branch}
            </span>
          )}
        </div>
      )}

      <div className="titlebar-spacer" />

      {/* Global search pill */}
      {config.titlebar.searchPill && (
        <>
          <button
            type="button"
            className="titlebar-search"
            onClick={onOpenCmdk}
            title="Search sessions and commands · ⌘K"
            aria-label="Search sessions and commands"
          >
            <IconSearch size={12} />
            <span className="titlebar-search-label">Search</span>
            <span className="titlebar-search-kbd">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
          <Tip label="Search · ⌘K" side="bottom">
            <button type="button" className="titlebar-search-compact" onClick={onOpenCmdk} aria-label="Search sessions and commands">
              <IconSearch size={14} />
            </button>
          </Tip>
        </>
      )}

      <div className="titlebar-spacer" />

      {/* Keyboard shortcuts */}
      {config.titlebar.shortcutsBtn && (
        <Tip label="Keyboard shortcuts · ⌘/" side="bottom">
          <IconButton icon={IconKeyboard} label="Keyboard shortcuts" onClick={onHelp} size={28} />
        </Tip>
      )}

      {/* Quick settings menu */}
      {config.titlebar.quickSettings && (
        <Menu align="right" width={264} trigger={() => <IconButton icon={IconSettings} label="Quick settings" size={28} />}>
          {(close) => (
            <>
              <MenuLabel>Quick settings</MenuLabel>
              <div className="quick-theme-row" role="group" aria-label="Theme">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cn("quick-theme-dot", theme === t.id && "is-active")}
                    onClick={() => setTheme(t.id)}
                    title={t.label}
                    aria-label={`Theme: ${t.label}`}
                    aria-pressed={theme === t.id}
                  >
                    <i style={{ ["--dot" as string]: t.swatch[2] }} />
                  </button>
                ))}
              </div>
              <MenuSep />
              <button
                type="button"
                className={cn("quick-toggle-row", layout.panel && "is-on")}
                onClick={() => setLayout({ ...layout, panel: !layout.panel })}
              >
                <span className="quick-toggle-box">{layout.panel && <IconCheck size={9} />}</span>
                <span className="flex-1">Workspace panel</span>
                <span className="font-mono text-[10px] text-ink-4">⌘L</span>
              </button>
              <button
                type="button"
                className={cn("quick-toggle-row", termOpen && "is-on")}
                onClick={() => setTermOpen(!termOpen)}
              >
                <span className="quick-toggle-box">{termOpen && <IconCheck size={9} />}</span>
                <span className="flex-1">Terminal</span>
                <span className="font-mono text-[10px] text-ink-4">⌘J</span>
              </button>
              <button
                type="button"
                className={cn("quick-toggle-row", layout.status && "is-on")}
                onClick={() => setLayout({ ...layout, status: !layout.status })}
              >
                <span className="quick-toggle-box">{layout.status && <IconCheck size={9} />}</span>
                <span className="flex-1">Status bar</span>
              </button>
              <button
                type="button"
                className={cn("quick-toggle-row", orbOn() && "is-on")}
                onClick={() => setOrb(!orbOn())}>
                <span className="quick-toggle-box">{orbOn() && <IconCheck size={9} />}</span>
                <span className="flex-1">Voice orb</span>
                <IconMic size={12} className="text-ink-4" />
              </button>
              {onOpenStudio && (
                <>
                  <MenuSep />
                  <button
                    type="button"
                    className="quick-link-row"
                    onClick={() => {
                      close();
                      onOpenStudio();
                    }}
                  >
                    <IconSliders size={13} className="shrink-0 text-iris-soft" />
                    <span className="flex-1 font-medium text-ink">Prototype Studio</span>
                    <IconChevron size={10} className="text-ink-4" />
                  </button>
                </>
              )}
              <MenuSep />
              <button
                type="button"
                className="quick-link-row"
                onClick={() => {
                  close();
                  goto("appearance");
                }}
              >
                <IconPalette size={13} className="shrink-0 text-ink-4" />
                <span className="flex-1">Appearance</span>
                <IconChevron size={10} className="text-ink-4" />
              </button>
              <button
                type="button"
                className="quick-link-row"
                onClick={() => {
                  close();
                  goto("providers");
                }}
              >
                <IconBrain size={13} className="shrink-0 text-ink-4" />
                <span className="flex-1">Providers &amp; models</span>
                <IconChevron size={10} className="text-ink-4" />
              </button>
              <button
                type="button"
                className="quick-link-row"
                onClick={() => {
                  close();
                  goto("voice");
                }}
              >
                <IconMic size={13} className="shrink-0 text-ink-4" />
                <span className="flex-1">Voice &amp; audio</span>
                <IconChevron size={10} className="text-ink-4" />
              </button>
              <button
                type="button"
                className="quick-link-row"
                onClick={() => {
                  close();
                  onHelp();
                }}
              >
                <IconKeyboard size={13} className="shrink-0 text-ink-4" />
                <span className="flex-1">Keyboard shortcuts</span>
                <IconChevron size={10} className="text-ink-4" />
              </button>
              <MenuSep />
              <button
                type="button"
                className="quick-link-row"
                onClick={() => {
                  close();
                  setView("settings");
                }}
              >
                <IconSettings size={13} className="shrink-0 text-ink-4" />
                <span className="flex-1">Open full settings</span>
                <Kbd>⌘,</Kbd>
              </button>
            </>
          )}
        </Menu>
      )}
    </header>
  );
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
}

const DEFAULT_PROFILES: UserProfile[] = [
  { id: "personal", name: "Personal", email: "developer@local", avatarColor: "#818cf8", role: "Owner" },
  { id: "work", name: "Work", email: "work@samjuniors.io", avatarColor: "#38bdf8", role: "Admin" },
  { id: "oss", name: "Open Source", email: "oss@aro.run", avatarColor: "#34d399", role: "Maintainer" },
];

export function ProfileControl({ onOpenSettings, inSidebar = false }: { onOpenSettings: () => void; inSidebar?: boolean }) {
  const { toast } = useApp();
  const [profiles, setProfiles] = useState<UserProfile[]>(() =>
    readStored("conductor.profiles.list", DEFAULT_PROFILES)
  );
  const [activeProfileId, setActiveProfileId] = useState<string>(() =>
    readStored("conductor.profiles.activeId", "personal")
  );
  const [signedIn, setSignedIn] = useState<boolean>(() =>
    readStored("conductor.profiles.signedIn", true)
  );
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0].value);

  useEffect(() => {
    writeStored("conductor.profiles.list", profiles);
  }, [profiles]);

  useEffect(() => {
    writeStored("conductor.profiles.activeId", activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    writeStored("conductor.profiles.signedIn", signedIn);
  }, [signedIn]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0];

  const switchProfile = (p: UserProfile) => {
    setActiveProfileId(p.id);
    toast(`Switched to ${p.name} profile`, "iris");
  };

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim()) return;
    const created: UserProfile = {
      id: makeId("prof"),
      name: newName.trim(),
      email: `${newName.trim().toLowerCase().replace(/\s+/g, ".")}@local`,
      avatarColor: newColor,
      role: "Custom",
    };
    setProfiles((prev) => [...prev, created]);
    setActiveProfileId(created.id);
    setNewName("");
    setCreating(false);
    toast(`Custom profile created: ${created.name}`, "mint");
  };

  const toggleSignIn = () => {
    const nextState = !signedIn;
    setSignedIn(nextState);
    toast(nextState ? "Signed in with Aro Cloud" : "Signed out (local mode)", nextState ? "mint" : "iris");
  };

  const initials = activeProfile.name.slice(0, 2).toUpperCase();

  return (
    <Menu
      align={inSidebar ? "left" : "right"}
      side={inSidebar ? "top" : "bottom"}
      width={inSidebar ? 245 : 272}
      className={inSidebar ? "w-full" : undefined}
      trigger={(open) => (
        inSidebar ? (
          <button
            type="button"
            className={cn(
              "group flex h-[36px] w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 text-[12px] text-ink-2 transition-all hover:bg-hover hover:text-ink active:scale-[0.99]",
              open && "bg-hover text-ink"
            )}
            aria-label={`Profile: ${activeProfile.name}`}
            title={`Active profile: ${activeProfile.name}`}
          >
            <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: activeProfile.avatarColor }}>
              {initials}
              {signedIn && (
                <span className="absolute -bottom-0.5 -right-0.5 size-[6px] rounded-full bg-emerald ring-1 ring-sunken" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-medium text-ink leading-tight text-[12.5px]">{activeProfile.name}</span>
              <span className="block truncate text-[10px] text-ink-4 leading-tight">{signedIn ? activeProfile.email : "Offline profile"}</span>
            </span>
            <IconChevronDown size={11} className="text-ink-4 transition-transform group-hover:text-ink-2 shrink-0" />
          </button>
        ) : (
          <Tip label={`Profile: ${activeProfile.name} · Switch or create`} side="bottom">
            <button
              type="button"
              className={cn(
                "group inline-flex h-[28px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-line bg-raise pl-1.5 pr-2 text-[12px] text-ink-2 transition-all hover:border-line-strong hover:bg-hover hover:text-ink active:scale-[0.98]",
                open && "border-line-strong bg-hover text-ink"
              )}
              aria-label={`Profile: ${activeProfile.name}`}
            >
              <span className="relative flex size-[19px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white shadow-sm" style={{ backgroundColor: activeProfile.avatarColor }}>
                {initials}
                {signedIn && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-[6px] rounded-full bg-emerald ring-1 ring-base" />
                )}
              </span>
              <span className="max-w-[85px] truncate font-medium text-ink hidden sm:inline">
                {activeProfile.name}
              </span>
              <IconChevronDown size={10} className="text-ink-4 transition-transform group-hover:text-ink-2" />
            </button>
          </Tip>
        )
      )}
    >
      {(close) => (
        <div className="p-1 space-y-1">
          {/* Header Identity Card */}
          <div className="flex items-center gap-2.5 rounded-[8px] bg-sunken p-2">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm"
              style={{ backgroundColor: activeProfile.avatarColor }}
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold text-ink">{activeProfile.name}</span>
                <span className="rounded-[4px] bg-iris-tint px-1 py-0.2 font-mono text-[8.5px] font-bold text-iris-soft uppercase">
                  {activeProfile.role || "Active"}
                </span>
              </div>
              <span className="block truncate text-[11px] text-ink-4">
                {signedIn ? activeProfile.email : "Local workspace (offline)"}
              </span>
            </div>
          </div>

          <MenuSep />

          {/* Profiles list */}
          <MenuLabel>Switch Profile</MenuLabel>
          <div className="space-y-0.5">
            {profiles.map((p) => {
              const isSelected = p.id === activeProfile.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    switchProfile(p);
                    close();
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] transition-colors",
                    isSelected ? "bg-raise font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"
                  )}
                >
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-ink-4 mr-1">{p.role}</span>
                  {isSelected && <IconCheck size={12} className="text-iris-soft shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Inline Custom Profile Creator */}
          {creating ? (
            <div className="rounded-[7px] border border-line-soft bg-raise p-2 space-y-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-ink">New profile</span>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-ink-4 hover:text-ink"
                >
                  <IconX size={11} />
                </button>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Profile name (e.g. Client X)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                className="h-[26px] w-full rounded-[5px] border border-line bg-sunken px-2 text-[11.5px] text-ink placeholder:text-ink-4 outline-none focus:border-iris"
              />
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1">
                  {PROJECT_COLORS.slice(0, 5).map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColor(c.value)}
                      className={cn(
                        "size-3.5 rounded-full transition-transform",
                        newColor === c.value && "ring-2 ring-ink ring-offset-1 scale-110"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreate()}
                  disabled={!newName.trim()}
                  className="rounded-[5px] bg-iris px-2 py-0.5 text-[11px] font-medium text-white hover:bg-iris-soft disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <IconPlus size={12} className="text-iris-soft" />
              <span>Create custom profile…</span>
            </button>
          )}

          <MenuSep />

          {/* Cloud Auth / Sign in toggle */}
          <button
            type="button"
            onClick={() => {
              toggleSignIn();
              close();
            }}
            className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-[11.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <div className="flex items-center gap-2">
              <IconUser size={13} className="text-ink-3" />
              <span>{signedIn ? "Sign out (local mode)" : "Sign in to Aro Cloud"}</span>
            </div>
            {signedIn && <span className="size-1.5 rounded-full bg-emerald" />}
          </button>

          <MenuSep />

          {/* Settings link */}
          <button
            type="button"
            onClick={() => {
              close();
              onOpenSettings();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <IconSettings size={12} className="text-ink-4" />
            <span>Manage accounts &amp; profiles</span>
          </button>
        </div>
      )}
    </Menu>
  );
}

export function PageHeader({ title, sub, eyebrow, right }: { title: string; sub: string; eyebrow: string; right?: React.ReactNode }) {
  return (
    <div className="page-header flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-line-soft bg-base">
      <div className="min-w-0">
        <span className="text-[10px] font-medium tracking-[.08em] text-ink-4 uppercase">{eyebrow}</span>
        <h1 className="ds-display mt-1 font-display font-semibold tracking-[-.03em] text-ink">{title}</h1>
        <p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-ink-3">{sub}</p>
      </div>
      {right && <div className="page-header-actions flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function Grid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3", className)}>{children}</div>;
}
