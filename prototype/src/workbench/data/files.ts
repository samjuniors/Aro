/* =====================================================================
   DEMO FILE CORPUS — the SofiaUI reference project's tree, used by the
   workspace Files tab (tree browse) and Search tab (ripgrep-style grep).
   Prototype-only mock data; the real app swaps this for the agent's
   file-listing tools.
   ===================================================================== */

export type FileNode = {
  name: string;
  kind: "dir" | "file";
  lang?: string;
  lines?: number;
  body?: string;
  children?: FileNode[];
};

export const DEMO_FILES: FileNode[] = [
  {
    name: "src",
    kind: "dir",
    children: [
      {
        name: "components",
        kind: "dir",
        children: [
          { name: "Button.tsx", kind: "file", lang: "tsx", lines: 42, body: `import { forwardRef } from "react";
import { cn } from "../utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "danger";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "solid", size = "md", className, ...rest }, ref) => (
    <button ref={ref} className={cn("sofia-btn", \`sofia-btn--\${variant}\`, size === "sm" && "sofia-btn--sm", className)} {...rest} />
  ),
);
Button.displayName = "Button";` },
          { name: "Card.tsx", kind: "file", lang: "tsx", lines: 28, body: `import { cn } from "../utils/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("sofia-card", className)}>{children}</section>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="sofia-card__title">{children}</h3>;
}` },
          { name: "Input.tsx", kind: "file", lang: "tsx", lines: 24, body: `import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, ...rest }, ref) => (
  <label htmlFor={id} className="sofia-field">
    {label && <span className="sofia-field__label">{label}</span>}
    <input ref={ref} id={id} className="sofia-input" {...rest} />
  </label>
));
Input.displayName = "Input";` },
          { name: "Tabs.tsx", kind: "file", lang: "tsx", lines: 37, body: `import { useState } from "react";
import { cn } from "../utils/cn";

export function Tabs({ items }: { items: { id: string; label: string; render: () => React.ReactNode } }) {
  const [active, setActive] = useState(items[0]?.id);
  const current = items.find((item) => item.id === active);
  return (
    <div className="sofia-tabs" role="tablist">
      {items.map((item) => (
        <button key={item.id} role="tab" aria-selected={item.id === active}
          onClick={() => setActive(item.id)}
          className={cn("sofia-tabs__tab", item.id === active && "is-active")}>
          {item.label}
        </button>
      ))}
      {current?.render()}
    </div>
  );
}` },
          { name: "Toast.tsx", kind: "file", lang: "tsx", lines: 31, body: `let toastCount = 0;

export function toast(message: string, tone: "info" | "warn" = "info") {
  const id = ++toastCount;
  const node = document.createElement("div");
  node.className = \`sofia-toast sofia-toast--\${tone}\`;
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2600);
  return id;
}` },
          { name: "index.ts", kind: "file", lang: "ts", lines: 6, body: `export { Button } from "./Button";
export { Card, CardTitle } from "./Card";
export { Input } from "./Input";
export { Tabs } from "./Tabs";
export { toast } from "./Toast";` },
        ],
      },
      {
        name: "hooks",
        kind: "dir",
        children: [
          { name: "useTheme.ts", kind: "file", lang: "ts", lines: 19, body: `import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.dataset.sofiaTheme = theme;
  }, [theme]);
  return { theme, setTheme };
}` },
          { name: "useHotkeys.ts", kind: "file", lang: "ts", lines: 23, body: `import { useEffect } from "react";

export function useHotkeys(map: Record<string, () => void>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const combo = [event.metaKey && "meta", event.shiftKey && "shift", event.key.toLowerCase()]
        .filter(Boolean).join("+");
      const fn = map[combo];
      if (fn) { event.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map]);
}` },
        ],
      },
      {
        name: "styles",
        kind: "dir",
        children: [
          { name: "tokens.css", kind: "file", lang: "css", lines: 18, body: `:root {
  --sofia-iris: #7c6bff;
  --sofia-mint: #35d6c4;
  --sofia-surface: #ffffff;
  --sofia-raised: #f4f5f8;
  --sofia-radius: 10px;
  --sofia-ease: cubic-bezier(.22, 1, .36, 1);
}` },
          { name: "globals.css", kind: "file", lang: "css", lines: 9, body: `@import "./tokens.css";

.sofia-btn { border-radius: var(--sofia-radius); transition: transform 140ms var(--sofia-ease); }
.sofia-card { background: var(--sofia-surface); box-shadow: 0 1px 3px rgb(16 18 24 / 6%); }` },
        ],
      },
      { name: "App.tsx", kind: "file", lang: "tsx", lines: 15, body: `import { Card, CardTitle, Input } from "./components";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardTitle>Sofia · {theme}</CardTitle>
      <Input label="Search" placeholder="Type to filter" />
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Flip</button>
    </Card>
  );
}` },
    ],
  },
  { name: "package.json", kind: "file", lang: "json", lines: 12, body: `{
  "name": "sofia-ui",
  "version": "2.4.0",
  "type": "module",
  "main": "src/components/index.ts",
  "scripts": { "dev": "vite", "build": "tsup src/components/index.ts --dts" },
  "peerDependencies": { "react": "^18 || ^19" }
}` },
  { name: "README.md", kind: "file", lang: "md", lines: 21, body: `# Sofia UI

A tiny component kit: Button, Card, Input, Tabs and a toast channel.
Theming is token-driven (\`--sofia-*\`) with light/dark out of the box.

## Usage

\`\`\`tsx
import { Button } from "sofia-ui";
\`\`\`` },
];

/** Flatten the corpus to `path → file` pairs for the Search tab. */
export function flattenFiles(nodes: FileNode[] = DEMO_FILES, prefix = ""): { path: string; node: FileNode }[] {
  const out: { path: string; node: FileNode }[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.kind === "dir") out.push(...flattenFiles(node.children ?? [], path));
    else out.push({ path, node });
  }
  return out;
}
