import { db } from "../db";
import { accounts, categories, transactions, budgets, dues, settlements, subscriptions, users } from "../db/schema";
import { eq, and, gte, lte, sql, desc, asc, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

// Accounts
export async function getAccounts(userId: string) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)))
    .orderBy(asc(accounts.sortOrder));
}

export async function getAccountById(userId: string, id: number) {
  const result = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .limit(1);
  return result[0] || null;
}

// Categories
export async function getCategories(
  userId: string,
  status: "active" | "archived" | "all" = "active"
) {
  const conditions = [eq(categories.userId, userId)];
  if (status === "active") {
    conditions.push(eq(categories.isArchived, false));
  } else if (status === "archived") {
    conditions.push(eq(categories.isArchived, true));
  }
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryById(userId: string, id: number) {
  const result = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return result[0] || null;
}

// Budgets
export async function getBudgets(userId: string) {
  return db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryPocket: categories.pocket,
      amount: budgets.amount,
      createdAt: budgets.createdAt,
      updatedAt: budgets.updatedAt,
    })
    .from(budgets)
    .innerJoin(
      categories,
      and(
        eq(budgets.categoryId, categories.id),
        eq(categories.isArchived, false)
      )
    )
    .where(eq(budgets.userId, userId))
    .orderBy(asc(categories.name));
}

// Dues (piutang & utang) with settled sums
export async function getDues(userId: string, direction?: "receivable" | "payable", status?: "open" | "settled") {
  const conditions = [eq(dues.userId, userId)];
  if (direction) conditions.push(eq(dues.direction, direction));
  if (status) conditions.push(eq(dues.status, status));

  const rows = await db
    .select({
      id: dues.id,
      direction: dues.direction,
      person: dues.person,
      title: dues.title,
      amount: dues.amount,
      status: dues.status,
      transactionId: dues.transactionId,
      createdAt: dues.createdAt,
      updatedAt: dues.updatedAt,
      settledSum: sql<number>`COALESCE(SUM(${settlements.amount}), 0)::int`,
    })
    .from(dues)
    .leftJoin(settlements, eq(settlements.dueId, dues.id))
    .where(and(...conditions))
    .groupBy(dues.id)
    .orderBy(desc(dues.createdAt));

  return rows.map((r) => ({ ...r, settledSum: Number(r.settledSum) || 0 }));
}

export async function getDueById(userId: string, id: number) {
  const result = await db
    .select()
    .from(dues)
    .where(and(eq(dues.id, id), eq(dues.userId, userId)))
    .limit(1);
  return result[0] || null;
}

// Settlements for a due
export async function getSettlementsByDue(userId: string, dueId: number) {
  return db
    .select({
      id: settlements.id,
      amount: settlements.amount,
      createdAt: settlements.createdAt,
      transactionId: settlements.transactionId,
      date: transactions.date,
      description: transactions.description,
    })
    .from(settlements)
    .leftJoin(transactions, eq(settlements.transactionId, transactions.id))
    .innerJoin(dues, eq(settlements.dueId, dues.id))
    .where(and(eq(settlements.dueId, dueId), eq(dues.userId, userId)))
    .orderBy(desc(settlements.createdAt));
}

// Subscriptions
export async function getSubscriptions(userId: string) {
  return db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      name: subscriptions.name,
      price: subscriptions.price,
      interval: subscriptions.interval,
      billingDay: subscriptions.billingDay,
      status: subscriptions.status,
      lastPaidAt: subscriptions.lastPaidAt,
      nextDueDate: subscriptions.nextDueDate,
      lastTransactionId: subscriptions.lastTransactionId,
      lastTransactionAccountId: transactions.accountId,
      notes: subscriptions.notes,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .leftJoin(transactions, eq(subscriptions.lastTransactionId, transactions.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(asc(subscriptions.name));
}

export async function getSubscriptionById(userId: string, id: number) {
  const result = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .limit(1);
  return result[0] || null;
}

// Last activity helpers (for notifications)
export async function getLastTransactionDate(userId: string): Promise<string | null> {
  const result = await db
    .select({ last: sql<string>`MAX(${transactions.date})` })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  return (result[0]?.last as string) || null;
}

export async function countTransactionsOnDate(userId: string, date: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.date, date)));
  return Number(result[0]?.count) || 0;
}

// Transactions
export async function getTransactions({
  userId,
  month,
  year,
  accountId,
  categoryId,
  type,
}: {
  userId: string;
  month?: number;
  year?: number;
  accountId?: number;
  categoryId?: number;
  type?: string;
}) {
  const conditions: (SQL<unknown> | undefined)[] = [eq(transactions.userId, userId)];

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    conditions.push(gte(transactions.date, startDate.toISOString().split("T")[0]));
    conditions.push(lte(transactions.date, endDate.toISOString().split("T")[0]));
  }

  if (accountId) {
    conditions.push(eq(transactions.accountId, accountId));
  }

  if (categoryId) {
    conditions.push(eq(transactions.categoryId, categoryId));
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
      conditions.push(eq(transactions.type, type as any));
    }
  }

  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function getTransactionById(userId: string, id: number) {
  const result = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  return result[0] || null;
}

// Balance calculation & caching
export async function getAccountBalance(userId: string, accountId: number) {
  const account = await getAccountById(userId, accountId);
  if (!account) return 0;

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(
        CASE
          WHEN ${transactions.type} = 'income' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'transfer_in' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'adjustment_in' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'expense' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'transfer_out' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'adjustment_out' THEN -${transactions.amount}
          ELSE 0
        END
      ), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.userId, userId)));

  return Number(account.initialBalance) + (Number(result[0]?.total) || 0);
}

export async function updateAccountBalance(userId: string, accountId: number) {
  const balance = await getAccountBalance(userId, accountId);
  await db
    .update(accounts)
    .set({ currentBalance: balance })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return balance;
}

export async function recalculateUserBalances(userId: string) {
  const allAccounts = await getAccounts(userId);
  for (const acc of allAccounts) {
    await updateAccountBalance(userId, acc.id);
  }
}

export async function getTotalBalance(userId: string) {
  const allAccounts = await getAccounts(userId);
  return allAccounts.reduce((sum, acc) => sum + (acc.currentBalance ?? 0), 0);
}

export async function getAccountsMonthNetBatch(
  userId: string,
  month: number,
  year: number
): Promise<Record<number, number>> {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const rows = await db
    .select({
      accountId: transactions.accountId,
      total: sql<number>`COALESCE(SUM(
        CASE
          WHEN ${transactions.type} = 'income' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'transfer_in' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'adjustment_in' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'expense' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'transfer_out' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'adjustment_out' THEN -${transactions.amount}
          ELSE 0
        END
      ), 0)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .groupBy(transactions.accountId);

  const result: Record<number, number> = {};
  for (const r of rows) {
    result[r.accountId] = Number(r.total) || 0;
  }
  return result;
}

// Net change of an account in a given month (transfers included)
export async function getAccountMonthNet(userId: string, accountId: number, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(
        CASE
          WHEN ${transactions.type} = 'income' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'transfer_in' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'adjustment_in' THEN ${transactions.amount}
          WHEN ${transactions.type} = 'expense' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'transfer_out' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'adjustment_out' THEN -${transactions.amount}
          ELSE 0
        END
      ), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  return Number(result[0]?.total) || 0;
}

// Monthly summary
export async function getMonthlySummary(userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const result = await db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      daysTracked: sql<number>`COUNT(DISTINCT ${transactions.date})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  return {
    totalIncome: Number(result[0]?.totalIncome) || 0,
    totalExpense: Number(result[0]?.totalExpense) || 0,
    net: (Number(result[0]?.totalIncome) || 0) - (Number(result[0]?.totalExpense) || 0),
    daysTracked: Number(result[0]?.daysTracked) || 0,
    daysInMonth: new Date(year, month, 0).getDate(),
  };
}

// Date range summary
export async function getDateRangeSummary(
  userId: string,
  startDate: string,
  endDate: string
) {
  const result = await db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      daysTracked: sql<number>`COUNT(DISTINCT ${transactions.date})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return {
    totalIncome: Number(result[0]?.totalIncome) || 0,
    totalExpense: Number(result[0]?.totalExpense) || 0,
    net: (Number(result[0]?.totalIncome) || 0) - (Number(result[0]?.totalExpense) || 0),
    daysTracked: Number(result[0]?.daysTracked) || 0,
    daysInMonth: diffDays,
  };
}

// Category breakdown for pie chart
export async function getCategoryBreakdown(
  userId: string,
  month: number,
  year: number,
  type: "expense" | "income" = "expense"
) {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const result = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      categoryPocket: categories.pocket,
      isArchived: categories.isArchived,
      total: sql<number>`SUM(${transactions.amount})::int`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, type)
      )
    )
    .groupBy(
      transactions.categoryId,
      categories.name,
      categories.icon,
      categories.color,
      categories.pocket,
      categories.isArchived
    )
    .orderBy(desc(sql`SUM(${transactions.amount})`));

  return result
    .filter((r) => r.categoryId !== null)
    .map((r) => ({
      ...r,
      total: Number(r.total) || 0,
    }));
}

// Monthly trend (6 months)
export async function getMonthlyTrend(userId: string, monthCount: number = 6) {
  const result = [];
  const now = new Date();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const summary = await getMonthlySummary(userId, month, year);
    result.push({
      month: d.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
      ...summary,
    });
  }

  return result;
}

// 4-Pockets Budgeting Summary
export interface PocketCategoryDetail {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  budget: number;
  spent: number;
  isArchived?: boolean;
}

export interface PocketItemSummary {
  pocket: "living" | "saving" | "playing" | "giving";
  name: string;
  targetBudget: number;
  spent: number;
  remaining: number;
  percentage: number;
  budgetRatio: number;
  categories: PocketCategoryDetail[];
}

export async function getFourPocketsSummary(userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  // 1. Fetch user categories and their budgets
  const userCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      color: categories.color,
      pocket: categories.pocket,
      isArchived: categories.isArchived,
      budgetAmount: budgets.amount,
    })
    .from(categories)
    .leftJoin(
      budgets,
      and(eq(budgets.categoryId, categories.id), eq(budgets.userId, userId))
    )
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // 2. Fetch monthly expense spent per category
  const expenseRows = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, "expense")
      )
    )
    .groupBy(transactions.categoryId);

  const spentMap = new Map<number, number>();
  for (const r of expenseRows) {
    if (r.categoryId) spentMap.set(r.categoryId, Number(r.total) || 0);
  }

  // 3. Fetch saving transfers (e.g. transfer_in to Mandiri account)
  const savingTransferRows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, "transfer_in"),
        sql`LOWER(${accounts.name}) LIKE '%mandiri%'`
      )
    );

  const savingTransferTotal = Number(savingTransferRows[0]?.total) || 0;

  // 4. Fetch income in current month (e.g. Gaji)
  const incomeRows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, "income")
      )
    );
  const monthIncome = Number(incomeRows[0]?.total) || 0;

  // Fetch user monthly salary for dynamic default pocket targets
  const [userRow] = await db
    .select({ monthlySalary: users.monthlySalary })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userSalary = userRow?.monthlySalary || 0;

  // 5. Group by pocket with dynamic default target based on user salary
  const pocketConfigs: Record<
    "living" | "saving" | "playing" | "giving",
    { name: string; defaultTarget: number }
  > = {
    living: { name: "Living", defaultTarget: Math.round(userSalary * 0.57) },
    saving: { name: "Saving", defaultTarget: Math.round(userSalary * 0.30) },
    playing: { name: "Playing", defaultTarget: Math.round(userSalary * 0.09) },
    giving: { name: "Giving", defaultTarget: Math.round(userSalary * 0.04) },
  };

  const pocketKeys: ("living" | "saving" | "playing" | "giving")[] = [
    "living",
    "saving",
    "playing",
    "giving",
  ];

  const result: PocketItemSummary[] = pocketKeys.map((key) => {
    const config = pocketConfigs[key];
    const pocketCats = userCategories.filter((c) => {
      if (c.pocket !== key) return false;
      const spent = spentMap.get(c.id) || 0;
      // Active categories are always included; archived categories only if they had transactions in this month
      return !c.isArchived || spent > 0;
    });

    const categoriesList: PocketCategoryDetail[] = pocketCats.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      budget: c.isArchived ? 0 : (Number(c.budgetAmount) || 0),
      spent: spentMap.get(c.id) || 0,
      isArchived: c.isArchived,
    }));

    const sumBudget = categoriesList.reduce((acc, c) => acc + c.budget, 0);
    const targetBudget = sumBudget > 0 ? sumBudget : config.defaultTarget;

    let totalSpent = categoriesList.reduce((acc, c) => acc + c.spent, 0);
    if (key === "saving") {
      totalSpent += savingTransferTotal;
    }

    const remaining = targetBudget - totalSpent;
    const percentage = targetBudget > 0 ? Math.round((totalSpent / targetBudget) * 100) : 0;

    return {
      pocket: key,
      name: config.name,
      targetBudget,
      spent: totalSpent,
      remaining,
      percentage,
      budgetRatio: 0,
      categories: categoriesList,
    };
  });

  const totalTarget = result.reduce((acc, p) => acc + p.targetBudget, 0);
  const totalSpent = result.reduce((acc, p) => acc + p.spent, 0);

  // Compute adaptive percentage for each pocket based on actual budget set
  for (const p of result) {
    p.budgetRatio = totalTarget > 0 ? Number(((p.targetBudget / totalTarget) * 100).toFixed(1)) : 0;
  }

  return {
    month,
    year,
    totalTarget,
    totalSpent,
    monthIncome,
    pockets: result,
  };
}
