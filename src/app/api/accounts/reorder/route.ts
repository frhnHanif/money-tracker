import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { getAccounts } from "@/lib/db/queries";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, direction } = await req.json();

  if (!id || !direction || !["up", "down"].includes(direction)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const all = await getAccounts();
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

  // Swap sortOrder
  await db
    .update(accounts)
    .set({ sortOrder: target.sortOrder })
    .where(eq(accounts.id, current.id));

  await db
    .update(accounts)
    .set({ sortOrder: current.sortOrder })
    .where(eq(accounts.id, target.id));

  return NextResponse.json({ success: true });
}
