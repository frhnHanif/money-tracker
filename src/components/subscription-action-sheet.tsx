"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  formatInterval,
  monthlyPrice,
  isPaidThisCycle,
  nextDue,
  type SubscriptionLike,
} from "@/lib/subscriptions";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Repeat,
  CheckCircle2,
  RotateCcw,
  Pause,
  Play,
  Pencil,
  Trash2,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface SubscriptionActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sub: SubscriptionLike | null;
  onSelectPay: (sub: SubscriptionLike) => void;
  onSelectUpdatePay: (sub: SubscriptionLike) => void;
  onSelectUnpay: (sub: SubscriptionLike) => void;
  onToggleStatus: (sub: SubscriptionLike) => void;
  onEdit: (sub: SubscriptionLike) => void;
  onDelete: (sub: SubscriptionLike) => void;
}

export function SubscriptionActionSheet({
  open,
  onOpenChange,
  sub,
  onSelectPay,
  onSelectUpdatePay,
  onSelectUnpay,
  onToggleStatus,
  onEdit,
  onDelete,
}: SubscriptionActionSheetProps) {
  if (!sub) return null;

  const isPaid = isPaidThisCycle(sub);
  const due = nextDue(sub);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-3 focus:outline-none"
      >
        {/* Grab bar pill iOS */}
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#d2d2d7] dark:bg-[#444446]" />

        <SheetHeader className="sr-only">
          <SheetTitle>Menu Langganan</SheetTitle>
        </SheetHeader>

        {/* Subscription Summary Card */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#2a2a2c]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] dark:bg-[#a78bfa]/20 dark:text-[#a78bfa]">
              <Repeat className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-semibold text-[#1d1d1f] dark:text-white">
                  {sub.name}
                </p>
                {isPaid ? (
                  <Badge className="bg-[#16a34a]/15 text-[#16a34a] hover:bg-[#16a34a]/20 border-transparent dark:bg-[#4ade80]/20 dark:text-[#4ade80] px-2 py-0 text-[10px] leading-5">
                    Sudah Dibayar
                  </Badge>
                ) : sub.status === "inactive" ? (
                  <Badge variant="secondary" className="px-2 py-0 text-[10px] leading-5 text-[#7a7a7a] dark:text-[#cccccc]">
                    Nonaktif
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-2 py-0 text-[10px] leading-5 text-[#b45309] dark:text-[#fbbf24]">
                    Belum Dibayar
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                {formatCurrency(sub.price)}/{formatInterval(sub)}
                {" • "}
                Jatuh tempo {format(due, "d MMM yyyy", { locale: id })}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Actions List */}
        <div className="space-y-2">
          {/* Action 1: Tandai Dibayar atau Update Pembayaran */}
          {sub.status === "active" && (
            isPaid ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onSelectUpdatePay(sub);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-[#16a34a]/10 p-3.5 text-sm font-medium text-[#16a34a] transition-colors hover:bg-[#16a34a]/15 active:bg-[#16a34a]/20 dark:bg-[#4ade80]/15 dark:text-[#4ade80] dark:hover:bg-[#4ade80]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16a34a]/15 text-[#16a34a] dark:bg-[#4ade80]/20 dark:text-[#4ade80]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Update Pembayaran</p>
                      <p className="text-xs text-[#16a34a]/80 dark:text-[#4ade80]/80">
                        Ubah tanggal bayar, jatuh tempo, atau akun
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onSelectUnpay(sub);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Batalkan Pembayaran</p>
                      <p className="text-xs text-red-400/90 dark:text-red-400/70">
                        Hapus transaksi pengeluaran & kembalikan saldo
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-400" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onSelectPay(sub);
                }}
                className="flex w-full items-center justify-between rounded-xl bg-[#0066cc]/10 p-3.5 text-sm font-medium text-[#0066cc] transition-colors hover:bg-[#0066cc]/15 active:bg-[#0066cc]/20 dark:bg-[#2997ff]/15 dark:text-[#2997ff] dark:hover:bg-[#2997ff]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc]/15 text-[#0066cc] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Tandai Dibayar</p>
                    <p className="text-xs text-[#0066cc]/80 dark:text-[#2997ff]/80">
                      Catat pembayaran siklus ini & kurangi saldo
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>
            )
          )}

          {/* Action 2: Jeda / Aktifkan Kembali */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onToggleStatus(sub);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-[#f5f5f7] p-3.5 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#ebebee] active:bg-[#e2e2e6] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7a7a7a]/10 text-[#7a7a7a] dark:text-[#cccccc]">
                {sub.status === "active" ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold">
                  {sub.status === "active" ? "Jeda Langganan" : "Aktifkan Kembali"}
                </p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  {sub.status === "active"
                    ? "Hentikan pencatatan jatuh tempo sementara"
                    : "Mulai aktifkan pencatatan jatuh tempo"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
          </button>

          {/* Action 3: Edit Detail */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onEdit(sub);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-[#f5f5f7] p-3.5 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#ebebee] active:bg-[#e2e2e6] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                <Pencil className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Edit Langganan</p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  Ubah nama, harga, siklus, atau catatan
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
          </button>

          {/* Action 4: Hapus Langganan */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onDelete(sub);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Hapus Langganan</p>
                <p className="text-xs text-red-400/90 dark:text-red-400/70">
                  Hapus langganan ini dari daftar
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400" />
          </button>
        </div>

        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="mt-3 w-full text-sm font-medium text-[#7a7a7a] hover:bg-transparent dark:text-[#cccccc]"
        >
          Tutup
        </Button>
      </SheetContent>
    </Sheet>
  );
}
