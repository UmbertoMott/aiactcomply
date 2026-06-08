// src/app/api/logvault/append/route.ts
// API Route protetta per append server-side dei log (Art. 12 EU AI Act)
// L'hashing SHA-256 avviene qui, sul server — non nel browser

import { NextRequest, NextResponse } from "next/server";
import { appendLogDB, type LogLevel } from "@/lib/db/logvault";

const VALID_LEVELS: LogLevel[] = ["info", "warning", "error", "critical"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      event?: string;
      level?: string;
      agent?: string;
    };

    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json(
        { error: "Campo 'event' obbligatorio (stringa)" },
        { status: 400 }
      );
    }

    if (!body.level || !VALID_LEVELS.includes(body.level as LogLevel)) {
      return NextResponse.json(
        { error: `Campo 'level' deve essere uno di: ${VALID_LEVELS.join(", ")}` },
        { status: 400 }
      );
    }

    const entry = await appendLogDB(
      body.event.slice(0, 1000), // max 1000 chars
      body.level as LogLevel,
      (body.agent ?? "user").slice(0, 100)
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    console.error("[LogVault API]", message);
    return NextResponse.json(
      { error: "Errore interno durante il salvataggio del log" },
      { status: 500 }
    );
  }
}
