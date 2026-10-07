import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Project, ProjectSource } from "../data/providers";
import { DEMO_PROJECT, DEMO_TASKS } from "../data/demo";
import { makeId, readStored, writeStored } from "./storage";

export type WorkspaceTask = { id: string; title: string; projectId?: string; status: "todo" | "doing" | "done"; createdAt: string };
export type WorkspaceSkill = { id: string; name: string; instructions: string; enabled: boolean };
export type WorkspaceConnector = { id: string; name: string; endpoint: string; transport: "http" | "stdio"; enabled: boolean };
export type ProjectInput = { name: string; sources: ProjectSource[]; sourceFiles?: Record<string, File[]> };

type WorkspaceContextValue = {
  projects: Project[];
  userProjects: Project[];
  addProject: (input: ProjectInput) => Project;
  updateProject: (project: Project) => void;
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
};

const WorkspaceContext = createContext<WorkspaceContextValue>(null!);
export const useWorkspace = () => useContext(WorkspaceContext);

function loadProjects(): Project[] {
  const legacy = readStored<Project[]>("conductor.projects", []);
  const demoIds = new Set(["platform", "payments", "editors", "personal"]);
  const userProjects = Array.isArray(legacy) ? legacy.filter((project) => project.id && project.name && !demoIds.has(project.id)) : [];
  return readStored<Project[]>("conductor.workspace.v3.projects", userProjects);
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
  const afterCreate = useRef<((project: Project) => void) | undefined>(undefined);

  const projects = demoEnabled ? [DEMO_PROJECT, ...userProjects.filter((p) => p.id !== DEMO_PROJECT.id)] : userProjects;
  const tasks = demoEnabled ? [...DEMO_TASKS, ...userTasks] : userTasks;

  useEffect(() => writeStored("conductor.workspace.v3.projects", userProjects), [userProjects]);
  useEffect(() => writeStored("conductor.workspace.v3.tasks", userTasks), [userTasks]);
  useEffect(() => writeStored("conductor.workspace.v3.skills", skills), [skills]);
  useEffect(() => writeStored("conductor.workspace.v3.connectors", connectors), [connectors]);
  useEffect(() => writeStored("conductor.workspace.v3.rules", rules), [rules]);
  useEffect(() => writeStored("conductor.workspace.v3.demo", demoEnabled), [demoEnabled]);

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

  return <WorkspaceContext.Provider value={{ projects, userProjects, addProject, updateProject, demoEnabled, setDemoEnabled, isDemoProject, sourceFiles, tasks, setTasks: setUserTasks as Dispatch<SetStateAction<WorkspaceTask[]>>, skills, setSkills, connectors, setConnectors, rules, setRules, projectDialogOpen, requestProject, closeProjectDialog, finishProject }}>{children}</WorkspaceContext.Provider>;
}