import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import {
  getSubscriptions,
  getBudgets,
  getCategoryBreakdown,
  getMonthlySummary,
  getLastTransactionDate,
  countTransactionsOnDate,
  getDues,
} from "@/lib/db/queries";
import { isPaidThisCycle, daysUntil } from "@/lib/subscriptions";
import { dueRemaining } from "@/lib/dues";
import { formatCurrency } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  tone: "danger" | "warning" | "info";
  title: string;
  description: string;
  href?: string;
}

function daysAgoText(days: number): string {
  if (days <= 0) return "hari ini";
  return `${days} hari lalu`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items: NotificationItem[] = [];
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // 1) Subscriptions overdue / due soon
  const subs = await getSubscriptions();
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    if (isPaidThisCycle(sub)) continue;
    const days = daysUntil(sub);
    if (days < 0) {
      items.push({
        id: `sub-overdue-${sub.id}`,
        tone: "danger",
        title: `${sub.name} — lewat ${Math.abs(days)} hari`,
        description: `Belum dibayar ${formatCurrency(sub.price)} • cek dan tandai`,
        href: "/subscriptions",
      });
    } else if (days <= 7) {
      items.push({
        id: `sub-due-${sub.id}`,
        tone: "warning",
        title: `${sub.name} jatuh tempo dalam ${days} hari`,
        description: `${formatCurrency(sub.price)} belum dibayar`,
        href: "/subscriptions",
      });
    }
  }

  // 2) Budgets over / >= 80%
  const [budgets, breakdown, summary] = await Promise.all([
    getBudgets(),
    getCategoryBreakdown(month, year, "expense"),
    getMonthlySummary(month, year),
  ]);
  const spentByCategory = new Map(
    breakdown.map((b) => [b.categoryId, b.total])
  );
  const totalExpense = summary.totalExpense;

  for (const budget of budgets) {
    const spent =
      budget.categoryId === null
        ? totalExpense
        : spentByCategory.get(budget.categoryId) ?? 0;
    const pct = (spent / budget.amount) * 100;
    const label =
      budget.categoryName ??
      (budget.categoryId === null ? "Budget total" : "Budget");
    if (pct >= 100) {
      items.push({
        id: `budget-over-${budget.id}`,
        tone: "danger",
        title: `${label} melebihi budget`,
        description: `Terpakai ${formatCurrency(spent)} dari ${formatCurrency(budget.amount)}`,
        href: "/statistics",
      });
    } else if (pct >= 80) {
      items.push({
        id: `budget-near-${budget.id}`,
        tone: "warning",
        title: `${label} sudah ${Math.round(pct)}% budget`,
        description: `Sisa ${formatCurrency(budget.amount - spent)}`,
        href: "/statistics",
      });
    }
  }

  // 3) No transactions for 2+ days
  const lastTx = await getLastTransactionDate();
  if (lastTx) {
    const last = new Date(lastTx);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const gap = Math.round(
      (today.getTime() - new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime()) /
        86400000
    );
    if (gap >= 2) {
      items.push({
        id: "gap",
        tone: "info",
        title: `Belum ada transaksi selama ${gap} hari`,
        description: `Terakhir dicatat ${format(new Date(lastTx), "dd MMM yyyy")}`,
        href: "/transactions",
      });
    }
  }

  // 4) Open receivables
  const dues = await getDues();
  const openReceivables = dues.filter(
    (d) => d.direction === "receivable" && dueRemaining(d) > 0
  );
  if (openReceivables.length > 0) {
    const total = openReceivables.reduce(
      (s, d) => s + dueRemaining(d),
      0
    );
    const people = new Set(openReceivables.map((d) => d.person));
    items.push({
      id: "receivable",
      tone: "info",
      title: `Piutang ${formatCurrency(total)} belum dibayar`,
      description: `Dari ${people.size} orang (${openReceivables.length} tagihan)`,
      href: "/piutang",
    });
  }

  // 5) Recap reminder: enabled & no transaction today
  const reminderEnabled = req.nextUrl.searchParams.get("reminderEnabled") === "1";
  if (reminderEnabled) {
    const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const todayCount = await countTransactionsOnDate(todayStr);
    if (todayCount === 0) {
      items.push({
        id: "recap-today",
        tone: "info",
        title: "Belum catat transaksi hari ini",
        description: "Rapikan pengeluaran/pemasukan harianmu",
        href: "/transactions",
      });
    }
  }

  return NextResponse.json({ count: items.length, items });
}