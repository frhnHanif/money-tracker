import { db } from "../db";
import { accounts, categories, transactions, budgets, dues, settlements } from "../db/schema";
import { eq, and, gte, lte, sql, desc, asc, or } from "drizzle-orm";

// Accounts
export async function getAccounts() {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.isArchived, false))
    .orderBy(asc(accounts.sortOrder));
}

export async function getAccountById(id: number) {
  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0] || null;
}

// Categories
export async function getCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isArchived, false))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryById(id: number) {
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0] || null;
}

// Budgets
export async function getBudgets() {
  return db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      amount: budgets.amount,
      createdAt: budgets.createdAt,
      updatedAt: budgets.updatedAt,
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .orderBy(asc(categories.name));
}

// Dues (piutang & utang) with settled sums
export async function getDues(direction?: "receivable" | "payable", status?: "open" | "settled") {
  const conditions = [];
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

export async function getDueById(id: number) {
  const result = await db.select().from(dues).where(eq(dues.id, id)).limit(1);
  return result[0] || null;
}

// Settlements for a due
export async function getSettlementsByDue(dueId: number) {
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
    .where(eq(settlements.dueId, dueId))
    .orderBy(desc(settlements.createdAt));
}

// Transactions
export async function getTransactions({
  month,
  year,
  accountId,
  categoryId,
  type,
}: {
  month?: number;
  year?: number;
  accountId?: number;
  categoryId?: number;
  type?: string;
} = {}) {
  const conditions = [];

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

export async function getTransactionById(id: number) {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  return result[0] || null;
}

// Balance calculation
export async function getAccountBalance(accountId: number) {
  const account = await getAccountById(accountId);
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
    .where(eq(transactions.accountId, accountId));

  return Number(account.initialBalance) + (Number(result[0]?.total) || 0);
}

export async function getTotalBalance() {
  const allAccounts = await getAccounts();
  let total = 0;
  for (const acc of allAccounts) {
    total += await getAccountBalance(acc.id);
  }
  return total;
}

// Net change of an account in a given month (transfers included)
export async function getAccountMonthNet(accountId: number, month: number, year: number) {
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
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  return Number(result[0]?.total) || 0;
}

// Monthly summary
export async function getMonthlySummary(month: number, year: number) {
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

// Category breakdown for pie chart
export async function getCategoryBreakdown(
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
      total: sql<number>`SUM(${transactions.amount})::int`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, type)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.icon, categories.color)
    .orderBy(desc(sql`SUM(${transactions.amount})`));

  return result
    .filter((r) => r.categoryId !== null)
    .map((r) => ({
      ...r,
      total: Number(r.total) || 0,
    }));
}

// Monthly trend (6 months)
export async function getMonthlyTrend(monthCount: number = 6) {
  const result = [];
  const now = new Date();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const summary = await getMonthlySummary(month, year);
    result.push({
      month: d.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
      ...summary,
    });
  }

  return result;
}
