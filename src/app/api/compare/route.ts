import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
import { loadCompareSide, orderByDate } from "@/lib/compare";
import { getSession } from "@/lib/db";
import { generateComparison } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/compare  { a, b } — AI progress diff between two of the caller's
// completed interviews. Ownership is enforced when auth is configured (same
// shape as the export/review routes); gracefully degrades to offline notes when
// no LLM key is set. The deterministic numeric deltas are rendered by the page;
// this endpoint is only the qualitative half, fetched on demand.
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "compare", { limit: 10 });
  if (limited) return limited;

  try {
    const { a, b } = (await req.json().catch(() => ({}))) as { a?: string; b?: string };
    if (!a || !b) return NextResponse.json({ error: "Two session ids (a, b) are required" }, { status: 400 });
    if (a === b) return NextResponse.json({ error: "Pick two different interviews" }, { status: 400 });

    if (authConfigured) {
      const email = (await auth())?.user?.email;
      if (!email) return NextResponse.json({ error: "Sign in to compare your interviews" }, { status: 401 });
      for (const id of [a, b]) {
        const s = getSession(id);
        if (!s || s.user_id !== email) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }
    }

    const sideA = loadCompareSide(a);
    const sideB = loadCompareSide(b);
    if (!sideA || !sideB) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    if (!sideA.feedback || !sideB.feedback) {
      return NextResponse.json({ error: "Both interviews must be completed before comparing" }, { status: 409 });
    }

    const [older, newer] = orderByDate(sideA, sideB);
    const comparison = await generateComparison(older, newer);
    return NextResponse.json({ comparison });
  } catch (err) {
    console.error("compare failed", err);
    return NextResponse.json({ error: "Failed to compare interviews" }, { status: 500 });
  }
}
