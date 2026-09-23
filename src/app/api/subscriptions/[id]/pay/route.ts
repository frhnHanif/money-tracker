import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, transactions, categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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
  const body = await req.json();
  const { accountId, date, nextDueDate } = body;

  if (!accountId || !date) {
    return NextResponse.json({ error: "Akun dan tanggal bayar wajib diisi" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, userId)))
    .limit(1);

  const sub = existing[0];
  if (!sub) {
    return NextResponse.json({ error: "Langganan tidak ditemukan" }, { status: 404 });
  }

  const newAccountId = parseInt(String(accountId));
  let finalTxId: number | null = sub.lastTransactionId;

  if (sub.lastTransactionId) {
    // Mode Update: cari transaksi yang sudah ada
    const existingTx = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, sub.lastTransactionId), eq(transactions.userId, userId)))
      .limit(1);

    if (existingTx[0]) {
      const oldAccountId = existingTx[0].accountId;
      await db
        .update(transactions)
        .set({
          accountId: newAccountId,
          date,
          amount: sub.price,
          description: sub.name,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, sub.lastTransactionId));

      if (oldAccountId !== newAccountId) {
        await updateAccountBalance(userId, oldAccountId);
      }
      await updateAccountBalance(userId, newAccountId);
    }
  } else {
    // Mode Pembayaran Baru: buat transaksi pengeluaran
    let catId: number | null = null;
    const existingCats = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.isArchived, false)));

    const found = existingCats.find((c) => c.name.toLowerCase() === "langganan");
    if (found) {
      catId = found.id;
    } else {
      const [createdCat] = await db
        .insert(categories)
        .values({
          userId,
          name: "Langganan",
          type: "expense",
          color: "#8b5cf6",
        })
        .returning();
      catId = createdCat?.id ?? null;
    }

    const [newTx] = await db
      .insert(transactions)
      .values({
        userId,
        type: "expense",
        amount: sub.price,
        accountId: newAccountId,
        categoryId: catId,
        description: sub.name,
        notes: `Pembayaran ${sub.name}`,
        date,
      })
      .returning();

    finalTxId = newTx.id;
    await updateAccountBalance(userId, newAccountId);
  }

  const [updatedSub] = await db
    .update(subscriptions)
    .set({
      lastPaidAt: date,
      nextDueDate: nextDueDate || null,
      lastTransactionId: finalTxId,
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.id, subId), eq(subscriptions.userId, userId)))
    .returning();

  return NextResponse.json({ success: true, subscription: updatedSub });
}
