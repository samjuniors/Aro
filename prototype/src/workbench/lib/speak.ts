/**
 * Speak text aloud for the hands-free voice agent.
 * Primary: the Aro cloud voice (/api/workbench/tts → natural WAV voice).
 * Fallback: the browser's built-in speechSynthesis (instant, offline).
 */

let audioEl: HTMLAudioElement | null = null;
let currentSeq = 0;

export function stopSpeaking() {
  currentSeq++;
  if (audioEl) {
    audioEl.pause();
    audioEl.src = "";
    audioEl = null;
  }
  try { window.speechSynthesis?.cancel(); } catch { /* not ready */ }
}

type SpeakHooks = { onStart?: () => void; onEnd?: () => void };

async function playArrayBuffer(buffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    audioEl = el;
    el.onended = () => { URL.revokeObjectURL(url); resolve(); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("audio decode failed")); };
    void el.play().catch((err) => { URL.revokeObjectURL(url); reject(err); });
  });
}

export async function speak(text: string, hooks: SpeakHooks = {}): Promise<boolean> {
  const clean = text.replace(/[#`*_[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 1600);
  if (!clean) return false;
  const seq = ++currentSeq;
  const alive = () => seq === currentSeq;

  hooks.onStart?.();
  try {
    const res = await fetch("/api/workbench/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, voice: "xiaochen", speed: 1.04 }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { chunks?: string[] };
      for (const b64 of data.chunks ?? []) {
        if (!alive()) return true;
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        await playArrayBuffer(bytes.buffer);
      }
    } else {
      await playArrayBuffer(await res.arrayBuffer());
    }
    if (!alive()) return true;
    hooks.onEnd?.();
    return true;
  } catch {
    if (!alive()) return true;
    /* cloud voice unavailable — fall back to the browser voice */
    if (!("speechSynthesis" in window)) { hooks.onEnd?.(); return false; }
    return new Promise((resolve) => {
      try { window.speechSynthesis.cancel(); } catch { /* not ready */ }
      const u = new SpeechSynthesisUtterance(clean.slice(0, 900));
      u.rate = 1.04;
      u.onend = () => { if (alive()) hooks.onEnd?.(); resolve(true); };
      u.onerror = () => { if (alive()) hooks.onEnd?.(); resolve(false); };
      window.speechSynthesis.speak(u);
    });
  }
}

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
