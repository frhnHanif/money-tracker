"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Info,
  Utensils,
  Cookie,
  ShoppingBag,
  Shirt,
  Car,
  Pencil,
  Users,
  Hand,
  ArrowRightLeft,
  Briefcase,
  Heart,
  TrendingUp,
  Archive,
  HelpCircle,
  Wallet,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Crown,
} from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const iconMap: Record<string, React.ComponentType<any>> = {
  utensils: Utensils,
  cookie: Cookie,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  car: Car,
  pencil: Pencil,
  users: Users,
  hand: Hand,
  "arrow-right-left": ArrowRightLeft,
  briefcase: Briefcase,
  heart: Heart,
  "trending-up": TrendingUp,
  archive: Archive,
  "help-circle": HelpCircle,
  tag: Wallet,
  wallet: Wallet,
};

const COLORS = [
  "#ef4444", "#f97316", "#a855f7", "#06b6d4", "#64748b",
  "#8b5cf6", "#ec4899", "#f59e0b", "#3b82f6", "#22c55e",
  "#e11d48", "#14b8a6", "#84cc16", "#f43f5e", "#6366f1",
];

export default function StatisticsPage() {
  const [initial] = useState(() => {
    if (typeof window === "undefined") {
      const now = new Date();
      return { month: now.getMonth() + 1, year: now.getFullYear() };
    }
    const params = new URLSearchParams(window.location.search);
    const m = Number(params.get("month"));
    const y = Number(params.get("year"));
    if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const syncUrl = (m: number, y: number) => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `?month=${m}&year=${y}`);
    }
  };

  const { data: breakdown = [] } = useQuery({
    queryKey: ["breakdown", month, year, activeTab],
    queryFn: () =>
      fetch(
        `/api/transactions/breakdown?month=${month}&year=${year}&type=${activeTab}`
      ).then((r) => r.json()),
  });

  const { data: summary } = useQuery({
    queryKey: ["summary", month, year],
    queryFn: () =>
      fetch(`/api/transactions/summary?month=${month}&year=${year}`).then((r) =>
        r.json()
      ),
  });

  const prevM = month === 1 ? 12 : month - 1;
  const prevY = month === 1 ? year - 1 : year;
  const { data: prevSummary } = useQuery({
    queryKey: ["summary", prevM, prevY],
    queryFn: () =>
      fetch(`/api/transactions/summary?month=${prevM}&year=${prevY}`).then((r) =>
        r.json()
      ),
  });

  const { data: trend = [] } = useQuery({
    queryKey: ["trend"],
    queryFn: () => fetch("/api/transactions/trend").then((r) => r.json()),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => fetch("/api/budgets").then((r) => r.json()),
  });

  const budgetsMap = useMemo(
    () =>
      Object.fromEntries(
        budgets.map((b: { categoryId: number; amount: number }) => [
          b.categoryId,
          b.amount,
        ])
      ),
    [budgets]
  );

  // Drill-down: fetch transactions for selected category
  const { data: categoryTransactions = [] } = useQuery({
    queryKey: ["categoryTransactions", month, year, activeTab, selectedCategory?.categoryId],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const params = new URLSearchParams();
      params.set("month", String(month));
      params.set("year", String(year));
      params.set("type", activeTab);
      params.set("categoryId", String(selectedCategory.categoryId));
      const res = await fetch(`/api/transactions?${params}`);
      return res.json();
    },
    enabled: !!selectedCategory,
  });

  const totalAmount = useMemo(
    () => breakdown.reduce((sum: number, item: any) => sum + item.total, 0),
    [breakdown]
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const curExpense = summary?.totalExpense || 0;
  const prevExpense = prevSummary?.totalExpense || 0;
  const avgDailyExpense = Math.round(curExpense / daysInMonth);
  const expenseDeltaPct =
    prevExpense > 0 ? ((curExpense - prevExpense) / prevExpense) * 100 : 0;
  const expenseDeltaText =
    prevExpense === 0 && curExpense === 0
      ? "0%"
      : `${expenseDeltaPct >= 0 ? "+" : ""}${expenseDeltaPct.toFixed(0)}%`;
  const topCategory = breakdown.length > 0 ? breakdown[0] : null;

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
      syncUrl(12, year - 1);
    } else {
      setMonth(month - 1);
      syncUrl(month - 1, year);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
      syncUrl(1, year + 1);
    } else {
      setMonth(month + 1);
      syncUrl(month + 1, year);
    }
  };

  const chartData = useMemo(
    () =>
      breakdown.map((item: any, i: number) => ({
        ...item,
        fill: item.categoryColor || COLORS[i % COLORS.length],
      })),
    [breakdown]
  );

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Tabs: Pengeluaran / Pemasukan */}
        <div className="flex rounded-lg bg-[#f5f5f7] p-1 dark:bg-[#2a2a2c]">
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              activeTab === "expense"
                ? "bg-white text-[#1d1d1f] dark:bg-[#3a3a3c] dark:text-white"
                : "text-[#7a7a7a] dark:text-[#cccccc]"
            }`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              activeTab === "income"
                ? "bg-white text-[#1d1d1f] dark:bg-[#3a3a3c] dark:text-white"
                : "text-[#7a7a7a] dark:text-[#cccccc]"
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="text-[#7a7a7a] hover:bg-[#f5f5f7] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold tracking-[-0.21px] text-[#1d1d1f] dark:text-white">
            {MONTHS[month - 1]} {year}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="text-[#7a7a7a] hover:bg-[#f5f5f7] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Donut Chart with Center Total */}
        <div className="relative mx-auto flex w-full max-w-[300px] items-center justify-center">
          {chartData.length === 0 ? (
            <div className="flex h-[280px] w-full items-center justify-center">
              <p className="text-center text-[#7a7a7a] dark:text-[#cccccc]">
                Belum ada data{" "}
                {activeTab === "expense" ? "pengeluaran" : "pemasukan"}
              </p>
            </div>
          ) : (
            <div className="relative h-[280px] w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="total"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={82}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={entry.categoryId} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      `${formatCurrency(Number(value))} (${
                        totalAmount > 0
                          ? Math.round((Number(value) / totalAmount) * 100)
                          : 0
                      }%)`
                    }
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2">
                <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                  {activeTab === "expense" ? "Total Pengeluaran" : "Total Pemasukan"}
                </span>
                <span className="text-[9px] font-medium text-[#7a7a7a] dark:text-[#cccccc]">
                  IDR
                </span>
                <span className="mt-0.5 max-w-[140px] truncate text-sm font-semibold leading-tight text-[#1d1d1f] dark:text-white">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 rounded-lg bg-[#0066cc]/8 p-4 dark:bg-[#2997ff]/10">
          <Info className="mt-0.5 size-5 shrink-0 text-[#0066cc] dark:text-[#2997ff]" />
          <div className="text-sm text-[#0066cc] dark:text-[#2997ff]">
            <p className="font-medium">Tentang Catatan Finansial</p>
            <p className="mt-0.5 text-[#0066cc]/70 dark:text-[#2997ff]/70">
              {activeTab === "expense"
                ? "Lihat ke mana uangmu pergi setiap bulan. Ketuk kategori untuk detail lebih lanjut."
                : "Pantau sumber pemasukanmu. Ketuk kategori untuk melihat rincian."}
            </p>
          </div>
        </div>

        {/* Insights */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#1d1d1f] dark:text-white">
            Insight {MONTHS[month - 1]}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
              <CalendarDays className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="mt-2 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Rata-rata harian
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-white">
                {formatCurrency(avgDailyExpense)}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
              <TrendingUp className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="mt-2 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                vs Bulan Lalu
              </p>
              <p
                className={`mt-0.5 text-sm font-semibold ${
                  expenseDeltaPct >= 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-[#16a34a] dark:text-[#4ade80]"
                }`}
              >
                {expenseDeltaText}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
              <Crown className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="mt-2 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Top Kategori
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#1d1d1f] dark:text-white">
                {topCategory?.categoryName || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Trend 6 Months */}
        {trend.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Tren 6 Bulan
            </h3>
            <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={trend} barGap={2}>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(0,0,0,0.06)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#7a7a7a" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#7a7a7a" }}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}rb`}
                    width={36}
                  />
<Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                      fontSize: "13px",
                    }}
                  />
                  <Bar
                    dataKey="totalIncome"
                    name="Income"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="totalExpense"
                    name="Expense"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 pt-1 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Income
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Expense
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Category List */}
        {chartData.length > 0 && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Kategori
            </h3>
            <div className="space-y-2">
              {chartData.map((item: any) => {
                const Icon = iconMap[item.categoryIcon] || Wallet;
                const percent =
                  totalAmount > 0
                    ? ((item.total / totalAmount) * 100).toFixed(0)
                    : "0";
                const budgetAmount: number | undefined =
                  budgetsMap[item.categoryId];
                const overBudget =
                  (budgetAmount ?? 0) > 0 && item.total > (budgetAmount ?? 0);
                return (
                  <button
                    key={item.categoryId}
                    onClick={() => setSelectedCategory(item)}
                    className="flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${item.fill}18` }}
                    >
                      <Icon
                        className="size-5"
                        style={{ color: item.fill }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                        {item.categoryName}
                      </p>
                      {budgetAmount != null && budgetAmount > 0 && activeTab === "expense" && (
                        <div className="mt-1.5">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-[#3a3a3c]">
                            <div
                              className={`h-full rounded-full ${
                                overBudget ? "bg-red-500" : ""
                              }`}
                              style={{
                                width: `${Math.min(
                                  (item.total / budgetAmount) * 100,
                                  100
                                )}%`,
                                backgroundColor: overBudget
                                  ? undefined
                                  : item.fill,
                              }}
                            />
                          </div>
                          <p
                            className={`mt-0.5 text-[10px] ${
                              overBudget
                                ? "text-red-500 dark:text-red-400"
                                : "text-[#7a7a7a] dark:text-[#cccccc]"
                            }`}
                          >
                            {overBudget
                              ? `Melebihi ${formatCurrency(
                                  item.total - budgetAmount
                                )}`
                              : `Sisa ${formatCurrency(
                                  budgetAmount - item.total
                                )} dari ${formatCurrency(budgetAmount)}`}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                        {formatCurrency(item.total)}
                      </p>
                      <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                        {percent}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drill-down Bottom Sheet */}
        <Sheet
          open={!!selectedCategory}
          onOpenChange={(open) => {
            if (!open) setSelectedCategory(null);
          }}
        >
          <SheetContent
            side="bottom"
            className="flex h-[95vh] flex-col rounded-t-3xl border-0 p-0 [&>button]:hidden"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[#e0e0e0] dark:bg-[#3a3a3c]" />
            </div>

            {/* Custom Header */}
            <div className="flex items-center gap-3 px-5 py-3">
              {/* Left: Category Icon */}
              {selectedCategory && (() => {
                const Icon = iconMap[selectedCategory.categoryIcon] || Wallet;
                return (
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${selectedCategory.fill}18` }}
                  >
                    <Icon className="size-5" style={{ color: selectedCategory.fill }} />
                  </div>
                );
              })()}

              {/* Center: Category Name + Total */}
              <div className="flex-1 text-center">
                <p className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                  {selectedCategory?.categoryName}
                </p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  {formatCurrency(selectedCategory?.total || 0)}
                </p>
              </div>

              {/* Right: Close Button */}
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#f0f0f0] dark:bg-white/10" />

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto px-5 py-3 pb-8">
              {categoryTransactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#7a7a7a]">
                  Tidak ada transaksi
                </p>
              ) : (
                <div className="space-y-1">
                  {categoryTransactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                          {tx.description || tx.categoryName || "Transaksi"}
                        </p>
                        <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                          {tx.accountName} • {formatDate(tx.date, "long")}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 pl-4 text-sm font-semibold ${
                          activeTab === "income"
                            ? "text-[#16a34a] dark:text-[#4ade80]"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {activeTab === "income" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppShell>
  );
}