import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/rag/rag-vertex";

const VOICE = { languageCode: "it-IT", name: "it-IT-Chirp3-HD-Aoede" };
const PROJECT = process.env.VERTEX_PROJECT_ID ?? "";

export async function POST(req: NextRequest) {
  const { text, speed = 1.0 } = (await req.json().catch(() => ({}))) as { text?: string; speed?: number };

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  // Auth: usa il service account Vertex (scope cloud-platform copre anche Cloud TTS)
  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    return NextResponse.json({ error: "TTS auth not configured" }, { status: 503 });
  }

  const gRes = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": PROJECT,
    },
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
    const err = (await gRes.json().catch(() => ({}))) as { error?: { message?: string } };
    return NextResponse.json(
      { error: "Google TTS error", detail: err?.error?.message ?? "unknown" },
      { status: 502 }
    );
  }

  const data = (await gRes.json()) as { audioContent?: string };
  if (!data.audioContent) {
    return NextResponse.json({ error: "No audio from Google TTS" }, { status: 502 });
  }

  return new NextResponse(Buffer.from(data.audioContent, "base64"), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
