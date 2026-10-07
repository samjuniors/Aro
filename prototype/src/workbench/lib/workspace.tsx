import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Project, ProjectSource } from "../data/providers";
import { DEMO_PROJECT, DEMO_TASKS } from "../data/demo";
import { makeId, readStored, writeStored } from "./storage";

export type WorkspaceTask = { id: string; title: string; projectId?: string; status: "todo" | "doing" | "done"; createdAt: string };
export type WorkspaceSkill = { id: string; name: string; instructions: string; enabled: boolean };
export type WorkspaceConnector = { id: string; name: string; endpoint: string; transport: "http" | "stdio"; enabled: boolean };
export type ProjectInput = { name: string; sources: ProjectSource[]; sourceFiles?: Record<string, File[]> };

/* Sticky agent plan: captured whenever an agent run creates a plan, kept at the
   composer corner across sessions and projects until cleared. */
export type AgentPlanItem = { id: string; text: string; state: "todo" | "doing" | "done" };
export type AgentPlan = { items: AgentPlanItem[]; sessionId?: string; title: string; updatedAt: number };

type WorkspaceContextValue = {
  projects: Project[];
  userProjects: Project[];
  addProject: (input: ProjectInput) => Project;
  updateProject: (project: Project) => void;
  toggleProjectPin: (id: string) => void;
  archiveProject: (id: string, archived: boolean) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
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
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(loadAgentPlan);
  const afterCreate = useRef<((project: Project) => void) | undefined>(undefined);

  const projects = demoEnabled
    ? [DEMO_PROJECT, ...userProjects.filter((p) => p.id !== DEMO_PROJECT.id && !p.archived)]
    : userProjects.filter((p) => !p.archived);
  const tasks = demoEnabled ? [...DEMO_TASKS, ...userTasks] : userTasks;

  useEffect(() => writeStored("conductor.workspace.v3.projects", userProjects), [userProjects]);
  useEffect(() => writeStored("conductor.workspace.v3.tasks", userTasks), [userTasks]);
  useEffect(() => writeStored("conductor.workspace.v3.skills", skills), [skills]);
  useEffect(() => writeStored("conductor.workspace.v3.connectors", connectors), [connectors]);
  useEffect(() => writeStored("conductor.workspace.v3.rules", rules), [rules]);
  useEffect(() => writeStored("conductor.workspace.v3.demo", demoEnabled), [demoEnabled]);
  useEffect(() => { if (agentPlan) writeStored("conductor.agentplan.v1", agentPlan); else localStorage.removeItem("conductor.agentplan.v1"); }, [agentPlan]);

  const addProject = useCallback((input: ProjectInput): Project => {
    const colors = ["#a89cff", "#6ab6a0", "#ca9b68", "#8bacdb", "#c989af"];
    const project: Project = {
      id: makeId("project"), name: input.name.trim(), kind: input.sources.some((s) => s.kind === "git" || Boolean(s.branch)) ? "repo" : "workspace",
      color: colors[Math.floor(Math.random() * colors.length)], sources: input.sources,
      path: input.sources[0]?.path ?? input.sources[0]?.remoteUrl,
      defaults: { agentId: "claude-code", mode: "agent", rules: [] },
    };
    setUserProjects((all) => [...all, project]);
    if (input.sourceFiles) setSourceFiles((all) => ({ ...all, ...input.sourceFiles }));
    return project;
  }, []);
  const updateProject = useCallback((project: Project) => {
    if (project.id === DEMO_PROJECT.id) return;
    setUserProjects((all) => all.map((p) => p.id === project.id ? project : p));
  }, []);
  const toggleProjectPin = useCallback((id: string) => {
    if (id === DEMO_PROJECT.id) return;
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, pinned: !p.pinned } : p));
  }, []);
  const archiveProject = useCallback((id: string, archived: boolean) => {
    if (id === DEMO_PROJECT.id) return;
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, archived } : p));
  }, []);
  const deleteProject = useCallback((id: string) => {
    if (id === DEMO_PROJECT.id) return;
    setUserProjects((all) => all.filter((p) => p.id !== id));
    setSourceFiles((all) => { const next = { ...all }; delete next[id]; return next; });
  }, []);
  const renameProject = useCallback((id: string, name: string) => {
    if (id === DEMO_PROJECT.id) return;
    setUserProjects((all) => all.map((p) => p.id === id ? { ...p, name } : p));
  }, []);

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

  return <WorkspaceContext.Provider value={{ projects, userProjects, addProject, updateProject, toggleProjectPin, archiveProject, deleteProject, renameProject, demoEnabled, setDemoEnabled, isDemoProject, sourceFiles, tasks, setTasks: setUserTasks as Dispatch<SetStateAction<WorkspaceTask[]>>, skills, setSkills, connectors, setConnectors, rules, setRules, projectDialogOpen, requestProject, closeProjectDialog, finishProject, agentPlan, setAgentPlan, updateAgentPlanItem, addAgentPlanItem, removeAgentPlanItem, clearAgentPlan }}>{children}</WorkspaceContext.Provider>;
}