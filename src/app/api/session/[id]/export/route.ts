import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
import { getSession } from "@/lib/db";
import { buildJSON, buildMarkdown, exportFilename } from "@/lib/export";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/session/:id/export?format=md|json — download a past interview's
// transcript + feedback. Reuses the same pure builders as the live feedback
// screen (src/lib/export.ts), but server-side so /history rows can export too.
//
// Ownership: when auth is configured the caller must be signed in and own the
// session, mirroring deleteSession's guard. When auth is unconfigured sessions
// are anonymous, so the route stays open like GET /api/session/:id.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (authConfigured) {
    const email = (await auth())?.user?.email;
    const session = getSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.user_id !== email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const state = buildInterviewState(id);
  if (!state) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "md";
  const body = format === "json" ? buildJSON(state) : buildMarkdown(state);
  const mime = format === "json" ? "application/json" : "text/markdown";
  const filename = `${exportFilename(state)}.${format}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": `${mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
