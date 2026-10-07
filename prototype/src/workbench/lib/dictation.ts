import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Browser Web Speech (kept for offline / Safari paths)                */
/* ------------------------------------------------------------------ */
type ResultEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type Rec = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: ResultEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type Ctor = new () => Rec;
const ctor = () => (window as Window & { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }).SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: Ctor }).webkitSpeechRecognition;

/* ------------------------------------------------------------------ */
/* Engines                                                             */
/* ------------------------------------------------------------------ */
export type Engine = "aro-cloud" | "browser" | "whisper-local";
export const ENGINES: { id: Engine; label: string; short: string; note: string }[] = [
  { id: "aro-cloud", label: "Aro voice · cloud", short: "aro", note: "Live streaming dictation in any browser. Audio is transcribed by the Aro voice service." },
  { id: "browser", label: "Browser engine", short: "browser", note: "Built-in Web Speech recognition. Chrome or Edge only, no setup." },
  { id: "whisper-local", label: "Whisper · local daemon", short: "whisper", note: "On-device transcription. Needs the Aro daemon on :4735." },
];
export const engineMeta = (id: Engine) => ENGINES.find((e) => e.id === id) ?? ENGINES[0];
export const readEngine = (): Engine => {
  const v = localStorage.getItem("conductor.voice.engine") as Engine | null;
  return v && ENGINES.some((e) => e.id === v) ? v : "aro-cloud";
};

const pickMime = () => {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
};

/** Encode Float32 samples as a 16-bit PCM mono WAV blob. */
const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
  const bytes = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const w = (offset: number, text: string) => { for (let i = 0; i < text.length; i += 1) bytes.setUint8(offset + i, text.charCodeAt(i)); };
  w(0, "RIFF"); bytes.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true);
  bytes.setUint32(24, sampleRate, true); bytes.setUint32(28, sampleRate * 2, true);
  bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true);
  w(36, "data"); bytes.setUint32(40, samples.length * 2, true);
  let at = 44;
  for (let i = 0; i < samples.length; i += 1, at += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    bytes.setInt16(at, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([bytes.buffer], { type: "audio/wav" });
};

/** Convert any recorded clip to 16 kHz mono WAV. The transcription service
 *  accepts WAV/WebM only — some environments record matroska or another
 *  container it can't detect, so this normalizes the payload everywhere. */
const blobToWav = async (blob: Blob): Promise<Blob> => {
  const Ctx = window.OfflineAudioContext ?? (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctx) throw new Error("no audio decoder");
  const decode = new Ctx(1, 1, 16000);
  const decoded = await decode.decodeAudioData(await blob.arrayBuffer());
  const channels = Math.min(2, decoded.numberOfChannels);
  const left = decoded.getChannelData(0);
  if (channels === 1 || decoded.numberOfChannels === 1) return encodeWav(left, decoded.sampleRate);
  const right = decoded.getChannelData(1);
  const mono = new Float32Array(left.length);
  for (let i = 0; i < left.length; i += 1) mono[i] = (left[i] + right[i]) / 2;
  return encodeWav(mono, decoded.sampleRate);
};

const tidy = (text: string) => {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/** Plain dictation: speech → text appended to a field. No commands, no hands-free loop. */
export function useDictation(onFinal: (text: string) => void, onError?: (msg: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [engine, setEngine] = useState<Engine>(() => (typeof window === "undefined" ? "aro-cloud" : readEngine()));
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<Rec | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const stoppedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const supported =
    typeof window !== "undefined" &&
    (Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined" || Boolean(ctor()));

  /* let the voice orb mirror composer dictation */
  useEffect(() => { window.dispatchEvent(new CustomEvent("conductor:dictation", { detail: listening })); }, [listening]);
  useEffect(() => {
    const h = (e: Event) => setEngine((e as CustomEvent<Engine>).detail);
    window.addEventListener("conductor:voice:engine", h);
    return () => window.removeEventListener("conductor:voice:engine", h);
  }, []);

  const teardownMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    audioCtxRef.current?.close().catch(() => { /* closing */ });
    audioCtxRef.current = null;
    setLevel(0);
  };

  /* live mic level meter for the waveform */
  const startMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) { const d = (v - 128) / 128; sum += d * d; }
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        if (now - last > 90) { last = now; setLevel(Math.min(1, rms * 3.2)); }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch { /* metering is decorative */ }
  };

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.clearInterval(timerRef.current);
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    try { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop(); } catch { /* already stopped */ }
    recRef.current = null;
    setListening(false);
    setInterim("");
    teardownMeter();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  /* ---- cloud engine: MediaRecorder → /api/workbench/stt ---- */
  const drainChunks = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      while (chunksRef.current.length > 0) {
        const batch = chunksRef.current.splice(0, chunksRef.current.length);
        let blob = new Blob(batch, { type: recorderRef.current?.mimeType || "audio/webm" });
        if (blob.size < 2048) continue;
        if (stoppedRef.current) break;
        /* normalize the clip to WAV — some browsers record containers the
           transcription service can't read ("unknown audio format") */
        try { blob = await blobToWav(blob); } catch { /* send the original — webm is still accepted */ }
        const base64 = await blobToBase64(blob);
        setInterim("…");
        try {
          const res = await fetch("/api/workbench/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio_base64: base64 }),
          });
          if (!res.ok) throw new Error(`STT ${res.status}`);
          const data = (await res.json()) as { text?: string; error?: string };
          if (data.error) throw new Error(data.error);
          const text = tidy(data.text ?? "");
          setInterim("");
          if (text && !stoppedRef.current) onFinalRef.current(text);
        } catch (err) {
          setInterim("");
          onErrorRef.current?.(`Dictation hiccup — ${err instanceof Error ? err.message : "transcription failed"}. Still listening.`);
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, []);

  const startCloud = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onErrorRef.current?.("This browser can't record audio. Chrome, Edge or Safari work best.");
      setListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mimeType = pickMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 96_000 } : undefined);
      stoppedRef.current = false;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          void drainChunks();
        }
      };
      recorder.onstop = () => { void drainChunks(); };
      recorder.start(2600);
      recorderRef.current = recorder;
      startMeter(stream);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
      setListening(true);
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      onErrorRef.current?.(denied ? "Microphone permission denied — allow it in the browser's site settings." : "Couldn't start the microphone.");
      setListening(false);
    }
  }, [drainChunks]);

  /* ---- browser engine ---- */
  const startBrowser = useCallback(() => {
    const C = ctor();
    if (!C) { onErrorRef.current?.("Dictation isn't supported in this browser. Chrome or Edge work best."); return; }
    try {
      recRef.current?.abort();
      const r = new C();
      r.lang = localStorage.getItem("conductor.voice.language") || navigator.language || "en-US";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let fin = "", tmp = "";
        for (let i = e.resultIndex; i < e.results.length; i += 1) { const it = e.results[i]; const t = it[0]?.transcript ?? ""; if (it.isFinal) fin += t; else tmp += t; }
        setInterim(tmp);
        if (fin.trim()) { onFinalRef.current(fin.trim()); setInterim(""); }
      };
      r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") onErrorRef.current?.("Microphone permission denied — allow it in the browser's site settings."); else if (e.error !== "no-speech" && e.error !== "aborted") onErrorRef.current?.(`Dictation stopped: ${e.error}`); setListening(false); };
      r.onend = () => setListening(false);
      recRef.current = r; r.start(); setListening(true);
    } catch { onErrorRef.current?.("Couldn't start the microphone."); setListening(false); }
  }, []);

  const start = useCallback(() => {
    if (engine === "browser") { startBrowser(); return; }
    if (engine === "whisper-local") { onErrorRef.current?.("Whisper daemon isn't reachable — using the Aro cloud engine."); }
    void startCloud();
  }, [engine, startBrowser, startCloud]);

  const toggle = useCallback(() => { if (listening) { stop(); return; } start(); }, [listening, start, stop]);

  useEffect(() => () => {
    stoppedRef.current = true;
    window.clearInterval(timerRef.current);
    try { recRef.current?.abort(); } catch { /* teardown */ }
    try { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop(); } catch { /* teardown */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    teardownMeter();
  }, []);

  return { listening, interim, level, elapsed, supported, engine, setEngine, start, stop, toggle };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}
