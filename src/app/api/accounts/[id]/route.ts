import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Soft delete - archive (scoped to user)
  await db
    .update(accounts)
    .set({ isArchived: true })
    .where(and(eq(accounts.id, parseInt(id)), eq(accounts.userId, userId)));

  return NextResponse.json({ success: true });
}
