import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const txId = parseInt(id);

  const existing = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
    .limit(1);
  const row = existing[0];

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.transferGroupId) {
    // Delete the whole transfer pair (transfer_out + transfer_in), scoped to user
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, row.transferGroupId),
          eq(transactions.userId, userId)
        )
      );
  } else {
    await db.delete(transactions).where(eq(transactions.id, txId));
  }

  return NextResponse.json({ success: true });
}
