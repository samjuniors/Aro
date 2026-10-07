import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { Project, ProjectSource } from "../data/providers";
import { useWorkspace } from "../lib/workspace";
import { makeId } from "../lib/storage";
import { IconCheck, IconChevronDown, IconFolder, IconGit, IconPin, IconPlus, IconSearch, IconX } from "./Icons";
import { Button, Input, Menu, MenuItem, Modal } from "./ui";

type FileHandle = { kind: "file"; name: string; getFile: () => Promise<File> };
type DirectoryHandle = { kind: "directory"; name: string; values: () => AsyncIterable<FileHandle | DirectoryHandle>; getDirectoryHandle: (name: string) => Promise<DirectoryHandle>; getFileHandle: (name: string) => Promise<FileHandle> };
type PickerWindow = Window & { showDirectoryPicker?: (options?: { mode: "read" }) => Promise<DirectoryHandle> };

export function ProjectDialog() {
  const { projects, projectDialogOpen: open, closeProjectDialog, finishProject } = useWorkspace();
  const [name, setName] = useState("");
  const [sources, setSources] = useState<ProjectSource[]>([]);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [error, setError] = useState("");
  const [addingGit, setAddingGit] = useState(false);
  const [gitUrl, setGitUrl] = useState("");
  const [reading, setReading] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(""); setSources([]); setFiles({}); setError(""); setAddingGit(false); setGitUrl("");
    const timer = window.setTimeout(() => nameInput.current?.focus(), 80);
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
    return () => window.clearTimeout(timer);
  }, [open]);

  const addFolder = (folderName: string, selected: File[], branch?: string, remoteUrl?: string) => {
    const id = makeId("source");
    setSources((all) => [...all, { id, kind: "folder", name: folderName, path: folderName, fileCount: selected.length, branch, remoteUrl }]);
    setFiles((all) => ({ ...all, [id]: selected }));
    setName((v) => v || folderName);
  };

  const chooseFolder = async () => {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) { folderInput.current?.click(); return; }
    setError("");
    try {
      const directory = await picker.call(window, { mode: "read" });
      setReading(true);
      const selected: File[] = [];
      const skip = new Set([".git", "node_modules", "dist", ".next", ".cache", ".venv"]);
      const walk = async (handle: DirectoryHandle) => {
        for await (const entry of handle.values()) {
          if (selected.length >= 1500) break;
          if (entry.kind === "file") selected.push(await entry.getFile());
          else if (!skip.has(entry.name)) await walk(entry);
        }
      };
      await walk(directory);
      let branch: string | undefined;
      let remoteUrl: string | undefined;
      try {
        const git = await directory.getDirectoryHandle(".git");
        const head = await (await git.getFileHandle("HEAD")).getFile();
        branch = (await head.text()).match(/^ref:\s*refs\/heads\/(.+)/)?.[1]?.trim();
        const config = await (await git.getFileHandle("config")).getFile();
        remoteUrl = (await config.text()).match(/\[remote "origin"\][\s\S]*?url\s*=\s*(\S+)/)?.[1];
        if (remoteUrl?.startsWith("http")) {
          const safeUrl = new URL(remoteUrl);
          safeUrl.username = ""; safeUrl.password = "";
          remoteUrl = safeUrl.href;
        }
      } catch { /* A source folder does not have to be a Git repository. */ }
      addFolder(directory.name, selected, branch, remoteUrl);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError("The folder could not be opened. Try the folder-upload option in a supported browser.");
    } finally { setReading(false); }
  };

  const addGit = () => {
    const value = gitUrl.trim();
    let valid = /^git@[^\s:]+:[^\s]+$/.test(value);
    if (!valid) {
      try {
        const url = new URL(value);
        valid = ["http:", "https:"].includes(url.protocol) && url.pathname.length > 1 && !url.username && !url.password;
      } catch { valid = false; }
    }
    if (!valid) { setError("Enter an HTTPS or SSH repository URL without credentials."); return; }
    const repoName = value.split(/[/:]/).filter(Boolean).at(-1)?.replace(/\.git$/, "") || "repository";
    setSources((all) => [...all, { id: makeId("source"), kind: "git", name: repoName, remoteUrl: value }]);
    setName((v) => v || repoName); setGitUrl(""); setAddingGit(false); setError("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { nameInput.current?.focus(); return; }
    if (projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) { setError("A project with this name already exists."); return; }
    finishProject({ name: trimmed, sources, sourceFiles: files });
  };

  return <Modal open={open} onClose={closeProjectDialog} title="Create project" width={520} plain>
    <form onSubmit={submit} className="px-5 pt-0.5 pb-5">
      <div className="project-name-field flex h-[40px] items-center rounded-[12px] border border-line bg-base focus-within:border-sky focus-within:ring-1 focus-within:ring-sky/30">
        <span className="flex h-5 w-11 shrink-0 items-center justify-center border-r border-line-soft text-ink-2"><IconFolder size={14} /></span>
        <input ref={nameInput} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Project name" aria-label="Project name" autoComplete="off" maxLength={100} className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-ink placeholder:text-ink-4 focus:outline-none" />
      </div>

      <label className="mt-3.5 mb-2 block text-[12px] font-medium text-ink">Source folders</label>
      <div className="project-sources-box rounded-[12px] border border-line-soft bg-base/45">
        {sources.length > 0 && <div className="space-y-1 px-3 pt-3">
          {sources.map((source) => <div key={source.id} className="flex items-center gap-2 rounded-[7px] bg-hover/35 px-2 py-1.5">
            {source.kind === "folder" ? <IconFolder size={13} className="text-ink-3" /> : <IconGit size={13} className="text-ink-3" />}
            <div className="min-w-0 flex-1"><span className="block truncate text-[12px] text-ink-2">{source.name}</span><span className="block truncate text-[10px] text-ink-4">{source.kind === "folder" ? `${source.fileCount ?? 0} readable files${source.branch ? ` · ${source.branch}` : ""}` : "Repository reference · not cloned"}</span></div>
            <button type="button" onClick={() => setSources((all) => all.filter((s) => s.id !== source.id))} aria-label={`Remove ${source.name}`} className="flex size-6 items-center justify-center rounded text-ink-4 hover:bg-hover hover:text-ink"><IconX size={11} /></button>
          </div>)}
        </div>}
        <div className="flex min-h-[102px] flex-col items-center justify-center gap-2 py-5">
          <Menu width={240} align="right" trigger={() => <button type="button" className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink">{reading ? "Reading folder…" : "Add a folder on this computer"}<IconChevronDown size={11} /></button>}>
            {(close) => <>
              <MenuItem icon={<IconFolder size={13} />} label="Choose a local folder" onClick={() => { close(); void chooseFolder(); }} />
              <MenuItem icon={<IconGit size={13} />} label="Add repository URL" onClick={() => { close(); setAddingGit(true); }} />
            </>}
          </Menu>
          <button type="button" onClick={() => void chooseFolder()} disabled={reading} className="flex h-[25px] items-center gap-1.5 rounded-full bg-hover/55 px-2.5 text-[12px] text-ink-2 transition-colors hover:bg-hover disabled:opacity-50"><IconFolder size={12} /><IconPlus size={10} />Add</button>
        </div>
      </div>
      <input ref={(element) => { folderInput.current = element; element?.setAttribute("webkitdirectory", ""); element?.setAttribute("directory", ""); }} type="file" multiple className="hidden" aria-label="Select folder" onChange={(e) => { const selected = Array.from(e.target.files ?? []); if (selected.length) addFolder(selected[0].webkitRelativePath.split("/")[0] || "Selected folder", selected); e.target.value = ""; }} />
      {addingGit && <div className="mt-2 flex gap-2"><Input value={gitUrl} onChange={(e) => setGitUrl(e.target.value)} placeholder="https://github.com/owner/repository" className="font-mono text-[11px]" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGit(); } }} /><Button size="sm" onClick={addGit} icon={IconPlus}>Add</Button></div>}
      {error && <p role="alert" className="mt-2 text-[11px] text-rose">{error}</p>}
      {sources.some((s) => s.kind === "git") && <p className="mt-2 text-[10px] leading-relaxed text-ink-4">Repository metadata is saved here. Clone, PR and merge operations require a Git runtime connection.</p>}
      <div className="mt-8 flex items-center justify-end gap-4"><button type="button" onClick={closeProjectDialog} className="h-[32px] px-1 text-[12px] text-ink-3 hover:text-ink">Cancel</button><button type="submit" disabled={!name.trim() || reading} className="reference-create-button h-[33px] rounded-[9px] bg-ink px-4 text-[12px] font-medium text-base transition-opacity hover:opacity-85 disabled:opacity-40">Create project</button></div>
    </form>
  </Modal>;
}

export function ProjectChooser({ project, onChoose }: { project?: Project; onChoose: (id?: string, createdProject?: Project) => void }) {
  const { projects, userProjects, requestProject, isDemoProject } = useWorkspace();
  const [search, setSearch] = useState("");
  const create = () => requestProject((p) => onChoose(p.id, p));
  const label = project
    ? <><IconFolder size={13} /><span className="truncate">{project.name}</span>{isDemoProject(project.id) && <span className="repo-dock-demo">DEMO</span>}<IconChevronDown size={11} className="ml-auto opacity-60" /></>
    : <><IconFolder size={13} className="opacity-70" /><span>Choose project</span></>;

  if (!projects.length) return <button type="button" onClick={create} className="composer-project-strip">{label}</button>;
  const matches = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const sortedMatches = [...matches].sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));
  const archived = userProjects.filter((p) => p.archived && p.name.toLowerCase().includes(search.toLowerCase()));
  return <Menu side="top" width={340} className="w-full" trigger={() => <button type="button" className={cn("composer-project-strip", project && "has-project")}>{label}</button>}>
    {(close) => <div className="repo-chooser">
      <div className="repo-chooser-search"><IconSearch size={13} /><input placeholder="Search repositories…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search repositories" /></div>
      <div className="repo-chooser-list">
        {sortedMatches.map((p) => (
          <button key={p.id} onClick={() => { onChoose(p.id); close(); }} className={cn("repo-chooser-row", p.id === project?.id && "selected")}>
            <span className="repo-chooser-main"><span className="repo-chooser-name">{p.name}{p.pinned && <IconPin size={9} className="ml-1.5 inline text-iris-soft" />}</span>{p.sources?.[0] && <span className="repo-chooser-sub">{p.sources[0].kind === "git" ? p.sources[0].remoteUrl?.replace(/^https?:\/\//, "") : `${p.sources[0].fileCount ?? 0} files`}</span>}</span>
            {isDemoProject(p.id) && <span className="repo-chooser-demo">DEMO</span>}
            {p.id === project?.id && <IconCheck size={13} className="repo-chooser-check" />}
          </button>
        ))}
        {!sortedMatches.length && archived.length === 0 && <p className="repo-chooser-empty">No repositories match “{search}”.</p>}
        {archived.length > 0 && <>
          <p className="repo-chooser-archived-label">Archived</p>
          {archived.map((p) => (
            <button key={p.id} onClick={() => { onChoose(p.id); close(); }} className="repo-chooser-row" title="This project is archived — open anyway or restore it from the sidebar archive view">
              <span className="repo-chooser-main"><span className="repo-chooser-name opacity-60">{p.name}</span></span>
              <span className="repo-chooser-demo">ARCHIVED</span>
            </button>
          ))}
        </>}
      </div>
      <button onClick={() => { close(); create(); }} className="repo-chooser-add"><IconPlus size={12} /> Add repositories…</button>
      {project && <button onClick={() => { onChoose(undefined); close(); }} className="repo-chooser-add repo-chooser-clear"><IconX size={11} /> Continue without a project</button>}
    </div>}
  </Menu>;
}