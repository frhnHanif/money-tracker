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
import { formatCurrency, formatDate, groupTransactions } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowRightLeft,
  Trash2,
  Plus,
  Wrench,
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
  amount?: number;
  accountName?: string;
  transferIn?: { accountName?: string };
  groupedTransfer?: boolean;
};

export default function TransactionsPage() {
  const queryClient = useQueryClient();
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
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TxRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const syncUrl = (m: number, y: number) => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `?month=${m}&year=${y}`);
    }
  };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", month, year, accountFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("month", String(month));
      params.set("year", String(year));
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

  const { data: summary } = useQuery({
    queryKey: ["summary", month, year],
    queryFn: () =>
      fetch(`/api/transactions/summary?month=${month}&year=${year}`).then((r) =>
        r.json()
      ),
  });

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
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="text-[#7a7a7a] hover:bg-[#f5f5f7] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold tracking-[-0.21px] text-[#1d1d1f] dark:text-white">
            {MONTHS[month - 1]} {year}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="text-[#7a7a7a] hover:bg-[#f5f5f7] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c]">
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

        {/* Search */}
        <div className="relative">
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
                Belum ada transaksi bulan ini
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
                    {(txs as any[]).map((tx: any) =>
                      tx.groupedTransfer ? (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                              style={{
                                backgroundColor:
                                  (tx.categoryColor || "#3b82f6") + "20",
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
                                    backgroundColor:
                                      (tx.categoryColor || "#3b82f6") + "20",
                                    color: tx.categoryColor || "#3b82f6",
                                    borderColor: "transparent",
                                  }}
                                >
                                  {tx.accountName} →{" "}
                                  {tx.transferIn?.accountName}
                                </Badge>
                                {tx.notes && (
                                  <span className="truncate text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                                    {tx.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <p className="text-sm font-semibold text-[#7a7a7a] dark:text-[#cccccc]">
                              {formatCurrency(tx.amount)}
                            </p>
                            <button
                              onClick={() => setDeleteTarget(tx)}
                              aria-label="Hapus transaksi"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-[#7a7a7a] hover:bg-red-50 hover:text-red-500 dark:text-[#cccccc] dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg p-3 hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor:
                                tx.type === "adjustment_in" ||
                                tx.type === "adjustment_out"
                                  ? "#7a7a7a20"
                                  : (tx.categoryColor || "#6b7280") + "20",
                            }}
                          >
                            {tx.type === "adjustment_in" ||
                            tx.type === "adjustment_out" ? (
                              <Wrench
                                className="h-4 w-4"
                                style={{ color: "#7a7a7a" }}
                              />
                            ) : (
                            <span
                              className="text-xs font-bold"
                              style={{ color: tx.categoryColor || "#6b7280" }}
                            >
                              {(tx.categoryName || "?")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                              {tx.description ||
                                tx.categoryName ||
                                (tx.type === "adjustment_in" ||
                                tx.type === "adjustment_out"
                                  ? "Penyesuaian saldo"
                                  : "Transaksi")}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                              {tx.type === "adjustment_in" ||
                              tx.type === "adjustment_out" ? (
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
                                  backgroundColor:
                                    (tx.categoryColor || "#6b7280") + "20",
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
                                  backgroundColor:
                                    (tx.accountColor || "#6b7280") + "20",
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
                        <div className="flex shrink-0 items-center gap-1">
                          <p
                            className={`text-sm font-semibold ${
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
                          <button
                            onClick={() => setDeleteTarget(tx)}
                            aria-label="Hapus transaksi"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[#7a7a7a] hover:bg-red-50 hover:text-red-500 dark:text-[#cccccc] dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      )
                    )}
                </div>
              </div>
            ))
        )}
      </div>

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
