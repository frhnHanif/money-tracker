import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, subscriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";
import { updateAccountBalance } from "@/lib/db/queries";

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
    const pair = await db
      .select({ accountId: transactions.accountId })
      .from(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, row.transferGroupId),
          eq(transactions.userId, userId)
        )
      );

    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, row.transferGroupId),
          eq(transactions.userId, userId)
        )
      );

    for (const p of pair) {
      await updateAccountBalance(userId, p.accountId);
    }
  } else {
    await db.delete(transactions).where(eq(transactions.id, txId));
    await updateAccountBalance(userId, row.accountId);
    await db
      .update(subscriptions)
      .set({ lastPaidAt: null, nextDueDate: null, lastTransactionId: null, updatedAt: new Date() })
      .where(and(eq(subscriptions.lastTransactionId, txId), eq(subscriptions.userId, userId)));
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
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

  const body = await req.json();
  const { amount, date, accountId, toAccountId, categoryId, description, notes, fee, type } = body;

  if (row.transferGroupId) {
    // Both transfers in the group
    const pair = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, row.transferGroupId),
          eq(transactions.userId, userId)
        )
      );

    const outTx = pair.find((t) => t.type === "transfer_out");
    const inTx = pair.find((t) => t.type === "transfer_in");

    const transferAmount =
      amount !== undefined ? parseInt(String(amount)) : (outTx?.amount ?? row.amount);
    const adminFee =
      fee !== undefined ? parseInt(String(fee)) || 0 : (outTx?.fee ?? 0);
    const receiveAmount = transferAmount - adminFee;

    const txDate = date || row.date;
    const desc = description !== undefined ? description : row.description;
    const note = notes !== undefined ? notes : row.notes;
    const fromAccId =
      accountId !== undefined ? parseInt(String(accountId)) : outTx?.accountId;
    const toAccId =
      toAccountId !== undefined ? parseInt(String(toAccountId)) : inTx?.accountId;

    if (outTx && fromAccId) {
      await db
        .update(transactions)
        .set({
          amount: transferAmount,
          fee: adminFee,
          accountId: fromAccId,
          date: txDate,
          description: desc,
          notes: note,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, outTx.id));
    }

    if (inTx && toAccId) {
      await db
        .update(transactions)
        .set({
          amount: receiveAmount,
          fee: 0,
          accountId: toAccId,
          date: txDate,
          description: desc,
          notes: note,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, inTx.id));
    }

    if (outTx) await updateAccountBalance(userId, outTx.accountId);
    if (fromAccId && fromAccId !== outTx?.accountId) await updateAccountBalance(userId, fromAccId);
    if (inTx) await updateAccountBalance(userId, inTx.accountId);
    if (toAccId && toAccId !== inTx?.accountId) await updateAccountBalance(userId, toAccId);

    return NextResponse.json({ success: true });
  }

  // Non-transfer regular transaction
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (amount !== undefined) updates.amount = parseInt(String(amount));
  if (date !== undefined) updates.date = date;
  if (accountId !== undefined) updates.accountId = parseInt(String(accountId));
  if (categoryId !== undefined) {
    updates.categoryId = categoryId ? parseInt(String(categoryId)) : null;
  }
  if (type !== undefined) updates.type = type;
  if (description !== undefined) updates.description = description;
  if (notes !== undefined) updates.notes = notes;

  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
    .returning();

  await updateAccountBalance(userId, row.accountId);
  if (accountId !== undefined && parseInt(String(accountId)) !== row.accountId) {
    await updateAccountBalance(userId, parseInt(String(accountId)));
  }

  return NextResponse.json(updated);
}
