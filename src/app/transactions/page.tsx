"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency, formatDate, groupTransactions } from "@/lib/utils";
import { TransactionActionSheet } from "@/components/transaction-action-sheet";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { DateRangePickerSheet } from "@/components/date-range-picker-sheet";
import { useLongPress } from "@/hooks/use-long-press";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowRightLeft,
  Plus,
  Wrench,
  Calendar as CalendarIcon,
} from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type TxRow = {
  id: number;
  type: string;
  description?: string;
  categoryName?: string;
  categoryColor?: string;
  categoryId?: number | null;
  amount?: number;
  accountName?: string;
  accountColor?: string;
  accountId?: number;
  date?: string;
  notes?: string;
  fee?: number;
  transferIn?: { id?: number; accountId?: number; accountName?: string };
  groupedTransfer?: boolean;
};

function TransactionRowItem({
  tx,
  onOpenMenu,
}: {
  tx: TxRow;
  onOpenMenu: (tx: TxRow) => void;
}) {
  const { isPressing, handlers } = useLongPress({
    onLongPress: () => onOpenMenu(tx),
  });

  if (tx.groupedTransfer) {
    return (
      <div
        {...handlers}
        className={cn(
          "flex items-center justify-between rounded-lg p-3 transition-all select-none cursor-pointer",
          isPressing
            ? "bg-[#ebebee] dark:bg-[#343438] scale-[0.99]"
            : "hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: (tx.categoryColor || "#3b82f6") + "20",
            }}
          >
            <ArrowRightLeft
              className="h-4 w-4"
              style={{
                color: tx.categoryColor || "#3b82f6",
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
              {tx.description || "Transfer"}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                className="px-1.5 py-0 text-[10px] leading-5"
                style={{
                  backgroundColor: (tx.categoryColor || "#3b82f6") + "20",
                  color: tx.categoryColor || "#3b82f6",
                  borderColor: "transparent",
                }}
              >
                {tx.accountName} → {tx.transferIn?.accountName}
              </Badge>
              {typeof tx.fee === "number" && tx.fee > 0 && (
                <Badge
                  className="px-1.5 py-0 text-[10px] leading-5"
                  style={{
                    backgroundColor: "#f9731620",
                    color: "#f97316",
                    borderColor: "transparent",
                  }}
                >
                  Admin: {formatCurrency(tx.fee)}
                </Badge>
              )}
              {tx.notes && (
                <span className="truncate text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  {tx.notes}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center pl-3">
          <p className="text-sm font-semibold text-[#7a7a7a] dark:text-[#cccccc]">
            {formatCurrency(tx.amount ?? 0)}
          </p>
        </div>
      </div>
    );
  }

  const isAdjustment =
    tx.type === "adjustment_in" || tx.type === "adjustment_out";

  return (
    <div
      {...handlers}
      className={cn(
        "flex items-center justify-between rounded-lg p-3 transition-all select-none cursor-pointer",
        isPressing
          ? "bg-[#ebebee] dark:bg-[#343438] scale-[0.99]"
          : "hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: isAdjustment
              ? "#7a7a7a20"
              : (tx.categoryColor || "#6b7280") + "20",
          }}
        >
          {isAdjustment ? (
            <Wrench className="h-4 w-4" style={{ color: "#7a7a7a" }} />
          ) : (
            <span
              className="text-xs font-bold"
              style={{ color: tx.categoryColor || "#6b7280" }}
            >
              {(tx.categoryName || "?").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
            {tx.description ||
              tx.categoryName ||
              (isAdjustment ? "Penyesuaian saldo" : "Transaksi")}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {isAdjustment ? (
              <Badge
                className="px-1.5 py-0 text-[10px] leading-5"
                style={{
                  backgroundColor: "#7a7a7a20",
                  color: "#7a7a7a",
                  borderColor: "transparent",
                }}
              >
                Penyesuaian
              </Badge>
            ) : (
              <Badge
                className="px-1.5 py-0 text-[10px] leading-5"
                style={{
                  backgroundColor: (tx.categoryColor || "#6b7280") + "20",
                  color: tx.categoryColor || "#6b7280",
                  borderColor: "transparent",
                }}
              >
                {tx.categoryName || "Uncategorized"}
              </Badge>
            )}
            <Badge
              className="px-1.5 py-0 text-[10px] leading-5"
              style={{
                backgroundColor: (tx.accountColor || "#6b7280") + "20",
                color: tx.accountColor || "#6b7280",
                borderColor: "transparent",
              }}
            >
              {tx.accountName}
            </Badge>
            {tx.notes && (
              <span className="truncate text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                {tx.notes}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center pl-3">
        <p
          className={`text-sm font-semibold ${
            tx.type === "income" || tx.type === "transfer_in"
              ? "text-[#16a34a] dark:text-[#4ade80]"
              : isAdjustment
                ? "text-[#7a7a7a] dark:text-[#cccccc]"
                : "text-red-500 dark:text-red-400"
          }`}
        >
          {tx.type === "income" || tx.type === "transfer_in"
            ? "+"
            : isAdjustment
              ? "±"
              : "-"}
          {formatCurrency(tx.amount ?? 0)}
        </p>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [initial] = useState(() => {
    const now = new Date();
    if (typeof window === "undefined") {
      return {
        dateRange: { from: subDays(now, 6), to: now },
        label: "7 Hari Terakhir",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      };
    }
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get("startDate");
    const endParam = params.get("endDate");
    if (startParam && endParam) {
      const from = new Date(startParam + "T00:00:00");
      const to = new Date(endParam + "T23:59:59");
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        return {
          dateRange: { from, to },
          label: `${format(from, "d MMM", { locale: id })} - ${format(to, "d MMM yyyy", { locale: id })}`,
          month: from.getMonth() + 1,
          year: from.getFullYear(),
        };
      }
    }
    const m = Number(params.get("month"));
    const y = Number(params.get("year"));
    if (m >= 1 && m <= 12 && y >= 2000) {
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0);
      return {
        dateRange: { from: monthStart, to: monthEnd },
        label: `${MONTHS[m - 1]} ${y}`,
        month: m,
        year: y,
      };
    }
    return {
      dateRange: { from: subDays(now, 6), to: now },
      label: "7 Hari Terakhir",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  });

  const [dateRange, setDateRange] = useState(initial.dateRange);
  const [rangeLabel, setRangeLabel] = useState(initial.label);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionTarget, setActionTarget] = useState<TxRow | null>(null);
  const [editTarget, setEditTarget] = useState<TxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TxRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const startDateStr = format(dateRange.from, "yyyy-MM-dd");
  const endDateStr = format(dateRange.to, "yyyy-MM-dd");
  const isCustomFilterActive = rangeLabel !== "7 Hari Terakhir";

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", startDateStr, endDateStr, accountFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", startDateStr);
      params.set("endDate", endDateStr);
      if (accountFilter !== "all") params.set("accountId", accountFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/transactions?${params}`);
      return res.json();
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.json()),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const { data: summary } = useQuery({
    queryKey: ["summary", startDateStr, endDateStr],
    queryFn: () =>
      fetch(`/api/transactions/summary?startDate=${startDateStr}&endDate=${endDateStr}`).then((r) =>
        r.json()
      ),
  });

  const prevMonth = () => {
    let nextM = month - 1;
    let nextY = year;
    if (nextM < 1) {
      nextM = 12;
      nextY = year - 1;
    }
    const newFrom = new Date(nextY, nextM - 1, 1);
    const newTo = new Date(nextY, nextM, 0);
    setMonth(nextM);
    setYear(nextY);
    setDateRange({ from: newFrom, to: newTo });
    setRangeLabel(`${MONTHS[nextM - 1]} ${nextY}`);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `?month=${nextM}&year=${nextY}`);
    }
  };

  const nextMonth = () => {
    let nextM = month + 1;
    let nextY = year;
    if (nextM > 12) {
      nextM = 1;
      nextY = year + 1;
    }
    const newFrom = new Date(nextY, nextM - 1, 1);
    const newTo = new Date(nextY, nextM, 0);
    setMonth(nextM);
    setYear(nextY);
    setDateRange({ from: newFrom, to: newTo });
    setRangeLabel(`${MONTHS[nextM - 1]} ${nextY}`);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `?month=${nextM}&year=${nextY}`);
    }
  };

  const handleApplyDateRange = (range: { from: Date; to: Date }, label?: string) => {
    setDateRange(range);
    const customLabel =
      label ||
      `${format(range.from, "d MMM", { locale: id })} - ${format(range.to, "d MMM yyyy", { locale: id })}`;
    setRangeLabel(customLabel);
    setMonth(range.from.getMonth() + 1);
    setYear(range.from.getFullYear());
    if (typeof window !== "undefined") {
      const s = format(range.from, "yyyy-MM-dd");
      const e = format(range.to, "yyyy-MM-dd");
      window.history.replaceState(null, "", `?startDate=${s}&endDate=${e}`);
    }
  };

  const handleResetToDefault = () => {
    const today = new Date();
    const range = { from: subDays(today, 6), to: today };
    setDateRange(range);
    setRangeLabel("7 Hari Terakhir");
    setMonth(today.getMonth() + 1);
    setYear(today.getFullYear());
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Transaksi dihapus");
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["summary"] });
        queryClient.invalidateQueries({ queryKey: ["balances"] });
        queryClient.invalidateQueries({ queryKey: ["breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["trend"] });
      }
    } finally {
      setDeleting(false);
    }
  };


  // Group transfer pairs and search-filter transactions by date
  const searchLower = search.toLowerCase().trim();
  const groupedRows = groupTransactions(transactions);
  const grouped: Record<string, any[]> = {};
  groupedRows.forEach((tx: any) => {
    if (searchLower) {
      const desc = (tx.description || "").toLowerCase();
      const cat = (tx.categoryName || "").toLowerCase();
      const acc = (tx.accountName || "").toLowerCase();
      const notes = (tx.notes || "").toLowerCase();
      const toAcc = (tx.transferIn?.accountName || "").toLowerCase();
      if (
        !desc.includes(searchLower) &&
        !cat.includes(searchLower) &&
        !acc.includes(searchLower) &&
        !notes.includes(searchLower) &&
        !toAcc.includes(searchLower)
      ) {
        return;
      }
    }
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Month / Period Selector */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="text-[#7a7a7a] hover:bg-[#f5f5f7] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={() => setIsDateSheetOpen(true)}
            className="flex flex-col items-center rounded-lg px-3 py-1 transition-colors hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
          >
            <h2 className="text-base font-semibold tracking-[-0.21px] text-[#1d1d1f] dark:text-white">
              {rangeLabel}
            </h2>
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              {format(dateRange.from, "d MMM", { locale: id })} - {format(dateRange.to, "d MMM yyyy", { locale: id })}
            </p>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="text-[#7a7a7a] hover:bg-[#f5f5f7] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#16a34a]/8 p-3 text-center dark:bg-[#4ade80]/10">
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">Income</p>
            <p className="text-lg font-semibold text-[#16a34a] dark:text-[#4ade80]">
              {formatCurrency(summary?.totalIncome || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/30">
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">Expense</p>
            <p className="text-lg font-semibold text-red-500 dark:text-red-400">
              {formatCurrency(summary?.totalExpense || 0)}
            </p>
          </div>
        </div>

        {/* Search & Date Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a] dark:text-[#cccccc]" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#e0e0e0] bg-white py-2.5 pl-10 pr-10 text-sm text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc] dark:border-white/15 dark:bg-[#272729] dark:text-white dark:placeholder:text-[#cccccc] dark:focus:border-[#2997ff] dark:focus:ring-[#2997ff]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7a7a] hover:text-[#333333] dark:text-[#cccccc] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsDateSheetOpen(true)}
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all active:scale-95",
              isCustomFilterActive
                ? "border-[#0066cc] bg-[#0066cc]/10 text-[#0066cc] dark:border-[#2997ff] dark:bg-[#2997ff]/20 dark:text-[#2997ff]"
                : "border-[#e0e0e0] bg-white text-[#7a7a7a] hover:bg-[#f5f5f7] dark:border-white/15 dark:bg-[#272729] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]"
            )}
            title="Filter rentang tanggal"
            aria-label="Filter rentang tanggal"
          >
            <CalendarIcon className="h-4 w-4" />
            {isCustomFilterActive && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#0066cc] ring-2 ring-white dark:bg-[#2997ff] dark:ring-[#1c1c1e]" />
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Semua Akun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Akun</SelectItem>
              {accounts.map((a: any) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="adjustment">Penyesuaian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <p className="py-8 text-center text-sm text-[#7a7a7a] dark:text-[#cccccc]">Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f7] dark:bg-[#2a2a2c]">
              <Search className="h-6 w-6 text-[#7a7a7a] dark:text-[#cccccc]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                Belum ada transaksi pada periode ini
              </p>
              <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                Catat pemasukan atau pengeluaran pertamamu
              </p>
            </div>
            <Button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("money-tracker:open-add"))
              }
            >
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => (
              <div key={date}>
                <p className="mb-3 ml-1 text-xs font-medium text-[#7a7a7a] dark:text-[#cccccc]">
                  {formatDate(date, "long")}
                </p>
                <div className="space-y-1">
                  {(txs as TxRow[]).map((tx: TxRow) => (
                    <TransactionRowItem
                      key={tx.id}
                      tx={tx}
                      onOpenMenu={(target) => setActionTarget(target)}
                    />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      <DateRangePickerSheet
        open={isDateSheetOpen}
        onOpenChange={setIsDateSheetOpen}
        dateRange={dateRange}
        onApply={handleApplyDateRange}
        onResetToDefault={handleResetToDefault}
      />

      <TransactionActionSheet
        open={!!actionTarget}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
        transaction={actionTarget}
        onEdit={(tx) => {
          setActionTarget(null);
          setEditTarget(tx);
        }}
        onDelete={(tx) => {
          setActionTarget(null);
          setDeleteTarget(tx);
        }}
      />

      <EditTransactionSheet
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        transaction={editTarget}
        accounts={accounts}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Hapus transaksi?"
        description={
          deleteTarget?.groupedTransfer
            ? `Transfer ${deleteTarget.accountName} → ${deleteTarget.transferIn?.accountName} akan dihapus dari kedua akun.`
            : deleteTarget
              ? `${deleteTarget.description || deleteTarget.categoryName || "Transaksi"} sebesar ${formatCurrency(deleteTarget.amount ?? 0)} akan dihapus.`
              : undefined
        }
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id);
        }}
        loading={deleting}
      />
    </AppShell>
  );
}
