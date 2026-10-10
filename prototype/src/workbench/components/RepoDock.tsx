import { useState, useMemo } from "react";
import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import {
  DEMO_BRANCHES,
  DEMO_CHANGED_FILES,
  DEMO_DIFFS,
  DEMO_DIFF_STATS,
  DEMO_PR,
  DEMO_PROJECT_ID,
} from "../data/demo";
import { useApp } from "../lib/app";
import {
  IconBranch,
  IconChevronDown,
  IconFile,
  IconFilePlus,
  IconGit,
  IconList,
  IconMaximize,
  IconMinimize,
  IconMore,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconSplitVertical,
  IconUndo,
  IconWrapText,
  IconX,
} from "./Icons";
import { Menu, MenuItem, MenuLabel, MenuSep } from "./ui";
import { DiffView } from "./Transcript";

export function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

export type RepoState = {
  isDemo: boolean;
  branch: string;
  branches: { name: string; ahead: number; behind: number }[];
  adds: number;
  dels: number;
  files: { path: string; adds: number; dels: number; status: string }[];
  pr?: { number: number; title: string } | null;
};

export function repoStateFor(project?: Project): RepoState | null {
  if (!project) return null;
  if (project.id === DEMO_PROJECT_ID) {
    return {
      isDemo: true,
      branch: DEMO_BRANCHES.find((b) => b.current)?.name ?? "main",
      branches: DEMO_BRANCHES.map((b) => ({ name: b.name, ahead: b.ahead, behind: b.behind })),
      adds: DEMO_DIFF_STATS.adds,
      dels: DEMO_DIFF_STATS.dels,
      files: DEMO_CHANGED_FILES,
      pr: { number: DEMO_PR.number, title: DEMO_PR.title },
    };
  }
  const source = project.sources?.[0];
  return {
    isDemo: false,
    branch: source?.branch ?? "main",
    branches: source?.branch ? [{ name: source.branch, ahead: 0, behind: 0 }] : [{ name: "main", ahead: 0, behind: 0 }],
    adds: 0,
    dels: 0,
    files: [],
    pr: null,
  };
}

/* ---------------- Repo bar below the composer ---------------- */
export function RepoBar({
  project,
  state,
  onOpenDiff,
  onOpenSettings,
}: {
  project: Project;
  state: RepoState;
  onOpenDiff: () => void;
  onOpenSettings: () => void;
}) {
  const { toast } = useApp();
  const [branch, setBranch] = useState(state.branch);
  const hasChanges = state.adds > 0 || state.dels > 0;

  return (
    <div className="repo-dock" data-demo={state.isDemo ? "true" : undefined}>
      <button className="repo-dock-repo" onClick={onOpenDiff} title="Open changes panel">
        <IconGit size={13} className="repo-dock-repo-icon" />
        <span className="repo-dock-repo-name">{project.name}</span>
        {state.isDemo && <span className="repo-dock-demo">DEMO</span>}
      </button>
      <span className="repo-dock-sep" />
      <Menu
        width={260}
        side="top"
        trigger={() => (
          <button className="repo-dock-branch" title="Switch branch">
            <IconBranch size={11} />
            <span className="truncate">{branch}</span>
            <IconChevronDown size={10} className="opacity-60" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Branches</MenuLabel>
            {state.branches.map((b) => (
              <MenuItem
                key={b.name}
                icon={<IconBranch size={12} />}
                label={b.name}
                hint={b.ahead || b.behind ? `↑${b.ahead} ↓${b.behind}` : undefined}
                active={b.name === branch}
                onClick={() => {
                  setBranch(b.name);
                  close();
                  if (!state.isDemo) toast("Branch checkout needs a connected Git runtime.", "amber");
                }}
              />
            ))}
          </>
        )}
      </Menu>
      <button
        onClick={onOpenDiff}
        className={cn("repo-dock-diff", !hasChanges && "repo-dock-diff-empty")}
        title={hasChanges ? "Open changes panel" : "No changes"}
      >
        {hasChanges ? (
          <>
            <span className="repo-dock-adds">+{formatCount(state.adds)}</span>
            <span className="repo-dock-dels">-{formatCount(state.dels)}</span>
            <IconChevronDown size={11} className="-rotate-90 opacity-60" />
          </>
        ) : (
          <span className="repo-dock-clean">No changes</span>
        )}
      </button>
      <div className="repo-dock-right">
        {state.pr ? (
          <button
            onClick={() =>
              toast(
                state.isDemo
                  ? `Demo: PR #${state.pr!.number} would merge ${branch} → main.`
                  : "Merge needs a connected Git runtime.",
                state.isDemo ? "mint" : "amber"
              )
            }
            className="repo-dock-merge"
          >
            <IconGit size={12} /> Merge PR
          </button>
        ) : (
          <button
            onClick={() => toast("Push a branch with a connected runtime to open a PR.", "amber")}
            className="repo-dock-merge repo-dock-merge-disabled"
          >
            Merge PR
          </button>
        )}
        <button onClick={onOpenSettings} className="repo-dock-gear" aria-label="Project settings">
          <IconSettings size={13} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   CODEX / CURSOR STYLE CHANGES & DIFFERENCE PANEL
   ONE top section only: the surrounding surface (workspace tab strip,
   sheet header or drawer header) already names the view — this content
   starts directly at its toolbar.
   - Toolbar: [ Branch ▾ ] [ main → origin/main ▾ ]      ··· ◫  ☰
   - Split view: wide diff viewer (or "No file changes yet") | files list
   - Tracks its own width (container queries): on a narrow panel the file
     list stacks below the diff instead of crushing it, and spare toolbar
     icons retire into the ··· menu — nothing ever overlaps.
   ========================================================================= */
export function ChangesPanelContent({
  project,
  state,
  onMerge,
}: {
  project?: Project;
  state?: RepoState | null;
  onMerge?: () => void;
}) {
  const { toast } = useApp();
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<"unified" | "split">("unified");
  const [branchMenu, setBranchMenu] = useState("main");
  const [showRightFiles, setShowRightFiles] = useState(true);
  const [wrapText, setWrapText] = useState(false);

  const effectiveState = state ?? (project ? repoStateFor(project) : null);
  const isDemo = effectiveState?.isDemo ?? false;
  const files = isDemo ? DEMO_CHANGED_FILES : effectiveState?.files ?? [];

  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return files;
    return files.filter((f) => f.path.toLowerCase().includes(filterQuery.toLowerCase()));
  }, [files, filterQuery]);

  const activePath = selectedPath ?? (files.length > 0 ? files[0].path : null);
  const activeDiff = activePath ? DEMO_DIFFS[activePath] : undefined;

  const currentBranch = effectiveState?.branch ?? "main";

  return (
    <div className="codex-changes-container">
      {/* 1. Toolbar (Branch and Actions) — the single header this view adds;
          the tab strip / sheet header above it is the one-and-only top bar */}
      <div className="codex-changes-subheader">
        <div className="codex-changes-subheader-left">
          {/* Branch dropdown */}
          <Menu
            width={200}
            trigger={() => (
              <button type="button" className="codex-changes-pill-btn">
                <span>Branch</span>
                <IconChevronDown size={10} className="opacity-70" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>Switch branch scope</MenuLabel>
                <MenuItem
                  icon={<IconBranch size={12} />}
                  label="Local working tree"
                  active
                  onClick={close}
                />
                <MenuItem
                  icon={<IconBranch size={12} />}
                  label="Staged changes only"
                  onClick={close}
                />
              </>
            )}
          </Menu>

          {/* main -> origin/main pill */}
          <Menu
            width={250}
            trigger={() => (
              <button type="button" className="codex-changes-pill-btn codex-branch-target">
                <span>{currentBranch}</span>
                <span className="opacity-50">→</span>
                <span>origin/{currentBranch}</span>
                <IconChevronDown size={10} className="opacity-70" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>Compare branches</MenuLabel>
                {(effectiveState?.branches ?? [{ name: "main", ahead: 0, behind: 0 }]).map((b) => (
                  <MenuItem
                    key={b.name}
                    icon={<IconBranch size={12} />}
                    label={b.name}
                    hint={b.ahead ? `+${b.ahead}` : undefined}
                    active={b.name === branchMenu}
                    onClick={() => {
                      setBranchMenu(b.name);
                      close();
                    }}
                  />
                ))}
              </>
            )}
          </Menu>
        </div>

        {/* Action icons on right — secondary actions live in the ··· menu so
            the row stays one line at any panel width */}
        <div className="codex-changes-subheader-right">
          <Menu
            width={210}
            align="right"
            trigger={() => (
              <button type="button" className="codex-changes-action-icon" title="More options" aria-label="More options">
                <IconMore size={13} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<IconRefresh size={12} />}
                  label="Refresh changes"
                  onClick={() => { toast("Refreshed changes from repository", "mint"); close(); }}
                />
                <MenuItem
                  icon={<IconFile size={12} />}
                  label="Stage / commit file"
                  onClick={() => { toast("Changes are automatically watched", "iris"); close(); }}
                />
                <MenuItem
                  icon={<IconUndo size={12} />}
                  label="Revert selected file"
                  onClick={() => { toast("Checkout previous version", "amber"); close(); }}
                />
                <MenuSep />
                <MenuItem
                  label="Stage all changes"
                  onClick={() => {
                    toast("Staged all changes", "mint");
                    close();
                  }}
                />
                <MenuItem
                  label="Discard all changes"
                  danger
                  onClick={() => {
                    toast("Discarded uncommitted changes", "amber");
                    close();
                  }}
                />
              </>
            )}
          </Menu>

          <button
            type="button"
            className={cn("codex-changes-action-icon", diffMode === "split" && "text-iris-soft")}
            title={diffMode === "split" ? "Switch to unified diff" : "Switch to split diff"}
            aria-pressed={diffMode === "split"}
            onClick={() => setDiffMode((m) => (m === "unified" ? "split" : "unified"))}
          >
            <IconSplitVertical size={13} />
          </button>

          <button
            type="button"
            className={cn("codex-changes-action-icon", wrapText && "text-iris-soft bg-hover/80")}
            title={wrapText ? "Disable word wrap" : "Enable word wrap"}
            aria-pressed={wrapText}
            onClick={() => setWrapText((w) => !w)}
          >
            <IconWrapText size={13} />
          </button>

          <button
            type="button"
            className={cn("codex-changes-action-icon", !showRightFiles && "opacity-50")}
            title={showRightFiles ? "Hide the file list" : "Show the file list"}
            aria-pressed={showRightFiles}
            onClick={() => setShowRightFiles((v) => !v)}
          >
            <IconList size={13} />
          </button>
        </div>
      </div>

      {/* 3. Main Split View: Left Diff & Empty State | Right File Filter Panel */}
      <div className="codex-changes-split-body">
        {/* Left column: Diff Viewer or Empty State */}
        <div className="codex-changes-diff-viewport scroll-thin">
          {files.length === 0 ? (
            /* EXACT Empty State from user screenshot */
            <div className="codex-changes-empty-stage">
              <div className="codex-empty-file-icon-box">
                <IconFilePlus size={36} className="text-ink-4 opacity-75" />
              </div>
              <h3 className="codex-empty-title">No file changes yet</h3>
              <p className="codex-empty-subtitle">Changes in this project will appear here.</p>
            </div>
          ) : activeDiff ? (
            /* Real diff view */
            <div className="p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line-soft">
                <div className="flex items-center gap-2 font-mono text-[12px] text-ink font-medium truncate">
                  <IconFile size={13} className="text-ink-4 shrink-0" />
                  <span className="truncate">{activePath}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-mint font-semibold">+{formatCount(activeDiff.adds)}</span>
                  <span className="text-rose font-semibold">−{formatCount(activeDiff.dels)}</span>
                </div>
              </div>
              <DiffView file={activeDiff} mode={diffMode} showToggle maxLines={200} wrap={wrapText} />
            </div>
          ) : (
            <div className="codex-changes-empty-stage">
              <div className="codex-empty-file-icon-box">
                <IconFile size={32} className="text-ink-4 opacity-60" />
              </div>
              <h3 className="codex-empty-title">Select a file to inspect</h3>
              <p className="codex-empty-subtitle">Click on any file in the right list to view its diff.</p>
            </div>
          )}
        </div>

        {/* Right column: Filter files input & list */}
        {showRightFiles && (
          <div className="codex-changes-files-sidebar">
            <div className="codex-changes-filter-box">
              <IconSearch size={13} className="text-ink-4 shrink-0" />
              <input
                type="text"
                placeholder="Filter files..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="codex-changes-filter-input"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery("")}
                  className="text-ink-4 hover:text-ink text-[11px]"
                >
                  <IconX size={11} />
                </button>
              )}
            </div>

            <div className="codex-changes-file-list scroll-thin">
              {filteredFiles.length === 0 ? (
                <div className="codex-no-matching-files">
                  No matching files
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = (activePath ?? "") === file.path;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedPath(file.path)}
                      className={cn(
                        "codex-file-row-btn",
                        isSelected && "is-selected"
                      )}
                    >
                      <span
                        className={cn(
                          "codex-file-status-letter",
                          file.status === "A"
                            ? "text-mint"
                            : file.status === "D"
                            ? "text-rose"
                            : "text-amber"
                        )}
                      >
                        {file.status}
                      </span>
                      <span className="codex-file-row-name truncate" title={file.path}>
                        {file.path.split("/").pop()}
                      </span>
                      <span className="codex-file-row-diff font-mono">
                        <span className="text-mint">+{formatCount(file.adds)}</span>{" "}
                        <span className="text-rose">−{formatCount(file.dels)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer summary */}
            {files.length > 0 && (
              <div className="codex-files-footer">
                <span className="text-ink-4">{files.length} changed</span>
                {effectiveState?.pr && onMerge && (
                  <button
                    type="button"
                    onClick={onMerge}
                    className="ml-auto text-[11px] font-medium text-iris-soft hover:underline"
                  >
                    Merge PR #{effectiveState.pr.number}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Right-Side Sliding Drawer Wrapper ----------------
   The drawer carries its own slim header (name · maximize · close); the
   content below is the very same ChangesPanelContent the workspace tab
   uses — one design, two surfaces. */
export function DiffSideDrawer({
  open,
  onClose,
  project,
  state,
  onMerge,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  state?: RepoState | null;
  onMerge?: () => void;
}) {
  const [maximized, setMaximized] = useState(false);

  if (!open) return null;

  return (
    <div className="diff-drawer-portal">
      <div className="diff-drawer-scrim animate-fade" onClick={onClose} aria-hidden />

      <aside
        className={cn(
          "diff-side-drawer animate-sheet",
          maximized && "is-maximized"
        )}
        role="dialog"
        aria-label="Changes and diff inspector"
      >
        <header className="codex-changes-drawer-head">
          <span className="flex min-w-0 items-center gap-2">
            <IconGit size={13} className="shrink-0 text-ink-3" />
            <span className="truncate text-[12.5px] font-medium text-ink">Changes</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className={cn("codex-changes-action-icon", maximized && "text-iris-soft")}
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? "Restore view" : "Maximize (⤢)"}
              aria-label={maximized ? "Restore view" : "Maximize view"}
            >
              {maximized ? <IconMinimize size={13} /> : <IconMaximize size={13} />}
            </button>
            <button
              type="button"
              className="codex-changes-action-icon"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close changes panel"
            >
              <IconX size={13} />
            </button>
          </span>
        </header>
        <ChangesPanelContent
          project={project}
          state={state}
          onMerge={onMerge}
        />
      </aside>
    </div>
  );
}

export { DiffSideDrawer as DiffDialog };
