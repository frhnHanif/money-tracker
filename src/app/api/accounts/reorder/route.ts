import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { getAccounts } from "@/lib/db/queries";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, direction } = await req.json();

  if (!id || !direction || !["up", "down"].includes(direction)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const all = await getAccounts(userId);
  const currentIndex = all.findIndex((a) => a.id === id);

  if (currentIndex === -1) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= all.length) {
    return NextResponse.json({ error: "Cannot move further" }, { status: 400 });
  }

  const current = all[currentIndex];
  const target = all[targetIndex];

  // Swap sortOrder (scoped to user)
  await db
    .update(accounts)
    .set({ sortOrder: target.sortOrder })
    .where(and(eq(accounts.id, current.id), eq(accounts.userId, userId)));

  await db
    .update(accounts)
    .set({ sortOrder: current.sortOrder })
    .where(and(eq(accounts.id, target.id), eq(accounts.userId, userId)));

  return NextResponse.json({ success: true });
}
