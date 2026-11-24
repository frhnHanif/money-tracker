"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useBudgetSettings } from "@/hooks/use-budget-settings";
import { getCycleRange, getCurrentCycle, MONTHS } from "@/lib/cycle";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  downloadFinancialReportPdf,
  type FinancialReportData,
  type ReportCategoryItem,
  type ReportTransactionItem,
  type ReportFourPocketsItem,
  type ReportAccountSummaryItem,
} from "@/lib/pdf/financial-report-pdf";
import {
  FileDown,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Wallet,
  Check,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface ApiBreakdownItem {
  categoryId?: number | null;
  categoryName?: string | null;
  categoryPocket?: "living" | "saving" | "playing" | "giving" | "none" | null;
  total?: number | string | null;
}

interface ApiTransactionRow {
  id: number;
  date: string;
  type: string;
  amount: number | string;
  accountId?: number | null;
  accountName?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categoryPocket?: string | null;
  description?: string | null;
  notes?: string | null;
}

interface ApiPocketItem {
  pocket: "living" | "saving" | "playing" | "giving";
  name: string;
  targetBudget: number;
  spent: number;
  remaining: number;
  percentage: number;
  budgetRatio?: number;
}

interface ApiFourPocketsResponse {
  month: number;
  year: number;
  totalTarget: number;
  totalSpent: number;
  monthIncome?: number;
  pockets: ApiPocketItem[];
}

export default function GenerateReportPage() {
  const { data: session } = useSession();
  const { isBudgetingEnabled, resetDay } = useBudgetSettings();

  // Active month/year initialized to current cycle
  const [month, setMonth] = useState(() => getCurrentCycle(resetDay, new Date()).month);
  const [year, setYear] = useState(() => getCurrentCycle(resetDay, new Date()).year);
  const [prevResetDay, setPrevResetDay] = useState(resetDay);

  if (prevResetDay !== resetDay) {
    setPrevResetDay(resetDay);
    const active = getCurrentCycle(resetDay, new Date());
    setMonth(active.month);
    setYear(active.year);
  }

  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeFourPockets, setIncludeFourPockets] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const currentCycle = useMemo(() => getCurrentCycle(resetDay, new Date()), [resetDay]);
  const isCurrentMonth = month === currentCycle.month && year === currentCycle.year;

  const cycleRange = useMemo(
    () => getCycleRange(year, month, resetDay),
    [year, month, resetDay]
  );

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const setThisMonth = () => {
    const active = getCurrentCycle(resetDay, new Date());
    setMonth(active.month);
    setYear(active.year);
  };

  // Queries
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["report-summary", month, year, resetDay],
    queryFn: () =>
      fetch(`/api/transactions/summary?month=${month}&year=${year}&resetDay=${resetDay}`).then((r) =>
        r.json()
      ),
  });

  const { data: expenseBreakdown = [] } = useQuery<ApiBreakdownItem[]>({
    queryKey: ["report-breakdown-expense", month, year, resetDay],
    queryFn: () =>
      fetch(`/api/transactions/breakdown?month=${month}&year=${year}&type=expense&resetDay=${resetDay}`).then((r) =>
        r.json()
      ),
  });

  const { data: incomeBreakdown = [] } = useQuery<ApiBreakdownItem[]>({
    queryKey: ["report-breakdown-income", month, year, resetDay],
    queryFn: () =>
      fetch(`/api/transactions/breakdown?month=${month}&year=${year}&type=income&resetDay=${resetDay}`).then((r) =>
        r.json()
      ),
  });

  const { data: fourPocketsData } = useQuery<ApiFourPocketsResponse>({
    queryKey: ["report-four-pockets", month, year, resetDay],
    queryFn: () =>
      fetch(`/api/statistics/four-pockets?month=${month}&year=${year}&resetDay=${resetDay}`).then((r) =>
        r.json()
      ),
    enabled: isBudgetingEnabled,
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

  const { data: allTransactions = [], isLoading: isTxLoading } = useQuery<ApiTransactionRow[]>({
    queryKey: ["report-transactions", month, year, resetDay],
    queryFn: () =>
      fetch(`/api/transactions?month=${month}&year=${year}&resetDay=${resetDay}`).then((r) =>
        r.json()
      ),
  });

  const totalIncome = summary?.totalIncome || 0;
  const totalExpense = summary?.totalExpense || 0;
  const netAmount = totalIncome - totalExpense;
  const totalTransactions = allTransactions.length;
  const daysInPeriod = cycleRange.daysInPeriod;
  const daysTracked = summary?.daysTracked || 0;
  const dailyAverageExpense = Math.round(totalExpense / daysInPeriod);
  const expenseToIncomeRatio =
    totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  // Process Category List based on typeFilter
  const processedCategories: ReportCategoryItem[] = useMemo(() => {
    const list: ReportCategoryItem[] = [];

    if (typeFilter === "all" || typeFilter === "expense") {
      const expTotal = totalExpense || 1;
      expenseBreakdown.forEach((item) => {
        const catTotal = Number(item.total) || 0;
        const bAmount = item.categoryId ? budgetsMap[item.categoryId] : null;
        // Count transactions for this category
        const count = allTransactions.filter(
          (t) => t.categoryId === item.categoryId && t.type === "expense"
        ).length;

        list.push({
          id: item.categoryId ?? undefined,
          name: item.categoryName || "Tanpa Kategori",
          type: "expense",
          pocket: item.categoryPocket || null,
          total: catTotal,
          percentage: (catTotal / expTotal) * 100,
          transactionCount: count,
          budgetAmount: bAmount,
          budgetUsagePercent: bAmount ? (catTotal / bAmount) * 100 : null,
        });
      });
    }

    if (typeFilter === "all" || typeFilter === "income") {
      const incTotal = totalIncome || 1;
      incomeBreakdown.forEach((item) => {
        const catTotal = Number(item.total) || 0;
        const count = allTransactions.filter(
          (t) => t.categoryId === item.categoryId && t.type === "income"
        ).length;

        list.push({
          id: item.categoryId ?? undefined,
          name: item.categoryName || "Pemasukan Lain",
          type: "income",
          pocket: null,
          total: catTotal,
          percentage: (catTotal / incTotal) * 100,
          transactionCount: count,
        });
      });
    }

    return list.sort((a, b) => b.total - a.total);
  }, [typeFilter, totalExpense, totalIncome, expenseBreakdown, incomeBreakdown, budgetsMap, allTransactions]);

  // Group detailed transactions by category
  const categoryTransactionsGrouped = useMemo(() => {
    return processedCategories.map((cat) => {
      const txs: ReportTransactionItem[] = allTransactions
        .filter((t) => {
          if (cat.id) {
            return t.categoryId === cat.id && t.type === cat.type;
          }
          return (!t.categoryId || t.categoryId === null) && t.type === cat.type;
        })
        .map((t) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          categoryId: t.categoryId,
          categoryName: t.categoryName || cat.name,
          categoryPocket: t.categoryPocket,
          description: t.description || "-",
          accountName: t.accountName || "Umum",
          notes: t.notes || null,
          amount: Number(t.amount) || 0,
        }));

      return {
        category: cat,
        transactions: txs,
      };
    }).filter((g) => g.transactions.length > 0);
  }, [processedCategories, allTransactions]);

  // Four Pockets Items
  const fourPocketsItems: ReportFourPocketsItem[] = useMemo(() => {
    if (!fourPocketsData?.pockets) return [];
    const totalTarget = fourPocketsData.totalTarget || 0;
    return fourPocketsData.pockets.map((p) => {
      const spent = Number(p.spent) || 0;
      const target = Number(p.targetBudget) || 0;
      const targetPercent =
        p.budgetRatio !== undefined && p.budgetRatio > 0
          ? p.budgetRatio
          : totalTarget > 0
          ? Number(((target / totalTarget) * 100).toFixed(1))
          : 0;
      const actPct = target > 0 ? (spent / target) * 100 : 0;

      let status: "safe" | "warning" | "exceeded" = "safe";
      if (p.pocket === "saving") {
        status = spent >= target && target > 0 ? "safe" : "warning";
      } else {
        if (spent > target && target > 0) {
          status = "exceeded";
        } else if (spent > target * 0.85 && target > 0) {
          status = "warning";
        }
      }

      return {
        key: p.pocket,
        name: p.name,
        targetPercent,
        targetAmount: target,
        spentAmount: spent,
        actualPercent: actPct,
        status,
      };
    });
  }, [fourPocketsData]);

  // Account Summaries
  const accountSummaries: ReportAccountSummaryItem[] = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    allTransactions.forEach((t) => {
      const acc = t.accountName || "Umum";
      if (!map.has(acc)) {
        map.set(acc, { income: 0, expense: 0 });
      }
      const item = map.get(acc)!;
      const amount = Number(t.amount) || 0;
      if (t.type === "income") {
        item.income += amount;
      } else if (t.type === "expense") {
        item.expense += amount;
      }
    });

    const result: ReportAccountSummaryItem[] = [];
    map.forEach((val, accName) => {
      result.push({
        accountName: accName,
        totalIncome: val.income,
        totalExpense: val.expense,
        net: val.income - val.expense,
      });
    });

    return result.sort((a, b) => b.totalExpense + b.totalIncome - (a.totalExpense + a.totalIncome));
  }, [allTransactions]);

  // Prepare full data structure for PDF generator
  const reportPayload: FinancialReportData = useMemo(() => {
    const now = new Date();
    const formattedNow = `${now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;

    return {
      userName: session?.user?.name || "Pengguna",
      userEmail: session?.user?.email || undefined,
      generatedAt: formattedNow,
      periodLabel: cycleRange.label,
      startDate: cycleRange.startDate,
      endDate: cycleRange.endDate,
      daysInPeriod,
      daysTracked,
      typeFilter,
      summary: {
        totalIncome,
        totalExpense,
        netAmount,
        totalTransactions,
        dailyAverageExpense,
        expenseToIncomeRatio,
      },
      fourPockets: includeFourPockets && isBudgetingEnabled ? fourPocketsItems : undefined,
      categories: processedCategories,
      categoryTransactions: includeDetails ? categoryTransactionsGrouped : [],
      accountSummaries: includeAccounts ? accountSummaries : undefined,
    };
  }, [
    session,
    cycleRange,
    daysInPeriod,
    daysTracked,
    typeFilter,
    totalIncome,
    totalExpense,
    netAmount,
    totalTransactions,
    dailyAverageExpense,
    expenseToIncomeRatio,
    includeFourPockets,
    isBudgetingEnabled,
    fourPocketsItems,
    processedCategories,
    includeDetails,
    categoryTransactionsGrouped,
    includeAccounts,
    accountSummaries,
  ]);

  const handleDownloadPdf = () => {
    try {
      setIsExporting(true);
      const filename = `Laporan-Keuangan-${MONTHS[month - 1]}-${year}.pdf`;
      downloadFinancialReportPdf(reportPayload, filename);
      toast.success("Laporan PDF berhasil di-generate & diunduh!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal men-generate PDF: " + msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      {/* Print-specific style rules */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          nav,
          header,
          .no-print,
          button,
          .fixed,
          [data-sonner-toaster] {
            display: none !important;
          }
          .printable-report {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .page-break {
            page-break-before: always;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="space-y-6 pb-24">
        {/* ============================================================== */}
        {/* CONTROL & FILTER PANEL (Hidden in print)                        */}
        {/* ============================================================== */}
        <div className="no-print space-y-4 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-[#f0f0f0] dark:bg-[#272729] dark:ring-white/10 sm:p-5">
          {/* Top Bar: Title & Primary Export Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white sm:text-xl">
                Generate & Export Laporan
              </h2>
              <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                Ekspor statistik keuangan dan rincian transaksi per kategori ke PDF
              </p>
            </div>

            {/* Action Buttons: 2-column on mobile, flex on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 gap-1.5 rounded-lg border-[#e0e0e0] text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] dark:border-white/10 dark:text-white dark:hover:bg-[#333336]"
              >
                <Printer className="h-4 w-4" />
                Cetak / PDF
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isExporting || isSummaryLoading || isTxLoading}
                className="h-9 gap-1.5 rounded-lg bg-[#0066cc] text-xs font-semibold text-white shadow-xs hover:bg-[#0071e3] active:scale-[0.98]"
              >
                <FileDown className="h-4 w-4" />
                {isExporting ? "Memproses..." : "Unduh File PDF"}
              </Button>
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] dark:bg-white/10" />

          {/* Period Selector Card */}
          <div className="rounded-xl border border-[#e0e0e0] bg-[#f9f9fb] p-3 dark:border-white/10 dark:bg-[#1d1d1f]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Bulan sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7a7a7a] transition-colors hover:bg-white hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <span className="text-sm font-bold tracking-tight text-[#1d1d1f] dark:text-white sm:text-base">
                  {MONTHS[month - 1]} {year}
                </span>
                <span className="text-[11px] font-medium text-[#7a7a7a] dark:text-[#cccccc]">
                  Siklus: {cycleRange.label} {resetDay > 1 ? `(Gajian tgl ${resetDay})` : "(Bulanan)"}
                </span>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                aria-label="Bulan berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7a7a7a] transition-colors hover:bg-white hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {!isCurrentMonth && (
              <div className="mt-2 flex justify-center border-t border-[#e5e5e7] pt-2 dark:border-white/10">
                <button
                  type="button"
                  onClick={setThisMonth}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0066cc] shadow-2xs transition-colors hover:bg-blue-50 dark:bg-[#2a2a2c] dark:text-[#2997ff] dark:hover:bg-[#333336]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Kembali ke Bulan Ini
                </button>
              </div>
            )}
          </div>

          {/* Filters & Options Grid */}
          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            {/* Tipe Transaksi (Segmented Control) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                Tipe Transaksi
              </label>
              <div className="flex rounded-xl bg-[#f5f5f7] p-1 dark:bg-[#1d1d1f]">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    typeFilter === "all"
                      ? "bg-white text-[#1d1d1f] shadow-xs dark:bg-[#2a2a2c] dark:text-white"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:text-white"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("expense")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    typeFilter === "expense"
                      ? "bg-white text-red-600 shadow-xs dark:bg-[#2a2a2c] dark:text-red-400"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("income")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    typeFilter === "income"
                      ? "bg-white text-emerald-600 shadow-xs dark:bg-[#2a2a2c] dark:text-emerald-400"
                      : "text-[#7a7a7a] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:text-white"
                  }`}
                >
                  Pemasukan
                </button>
              </div>
            </div>

            {/* Opsi Konten Dokumen (Chips) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                Sertakan dalam PDF
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeDetails(!includeDetails)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    includeDetails
                      ? "border-[#0066cc]/40 bg-[#0066cc]/10 text-[#0066cc] dark:border-[#2997ff]/40 dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-[#e0e0e0] bg-transparent text-[#7a7a7a] hover:bg-[#f5f5f7] dark:border-white/10 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 transition-opacity ${includeDetails ? "opacity-100" : "opacity-0 -mr-3.5"}`} />
                  Rincian Transaksi
                </button>

                {isBudgetingEnabled && (
                  <button
                    type="button"
                    onClick={() => setIncludeFourPockets(!includeFourPockets)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      includeFourPockets
                        ? "border-[#0066cc]/40 bg-[#0066cc]/10 text-[#0066cc] dark:border-[#2997ff]/40 dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                        : "border-[#e0e0e0] bg-transparent text-[#7a7a7a] hover:bg-[#f5f5f7] dark:border-white/10 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
                    }`}
                  >
                    <Check className={`h-3.5 w-3.5 transition-opacity ${includeFourPockets ? "opacity-100" : "opacity-0 -mr-3.5"}`} />
                    Metode 4 Kantong
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIncludeAccounts(!includeAccounts)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    includeAccounts
                      ? "border-[#0066cc]/40 bg-[#0066cc]/10 text-[#0066cc] dark:border-[#2997ff]/40 dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-[#e0e0e0] bg-transparent text-[#7a7a7a] hover:bg-[#f5f5f7] dark:border-white/10 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 transition-opacity ${includeAccounts ? "opacity-100" : "opacity-0 -mr-3.5"}`} />
                  Ringkasan Akun
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DOCUMENT PREVIEW CONTAINER (Styled like an executive report)     */}
        {/* ============================================================== */}
        <div className="printable-report space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#f0f0f0] dark:bg-[#1f1f21] dark:ring-white/10">
          {/* Header Banner */}
          <div className="flex flex-col gap-4 border-b border-[#f0f0f0] pb-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded bg-[#0066cc]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#0066cc] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                  MONEY TRACKER
                </span>
                <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                  Laporan Resmi
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
                Laporan Keuangan & Statistik
              </h1>
              <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                Periode Siklus:{" "}
                <strong className="text-[#1d1d1f] dark:text-white">
                  {cycleRange.label}
                </strong>{" "}
                ({cycleRange.startDate} s/d {cycleRange.endDate})
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
                {session?.user?.name || "Pengguna"}
              </p>
              {session?.user?.email && (
                <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                  {session.user.email}
                </p>
              )}
              <p className="mt-1 text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
                {daysTracked} hari aktif dari {daysInPeriod} hari siklus
              </p>
            </div>
          </div>

          {/* Executive Summary Cards */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
              Ringkasan Eksekutif
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Income */}
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950/40 dark:bg-emerald-950/20 sm:p-4">
                <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <ArrowDownLeft className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Total Pemasukan
                    </span>
                    <p className="truncate text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                      Arus kas masuk
                    </p>
                  </div>
                </div>
                <div className="ml-auto min-w-0 shrink-0 text-right">
                  <p className="whitespace-nowrap text-base font-bold text-emerald-700 dark:text-emerald-300 sm:text-lg">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
              </div>

              {/* Expense */}
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-red-100 bg-red-50/50 p-3.5 dark:border-red-950/40 dark:bg-red-950/20 sm:p-4">
                <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100/80 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                    <ArrowUpRight className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-red-800 dark:text-red-300">
                      Total Pengeluaran
                    </span>
                    <p className="truncate text-[11px] text-red-600/80 dark:text-red-400/80">
                      {expenseToIncomeRatio > 0
                        ? `${expenseToIncomeRatio.toFixed(1)}% dari pemasukan`
                        : "Total belanja"}
                    </p>
                  </div>
                </div>
                <div className="ml-auto min-w-0 shrink-0 text-right">
                  <p className="whitespace-nowrap text-base font-bold text-red-700 dark:text-red-300 sm:text-lg">
                    {formatCurrency(totalExpense)}
                  </p>
                </div>
              </div>

              {/* Net Cash Flow */}
              <div
                className={`flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border p-3.5 sm:p-4 ${
                  netAmount >= 0
                    ? "border-blue-100 bg-blue-50/50 dark:border-blue-950/40 dark:bg-blue-950/20"
                    : "border-red-100 bg-red-50/50 dark:border-red-950/40 dark:bg-red-950/20"
                }`}
              >
                <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      netAmount >= 0
                        ? "bg-blue-100/80 text-[#0066cc] dark:bg-blue-900/50 dark:text-[#2997ff]"
                        : "bg-red-100/80 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                    }`}
                  >
                    <Wallet className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-xs font-semibold ${
                        netAmount >= 0
                          ? "text-blue-900 dark:text-blue-200"
                          : "text-red-900 dark:text-red-200"
                      }`}
                    >
                      Arus Kas Bersih
                    </span>
                    <p className="truncate text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                      {netAmount >= 0 ? "Surplus periode" : "Defisit periode"}
                    </p>
                  </div>
                </div>
                <div className="ml-auto min-w-0 shrink-0 text-right">
                  <p
                    className={`whitespace-nowrap text-base font-bold sm:text-lg ${
                      netAmount >= 0
                        ? "text-[#0066cc] dark:text-[#2997ff]"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(netAmount)}
                  </p>
                </div>
              </div>

              {/* Daily Average & Tx Count */}
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-[#f0f0f0] bg-[#fafafc] p-3.5 dark:border-white/10 dark:bg-[#272729] sm:p-4">
                <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-200/70 text-[#1d1d1f] dark:bg-[#333336] dark:text-white">
                    <PieChart className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[#1d1d1f] dark:text-white">
                      Rata-rata Harian
                    </span>
                    <p className="truncate text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                      {totalTransactions} total transaksi
                    </p>
                  </div>
                </div>
                <div className="ml-auto min-w-0 shrink-0 text-right">
                  <div className="flex items-baseline justify-end gap-1 whitespace-nowrap">
                    <span className="text-base font-bold text-[#1d1d1f] dark:text-white sm:text-lg">
                      {formatCurrency(dailyAverageExpense)}
                    </span>
                    <span className="shrink-0 text-xs font-normal text-[#7a7a7a] dark:text-[#cccccc]">
                      /hari
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Pockets Section (if enabled) */}
          {includeFourPockets && isBudgetingEnabled && fourPocketsItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                  Alokasi 4 Kantong (Budgeting)
                </h3>
                <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                  {fourPocketsData?.totalTarget
                    ? `Total Terencana: ${formatCurrency(fourPocketsData.totalTarget)}`
                    : "Living (57%) • Saving (30%) • Playing (9%) • Giving (4%)"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#f0f0f0] dark:border-white/10">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-[#f5f5f7] text-[11px] font-semibold text-[#7a7a7a] dark:bg-[#272729] dark:text-[#cccccc]">
                    <tr>
                      <th className="p-2.5">Kantong</th>
                      <th className="p-2.5 text-right">Target %</th>
                      <th className="p-2.5 text-right">Target Nominal</th>
                      <th className="p-2.5 text-right">Realisasi (Rp)</th>
                      <th className="p-2.5 text-right">Realisasi %</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/10">
                    {fourPocketsItems.map((pocket) => (
                      <tr key={pocket.key} className="hover:bg-[#f9f9fa] dark:hover:bg-[#252527]">
                        <td className="p-2.5 font-medium text-[#1d1d1f] dark:text-white">
                          {pocket.name}
                        </td>
                        <td className="p-2.5 text-right text-[#7a7a7a] dark:text-[#cccccc]">
                          {pocket.targetPercent.toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-right text-[#7a7a7a] dark:text-[#cccccc]">
                          {formatCurrency(pocket.targetAmount)}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-[#1d1d1f] dark:text-white">
                          {formatCurrency(pocket.spentAmount)}
                        </td>
                        <td
                          className={`p-2.5 text-right font-semibold ${
                            pocket.status === "exceeded"
                              ? "text-red-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {pocket.actualPercent.toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              pocket.status === "exceeded"
                                ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                : pocket.key === "saving" && pocket.spentAmount >= pocket.targetAmount && pocket.targetAmount > 0
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : pocket.status === "warning"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {pocket.status === "exceeded"
                              ? "Over Budget"
                              : pocket.key === "saving" && pocket.spentAmount >= pocket.targetAmount && pocket.targetAmount > 0
                              ? "Tercapai"
                              : pocket.status === "warning"
                              ? "Waspada"
                              : "Terkendali"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-[#e5e5e7] bg-[#f5f5f7]/60 font-semibold dark:border-white/10 dark:bg-[#272729]/60">
                    <tr>
                      <td className="p-2.5 text-[#1d1d1f] dark:text-white">Total</td>
                      <td className="p-2.5 text-right text-[#7a7a7a] dark:text-[#cccccc]">
                        {fourPocketsItems.reduce((acc, p) => acc + p.targetPercent, 0).toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-right text-[#1d1d1f] dark:text-white">
                        {formatCurrency(fourPocketsItems.reduce((acc, p) => acc + p.targetAmount, 0))}
                      </td>
                      <td className="p-2.5 text-right text-[#1d1d1f] dark:text-white">
                        {formatCurrency(fourPocketsItems.reduce((acc, p) => acc + p.spentAmount, 0))}
                      </td>
                      <td className="p-2.5 text-right text-[#1d1d1f] dark:text-white">
                        {fourPocketsItems.reduce((acc, p) => acc + p.targetAmount, 0) > 0
                          ? (
                              (fourPocketsItems.reduce((acc, p) => acc + p.spentAmount, 0) /
                                fourPocketsItems.reduce((acc, p) => acc + p.targetAmount, 0)) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </td>
                      <td className="p-2.5 text-center text-[#7a7a7a] dark:text-[#cccccc]">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Category Summary Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                Ringkasan Statistik Per Kategori
              </h3>
              <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                {processedCategories.length} Kategori Ditemukan
              </span>
            </div>

            {processedCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e0e0e0] p-6 text-center text-xs text-[#7a7a7a] dark:border-white/10 dark:text-[#cccccc]">
                Tidak ada data transaksi pada periode dan filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#f0f0f0] dark:border-white/10">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-[#f5f5f7] text-[11px] font-semibold text-[#7a7a7a] dark:bg-[#272729] dark:text-[#cccccc]">
                    <tr>
                      <th className="w-10 p-2.5 text-center">No</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5 text-center">Tipe</th>
                      <th className="p-2.5">Kantong</th>
                      <th className="p-2.5 text-center">Jml Tx</th>
                      <th className="p-2.5 text-right">Total (Rp)</th>
                      <th className="p-2.5 text-right">Porsi (%)</th>
                      <th className="p-2.5 text-right">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/10">
                    {processedCategories.map((cat, idx) => (
                      <tr key={cat.name + idx} className="hover:bg-[#f9f9fa] dark:hover:bg-[#252527]">
                        <td className="p-2.5 text-center text-[#7a7a7a] dark:text-[#cccccc]">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 font-medium text-[#1d1d1f] dark:text-white">
                          {cat.name}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              cat.type === "income"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            }`}
                          >
                            {cat.type === "income" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                          {cat.pocket && cat.pocket !== "none" ? cat.pocket.toUpperCase() : "-"}
                        </td>
                        <td className="p-2.5 text-center text-[#7a7a7a] dark:text-[#cccccc]">
                          {cat.transactionCount}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-[#1d1d1f] dark:text-white">
                          {formatCurrency(cat.total)}
                        </td>
                        <td className="p-2.5 text-right text-[#7a7a7a] dark:text-[#cccccc]">
                          {cat.percentage.toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-right text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                          {cat.budgetAmount ? formatCurrency(cat.budgetAmount) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Itemized Transactions by Category */}
          {includeDetails && categoryTransactionsGrouped.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-5 dark:border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                  Rincian Transaksi Tiap Kategori
                </h3>
                <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                  {categoryTransactionsGrouped.length} Kategori dengan transaksi
                </span>
              </div>

              <div className="space-y-4">
                {categoryTransactionsGrouped.map((group, gIdx) => {
                  const cat = group.category;
                  const txList = group.transactions;

                  return (
                    <div
                      key={cat.name + gIdx}
                      className="overflow-hidden rounded-xl border border-[#f0f0f0] dark:border-white/10"
                    >
                      {/* Category Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f5f5f7] px-3.5 py-2.5 dark:bg-[#272729]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0066cc] dark:text-[#2997ff]">
                            {cat.name}
                          </span>
                          {cat.pocket && cat.pocket !== "none" && (
                            <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#7a7a7a] dark:bg-[#333336] dark:text-[#cccccc]">
                              {cat.pocket.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
                          <span className="mr-2 text-[11px] font-normal text-[#7a7a7a] dark:text-[#cccccc]">
                            {txList.length} Transaksi •
                          </span>
                          <span>{formatCurrency(cat.total)}</span>
                          <span className="ml-1 text-[11px] font-normal text-[#7a7a7a] dark:text-[#cccccc]">
                            ({cat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Transactions Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[540px] text-left text-xs">
                          <thead className="border-b border-[#f0f0f0] bg-white text-[10px] font-semibold text-[#7a7a7a] dark:border-white/10 dark:bg-[#1f1f21] dark:text-[#cccccc]">
                            <tr>
                              <th className="w-8 p-2 text-center">No</th>
                              <th className="w-24 p-2">Tanggal</th>
                              <th className="p-2">Deskripsi Transaksi</th>
                              <th className="w-28 p-2">Akun / Rekening</th>
                              <th className="p-2">Catatan</th>
                              <th className="w-28 p-2 text-right">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/10">
                            {txList.map((tx, tIdx) => (
                              <tr key={tx.id || tIdx} className="hover:bg-[#fafafc] dark:hover:bg-[#252527]">
                                <td className="p-2 text-center text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                                  {tIdx + 1}
                                </td>
                                <td className="p-2 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                                  {formatDate(tx.date, "short")}
                                </td>
                                <td className="p-2 font-medium text-[#1d1d1f] dark:text-white">
                                  {tx.description}
                                </td>
                                <td className="p-2 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                                  {tx.accountName}
                                </td>
                                <td className="p-2 text-[11px] italic text-[#7a7a7a] dark:text-[#cccccc]">
                                  {tx.notes || "-"}
                                </td>
                                <td
                                  className={`p-2 text-right font-medium ${
                                    tx.type === "income"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-[#1d1d1f] dark:text-white"
                                  }`}
                                >
                                  {formatCurrency(tx.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-[#f0f0f0] bg-[#fafafc] font-semibold text-[#1d1d1f] dark:border-white/10 dark:bg-[#272729] dark:text-white">
                            <tr>
                              <td colSpan={5} className="p-2 text-right text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                                Subtotal {cat.name}:
                              </td>
                              <td className="p-2 text-right">
                                {formatCurrency(cat.total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Summary Section */}
          {includeAccounts && accountSummaries.length > 0 && (
            <div className="space-y-3 border-t border-[#f0f0f0] pt-5 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                Ringkasan Per Akun / Rekening
              </h3>

              <div className="overflow-x-auto rounded-xl border border-[#f0f0f0] dark:border-white/10">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-[#f5f5f7] text-[11px] font-semibold text-[#7a7a7a] dark:bg-[#272729] dark:text-[#cccccc]">
                    <tr>
                      <th className="p-2.5">Nama Rekening / Akun</th>
                      <th className="p-2.5 text-right">Pemasukan</th>
                      <th className="p-2.5 text-right">Pengeluaran</th>
                      <th className="p-2.5 text-right">Arus Kas Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/10">
                    {accountSummaries.map((acc) => (
                      <tr key={acc.accountName} className="hover:bg-[#f9f9fa] dark:hover:bg-[#252527]">
                        <td className="p-2.5 font-medium text-[#1d1d1f] dark:text-white">
                          {acc.accountName}
                        </td>
                        <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(acc.totalIncome)}
                        </td>
                        <td className="p-2.5 text-right text-red-600 dark:text-red-400">
                          {formatCurrency(acc.totalExpense)}
                        </td>
                        <td
                          className={`p-2.5 text-right font-semibold ${
                            acc.net >= 0
                              ? "text-[#0066cc] dark:text-[#2997ff]"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatCurrency(acc.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer inside document */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-[#f0f0f0] pt-4 text-[10px] text-[#7a7a7a] dark:border-white/10 dark:text-[#cccccc] sm:flex-row">
            <span>Money Tracker • Laporan Keuangan Pribadi</span>
            <span>Dicetak secara otomatis pada {reportPayload.generatedAt}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
