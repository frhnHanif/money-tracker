"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Pencil,
  Trash2,
  ChevronRight,
  ArrowRightLeft,
  Wrench,
} from "lucide-react";

export interface TransactionItemData {
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
}

interface TransactionActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionItemData | null;
  onEdit: (tx: TransactionItemData) => void;
  onDelete: (tx: TransactionItemData) => void;
}

export function TransactionActionSheet({
  open,
  onOpenChange,
  transaction,
  onEdit,
  onDelete,
}: TransactionActionSheetProps) {
  if (!transaction) return null;

  const isTransfer = !!transaction.groupedTransfer || transaction.type === "transfer_out" || transaction.type === "transfer_in";
  const isAdjustment =
    transaction.type === "adjustment_in" ||
    transaction.type === "adjustment_out";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl px-5 pb-6 pt-3 focus:outline-none"
      >
        {/* Grab bar pill */}
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-[#d2d2d7] dark:bg-[#444446]" />

        <SheetHeader className="sr-only">
          <SheetTitle>Menu Transaksi</SheetTitle>
        </SheetHeader>

        {/* Transaction Summary Card */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#2a2a2c]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: isAdjustment
                  ? "#7a7a7a20"
                  : (transaction.categoryColor || "#3b82f6") + "20",
              }}
            >
              {isTransfer ? (
                <ArrowRightLeft
                  className="h-5 w-5"
                  style={{ color: transaction.categoryColor || "#3b82f6" }}
                />
              ) : isAdjustment ? (
                <Wrench className="h-5 w-5" style={{ color: "#7a7a7a" }} />
              ) : (
                <span
                  className="text-xs font-bold"
                  style={{ color: transaction.categoryColor || "#6b7280" }}
                >
                  {(transaction.categoryName || "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#1d1d1f] dark:text-white">
                {transaction.description ||
                  (isTransfer
                    ? "Transfer"
                    : isAdjustment
                      ? "Penyesuaian saldo"
                      : transaction.categoryName || "Transaksi")}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                {isTransfer ? (
                  <span>
                    {transaction.accountName} → {transaction.transferIn?.accountName}
                  </span>
                ) : (
                  <span>{transaction.accountName}</span>
                )}
                <span>•</span>
                <span>{transaction.date ? formatDate(transaction.date, "short") : ""}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 pl-3 text-right">
            <p
              className={`text-base font-bold ${
                isTransfer
                  ? "text-[#1d1d1f] dark:text-white"
                  : transaction.type === "income" ||
                      transaction.type === "transfer_in"
                    ? "text-[#16a34a] dark:text-[#4ade80]"
                    : isAdjustment
                      ? "text-[#7a7a7a] dark:text-[#cccccc]"
                      : "text-red-500 dark:text-red-400"
              }`}
            >
              {isTransfer
                ? ""
                : transaction.type === "income" ||
                    transaction.type === "transfer_in"
                  ? "+"
                  : isAdjustment
                    ? "±"
                    : "-"}
              {formatCurrency(transaction.amount || 0)}
            </p>
            {typeof transaction.fee === "number" && transaction.fee > 0 && (
              <Badge
                className="mt-1 px-1.5 py-0 text-[10px] leading-4"
                style={{
                  backgroundColor: "#f9731620",
                  color: "#f97316",
                  borderColor: "transparent",
                }}
              >
                Admin {formatCurrency(transaction.fee)}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onEdit(transaction);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-[#f5f5f7] p-3.5 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#ebebee] active:bg-[#e2e2e6] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438] dark:active:bg-[#3d3d40]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                <Pencil className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Edit Transaksi</p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  Ubah nominal, akun, kategori, atau catatan
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onDelete(transaction);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 dark:active:bg-red-950/70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Hapus Transaksi</p>
                <p className="text-xs text-red-400/90 dark:text-red-400/70">
                  Hapus transaksi ini secara permanen
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400 dark:text-red-400" />
          </button>
        </div>

        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="mt-3 w-full text-sm font-medium text-[#7a7a7a] hover:bg-transparent dark:text-[#cccccc]"
        >
          Batal
        </Button>
      </SheetContent>
    </Sheet>
  );
}
