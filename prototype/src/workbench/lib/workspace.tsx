import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Project, ProjectSource } from "../data/providers";
import { DEMO_PROJECT, DEMO_TASKS } from "../data/demo";
import { makeId, readStored, writeStored } from "./storage";

export type WorkspaceTask = { id: string; title: string; projectId?: string; status: "todo" | "doing" | "done"; createdAt: string };
export type WorkspaceSkill = { id: string; name: string; instructions: string; enabled: boolean };
export type WorkspaceConnector = { id: string; name: string; endpoint: string; transport: "http" | "stdio"; enabled: boolean };
export type ProjectInput = { name: string; color?: string; sources: ProjectSource[]; sourceFiles?: Record<string, File[]> };

/* Sticky agent plan: captured whenever an agent run creates a plan, kept at the
   composer corner across sessions and projects until cleared. */
export type AgentPlanItem = { id: string; text: string; state: "todo" | "doing" | "done" };
export type AgentPlan = { items: AgentPlanItem[]; sessionId?: string; title: string; updatedAt: number };

export const PROJECT_COLORS = [
  { value: "#818cf8", label: "Iris" },
  { value: "#38bdf8", label: "Sky" },
  { value: "#34d399", label: "Mint" },
  { value: "#fbbf24", label: "Amber" },
  { value: "#f472b6", label: "Rose" },
  { value: "#a78bfa", label: "Purple" },
  { value: "#fb923c", label: "Orange" },
  { value: "#94a3b8", label: "Slate" },
];

export type WorkspaceContextValue = {
  projects: Project[];
  userProjects: Project[];
  /** The reference demo project with the user's overrides (pin/archive/rename) applied. */
  demoProject: Project;
  addProject: (input: ProjectInput) => Project;
  updateProject: (project: Project) => void;
  setProjectColor: (id: string, color: string) => void;
  toggleProjectPin: (id: string) => void;
  archiveProject: (id: string, archived: boolean) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  /** Copies a project (shell only) into a fresh user project and returns it. */
  duplicateProject: (id: string) => Project;
  demoEnabled: boolean;
  setDemoEnabled: (v: boolean) => void;
  isDemoProject: (id?: string) => boolean;
  sourceFiles: Record<string, File[]>;
  tasks: WorkspaceTask[];
  setTasks: Dispatch<SetStateAction<WorkspaceTask[]>>;
  skills: WorkspaceSkill[];
  setSkills: Dispatch<SetStateAction<WorkspaceSkill[]>>;
  connectors: WorkspaceConnector[];
  setConnectors: Dispatch<SetStateAction<WorkspaceConnector[]>>;
  rules: string[];
  setRules: Dispatch<SetStateAction<string[]>>;
  projectDialogOpen: boolean;
  requestProject: (onCreated?: (project: Project) => void) => void;
  closeProjectDialog: () => void;
  finishProject: (input: ProjectInput) => Project;
  agentPlan: AgentPlan | null;
  setAgentPlan: Dispatch<SetStateAction<AgentPlan | null>>;
  updateAgentPlanItem: (id: string, patch: Partial<AgentPlanItem>) => void;
  addAgentPlanItem: (text: string) => void;
  removeAgentPlanItem: (id: string) => void;
  clearAgentPlan: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue>(null!);
export const useWorkspace = () => useContext(WorkspaceContext);

function loadProjects(): Project[] {
  const legacy = readStored<Project[]>("conductor.projects", []);
  const demoIds = new Set(["platform", "payments", "editors", "personal"]);
  const userProjects = Array.isArray(legacy) ? legacy.filter((project) => project.id && project.name && !demoIds.has(project.id)) : [];
  return readStored<Project[]>("conductor.workspace.v3.projects", userProjects);
}

/* Per-user tweaks applied on top of the overlaid reference demo (SofiaUI):
   pinning, archiving, renaming and color tweaks work on it like on any other project. */
type DemoOverrides = { pinned?: boolean; archived?: boolean; name?: string; color?: string };

function loadDemoOverrides(): DemoOverrides {
  return readStored<DemoOverrides>("conductor.workspace.v3.demo-over", {});
}

function loadAgentPlan(): AgentPlan | null {
  const stored = readStored<AgentPlan | null>("conductor.agentplan.v1", null);
  return stored && Array.isArray(stored.items) && stored.items.length > 0 ? stored : null;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  // User projects only — the reference demo is overlaid, never persisted.
  const [userProjects, setUserProjects] = useState<Project[]>(loadProjects);
  const [demoEnabled, setDemoEnabledState] = useState<boolean>(() => readStored("conductor.workspace.v3.demo", true));
  const [sourceFiles, setSourceFiles] = useState<Record<string, File[]>>({});
  const [userTasks, setUserTasks] = useState<WorkspaceTask[]>(() => readStored("conductor.workspace.v3.tasks", []));
  const [skills, setSkills] = useState<WorkspaceSkill[]>(() => readStored("conductor.workspace.v3.skills", []));
  const [connectors, setConnectors] = useState<WorkspaceConnector[]>(() => readStored("conductor.workspace.v3.connectors", []));
  const [rules, setRules] = useState<string[]>(() => readStored("conductor.workspace.v3.rules", []));
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [demoOver, setDemoOver] = useState<DemoOverrides>(loadDemoOverrides);
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(loadAgentPlan);
  const afterCreate = useRef<((project: Project) => void) | undefined>(undefined);

  /* the demo project with overrides applied — pinned/archived/renamed/colored by the user */
  const demoProject = useMemo<Project>(() => ({
    ...DEMO_PROJECT,
    ...(demoOver.name ? { name: demoOver.name } : {}),
    pinned: Boolean(demoOver.pinned),
    archived: Boolean(demoOver.archived),
    color: demoOver.color ?? DEMO_PROJECT.color ?? "#818cf8",
  }), [demoOver]);
  const projects = demoEnabled
    ? [...(demoProject.archived ? [] : [demoProject]), ...userProjects.filter((p) => p.id !== DEMO_PROJECT.id && !p.archived)]
    : userProjects.filter((p) => !p.archived);
  const tasks = demoEnabled ? [...DEMO_TASKS, ...userTasks] : userTasks;

  useEffect(() => writeStored("conductor.workspace.v3.projects", userProjects), [userProjects]);
  useEffect(() => writeStored("conductor.workspace.v3.tasks", userTasks), [userTasks]);
  useEffect(() => writeStored("conductor.workspace.v3.skills", skills), [skills]);
  useEffect(() => writeStored("conductor.workspace.v3.connectors", connectors), [connectors]);
  useEffect(() => writeStored("conductor.workspace.v3.rules", rules), [rules]);
  useEffect(() => writeStored("conductor.workspace.v3.demo", demoEnabled), [demoEnabled]);
  useEffect(() => writeStored("conductor.workspace.v3.demo-over", demoOver), [demoOver]);
  useEffect(() => { if (agentPlan) writeStored("conductor.agentplan.v1", agentPlan); else localStorage.removeItem("conductor.agentplan.v1"); }, [agentPlan]);

  const addProject = useCallback((input: ProjectInput): Project => {
    const colors = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#94a3b8"];
    const project: Project = {
      id: makeId("project"), name: input.name.trim(), kind: input.sources.some((s) => s.kind === "git" || Boolean(s.branch)) ? "repo" : "workspace",
      color: input.color || colors[Math.floor(Math.random() * colors.length)], sources: input.sources,
      path: input.sources[0]?.path ?? input.sources[0]?.remoteUrl,
      defaults: { agentId: "claude-code", mode: "agent", rules: [] },
    };
    setUserProjects((all) => [...all, project]);
    if (input.sourceFiles) setSourceFiles((all) => ({ ...all, ...input.sourceFiles }));
    return project;
  }, []);
  const updateProject = useCallback((project: Project) => {
    if (project.id === DEMO_PROJECT.id) {
      if (project.color) setDemoOver((o) => ({ ...o, color: project.color }));
      return;
    }
    setUserProjects((all) => all.map((p) => p.id === project.id ? project : p));
  }, []);
  const setProjectColor = useCallback((id: string, color: string) => {
    if (id === DEMO_PROJECT.id) {
      setDemoOver((o) => ({ ...o, color }));
      return;
    }
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, color } : p));
  }, []);
  const toggleProjectPin = useCallback((id: string) => {
    if (id === DEMO_PROJECT.id) { setDemoOver((o) => ({ ...o, pinned: !o.pinned })); return; }
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, pinned: !p.pinned } : p));
  }, []);
  const archiveProject = useCallback((id: string, archived: boolean) => {
    if (id === DEMO_PROJECT.id) { setDemoOver((o) => ({ ...o, archived })); return; }
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, archived } : p));
  }, []);
  const deleteProject = useCallback((id: string) => {
    /* deleting the reference demo hides the overlay — the Demo toggle brings it back */
    if (id === DEMO_PROJECT.id) { setDemoOver({}); setDemoEnabledState(false); return; }
    setUserProjects((all) => all.filter((p) => p.id !== id));
    setSourceFiles((all) => { const next = { ...all }; delete next[id]; return next; });
  }, []);
  const renameProject = useCallback((id: string, name: string) => {
    if (id === DEMO_PROJECT.id) { setDemoOver((o) => ({ ...o, name })); return; }
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, name } : p));
  }, []);
  const duplicateProject = useCallback((id: string): Project => {
    const source = id === DEMO_PROJECT.id ? demoProject : userProjects.find((p) => p.id === id);
    if (!source) return demoProject;
    const taken = new Set(userProjects.map((p) => p.name.toLowerCase()));
    let name = `${source.name} copy`;
    for (let i = 2; taken.has(name.toLowerCase()); i += 1) name = `${source.name} copy ${i}`;
    const copy: Project = { ...source, id: makeId("project"), name, pinned: false, archived: false, defaults: source.defaults ? { ...source.defaults } : undefined };
    setUserProjects((all) => [...all, copy]);
    return copy;
  }, [userProjects, demoProject]);

  /* ---- sticky agent plan ---- */
  const updateAgentPlanItem = useCallback((id: string, patch: Partial<AgentPlanItem>) => {
    setAgentPlan((plan) => (plan ? { ...plan, items: plan.items.map((it) => it.id === id ? { ...it, ...patch } : it), updatedAt: Date.now() } : plan));
  }, []);
  const addAgentPlanItem = useCallback((text: string) => {
    setAgentPlan((plan) => plan ? { ...plan, items: [...plan.items, { id: `ap${Date.now()}`, text, state: "todo" }], updatedAt: Date.now() } : plan);
  }, []);
  const removeAgentPlanItem = useCallback((id: string) => {
    setAgentPlan((plan) => (plan && plan.items.length > 1 ? { ...plan, items: plan.items.filter((it) => it.id !== id), updatedAt: Date.now() } : null));
  }, []);
  const clearAgentPlan = useCallback(() => setAgentPlan(null), []);
  const setDemoEnabled = useCallback((v: boolean) => setDemoEnabledState(v), []);
  const isDemoProject = useCallback((id?: string) => id === DEMO_PROJECT.id, []);
  const requestProject = useCallback((onCreated?: (project: Project) => void) => {
    afterCreate.current = onCreated;
    setProjectDialogOpen(true);
  }, []);
  const closeProjectDialog = useCallback(() => { setProjectDialogOpen(false); afterCreate.current = undefined; }, []);
  const finishProject = useCallback((input: ProjectInput) => {
    const project = addProject(input);
    setProjectDialogOpen(false);
    const callback = afterCreate.current;
    afterCreate.current = undefined;
    callback?.(project);
    return project;
  }, [addProject]);

  return <WorkspaceContext.Provider value={{ projects, userProjects, demoProject, addProject, updateProject, setProjectColor, toggleProjectPin, archiveProject, deleteProject, renameProject, duplicateProject, demoEnabled, setDemoEnabled, isDemoProject, sourceFiles, tasks, setTasks: setUserTasks as Dispatch<SetStateAction<WorkspaceTask[]>>, skills, setSkills, connectors, setConnectors, rules, setRules, projectDialogOpen, requestProject, closeProjectDialog, finishProject, agentPlan, setAgentPlan, updateAgentPlanItem, addAgentPlanItem, removeAgentPlanItem, clearAgentPlan }}>{children}</WorkspaceContext.Provider>;
}