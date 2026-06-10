import { NextRequest, NextResponse } from "next/server";

const VOICE = { languageCode: "it-IT", name: "it-IT-Chirp3-HD-Aoede" };

export async function POST(req: NextRequest) {
  const { text, speed = 1.0 } = (await req.json().catch(() => ({}))) as { text?: string; speed?: number };

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const GOOGLE_KEY = process.env.GOOGLE_TTS_API_KEY;
  if (!GOOGLE_KEY) {
    return NextResponse.json({ error: "GOOGLE_TTS_API_KEY not configured" }, { status: 503 });
  }

  const gRes = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GOOGLE_KEY },
    body: JSON.stringify({
      input: { text: text.substring(0, 5000) },
      voice: VOICE,
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: Math.min(Math.max(speed, 0.25), 4.0),
      },
    }),
  });

  if (!gRes.ok) {
    const err = await gRes.json().catch(() => ({})) as { error?: { message?: string } };
    return NextResponse.json(
      { error: "Google TTS error", detail: err?.error?.message ?? "unknown" },
      { status: 502 }
    );
  }

  const data = await gRes.json() as { audioContent?: string };
  if (!data.audioContent) {
    return NextResponse.json({ error: "No audio from Google TTS" }, { status: 502 });
  }

  const buf = Buffer.from(data.audioContent, "base64");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
