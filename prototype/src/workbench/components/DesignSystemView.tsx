import { useEffect, useState } from "react";
import { DESIGN_SPECS, specFor } from "../data/design";
import { useApp } from "../lib/app";
import { IconCheck, IconCopy, IconWave } from "./Icons";
import { Button, Input, Menu, MenuItem, Segmented } from "./ui";
import { cn } from "../utils/cn";

const TOKENS = ["--color-base", "--color-sunken", "--color-raise", "--color-overlay", "--color-line", "--color-ink", "--color-ink-2", "--color-ink-3", "--color-iris", "--color-mint", "--color-rose"];

export function DesignSystemView() {
  const { design, setDesign, theme, toast } = useApp();
  const [colors, setColors] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<"first" | "second">("first");
  const profile = specFor(design);
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      setColors(Object.fromEntries(TOKENS.map((token) => [token, style.getPropertyValue(token).trim()])));
    });
    return () => cancelAnimationFrame(timer);
  }, [design, theme]);
  const exportTokens = () => {
    const text = `:root {\n${Object.entries(colors).map(([token, value]) => `  ${token}: ${value};`).join("\n")}\n}`;
    void navigator.clipboard?.writeText(text).then(() => toast("Current tokens copied", "mint"));
  };
  return <div className="scroll-thin min-h-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-[900px] space-y-7 p-6">
    <div><span className="text-[10px] tracking-[.1em] text-ink-4 uppercase">Reference</span><h1 className="mt-1 font-display text-[26px] font-semibold tracking-[-.035em] text-ink">Design system</h1><p className="mt-2 text-[12px] leading-relaxed text-ink-3">A component and token reference, separate from your workspace. Examples below never create sessions, tasks or activity.</p></div>
    <section><h2 className="mb-3 text-[13px] font-medium text-ink-2">Visual profiles</h2><div className="grid gap-2 sm:grid-cols-2">{DESIGN_SPECS.map((spec) => <button key={spec.id} onClick={() => setDesign(spec.id)} className={cn("flex items-start gap-3 rounded-[9px] border p-3 text-left", design === spec.id ? "border-ink-3 bg-hover/35" : "border-line hover:bg-hover/20")}><div className="min-w-0 flex-1"><p className="text-[12.5px] font-medium text-ink">{spec.label}</p><p className="mt-1 text-[10.5px] leading-relaxed text-ink-3">{spec.summary}</p><p className="mt-1.5 font-mono text-[9px] text-ink-4">{spec.panels.sidebar}px sidebar · {spec.panels.context}px context · {spec.shape.radiusPanel} corners</p></div>{design === spec.id && <IconCheck size={12} />}</button>)}</div></section>
    <section className="border-t border-line-soft pt-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-[13px] font-medium text-ink-2">Live color tokens</h2><Button size="xs" icon={IconCopy} onClick={exportTokens}>Copy CSS</Button></div><div className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">{TOKENS.map((token) => <div key={token} className="flex min-w-0 items-center gap-2.5"><i className="size-[24px] shrink-0 rounded-[5px] border border-line" style={{ background: `var(${token})` }} /><div className="min-w-0"><p className="truncate font-mono text-[10px] text-ink-2">{token.replace("--color-", "")}</p><p className="truncate font-mono text-[9px] text-ink-4">{colors[token] || "loading"}</p></div></div>)}</div></section>
    <section className="border-t border-line-soft pt-5"><h2 className="mb-3 text-[13px] font-medium text-ink-2">Typography: {profile.label}</h2><div className="space-y-4">{[profile.type.display, profile.type.title, profile.type.body, profile.type.meta, profile.type.mono].map((type) => <div key={type.role}><div className="flex items-center gap-2"><span className="text-[11px] text-ink-2">{type.role}</span><span className="font-mono text-[9px] text-ink-4">{type.family} · {type.size} · {type.weight}</span></div><p className={cn("mt-1 text-ink", type.role === "Display" ? "font-display text-[26px] font-semibold tracking-[-.03em]" : type.role === "Mono" ? "font-mono text-[11px]" : "text-[13px]")}>{type.role === "Mono" ? "source-folder / selected-file" : "Your work, in your workspace."}</p></div>)}</div></section>
    <section className="border-t border-line-soft pt-5"><h2 className="mb-3 text-[13px] font-medium text-ink-2">Spacing and geometry</h2><div className="space-y-2">{profile.spacing.scale.map((space) => <div key={space.token} className="flex items-center gap-3"><span className="w-8 font-mono text-[10px] text-ink-4">{space.px}px</span><i className="h-[5px] bg-ink-3" style={{ width: space.px * 3 }} /><span className="text-[11px] text-ink-3">{space.usage}</span></div>)}</div><p className="mt-4 text-[11px] text-ink-4">{profile.elevation}</p></section>
    <section className="border-t border-line-soft pt-5"><h2 className="mb-3 text-[13px] font-medium text-ink-2">Interactive component specimens</h2><div className="flex flex-wrap items-center gap-2"><Button variant="primary">Primary</Button><Button>Secondary</Button><Button variant="danger">Destructive</Button><Button disabled>Disabled</Button><button className="composer-icon-button" aria-label="Waveform specimen"><IconWave size={16} /></button><Menu trigger={() => <Button size="sm">Popover</Button>}>{(close) => <><MenuItem label="First option" onClick={close} /><MenuItem label="Second option" onClick={close} /></>}</Menu><Segmented value={selection} onChange={setSelection} items={[{ value: "first", label: "First" }, { value: "second", label: "Second" }]} /></div><Input className="mt-3 max-w-[300px]" placeholder="Input specimen" /></section>
    <p className="border-t border-line-soft pt-4 text-[10.5px] leading-relaxed text-ink-4">Profiles are adaptations of the visual references, not official proprietary specifications. Operating-system reduced-motion preferences and visible keyboard focus are supported throughout.</p>
  </div></div>;
}