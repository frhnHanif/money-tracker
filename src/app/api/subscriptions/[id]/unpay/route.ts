import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, transactions } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getUserId } from "@/lib/session";
import { updateAccountBalance } from "@/lib/db/queries";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subId = parseInt(id);

  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, userId)))
    .limit(1);

  const sub = existing[0];
  if (!sub) {
    return NextResponse.json({ error: "Langganan tidak ditemukan" }, { status: 404 });
  }

  let txToDeleteId: number | null = sub.lastTransactionId ?? null;
  let accountIdToUpdate: number | null = null;

  if (txToDeleteId) {
    const tx = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, txToDeleteId), eq(transactions.userId, userId)))
      .limit(1);
    if (tx[0]) {
      accountIdToUpdate = tx[0].accountId;
      await db.delete(transactions).where(eq(transactions.id, txToDeleteId));
    }
  } else if (sub.lastPaidAt) {
    // Fallback if lastTransactionId wasn't stored (e.g. older payments)
    const matchingTx = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          eq(transactions.amount, sub.price),
          eq(transactions.date, sub.lastPaidAt),
          eq(transactions.description, sub.name)
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(1);

    if (matchingTx[0]) {
      accountIdToUpdate = matchingTx[0].accountId;
      await db.delete(transactions).where(eq(transactions.id, matchingTx[0].id));
    }
  }

  if (accountIdToUpdate) {
    await updateAccountBalance(userId, accountIdToUpdate);
  }

  const [updatedSub] = await db
    .update(subscriptions)
    .set({
      lastPaidAt: null,
      nextDueDate: null,
      lastTransactionId: null,
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, userId)))
    .returning();

  return NextResponse.json({ success: true, subscription: updatedSub });
}
