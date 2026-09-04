import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const txId = parseInt(id);

  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, txId))
    .limit(1);
  const row = existing[0];

  if (row?.transferGroupId) {
    // Delete the whole transfer pair (transfer_out + transfer_in)
    await db
      .delete(transactions)
      .where(eq(transactions.transferGroupId, row.transferGroupId));
  } else {
    await db.delete(transactions).where(eq(transactions.id, txId));
  }

  return NextResponse.json({ success: true });
}
