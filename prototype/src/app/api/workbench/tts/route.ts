import { NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Text-to-speech for the Aro workbench prototype.
 * Accepts { text, voice?, speed? } and returns audio/wav bytes.
 * Text is split into <=1000-char sentence chunks (API limit 1024) and the
 * chunks are returned as a single concatenated WAV when possible; for multi-
 * chunk text each chunk is a separate WAV and the client plays them in order
 * (returned as { chunks: [base64...] } in that case).
 */
const VOICES = ["tongtong", "chuichui", "xiaochen", "jam", "kazi", "douji", "luodo"]

function splitText(text: string, max = 1000): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text]
  const chunks: string[] = []
  let current = ""
  for (const sentence of sentences) {
    if ((current + sentence).length <= max) current += sentence
    else {
      if (current.trim()) chunks.push(current.trim())
      current = sentence.length > max ? "" : sentence
      if (sentence.length > max) {
        // hard-split overlong sentences on word boundaries
        for (const piece of sentence.match(new RegExp(`.{1,${max}}(\\s|$)`, "g")) ?? []) chunks.push(piece.trim())
      }
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(Boolean).slice(0, 8)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; voice?: string; speed?: number }
    const text = (body.text ?? "").replace(/\s+/g, " ").trim()

    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 })
    }

    const voice = body.voice && VOICES.includes(body.voice) ? body.voice : "tongtong"
    const speed = typeof body.speed === "number" ? Math.min(2, Math.max(0.5, body.speed)) : 1.0

    const zai = await ZAI.create()
    const chunks = splitText(text)

    const wavs: Buffer[] = []
    for (const chunk of chunks) {
      const response = await zai.audio.tts.create({
        input: chunk,
        voice,
        speed,
        response_format: "wav",
        stream: false,
      })
      const arrayBuffer = await response.arrayBuffer()
      wavs.push(Buffer.from(new Uint8Array(arrayBuffer)))
    }

    // Single chunk → stream the WAV directly. Multiple chunks → base64 array
    // (client plays them sequentially; naive WAV concat would break headers).
    if (wavs.length === 1) {
      const wav = wavs[0]
      return new NextResponse(new Uint8Array(wav), {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": String(wav.length),
          "Cache-Control": "no-cache",
        },
      })
    }

    return NextResponse.json({ chunks: wavs.map((w) => w.toString("base64")), voice, speed })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Speech synthesis failed"
    console.error("[workbench/tts]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
