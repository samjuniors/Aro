import type { DiffFile } from "./catalog";
import type { Session } from "./catalog";
import type { Project } from "./providers";

/* ============================================================
   REFERENCE DEMO — "SofiaUI"
   A pre-filled project so you can compare blank vs. lived-in UI.
   Clearly marked as demo data everywhere it appears.
   ============================================================ */

export const DEMO_PROJECT_ID = "demo-sofia-ui";

export const DEMO_PROJECT: Project = {
  id: DEMO_PROJECT_ID,
  name: "SofiaUI",
  path: "samjuniors/SofiaUI",
  color: "#7fb0ff",
  kind: "repo",
  sources: [
    {
      id: "demo-source-1",
      kind: "git",
      name: "SofiaUI",
      remoteUrl: "https://github.com/samjuniors/SofiaUI",
      branch: "arena/01a0ebb-sofiaui",
      fileCount: 342,
    },
  ],
  defaults: {
    agentId: "claude-code",
    modelId: "provider:anthropic:claude-sonnet-4-6",
    mode: "agent",
    rules: ["Follow existing component patterns", "Keep diffs reviewable", "No new dependencies without asking"],
    budget: "$25 / session",
  },
};

export const DEMO_REPOS = [
  { id: "demo-repo-os", name: "samjuniors/SamjuniorsOS", branch: "main", demo: true },
  { id: DEMO_PROJECT_ID, name: "samjuniors/SofiaUI", branch: "arena/01a0ebb-sofiaui", demo: true },
  { id: "demo-repo-agent", name: "samjuniors/SamAgent", branch: "main", demo: true },
];

export const DEMO_BRANCHES = [
  { name: "arena/01a0ebb-sofiaui", ahead: 12, behind: 0, current: true },
  { name: "arena/01a0ebb-polish", ahead: 4, behind: 1, current: false },
  { name: "main", ahead: 0, behind: 2, current: false },
];

export const DEMO_DIFF_STATS = { adds: 316847, dels: 2083, files: 14, commits: 12 };

export type DemoChangedFile = { path: string; adds: number; dels: number; status: "M" | "A" | "D" | "R" };

export const DEMO_CHANGED_FILES: DemoChangedFile[] = [
  { path: "src/components/Button/Button.tsx", adds: 84210, dels: 412, status: "M" },
  { path: "src/components/Button/Button.test.tsx", adds: 12480, dels: 96, status: "M" },
  { path: "src/styles/tokens.css", adds: 48210, dels: 388, status: "M" },
  { path: "src/components/Input/Input.tsx", adds: 32104, dels: 204, status: "M" },
  { path: "src/components/Modal/Modal.tsx", adds: 28940, dels: 310, status: "M" },
  { path: "src/components/Tooltip/Tooltip.tsx", adds: 18722, dels: 88, status: "A" },
  { path: "src/hooks/useFocusTrap.ts", adds: 9410, dels: 12, status: "A" },
  { path: "src/utils/cn.ts", adds: 2204, dels: 140, status: "M" },
  { path: "docs/components/button.mdx", adds: 18204, dels: 96, status: "M" },
  { path: "docs/migration-v3.md", adds: 24118, dels: 44, status: "A" },
  { path: "stories/Button.stories.tsx", adds: 31240, dels: 120, status: "M" },
  { path: "stories/Input.stories.tsx", adds: 22100, dels: 98, status: "M" },
  { path: "package.json", adds: 18, dels: 4, status: "M" },
  { path: "src/components/LegacyButton.tsx", adds: 0, dels: 61, status: "D" },
];

export const DEMO_PROJECT_FILES = [
  { path: "src/components/Button/Button.tsx", kind: "file" as const },
  { path: "src/components/Button/Button.test.tsx", kind: "file" as const },
  { path: "src/components/Button/index.ts", kind: "file" as const },
  { path: "src/components/Input/Input.tsx", kind: "file" as const },
  { path: "src/components/Modal/Modal.tsx", kind: "file" as const },
  { path: "src/components/Tooltip/Tooltip.tsx", kind: "file" as const },
  { path: "src/hooks/useFocusTrap.ts", kind: "file" as const },
  { path: "src/hooks/useMediaQuery.ts", kind: "file" as const },
  { path: "src/styles/tokens.css", kind: "file" as const },
  { path: "src/styles/reset.css", kind: "file" as const },
  { path: "src/utils/cn.ts", kind: "file" as const },
  { path: "docs/components/button.mdx", kind: "file" as const },
  { path: "docs/migration-v3.md", kind: "file" as const },
  { path: "stories/Button.stories.tsx", kind: "file" as const },
  { path: "package.json", kind: "file" as const },
];

function diffFile(path: string, adds: number, dels: number, lines: DiffFile["lines"]): DiffFile {
  return { path, adds, dels, lang: path.endsWith(".css") ? "css" : path.endsWith(".mdx") || path.endsWith(".md") ? "md" : "ts", lines };
}

export const DEMO_DIFFS: Record<string, DiffFile> = {
  "src/components/Button/Button.tsx": diffFile("src/components/Button/Button.tsx", 84210, 412, [
    { t: "hunk", text: "@@ -12,9 +12,24 @@ export function Button", o: 12, n: 12 },
    { t: "ctx", text: "   variant = \"primary\",", o: 13, n: 13 },
    { t: "ctx", text: "   size = \"md\",", o: 14, n: 14 },
    { t: "del", text: "   children,", o: 15 },
    { t: "del", text: " }: ButtonProps) {", o: 16 },
    { t: "add", text: "   children,", n: 15 },
    { t: "add", text: "   loading = false,", n: 16 },
    { t: "add", text: "   fullWidth = false,", n: 17 },
    { t: "add", text: " }: ButtonProps) {", n: 18 },
    { t: "add", text: "   const { density } = useDensity();", n: 19 },
    { t: "ctx", text: "   return (", o: 17, n: 20 },
    { t: "del", text: "     <button className={styles.button}>", o: 18 },
    { t: "add", text: "     <button", n: 21 },
    { t: "add", text: "       aria-busy={loading}", n: 22 },
    { t: "add", text: "       data-density={density}", n: 23 },
    { t: "add", text: "       className={cn(styles.button, fullWidth && styles.full)}", n: 24 },
    { t: "add", text: "     >", n: 25 },
    { t: "ctx", text: "       {children}", o: 19, n: 26 },
    { t: "ctx", text: "     </button>", o: 20, n: 27 },
  ]),
  "src/styles/tokens.css": diffFile("src/styles/tokens.css", 48210, 388, [
    { t: "hunk", text: "@@ -1,6 +1,14 @@ :root", o: 1, n: 1 },
    { t: "ctx", text: "   --space-1: 4px;", o: 2, n: 2 },
    { t: "del", text: "   --space-2: 6px;", o: 3 },
    { t: "add", text: "   --space-2: 8px;", n: 3 },
    { t: "add", text: "   --space-3: 12px;", n: 4 },
    { t: "add", text: "   --space-4: 16px;", n: 5 },
    { t: "ctx", text: "   --radius-sm: 5px;", o: 4, n: 6 },
    { t: "del", text: "   --radius-md: 6px;", o: 5 },
    { t: "add", text: "   --radius-md: 8px;", n: 7 },
    { t: "add", text: "   --radius-lg: 12px;", n: 8 },
    { t: "ctx", text: "   --font-sans: \"Inter\", system-ui;", o: 6, n: 9 },
  ]),
  "src/utils/cn.ts": diffFile("src/utils/cn.ts", 2204, 140, [
    { t: "hunk", text: "@@ -1,4 +1,9 @@", o: 1, n: 1 },
    { t: "del", text: " export const cn = (...c: string[]) => c.join(\" \");", o: 1 },
    { t: "add", text: " import { clsx, type ClassValue } from \"clsx\";", n: 1 },
    { t: "add", text: " import { twMerge } from \"tailwind-merge\";", n: 2 },
    { t: "add", text: " ", n: 3 },
    { t: "add", text: " export function cn(...inputs: ClassValue[]) {", n: 4 },
    { t: "add", text: "   return twMerge(clsx(inputs));", n: 5 },
    { t: "add", text: " }", n: 6 },
  ]),
};

export const DEMO_SESSIONS: Session[] = [
  {
    id: "demo-session-1",
    title: "Polish Button focus ring + loading state",
    agentId: "claude-code",
    branch: "arena/01a0ebb-sofiaui",
    status: "done",
    updated: "12m",
    group: "Today",
    tokens: 18420,
    cost: "$0.42",
    projectId: DEMO_PROJECT_ID,
    modelId: "provider:anthropic:claude-sonnet-4-6",
    permission: "agent",
    product: "code",
    steps: [
      { id: "demo-s1-u1", type: "user", text: "The Button focus ring disappears on dark backgrounds and there's no loading state. Fix both and keep the API backwards compatible.", at: "09:41" },
      {
        id: "demo-s1-plan", type: "tool", tool: "plan", title: "Plan", status: "done", ms: 900,
        lines: [
          "Reproduce the focus-ring regression on a dark surface",
          "Add a `loading` prop with `aria-busy` to Button",
          "Density-aware focus ring token pass",
          "Verify backwards compatibility in Storybook",
        ],
      },
      { id: "demo-s1-t1", type: "text", text: "On it — I added a `loading` prop with `aria-busy`, a density-aware focus ring, and kept every existing prop working. The diff is in **Changes** (3 files).", agentId: "claude-code" },
      {
        id: "demo-s1-tool", type: "tool", tool: "edit", title: "Edit", target: "src/components/Button/Button.tsx", status: "done", ms: 1840,
        diff: diffFile("src/components/Button/Button.tsx", 14, 3, [
          { t: "hunk", text: "@@ -12,6 +12,14 @@", o: 12, n: 12 },
          { t: "del", text: "     <button className={styles.button}>", o: 14 },
          { t: "add", text: "     <button aria-busy={loading} className={cn(styles.button)}>", n: 14 },
          { t: "add", text: "       {loading && <Spinner size={14} />}", n: 15 },
        ]),
      },
    ],
  },
  {
    id: "demo-session-2",
    title: "Audit token scale for a11y contrast",
    agentId: "claude-code",
    branch: "arena/01a0ebb-sofiaui",
    status: "waiting",
    updated: "1h",
    group: "Today",
    tokens: 8210,
    cost: "$0.18",
    projectId: DEMO_PROJECT_ID,
    modelId: "provider:anthropic:claude-sonnet-4-6",
    permission: "plan",
    product: "code",
    steps: [
      { id: "demo-s2-u1", type: "user", text: "Check the token scale for contrast issues.", at: "08:15" },
      { id: "demo-s2-t1", type: "text", text: "Found 2 low-contrast pairs in `tokens.css`. I drafted a plan — approve it and I'll apply the fixes.", agentId: "claude-code" },
      { id: "demo-s2-a1", type: "approval", command: "apply tokens.css contrast fixes", reason: "Touches shared design tokens", risk: "medium", state: "open" },
    ],
  },
];

export const DEMO_TASKS = [
  { id: "demo-task-1", title: "Ship Button loading state", projectId: DEMO_PROJECT_ID, status: "doing" as const, createdAt: new Date().toISOString() },
  { id: "demo-task-2", title: "Fix token contrast pairs", projectId: DEMO_PROJECT_ID, status: "todo" as const, createdAt: new Date().toISOString() },
  { id: "demo-task-3", title: "Review arena PR before merge", projectId: DEMO_PROJECT_ID, status: "todo" as const, createdAt: new Date().toISOString() },
];

export const DEMO_PR = { number: 482, title: "SofiaUI polish: Button, tokens, focus", branch: "arena/01a0ebb-sofiaui", base: "main", state: "open" as const, checks: "11/12 passing", reviews: "1 approval needed" };
