import { NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Speech-to-text for the Aro workbench prototype.
 * Accepts a JSON body { audio_base64 } (WAV/MP3/webm/OGG clip from MediaRecorder)
 * and returns { text }. Used by the composer dictation bubble and the
 * hands-free voice agent for live transcription in ANY browser (no Web Speech
 * API dependency).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { audio_base64?: string }
    const audio = body.audio_base64

    if (!audio || audio.length < 64) {
      return NextResponse.json({ error: "audio_base64 required" }, { status: 400 })
    }

    const zai = await ZAI.create()
    const response = await zai.audio.asr.create({ file_base64: audio })
    const text = (response.text ?? "").trim()

    return NextResponse.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed"
    console.error("[workbench/stt]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
