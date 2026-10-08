import { useCallback, useSyncExternalStore } from "react";
import { readStored, writeStored } from "../lib/storage";
import type { WorkspaceTool } from "../components/WorkspacePanel";

export type SupportedIde = "cursor" | "vscode" | "windsurf" | "zed";

export interface IdeDefinition {
  id: SupportedIde;
  name: string;
  scheme: string;
  tagline: string;
  color: string;
}

export const IDE_CATALOG: IdeDefinition[] = [
  { id: "cursor", name: "Cursor", scheme: "cursor://file", tagline: "AI-first code editor", color: "#818cf8" },
  { id: "vscode", name: "VS Code", scheme: "vscode://file", tagline: "Visual Studio Code", color: "#38bdf8" },
  { id: "windsurf", name: "Windsurf", scheme: "windsurf://file", tagline: "Codeium flow editor", color: "#34d399" },
  { id: "zed", name: "Zed", scheme: "zed://file", tagline: "High-performance multiplayer editor", color: "#fbbf24" },
];

export interface PrototypeConfig {
  // Layout Modules
  layout: {
    sidebar: boolean;
    workspacePanel: boolean;
    terminal: boolean;
    statusBar: boolean;
    repoBar: boolean;
    planCorner: boolean;
    voiceOrb: boolean;
  };
  // Titlebar Components & Buttons
  titlebar: {
    productSwitcher: boolean;
    projectTitle: boolean;
    searchPill: boolean;
    shortcutsBtn: boolean;
    quickSettings: boolean;
    studioBtn: boolean;
    profileAvatar: boolean;
  };
  // External IDE Preference
  preferredIde: SupportedIde;
  // Workspace Panel Configuration
  workspace: {
    fixedTabWidth: boolean;
    showConnectTools: boolean;
    showCloseAll: boolean;
    showFullscreen: boolean;
    enabledTools: WorkspaceTool[];
  };
  // Composer controls
  composer: {
    attachments: boolean;
    projectPicker: boolean;
    permissions: boolean;
    modelSelector: boolean;
    voiceButton: boolean;
    freshSuggestions: boolean;
  };
}

export const DEFAULT_PROTOTYPE_CONFIG: PrototypeConfig = {
  layout: {
    sidebar: true,
    workspacePanel: true,
    terminal: false,
    statusBar: true,
    repoBar: true,
    planCorner: true,
    voiceOrb: true,
  },
  titlebar: {
    productSwitcher: true,
    projectTitle: true,
    searchPill: true,
    shortcutsBtn: true,
    quickSettings: true,
    studioBtn: true,
    profileAvatar: true,
  },
  preferredIde: "cursor",
  workspace: {
    fixedTabWidth: true,
    showConnectTools: true,
    showCloseAll: true,
    showFullscreen: true,
    enabledTools: [
      "browse",
      "changes",
      "terminal",
      "artifacts",
      "memory",
      "files",
      "search",
      "tasks",
      "runs",
      "automations",
    ],
  },
  composer: {
    attachments: true,
    projectPicker: true,
    permissions: true,
    modelSelector: true,
    voiceButton: true,
    freshSuggestions: true,
  },
};

export const PROTOTYPE_PRESETS: {
  id: string;
  name: string;
  desc: string;
  config: Partial<PrototypeConfig>;
}[] = [
  {
    id: "full-ide",
    name: "Full IDE (Cursor/VS Code)",
    desc: "All panels, external IDE icon, workspace tools, dense control bars",
    config: {
      titlebar: {
        productSwitcher: true,
        projectTitle: true,
        searchPill: true,
        shortcutsBtn: true,
        quickSettings: true,
        studioBtn: true,
        profileAvatar: true,
      },
      workspace: {
        fixedTabWidth: true,
        showConnectTools: true,
        showCloseAll: true,
        showFullscreen: true,
        enabledTools: [
          "browse",
          "changes",
          "terminal",
          "artifacts",
          "memory",
          "files",
          "search",
          "tasks",
          "runs",
          "automations",
        ],
      },
      layout: {
        sidebar: true,
        workspacePanel: true,
        terminal: true,
        statusBar: true,
        repoBar: true,
        planCorner: true,
        voiceOrb: true,
      },
    },
  },
  {
    id: "zen",
    name: "Minimalist Focus",
    desc: "Pure conversation view with clean chrome and hidden peripheral sidebars",
    config: {
      titlebar: {
        productSwitcher: false,
        projectTitle: true,
        searchPill: true,
        shortcutsBtn: false,
        quickSettings: true,
        studioBtn: true,
        profileAvatar: true,
      },
      layout: {
        sidebar: false,
        workspacePanel: false,
        terminal: false,
        statusBar: false,
        repoBar: false,
        planCorner: true,
        voiceOrb: false,
      },
    },
  },
  {
    id: "split-review",
    name: "Two-Column Code Review",
    desc: "Sidebar + Chat + Workspace side-by-side with Git changes forward",
    config: {
      titlebar: {
        productSwitcher: true,
        projectTitle: true,
        searchPill: true,
        shortcutsBtn: true,
        quickSettings: true,
        studioBtn: true,
        profileAvatar: true,
      },
      layout: {
        sidebar: true,
        workspacePanel: true,
        terminal: false,
        statusBar: true,
        repoBar: true,
        planCorner: true,
        voiceOrb: false,
      },
    },
  },
];

const CONFIG_KEY = "aro.prototype.config.v2";

export function readPrototypeConfig(): PrototypeConfig {
  const saved = readStored<Partial<PrototypeConfig>>(CONFIG_KEY, {});
  return {
    ...DEFAULT_PROTOTYPE_CONFIG,
    ...saved,
    layout: { ...DEFAULT_PROTOTYPE_CONFIG.layout, ...(saved.layout || {}) },
    titlebar: { ...DEFAULT_PROTOTYPE_CONFIG.titlebar, ...(saved.titlebar || {}) },
    workspace: {
      ...DEFAULT_PROTOTYPE_CONFIG.workspace,
      ...(saved.workspace || {}),
      enabledTools: saved.workspace?.enabledTools ?? DEFAULT_PROTOTYPE_CONFIG.workspace.enabledTools,
    },
    composer: { ...DEFAULT_PROTOTYPE_CONFIG.composer, ...(saved.composer || {}) },
  };
}

// Module-level external store for tear-free, safe React subscriptions
let currentConfig: PrototypeConfig = DEFAULT_PROTOTYPE_CONFIG;
let isInitialized = false;

function getStoreConfig(): PrototypeConfig {
  if (typeof window === "undefined") {
    return DEFAULT_PROTOTYPE_CONFIG;
  }
  if (!isInitialized) {
    currentConfig = readPrototypeConfig();
    isInitialized = true;
  }
  return currentConfig;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PrototypeConfig {
  return getStoreConfig();
}

function getServerSnapshot(): PrototypeConfig {
  return DEFAULT_PROTOTYPE_CONFIG;
}

// Cross-tab synchronization
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CONFIG_KEY) {
      currentConfig = readPrototypeConfig();
      listeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // ignore
        }
      });
    }
  });
}

export function writePrototypeConfig(cfg: PrototypeConfig): void {
  currentConfig = cfg;
  isInitialized = true;
  writeStored(CONFIG_KEY, cfg);
  // Safely notify all subscribed React components
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("Error notifying prototype config listener:", err);
    }
  });
}

/** Hook for reactive prototype configuration across the whole application */
export function usePrototypeConfig() {
  const config = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateConfig = useCallback((updater: (prev: PrototypeConfig) => PrototypeConfig) => {
    const current = getStoreConfig();
    const next = updater(current);
    writePrototypeConfig(next);
  }, []);

  const resetConfig = useCallback(() => {
    writePrototypeConfig(DEFAULT_PROTOTYPE_CONFIG);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PROTOTYPE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const current = getStoreConfig();
    const next: PrototypeConfig = {
      ...current,
      ...preset.config,
      layout: { ...current.layout, ...(preset.config.layout || {}) },
      titlebar: { ...current.titlebar, ...(preset.config.titlebar || {}) },
      workspace: { ...current.workspace, ...(preset.config.workspace || {}) },
      composer: { ...current.composer, ...(preset.config.composer || {}) },
    };
    writePrototypeConfig(next);
  }, []);

  return { config, updateConfig, resetConfig, applyPreset };
}
