import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, accounts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserId } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";
import { updateAccountBalance } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type");
  const limit = searchParams.get("limit");

  const data = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      accountId: transactions.accountId,
      accountName: accounts.name,
      accountColor: accounts.color,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      description: transactions.description,
      notes: transactions.notes,
      transferGroupId: transactions.transferGroupId,
      fee: transactions.fee,
      source: transactions.source,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  // Filter in JS since we need dynamic conditions
  let filtered = data;
  if (month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    filtered = filtered.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date);
      return d.getMonth() + 1 === m && d.getFullYear() === y;
    });
  }
  if (accountId) {
    filtered = filtered.filter((tx) => tx.accountId === parseInt(accountId));
  }
  if (categoryId) {
    filtered = filtered.filter((tx) => tx.categoryId === parseInt(categoryId));
  }
  if (type && type !== "all") {
    if (type === "transfer") {
      filtered = filtered.filter(
        (tx) => tx.type === "transfer_out" || tx.type === "transfer_in"
      );
    } else if (type === "adjustment") {
      filtered = filtered.filter(
        (tx) => tx.type === "adjustment_in" || tx.type === "adjustment_out"
      );
    } else {
      filtered = filtered.filter((tx) => tx.type === type);
    }
  }
  if (limit) {
    filtered = filtered.slice(0, parseInt(limit));
  }

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, amount, accountId, toAccountId, categoryId, description, notes, date, fee } = body;

  if (type === "transfer" && toAccountId) {
    // Create paired transfer transactions
    const groupId = uuidv4();
    const adminFee = parseInt(fee) || 0;
    const transferAmount = parseInt(amount);
    const receiveAmount = transferAmount - adminFee;

    const [outTx] = await db
      .insert(transactions)
      .values({
        userId,
        type: "transfer_out",
        amount: transferAmount,
        fee: adminFee,
        date: date || new Date().toISOString().split("T")[0],
        accountId: parseInt(accountId),
        description: description || "",
        notes: notes || "",
        transferGroupId: groupId,
      })
      .returning();

    const [inTx] = await db
      .insert(transactions)
      .values({
        userId,
        type: "transfer_in",
        amount: receiveAmount,
        fee: 0,
        date: date || new Date().toISOString().split("T")[0],
        accountId: parseInt(toAccountId),
        description: description || "",
        notes: notes || "",
        transferGroupId: groupId,
      })
      .returning();

    await updateAccountBalance(userId, parseInt(accountId));
    await updateAccountBalance(userId, parseInt(toAccountId));

    return NextResponse.json({ out: outTx, in: inTx });
  }

  const [result] = await db
    .insert(transactions)
    .values({
      userId,
      type: type || "expense",
      amount: parseInt(amount),
      date: date || new Date().toISOString().split("T")[0],
      accountId: parseInt(accountId),
      categoryId: categoryId ? parseInt(categoryId) : null,
      description: description || "",
      notes: notes || "",
    })
    .returning();

  await updateAccountBalance(userId, parseInt(accountId));

  return NextResponse.json(result);
}
