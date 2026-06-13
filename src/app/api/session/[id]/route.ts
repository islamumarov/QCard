import { NextResponse } from "next/server";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/session/:id — fetch current interview state.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = buildInterviewState(id);
  if (!state) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(state);
}
