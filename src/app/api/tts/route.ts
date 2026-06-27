import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/ratelimit";

// Kokoro-FastAPI text-to-speech proxy (https://github.com/remsky/Kokoro-FastAPI).
// Exposes an OpenAI-compatible /v1/audio/speech endpoint. Browser Web Speech
// voices are inconsistent (Chrome cuts off long lines, robotic voices), so we
// synthesize server-side with Kokoro and stream the MP3 back to the client.
function baseUrl(): string {
  return (process.env.KOKORO_URL || "http://localhost:8880").replace(/\/$/, "");
}

export async function GET() {
  // Probe Kokoro so the client knows whether server TTS is reachable.
  try {
    const res = await fetch(`${baseUrl()}/v1/models`, { signal: AbortSignal.timeout(2000) });
    return NextResponse.json({ enabled: res.ok });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(req: Request) {
  // TTS lines fire per interviewer turn; a generous window covers normal use
  // while still capping a runaway client.
  const limited = enforceRateLimit(req, "tts", { limit: 60 });
  if (limited) return limited;

  let text: string | undefined;
  try {
    ({ text } = (await req.json()) as { text?: string });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  text = (text || "").trim();
  if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

  const voice = process.env.KOKORO_VOICE || "af_bella";
  const model = process.env.KOKORO_MODEL || "kokoro";

  try {
    const res = await fetch(`${baseUrl()}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Kokoro ignores auth, but the OpenAI-compatible layer expects a bearer.
        Authorization: `Bearer ${process.env.KOKORO_API_KEY || "not-needed"}`,
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: "mp3",
        speed: Number(process.env.KOKORO_SPEED || "1"),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[tts] Kokoro failed", res.status, detail);
      return NextResponse.json({ error: "TTS request failed" }, { status: 502 });
    }

    const audio = Buffer.from(await res.arrayBuffer());
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts] synthesis error", err);
    return NextResponse.json({ error: "TTS error" }, { status: 502 });
  }
}
