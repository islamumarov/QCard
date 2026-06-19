"use server";

import { revalidatePath } from "next/cache";
import { auth, authConfigured } from "@/auth";
import { deleteSession } from "@/lib/db";

// Server action: remove one of the signed-in user's past interviews.
// Mirrors the gracefully-optional auth pattern — a no-op unless auth is
// configured AND the caller is signed in. Ownership is enforced in the SQL
// (deleteSession matches on user_id), so a forged id can't touch another
// account's data.
export async function deleteSessionAction(formData: FormData): Promise<void> {
  if (!authConfigured) return;
  const email = (await auth())?.user?.email;
  if (!email) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  deleteSession(id, email);
  revalidatePath("/history");
}
