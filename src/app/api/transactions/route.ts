import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, accounts, categories, dues, settlements } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, or, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { getUserId } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";
import { updateAccountBalance, getUserResetDay } from "@/lib/db/queries";
import { getCycleRange } from "@/lib/cycle";
import type {
  SplitBillMeta,
  SplitBillStatus,
  SplitSettlementMeta,
} from "@/lib/split-bill-grouping";

function extractSplitEventTitle(raw: string | null | undefined): string {
  if (!raw) return "Split Bill";
  let cleaned = raw.trim();
  if (/^Talangan Split Bill:/i.test(cleaned)) return "Split Bill";
  cleaned = cleaned
    .replace(/\s*\(Pelunasan\)$/i, "")
    .replace(/\s*\(Split Bill\)$/i, "")
    .replace(/\s*\(Porsi Saya\)$/i, "")
    .replace(/\s*\(Talangan:.*\)$/i, "")
    .trim();
  return cleaned || "Split Bill";
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type");
  const limit = searchParams.get("limit");

  const conditions: (SQL<unknown> | undefined)[] = [eq(transactions.userId, userId)];

  if (startDate) {
    conditions.push(gte(transactions.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(transactions.date, endDate));
  } else if (!startDate && month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    const resetDayParam = searchParams.get("resetDay");
    const userResetDay = resetDayParam ? parseInt(resetDayParam) : await getUserResetDay(userId);
    const { startDate: sDate, endDate: eDate } = getCycleRange(y, m, userResetDay);
    conditions.push(gte(transactions.date, sDate));
    conditions.push(lte(transactions.date, eDate));
  }

  if (accountId && accountId !== "all") {
    conditions.push(eq(transactions.accountId, parseInt(accountId)));
  }

  if (categoryId && categoryId !== "all") {
    conditions.push(eq(transactions.categoryId, parseInt(categoryId)));
  }

  if (type && type !== "all") {
    if (type === "transfer") {
      conditions.push(
        or(
          eq(transactions.type, "transfer_out"),
          eq(transactions.type, "transfer_in")
        )
      );
    } else if (type === "adjustment") {
      conditions.push(
        or(
          eq(transactions.type, "adjustment_in"),
          eq(transactions.type, "adjustment_out")
        )
      );
    } else {
      conditions.push(eq(transactions.type, type as typeof transactions.$inferSelect.type));
    }
  }

  const baseQuery = db
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
      splitGroupId: transactions.splitGroupId,
      fee: transactions.fee,
      source: transactions.source,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const data = limit ? await baseQuery.limit(parseInt(limit)) : await baseQuery;
  if (data.length === 0) {
    return NextResponse.json(data);
  }

  // Batch Query A: Identify settlements linked to Split Bill dues
  const returnedIds = data.map((t) => t.id);
  const rawSettlementLinks = await db
    .select({
      settleTxId: settlements.transactionId,
      settledAmount: settlements.amount,
      dueId: dues.id,
      person: dues.person,
      dueTitle: dues.title,
      dueAmount: dues.amount,
      originTxId: dues.transactionId,
    })
    .from(settlements)
    .innerJoin(dues, eq(settlements.dueId, dues.id))
    .where(
      and(
        inArray(settlements.transactionId, returnedIds),
        eq(dues.userId, userId),
        isNotNull(dues.transactionId)
      )
    );

  const originTxIds = Array.from(
    new Set(
      rawSettlementLinks
        .map((r) => r.originTxId)
        .filter((id): id is number => typeof id === "number")
    )
  );

  const originTxMap = new Map<
    number,
    { id: number; splitGroupId: string | null; description: string | null }
  >();

  if (originTxIds.length > 0) {
    const verifiedOrigins = await db
      .select({
        id: transactions.id,
        splitGroupId: transactions.splitGroupId,
        description: transactions.description,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.id, originTxIds),
          eq(transactions.userId, userId),
          eq(transactions.source, "split_bill")
        )
      );
    for (const o of verifiedOrigins) {
      originTxMap.set(o.id, o);
    }
  }

  const verifiedSettlementByTxId = new Map<
    number,
    (typeof rawSettlementLinks)[number] & { originSplitKey: string }
  >();

  for (const link of rawSettlementLinks) {
    if (!link.originTxId) continue;
    const origin = originTxMap.get(link.originTxId);
    if (!origin) continue;
    verifiedSettlementByTxId.set(link.settleTxId, {
      ...link,
      originSplitKey: origin.splitGroupId ?? `tx-${origin.id}`,
    });
  }

  // Batch Query B: Fetch sibling Split Bill transactions + dues breakdown
  const splitGroupIds = new Set<string>();
  const standaloneSplitTxIds = new Set<number>();

  for (const row of data) {
    if (row.source === "split_bill") {
      if (row.splitGroupId) splitGroupIds.add(row.splitGroupId);
      else standaloneSplitTxIds.add(row.id);
    }
  }

  for (const origin of originTxMap.values()) {
    if (origin.splitGroupId) splitGroupIds.add(origin.splitGroupId);
    else standaloneSplitTxIds.add(origin.id);
  }

  const metaBySplitKey = new Map<string, SplitBillMeta>();

  if (splitGroupIds.size > 0 || standaloneSplitTxIds.size > 0) {
    const siblingFilters: SQL[] = [];
    if (splitGroupIds.size > 0) {
      siblingFilters.push(inArray(transactions.splitGroupId, Array.from(splitGroupIds)));
    }
    if (standaloneSplitTxIds.size > 0) {
      siblingFilters.push(inArray(transactions.id, Array.from(standaloneSplitTxIds)));
    }

    const siblingTxs = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        splitGroupId: transactions.splitGroupId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.source, "split_bill"),
          siblingFilters.length === 1 ? siblingFilters[0] : or(...siblingFilters)
        )
      );

    const dueAnchorTxIds = Array.from(
      new Set([...siblingTxs.map((s) => s.id), ...Array.from(standaloneSplitTxIds), ...originTxIds])
    );

    const duesRows =
      dueAnchorTxIds.length > 0
        ? await db
            .select({
              id: dues.id,
              person: dues.person,
              title: dues.title,
              amount: dues.amount,
              status: dues.status,
              transactionId: dues.transactionId,
              settledSum: sql<number>`COALESCE(SUM(${settlements.amount}), 0)::int`,
            })
            .from(dues)
            .leftJoin(settlements, eq(settlements.dueId, dues.id))
            .where(and(eq(dues.userId, userId), inArray(dues.transactionId, dueAnchorTxIds)))
            .groupBy(dues.id)
        : [];

    const siblingsByKey = new Map<string, typeof siblingTxs>();
    const txIdToKey = new Map<number, string>();

    for (const s of siblingTxs) {
      const key = s.splitGroupId ?? `tx-${s.id}`;
      txIdToKey.set(s.id, key);
      const list = siblingsByKey.get(key) ?? [];
      list.push(s);
      siblingsByKey.set(key, list);
    }

    for (const origin of originTxMap.values()) {
      if (!txIdToKey.has(origin.id)) {
        txIdToKey.set(origin.id, origin.splitGroupId ?? `tx-${origin.id}`);
      }
    }

    const duesByKey = new Map<string, typeof duesRows>();
    for (const d of duesRows) {
      if (!d.transactionId) continue;
      const key = txIdToKey.get(d.transactionId) ?? `tx-${d.transactionId}`;
      const list = duesByKey.get(key) ?? [];
      list.push(d);
      duesByKey.set(key, list);
    }

    const allKeys = new Set<string>([...siblingsByKey.keys(), ...duesByKey.keys()]);

    for (const key of allKeys) {
      const sibs = siblingsByKey.get(key) ?? [];
      const keyDues = duesByKey.get(key) ?? [];

      const personalAmount = sibs
        .filter((s) => s.type === "expense")
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      const talanganTxSum = sibs
        .filter((s) => s.type === "adjustment_out")
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      const friends = keyDues.map((d) => ({
        dueId: d.id,
        person: d.person,
        amount: d.amount,
        settledSum: Number(d.settledSum) || 0,
        status: d.status as "open" | "settled",
      }));

      const totalReceivable = friends.reduce((sum, f) => sum + f.amount, 0);
      const talanganAmount = talanganTxSum > 0 ? talanganTxSum : totalReceivable;
      const totalPaid = personalAmount + talanganAmount;

      const allSettled =
        friends.length > 0 &&
        friends.every((f) => f.status === "settled" || f.settledSum >= f.amount);
      const anySettled = friends.some(
        (f) => f.status === "settled" || f.settledSum > 0
      );
      const splitStatus: SplitBillStatus = allSettled
        ? "settled"
        : anySettled
          ? "partial"
          : "open";

      const personalSib = sibs.find((s) => s.type === "expense");
      const talanganSib = sibs.find((s) => s.type === "adjustment_out");
      const rawTitle =
        keyDues[0]?.title ||
        personalSib?.description ||
        talanganSib?.description ||
        "Split Bill";

      metaBySplitKey.set(key, {
        splitKey: key,
        eventTitle: extractSplitEventTitle(rawTitle),
        personalAmount,
        talanganAmount,
        totalPaid,
        splitStatus,
        friends,
      });
    }
  }

  const enrichedData = data.map((row) => {
    let splitBillMeta: SplitBillMeta | undefined;
    let splitSettlementMeta: SplitSettlementMeta | undefined;

    if (row.source === "split_bill") {
      const key = row.splitGroupId ?? `tx-${row.id}`;
      splitBillMeta = metaBySplitKey.get(key);
    }

    const sLink = verifiedSettlementByTxId.get(row.id);
    if (sLink) {
      const originMeta = metaBySplitKey.get(sLink.originSplitKey);
      const friends = originMeta?.friends ?? [];
      const totalReceivable = friends.reduce((sum, f) => sum + f.amount, 0);
      const totalSettled = friends.reduce((sum, f) => sum + f.settledSum, 0);
      const settledFriendCount = friends.filter(
        (f) => f.status === "settled" || f.settledSum > 0
      ).length;

      splitSettlementMeta = {
        splitKey: sLink.originSplitKey,
        originTxId: sLink.originTxId!,
        eventTitle: originMeta?.eventTitle || extractSplitEventTitle(sLink.dueTitle),
        dueId: sLink.dueId,
        person: sLink.person,
        dueAmount: sLink.dueAmount,
        settledAmount: sLink.settledAmount,
        splitStatus: originMeta?.splitStatus ?? "open",
        totalReceivable,
        totalSettled,
        settledFriendCount,
        totalFriendCount: friends.length,
      };
    }

    return {
      ...row,
      ...(splitBillMeta ? { splitBillMeta } : {}),
      ...(splitSettlementMeta ? { splitSettlementMeta } : {}),
    };
  });

  return NextResponse.json(enrichedData);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, amount, accountId, toAccountId, categoryId, description, notes, date, fee } = body;

  if (type === "transfer" && toAccountId) {
    // Create paired transfer transactions:
    // Sender is charged transferAmount + adminFee, receiver receives transferAmount
    const groupId = uuidv4();
    const adminFee = parseInt(fee) || 0;
    const transferAmount = parseInt(amount);
    const totalOutAmount = transferAmount + adminFee;
    const receiveAmount = transferAmount;
    const parsedCat = categoryId ? parseInt(String(categoryId), 10) : null;
    const parsedCategoryId = parsedCat !== null && !Number.isNaN(parsedCat) ? parsedCat : null;

    const [outTx] = await db
      .insert(transactions)
      .values({
        userId,
        type: "transfer_out",
        amount: totalOutAmount,
        fee: adminFee,
        date: date || new Date().toISOString().split("T")[0],
        accountId: parseInt(accountId),
        categoryId: parsedCategoryId,
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
        categoryId: parsedCategoryId,
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
