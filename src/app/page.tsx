"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { AccountCarousel } from "@/components/home/account-carousel";
import { ActivityWidget } from "@/components/home/activity-widget";
import { BudgetWidget } from "@/components/home/budget-widget";
import { formatCurrency, groupTransactions } from "@/lib/utils";
import { dueRemaining, type DueItem } from "@/lib/dues";
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  HandCoins,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface AccountLike {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface AccountBalance {
  balance: number;
  monthNet: number;
}

interface BudgetLike {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  amount: number;
}

interface SummaryLike {
  totalIncome: number;
  totalExpense: number;
  net: number;
  daysTracked: number;
  daysInMonth: number;
}

interface BreakdownItem {
  categoryName: string;
  categoryColor: string | null;
  total: number;
}

export default function HomePage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [showBalance, setShowBalance] = useState(false);

  const { data: accounts = [] } = useQuery<AccountLike[]>({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.json()),
  });

  const { data: balances = {} } = useQuery<Record<number, AccountBalance>>({
    queryKey: ["balances"],
    queryFn: () => fetch("/api/accounts/balances").then((r) => r.json()),
  });

  const { data: summary } = useQuery<SummaryLike>({
    queryKey: ["summary", month, year],
    queryFn: () =>
      fetch(`/api/transactions/summary?month=${month}&year=${year}`).then((r) =>
        r.json()
      ),
  });

  const { data: breakdown = [] } = useQuery<BreakdownItem[]>({
    queryKey: ["breakdown", month, year, "expense"],
    queryFn: () =>
      fetch(
        `/api/transactions/breakdown?month=${month}&year=${year}&type=expense`
      ).then((r) => r.json()),
  });

  const { data: budgets = [] } = useQuery<BudgetLike[]>({
    queryKey: ["budgets"],
    queryFn: () => fetch("/api/budgets").then((r) => r.json()),
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["transactions", "recent", month, year],
    queryFn: () =>
      fetch(`/api/transactions?month=${month}&year=${year}&limit=5`).then((r) => r.json()),
  });

  const { data: dues = [] } = useQuery<DueItem[]>({
    queryKey: ["dues"],
    queryFn: () => fetch("/api/dues").then((r) => r.json()),
  });

  const openDues = dues.filter((d) => dueRemaining(d) > 0);
  const receivableSum = openDues
    .filter((d) => d.direction === "receivable")
    .reduce((s, d) => s + dueRemaining(d), 0);
  const payableSum = openDues
    .filter((d) => d.direction === "payable")
    .reduce((s, d) => s + dueRemaining(d), 0);

  const groupedRecent = groupTransactions(recentTransactions);
  const globalBudget = budgets.find((b) => b.categoryId === null);

  return (
    <AppShell>
      <div className="space-y-8 pb-4">
        {/* Account Carousel */}
        <AccountCarousel
          accounts={accounts}
          balances={balances}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance((v) => !v)}
        />

        {/* Monthly Summary — compact */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#16a34a]/8 p-3 text-center dark:bg-[#4ade80]/10">
            <div className="flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#16a34a] dark:text-[#4ade80]" />
              <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Income
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#16a34a] dark:text-[#4ade80]">
              {showBalance ? formatCurrency(summary?.totalIncome || 0) : "••••"}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/30">
            <div className="flex items-center justify-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
              <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Expense
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-red-500 dark:text-red-400">
              {showBalance ? formatCurrency(summary?.totalExpense || 0) : "••••"}
            </p>
          </div>
          <div className="rounded-lg bg-[#f5f5f7] p-3 text-center dark:bg-[#2a2a2c]">
            <div className="flex items-center justify-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Net
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#333333] dark:text-white">
              {showBalance ? formatCurrency(summary?.net || 0) : "••••"}
            </p>
          </div>
        </div>

        {/* Activity — non-sensitive stats */}
        <ActivityWidget
          breakdown={breakdown}
          daysTracked={summary?.daysTracked ?? 0}
          daysInMonth={summary?.daysInMonth ?? 30}
          monthLabel={MONTHS[month - 1]}
        />

        {/* Budget widget */}
        {globalBudget && (
          <BudgetWidget
            budget={globalBudget.amount}
            spent={summary?.totalExpense ?? 0}
          />
        )}

        {/* Dues (piutang/utang) */}
        {openDues.length > 0 && (
          <Link href="/piutang" className="block">
            <div className="flex items-center gap-4 rounded-lg bg-[#16a34a]/8 px-5 py-4 dark:bg-[#4ade80]/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#16a34a]/15 dark:bg-[#4ade80]/20">
                <HandCoins className="h-5 w-5 text-[#16a34a] dark:text-[#4ade80]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                  {receivableSum > 0 && payableSum > 0
                    ? `Piutang ${formatCurrency(receivableSum)} • Utang ${formatCurrency(payableSum)}`
                    : receivableSum > 0
                      ? `Piutang ${formatCurrency(receivableSum)}`
                      : `Utang ${formatCurrency(payableSum)}`}
                </p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  {openDues.length} tagihan terbuka • ketuk untuk kelola
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#7a7a7a] dark:text-[#cccccc]" />
            </div>
          </Link>
        )}

        {/* Recent Transactions — Full-bleed */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Transaksi Terbaru
            </h3>
            <Link
              href="/transactions"
              className="text-xs font-medium text-[#0066cc] hover:underline dark:text-[#2997ff]"
            >
              Lihat semua
            </Link>
          </div>
          {groupedRecent.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#7a7a7a] dark:text-[#cccccc]">
              Belum ada transaksi
            </p>
          ) : (
            <div className="space-y-1">
              {groupedRecent.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg px-4 py-4 hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                      {tx.description || tx.categoryName || "Transaksi"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                      {tx.groupedTransfer
                        ? `${tx.accountName} → ${tx.transferIn?.accountName}`
                        : `${tx.accountName} • ${tx.date}`}
                    </p>
                  </div>
                  {tx.groupedTransfer ? (
                    <p className="shrink-0 pl-4 text-sm font-semibold text-[#7a7a7a] dark:text-[#cccccc]">
                      {formatCurrency(tx.amount)}
                    </p>
                  ) : (
                  <p
                    className={`shrink-0 pl-4 text-sm font-semibold ${
                      tx.type === "income" || tx.type === "transfer_in"
                        ? "text-[#16a34a] dark:text-[#4ade80]"
                        : tx.type === "adjustment_in" ||
                            tx.type === "adjustment_out"
                          ? "text-[#7a7a7a] dark:text-[#cccccc]"
                          : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "income" || tx.type === "transfer_in"
                      ? "+"
                      : tx.type === "adjustment_in" ||
                          tx.type === "adjustment_out"
                        ? "±"
                        : "-"}
                    {formatCurrency(tx.amount)}
                  </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}