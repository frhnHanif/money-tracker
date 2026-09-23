"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency } from "@/lib/utils";
import {
  nextDue,
  formatInterval,
  type SubscriptionLike,
} from "@/lib/subscriptions";
import { format, addDays, addMonths, addYears, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccountLike {
  id: number;
  name: string;
}

interface SubscriptionPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sub: SubscriptionLike | null;
  accounts: AccountLike[];
  mode: "pay" | "update";
  onSuccess: () => void;
}

export function SubscriptionPaymentSheet({
  open,
  onOpenChange,
  sub,
  accounts,
  mode,
  onSuccess,
}: SubscriptionPaymentSheetProps) {
  const [accountId, setAccountId] = useState<string>("");
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [isPayDateExpanded, setIsPayDateExpanded] = useState(false);
  const [isDueDateExpanded, setIsDueDateExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize form state when sheet opens or sub changes
  useEffect(() => {
    if (open && sub) {
      // 1. Account
      if (sub.lastTransactionAccountId) {
        setAccountId(String(sub.lastTransactionAccountId));
      } else if (accounts.length > 0) {
        setAccountId(String(accounts[0].id));
      }

      // 2. Pay date
      if (mode === "update" && sub.lastPaidAt) {
        const pd = new Date(sub.lastPaidAt + "T00:00:00");
        setPayDate(!isNaN(pd.getTime()) ? pd : new Date());
      } else {
        setPayDate(new Date());
      }

      // 3. Due date
      const initialDue = nextDue(sub);
      setDueDate(initialDue);
      setIsPayDateExpanded(false);
      setIsDueDateExpanded(false);
    }
  }, [open, sub, accounts, mode]);

  if (!sub) return null;

  // Shortcut helpers
  const handleShortcut28 = () => {
    setDueDate(addDays(payDate, 28));
    setIsDueDateExpanded(false);
  };

  const handleShortcut30 = () => {
    setDueDate(addDays(payDate, 30));
    setIsDueDateExpanded(false);
  };

  const handleShortcut1Month = () => {
    setDueDate(addMonths(payDate, 1));
    setIsDueDateExpanded(false);
  };

  const handleShortcut1Year = () => {
    setDueDate(addYears(payDate, 1));
    setIsDueDateExpanded(false);
  };

  // Determine active shortcut pill
  const isShortcut28 = isSameDay(dueDate, addDays(payDate, 28));
  const isShortcut30 = isSameDay(dueDate, addDays(payDate, 30));
  const isShortcut1Month = isSameDay(dueDate, addMonths(payDate, 1));
  const isShortcut1Year = isSameDay(dueDate, addYears(payDate, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Pilih akun pembayaran");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(accountId),
          date: format(payDate, "yyyy-MM-dd"),
          nextDueDate: format(dueDate, "yyyy-MM-dd"),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan pembayaran");
      }

      toast.success(
        mode === "update"
          ? `Pembayaran ${sub.name} diperbarui`
          : `${sub.name} dibayar & tercatat`
      );
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-3 focus:outline-none"
      >
        {/* Grab bar pill iOS */}
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#d2d2d7] dark:bg-[#444446]" />

        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-semibold text-[#1d1d1f] dark:text-white">
            {mode === "update" ? "Update Pembayaran" : "Tandai Dibayar"} — {sub.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
            Nominal {formatCurrency(sub.price)}/{formatInterval(sub)} • Pengeluaran akan disinkronkan ke akun
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Akun Pembayaran */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#1d1d1f] dark:text-white">
              Akun Pembayaran
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-11 rounded-xl text-sm">
                <SelectValue placeholder="Pilih akun pembayaran" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal Bayar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#1d1d1f] dark:text-white">
              Tanggal Bayar
            </Label>
            <button
              type="button"
              onClick={() => {
                setIsPayDateExpanded(!isPayDateExpanded);
                setIsDueDateExpanded(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-[#e0e0e0] bg-white px-3 text-sm text-[#1d1d1f] shadow-sm transition-colors hover:bg-[#f5f5f7] focus:outline-none dark:border-white/15 dark:bg-[#272729] dark:text-white dark:hover:bg-[#2a2a2c]"
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
                {format(payDate, "d MMMM yyyy", { locale: id })}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-[#7a7a7a] transition-transform duration-200",
                  isPayDateExpanded && "rotate-180"
                )}
              />
            </button>
            {isPayDateExpanded && (
              <div className="flex justify-center rounded-2xl border border-[#e0e0e0] bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#242426]">
                <Calendar
                  mode="single"
                  selected={payDate}
                  onSelect={(day) => {
                    if (day) {
                      setPayDate(day);
                      setIsPayDateExpanded(false);
                      // Otomatis sesuaikan dueDate jika sub interval bulanan
                      if (sub.interval === "yearly") {
                        setDueDate(addYears(day, 1));
                      } else {
                        setDueDate(addMonths(day, 1));
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Tanggal Jatuh Tempo Berikutnya */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-[#1d1d1f] dark:text-white">
                Tanggal Jatuh Tempo Baru
              </Label>
              <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                {format(dueDate, "d MMM yyyy", { locale: id })}
              </span>
            </div>

            {/* Shortcut Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <button
                type="button"
                onClick={handleShortcut28}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isShortcut28
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +28 Hari
              </button>
              <button
                type="button"
                onClick={handleShortcut30}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isShortcut30
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +30 Hari
              </button>
              <button
                type="button"
                onClick={handleShortcut1Month}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isShortcut1Month
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +1 Bulan
              </button>
              {sub.interval === "yearly" && (
                <button
                  type="button"
                  onClick={handleShortcut1Year}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    isShortcut1Year
                      ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                      : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                  )}
                >
                  +1 Tahun
                </button>
              )}
            </div>

            {/* Custom Date Picker button */}
            <button
              type="button"
              onClick={() => {
                setIsDueDateExpanded(!isDueDateExpanded);
                setIsPayDateExpanded(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-[#e0e0e0] bg-white px-3 text-sm text-[#1d1d1f] shadow-sm transition-colors hover:bg-[#f5f5f7] focus:outline-none dark:border-white/15 dark:bg-[#272729] dark:text-white dark:hover:bg-[#2a2a2c]"
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc]" />
                {format(dueDate, "d MMMM yyyy", { locale: id })}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-[#7a7a7a] transition-transform duration-200",
                  isDueDateExpanded && "rotate-180"
                )}
              />
            </button>
            {isDueDateExpanded && (
              <div className="flex justify-center rounded-2xl border border-[#e0e0e0] bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#242426]">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(day) => {
                    if (day) {
                      setDueDate(day);
                      setIsDueDateExpanded(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          <SheetFooter className="pt-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#0066cc] text-sm font-medium text-white hover:bg-[#0055b3] dark:bg-[#2997ff] dark:hover:bg-[#1a88ff]"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {loading
                ? "Menyimpan..."
                : mode === "update"
                  ? "Simpan Perubahan"
                  : "Catat Pembayaran"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
