import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PROVIDER_SEEDS, type ModelProvider } from "../data/providers";
import { readStored, writeStored } from "./storage";

/* ---------------- themes ---------------- */
export type ThemeId = "obsidian" | "daylight" | "nord" | "ember" | "paper" | "ink";
export type DesignId = "aro" | "codex" | "claude" | "editorial" | "cursor";
export const THEMES: { id: ThemeId; label: string; desc: string; swatch: string[] }[] = [
  { id: "obsidian", label: "Obsidian", desc: "Deep neutral dark · violet accent", swatch: ["#0c0e14", "#12151d", "#7c6bff", "#35d6c4"] },
  { id: "daylight", label: "Daylight", desc: "Clean light · high legibility", swatch: ["#ffffff", "#f4f5f8", "#5b4ce6", "#0f9f90"] },
  { id: "nord", label: "Nord", desc: "Arctic blue-grey · frost accent", swatch: ["#2a303b", "#313845", "#88c0d0", "#a3be8c"] },
  { id: "ember", label: "Ember", desc: "Warm charcoal · copper accent", swatch: ["#171210", "#1f1815", "#ff8a4c", "#4fd1b5"] },
  { id: "paper", label: "Paper", desc: "Warm light · ink on paper", swatch: ["#faf7f0", "#f4f0e6", "#8a5cf6", "#0f8f86"] },
  { id: "ink", label: "Ink", desc: "Editorial dark · serif on near-black", swatch: ["#14110d", "#1c1813", "#e2e8e0", "#e8663a"] },
];

/**
 * Structural systems, not just color themes. Each profile changes hierarchy,
 * type, panel proportions, corner language, and surface treatment.
 */
export const DESIGN_SYSTEMS: {
  id: DesignId;
  label: string;
  source: string;
  desc: string;
  defaultTheme: ThemeId;
  font: string;
  shell: { sidebar: number; context: number; chrome: number };
  traits: string[];
  swatch: string[];
}[] = [
  {
    id: "aro", label: "Aro", source: "Current", desc: "Dense dark control surface with violet signal and generous context.", defaultTheme: "obsidian", font: "Space Grotesk",
    shell: { sidebar: 272, context: 368, chrome: 46 }, traits: ["Balanced density", "Signal color", "Soft elevation"], swatch: ["#0c0e14", "#12151d", "#8f82ff", "#35d6c4"],
  },
  {
    id: "codex", label: "Codex", source: "Codex desktop", desc: "Project-first, monochrome, compact and review-forward.", defaultTheme: "obsidian", font: "Inter",
    shell: { sidebar: 292, context: 400, chrome: 44 }, traits: ["Project sidebar", "Tight rows", "Quiet chrome"], swatch: ["#0a0a0b", "#111214", "#d6d6d2", "#8f8f88"],
  },
  {
    id: "claude", label: "Claude Code", source: "Claude Code desktop", desc: "Session-centric, warm graphite, high-clarity status and tool rows.", defaultTheme: "ember", font: "Inter",
    shell: { sidebar: 284, context: 382, chrome: 48 }, traits: ["Warm graphite", "Conversation focus", "Status clarity"], swatch: ["#181614", "#25211e", "#e29a68", "#a9c7ad"],
  },
  {
    id: "editorial", label: "Editorial", source: "Attached references", desc: "Magazine rhythm: serif display, squared panels, hard rules, oversized numbers. Light (Paper) and dark (Ink).", defaultTheme: "paper", font: "Newsreader",
    shell: { sidebar: 304, context: 420, chrome: 52 }, traits: ["Oversized headlines", "Hard rules", "Squared panels", "Light + dark"], swatch: ["#f8f3ea", "#14110d", "#17130e", "#df5e2e"],
  },
  {
    id: "cursor", label: "Cursor", source: "Cursor 2.x", desc: "VS Code lineage: the most information per pixel. Compact, keyboard-first, subtle blue signal.", defaultTheme: "obsidian", font: "Inter",
    shell: { sidebar: 248, context: 352, chrome: 42 }, traits: ["Compact", "Keyboard-first", "Dense rows", "Subtle blue"], swatch: ["#0d1117", "#161b22", "#58a6ff", "#3fb950"],
  },
];

/* ---------------- product mode ---------------- */
export type ProductMode = "code" | "agent";

/* ---------------- todos ---------------- */
export type Todo = { id: string; text: string; state: "todo" | "doing" | "done"; by?: "agent" | "you" };

type Ctx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  design: DesignId;
  setDesign: (d: DesignId) => void;
  product: ProductMode;
  setProduct: (p: ProductMode) => void;
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  todoOpen: boolean;
  setTodoOpen: (b: boolean) => void;
  toast: (msg: string, tone?: "iris" | "mint" | "amber" | "rose") => void;
  toasts: { id: number; msg: string; tone: string }[];
  termOpen: boolean;
  setTermOpen: (b: boolean) => void;
  termFeed: TermLine[];
  termPush: (lines: TermLine[]) => void;
  dockOpen: boolean;
  setDockOpen: (b: boolean) => void;
  settingsSection: string;
  setSettingsSection: (s: string) => void;
  providers: ModelProvider[];
  setProviders: React.Dispatch<React.SetStateAction<ModelProvider[]>>;
};
export type TermLine = { t: string; k?: "cmd" | "ok" | "err" | "warn" | "dim" | "info" };

const AppCtx = createContext<Ctx>(null!);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(
    () => (localStorage.getItem("conductor.theme") as ThemeId) || "obsidian",
  );
  const [design, setDesignState] = useState<DesignId>(
    () => (localStorage.getItem("conductor.design") as DesignId) || "aro",
  );
  const [product, setProduct] = useState<ProductMode>("code");
  const [todos, setTodos] = useState<Todo[]>(() => readStored("conductor.workspace.v3.todos", []));
  const [todoOpen, setTodoOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: string }[]>([]);

  const [termOpen, setTermOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState("general");
  const [providers, setProviders] = useState<ModelProvider[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("conductor.providers") || "null") as ModelProvider[] | null;
      if (!saved) return PROVIDER_SEEDS;
      const known = PROVIDER_SEEDS.map((p) => {
        const previous = saved.find((x) => x.id === p.id);
        return { ...p, baseUrl: previous?.baseUrl ?? p.baseUrl, models: p.kind === "local" ? previous?.models ?? [] : p.models, status: p.kind === "local" ? "offline" as const : "needs-key" as const };
      });
      const custom = saved.filter((p) => !PROVIDER_SEEDS.some((seed) => seed.id === p.id) && p.name && p.kind === "local").map((p) => ({ ...p, status: "offline" as const }));
      return [...known, ...custom];
    } catch { return PROVIDER_SEEDS; }
  });
  const [termFeed, setTermFeed] = useState<TermLine[]>([]);
  const termPush = useCallback((lines: TermLine[]) => setTermFeed((f) => [...f, ...lines].slice(-400)), []);
  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem("conductor.theme", t);
  }, []);
  const setDesign = useCallback((d: DesignId) => {
    setDesignState(d);
    localStorage.setItem("conductor.design", d);
    const profile = DESIGN_SYSTEMS.find((x) => x.id === d);
    if (profile) {
      setThemeState(profile.defaultTheme);
      localStorage.setItem("conductor.theme", profile.defaultTheme);
    }
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-design", design);
    document.documentElement.setAttribute("data-density", localStorage.getItem("conductor.density") || "comfortable");
    document.documentElement.setAttribute("data-motion", localStorage.getItem("conductor.motion") || "system");
  }, [theme, design]);
  useEffect(() => {
    writeStored("conductor.providers", providers);
  }, [providers]);
  useEffect(() => writeStored("conductor.workspace.v3.todos", todos), [todos]);

  const toast = useCallback((msg: string, tone = "iris") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <AppCtx.Provider value={{ theme, setTheme, design, setDesign, product, setProduct, todos, setTodos, todoOpen, setTodoOpen, toast, toasts, termOpen, setTermOpen, termFeed, termPush, dockOpen, setDockOpen, settingsSection, setSettingsSection, providers, setProviders }}>
      {children}
    </AppCtx.Provider>
  );
}

/* ---------------- vertical resize (bottom panels) ---------------- */
export function useResizableY(initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial);
  const [active, setActive] = useState(false);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const y0 = e.clientY, s0 = size;
    setActive(true);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    const move = (ev: MouseEvent) => setSize(Math.max(min, Math.min(max, s0 - (ev.clientY - y0))));
    const up = () => {
      setActive(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [size, min, max]);
  return { size, setSize, active, handle: { onMouseDown, "data-active": active, className: "resizer-y" } as const };
}

/* ---------------- resizable panel hook ---------------- */
export function useResizable(initial: number, min: number, max: number, dir: "left" | "right" = "right") {
  const [size, setSize] = useState(initial);
  const [active, setActive] = useState(false);
  const start = useRef<{ x: number; s: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      start.current = { x: e.clientX, s: size };
      setActive(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const move = (ev: MouseEvent) => {
        if (!start.current) return;
        const d = (ev.clientX - start.current.x) * (dir === "right" ? 1 : -1);
        setSize(Math.max(min, Math.min(max, start.current.s + d)));
      };
      const up = () => {
        start.current = null;
        setActive(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [size, min, max, dir],
  );

  return { size, setSize, active, handle: { onMouseDown, "data-active": active, className: "resizer" } as const };
}
