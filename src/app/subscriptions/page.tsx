"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, addMonths, addYears, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatInputCurrency, cn } from "@/lib/utils";
import {
  nextDue,
  isPaidThisCycle,
  daysUntil,
  monthlyPrice,
  formatInterval,
  type SubscriptionLike,
} from "@/lib/subscriptions";
import {
  Repeat,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Pause,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { SubscriptionActionSheet } from "@/components/subscription-action-sheet";
import { SubscriptionPaymentSheet } from "@/components/subscription-payment-sheet";

interface AccountLike {
  id: number;
  name: string;
}

const fmtDate = (d: Date) => {
  const now = new Date();
  if (d.getFullYear() !== now.getFullYear()) {
    return format(d, "dd MMM yyyy");
  }
  return format(d, "dd MMM");
};

const dueLabel = (sub: SubscriptionLike) => {
  if (sub.status === "inactive") return null;
  const due = nextDue(sub);
  const days = daysUntil(sub);
  if (days < 0) {
    return {
      tone: "overdue" as const,
      text: `Lewat ${Math.abs(days)} hari — jatuh tempo ${fmtDate(due)}`,
    };
  }
  if (days <= 3) {
    return {
      tone: "soon" as const,
      text: days === 0
        ? `Jatuh tempo hari ini (${fmtDate(due)})`
        : `Jatuh tempo dalam ${days} hari (${fmtDate(due)})`,
    };
  }
  const paid = isPaidThisCycle(sub);
  if (paid) {
    return {
      tone: "paid" as const,
      text: `✓ Dibayar ${fmtDate(new Date(sub.lastPaidAt!))} • Jatuh tempo ${fmtDate(due)}`,
    };
  }
  return {
    tone: "ok" as const,
    text: `Jatuh tempo ${fmtDate(due)}`,
  };
};

const getStatusIcon = (sub: SubscriptionLike) => {
  if (sub.status === "inactive") {
    return (
      <div
        className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
        title="Nonaktif"
      >
        <Pause className="h-3.5 w-3.5" />
      </div>
    );
  }
  const days = daysUntil(sub);
  if (days < 0) {
    return (
      <div
        className="flex size-7 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
        title={`Lewat tempo ${Math.abs(days)} hari`}
      >
        <AlertCircle className="h-4 w-4" />
      </div>
    );
  }
  if (days <= 3) {
    return (
      <div
        className="flex size-7 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        title={days === 0 ? "Jatuh tempo hari ini" : `Jatuh tempo dalam ${days} hari`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (isPaidThisCycle(sub)) {
    return (
      <div
        className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        title="Sudah Dibayar"
      >
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div
      className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
      title="Belum jatuh tempo"
    >
      <Clock className="h-3.5 w-3.5" />
    </div>
  );
};

type Tab = "all" | "active" | "inactive";

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [selectedSub, setSelectedSub] = useState<SubscriptionLike | null>(null);
  const [paymentSub, setPaymentSub] = useState<SubscriptionLike | null>(null);
  const [paymentMode, setPaymentMode] = useState<"pay" | "update">("pay");
  const [unpaySub, setUnpaySub] = useState<SubscriptionLike | null>(null);
  const [unpaying, setUnpaying] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriptionLike | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionLike | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: subs = [] } = useQuery<SubscriptionLike[]>({
    queryKey: ["subscriptions"],
    queryFn: () => fetch("/api/subscriptions").then((r) => r.json()),
  });

  const { data: accounts = [] } = useQuery<AccountLike[]>({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.json()),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["trend"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const activeSubs = subs.filter((s) => s.status === "active");
  const visible = useMemo(() => {
    if (tab === "active") return activeSubs;
    if (tab === "inactive") return subs.filter((s) => s.status === "inactive");
    return subs;
  }, [subs, tab, activeSubs]);

  const totalMonthly = activeSubs.reduce((s, x) => s + monthlyPrice(x), 0);
  const dueSoon = activeSubs.filter((s) => {
    if (isPaidThisCycle(s)) return false;
    const d = daysUntil(s);
    return d >= 0 && d <= 3;
  }).length;
  const overdueCount = activeSubs.filter((s) => {
    if (isPaidThisCycle(s)) return false;
    return daysUntil(s) < 0;
  }).length;

  const toggleStatus = async (sub: SubscriptionLike) => {
    const res = await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: sub.status === "active" ? "inactive" : "active",
      }),
    });
    if (res.ok) {
      toast.success(
        sub.status === "active"
          ? `${sub.name} dinonaktifkan`
          : `${sub.name} diaktifkan kembali`
      );
      invalidateAll();
    } else {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#0066cc]/8 p-3 text-center dark:bg-[#2997ff]/10">
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              Total/bln
            </p>
            <p className="mt-1 text-sm font-semibold text-[#0066cc] dark:text-[#2997ff]">
              {formatCurrency(Math.round(totalMonthly))}
            </p>
            <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
              {activeSubs.length} aktif
            </p>
          </div>
          <div className="rounded-lg bg-[#f59e0b]/10 p-3 text-center dark:bg-[#f59e0b]/15">
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              Jatuh tempo
            </p>
            <p className="mt-1 text-sm font-semibold text-[#b45309] dark:text-[#fbbf24]">
              {dueSoon}
            </p>
            <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
              ≤ 3 hari
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/30">
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              Lewat
            </p>
            <p className="mt-1 text-sm font-semibold text-red-500 dark:text-red-400">
              {overdueCount}
            </p>
            <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
              belum dibayar
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-[#f5f5f7] p-1 dark:bg-[#2a2a2c]">
          {(
            [
              ["all", "Semua"],
              ["active", "Aktif"],
              ["inactive", "Nonaktif"],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === value
                  ? "bg-white text-[#1d1d1f] dark:bg-[#3a3a3c] dark:text-white"
                  : "text-[#7a7a7a] dark:text-[#cccccc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f7] dark:bg-[#2a2a2c]">
              <Repeat className="h-7 w-7 text-[#7a7a7a] dark:text-[#cccccc]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                Belum ada langganan
              </p>
              <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                Tambahkan Spotify, streaming, atau layanan berlanggananmu
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Tambah Langganan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((sub) => {
              const label = dueLabel(sub);
              return (
                <div
                  key={sub.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSub(sub)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSub(sub);
                    }
                  }}
                  className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-[#f0f0f0] transition-colors hover:bg-zinc-50/80 active:bg-zinc-100 cursor-pointer dark:bg-[#272729] dark:ring-white/10 dark:hover:bg-zinc-800/60 dark:active:bg-zinc-800"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                        {sub.name}
                      </p>
                      {sub.status === "inactive" && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 px-1.5 py-0 text-[10px] leading-5 text-[#7a7a7a] dark:text-[#cccccc]"
                        >
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                      {formatCurrency(sub.price)}/{formatInterval(sub)}
                    </p>
                    {label && (
                      <p
                        className={`mt-1 text-xs font-medium ${
                          label.tone === "paid"
                            ? "text-[#16a34a] dark:text-[#4ade80]"
                            : label.tone === "overdue"
                              ? "text-red-500 dark:text-red-400"
                              : label.tone === "soon"
                                ? "text-[#b45309] dark:text-[#fbbf24]"
                                : "text-[#7a7a7a] dark:text-[#cccccc]"
                        }`}
                      >
                        {label.text}
                      </p>
                    )}
                    {sub.status === "inactive" && (
                      <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                        Berhenti — klik untuk opsi
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center">
                    {getStatusIcon(sub)}
                  </div>
                </div>
              );
            })}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Tambah Langganan
            </Button>
          </div>
        )}
      </div>

      {/* iOS Style Action Sheet for Subscription Options */}
      {selectedSub && (
        <SubscriptionActionSheet
          open={!!selectedSub}
          onOpenChange={(open) => {
            if (!open) setSelectedSub(null);
          }}
          sub={selectedSub}
          onSelectPay={(sub) => {
            setSelectedSub(null);
            setPaymentSub(sub);
            setPaymentMode("pay");
          }}
          onSelectUpdatePay={(sub) => {
            setSelectedSub(null);
            setPaymentSub(sub);
            setPaymentMode("update");
          }}
          onSelectUnpay={(sub) => {
            setSelectedSub(null);
            setUnpaySub(sub);
          }}
          onToggleStatus={(sub) => {
            setSelectedSub(null);
            toggleStatus(sub);
          }}
          onEdit={(sub) => {
            setSelectedSub(null);
            setEditTarget(sub);
          }}
          onDelete={(sub) => {
            setSelectedSub(null);
            setDeleteTarget(sub);
          }}
        />
      )}

      {/* Payment / Update Payment Sheet */}
      {paymentSub && (
        <SubscriptionPaymentSheet
          open={!!paymentSub}
          onOpenChange={(open) => {
            if (!open) setPaymentSub(null);
          }}
          sub={paymentSub}
          accounts={accounts}
          mode={paymentMode}
          onSuccess={() => {
            setPaymentSub(null);
            invalidateAll();
          }}
        />
      )}

      {/* Edit Subscription Dialog */}
      {editTarget && (
        <EditDialog
          sub={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => {
            setEditTarget(null);
            invalidateAll();
          }}
        />
      )}

      {/* Add Subscription Dialog */}
      <AddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          setAddOpen(false);
          invalidateAll();
        }}
      />

      {/* Confirm Unpay Dialog */}
      <ConfirmDialog
        open={!!unpaySub}
        onOpenChange={(open) => {
          if (!open) setUnpaySub(null);
        }}
        title={`Batalkan pembayaran ${unpaySub?.name}?`}
        description="Status langganan akan dikembalikan ke belum dibayar dan transaksi pembayaran terkait akan dihapus (saldo akun dipulihkan)."
        confirmLabel={unpaying ? "Membatalkan..." : "Batalkan Pembayaran"}
        loading={unpaying}
        onConfirm={async () => {
          if (!unpaySub) return;
          setUnpaying(true);
          try {
            const res = await fetch(`/api/subscriptions/${unpaySub.id}/unpay`, {
              method: "POST",
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Gagal membatalkan pembayaran");
            }
            toast.success(`Pembayaran ${unpaySub.name} berhasil dibatalkan`);
            setUnpaySub(null);
            invalidateAll();
          } catch (err: any) {
            toast.error(err.message || "Gagal membatalkan pembayaran");
          } finally {
            setUnpaying(false);
          }
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus langganan ${deleteTarget?.name}?`}
        description="Riwayat pembayarannya (transaksi) tetap tersimpan."
        onConfirm={() => {
          if (deleteTarget) {
            fetch(`/api/subscriptions/${deleteTarget.id}`, { method: "DELETE" })
              .then(() => {
                toast.success("Langganan dihapus");
                invalidateAll();
              })
              .catch(() => toast.error("Gagal menghapus"));
          }
        }}
      />
    </AppShell>
  );
}

/* ---------- Edit dialog ---------- */
function EditDialog({
  sub,
  onClose,
  onDone,
}: {
  sub: SubscriptionLike;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(sub.name);
  const [price, setPrice] = useState(String(sub.price));
  const [interval, setInterval] = useState(sub.interval);
  const [dueDate, setDueDate] = useState<Date>(() => nextDue(sub));
  const [isDueDateExpanded, setIsDueDateExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleIntervalChange = (newInterval: "monthly" | "yearly") => {
    setInterval(newInterval);
    if (newInterval === "yearly") {
      setDueDate(addYears(new Date(), 1));
    } else {
      setDueDate(addMonths(new Date(), 1));
    }
  };

  const handleShortcut28 = () => {
    setDueDate(addDays(new Date(), 28));
    setIsDueDateExpanded(false);
  };
  const handleShortcut30 = () => {
    setDueDate(addDays(new Date(), 30));
    setIsDueDateExpanded(false);
  };
  const handleShortcut1Month = () => {
    setDueDate(addMonths(new Date(), 1));
    setIsDueDateExpanded(false);
  };
  const handleShortcut1Year = () => {
    setDueDate(addYears(new Date(), 1));
    setIsDueDateExpanded(false);
  };

  const isShortcut28 = isSameDay(dueDate, addDays(new Date(), 28));
  const isShortcut30 = isSameDay(dueDate, addDays(new Date(), 30));
  const isShortcut1Month = isSameDay(dueDate, addMonths(new Date(), 1));
  const isShortcut1Year = isSameDay(dueDate, addYears(new Date(), 1));

  const submit = async () => {
    const amt = parseInt(price.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0 || !name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: amt,
          interval,
          billingDay: dueDate.getDate(),
          nextDueDate: format(dueDate, "yyyy-MM-dd"),
        }),
      });
      if (!res.ok) throw new Error("Gagal");
      toast.success("Langganan diperbarui");
      onDone();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Langganan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 pt-1">
          <div>
            <Label className="text-xs">Nama</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Harga</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(formatInputCurrency(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Interval</Label>
            <Select value={interval} onValueChange={(v) => handleIntervalChange(v as "monthly" | "yearly")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal Jatuh Tempo */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tanggal Jatuh Tempo</Label>
              <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Tagihan ke-{dueDate.getDate()}
              </span>
            </div>

            {/* Shortcut Chips */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleShortcut28}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut28
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +28 Hari
              </button>
              <button
                type="button"
                onClick={handleShortcut30}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut30
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +30 Hari
              </button>
              <button
                type="button"
                onClick={handleShortcut1Month}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut1Month
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +1 Bulan
              </button>
              <button
                type="button"
                onClick={handleShortcut1Year}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut1Year
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +1 Tahun
              </button>
            </div>

            {/* Date button + calendar */}
            <button
              type="button"
              onClick={() => setIsDueDateExpanded(!isDueDateExpanded)}
              className="mt-2 flex h-10 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-[#1d1d1f] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-[#7a7a7a] dark:text-[#cccccc]" />
                <span>{format(dueDate, "d MMMM yyyy", { locale: id })}</span>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-[#7a7a7a] transition-transform", isDueDateExpanded && "rotate-180")} />
            </button>
            {isDueDateExpanded && (
              <div className="mt-2 flex justify-center rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => {
                    if (d) {
                      setDueDate(d);
                      setIsDueDateExpanded(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={submit}
              disabled={loading || !name.trim() || !price}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Add dialog ---------- */
function AddDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [isPaid, setIsPaid] = useState(false);
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(() => addMonths(new Date(), 1));
  const [isPayDateExpanded, setIsPayDateExpanded] = useState(false);
  const [isDueDateExpanded, setIsDueDateExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Update dueDate when interval, isPaid, or payDate changes
  const handleIntervalChange = (newInterval: "monthly" | "yearly") => {
    setInterval(newInterval);
    const base = isPaid ? payDate : new Date();
    if (newInterval === "yearly") {
      setDueDate(addYears(base, 1));
    } else {
      setDueDate(addMonths(base, 1));
    }
  };

  const handleIsPaidChange = (paid: boolean) => {
    setIsPaid(paid);
    const base = paid ? payDate : new Date();
    if (interval === "yearly") {
      setDueDate(addYears(base, 1));
    } else {
      setDueDate(addMonths(base, 1));
    }
  };

  const handlePayDateChange = (date: Date) => {
    setPayDate(date);
    if (interval === "yearly") {
      setDueDate(addYears(date, 1));
    } else {
      setDueDate(addMonths(date, 1));
    }
    setIsPayDateExpanded(false);
  };

  // Shortcuts
  const baseForShortcut = isPaid ? payDate : new Date();
  const handleShortcut28 = () => {
    setDueDate(addDays(baseForShortcut, 28));
    setIsDueDateExpanded(false);
  };
  const handleShortcut30 = () => {
    setDueDate(addDays(baseForShortcut, 30));
    setIsDueDateExpanded(false);
  };
  const handleShortcut1Month = () => {
    setDueDate(addMonths(baseForShortcut, 1));
    setIsDueDateExpanded(false);
  };
  const handleShortcut1Year = () => {
    setDueDate(addYears(baseForShortcut, 1));
    setIsDueDateExpanded(false);
  };

  const isShortcut28 = isSameDay(dueDate, addDays(baseForShortcut, 28));
  const isShortcut30 = isSameDay(dueDate, addDays(baseForShortcut, 30));
  const isShortcut1Month = isSameDay(dueDate, addMonths(baseForShortcut, 1));
  const isShortcut1Year = isSameDay(dueDate, addYears(baseForShortcut, 1));

  const resetForm = () => {
    setName("");
    setPrice("");
    setInterval("monthly");
    setIsPaid(false);
    setPayDate(new Date());
    setDueDate(addMonths(new Date(), 1));
    setIsPayDateExpanded(false);
    setIsDueDateExpanded(false);
  };

  const submit = async () => {
    const amt = parseInt(price.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0 || !name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: amt,
          interval,
          billingDay: dueDate.getDate(),
          status: "active",
          lastPaidAt: isPaid ? format(payDate, "yyyy-MM-dd") : null,
          nextDueDate: format(dueDate, "yyyy-MM-dd"),
        }),
      });
      if (!res.ok) throw new Error("Gagal");
      toast.success("Langganan ditambahkan");
      resetForm();
      onDone();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Tambah Langganan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 pt-1">
          <div>
            <Label className="text-xs">Nama layanan</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Spotify, Netflix, Canva..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Harga</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(formatInputCurrency(e.target.value))}
              placeholder="Rp0"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Interval</Label>
            <Select value={interval} onValueChange={(v) => handleIntervalChange(v as "monthly" | "yearly")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Pembayaran */}
          <div>
            <Label className="text-xs">Status Pembayaran</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleIsPaidChange(true)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors",
                  isPaid
                    ? "border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a] dark:border-[#4ade80] dark:bg-[#4ade80]/15 dark:text-[#4ade80]"
                    : "border-zinc-200 bg-transparent text-[#7a7a7a] hover:bg-zinc-50 dark:border-white/10 dark:text-[#cccccc] dark:hover:bg-zinc-800"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sudah Dibayar
              </button>
              <button
                type="button"
                onClick={() => handleIsPaidChange(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors",
                  !isPaid
                    ? "border-[#b45309] bg-[#f59e0b]/10 text-[#b45309] dark:border-[#fbbf24] dark:bg-[#fbbf24]/15 dark:text-[#fbbf24]"
                    : "border-zinc-200 bg-transparent text-[#7a7a7a] hover:bg-zinc-50 dark:border-white/10 dark:text-[#cccccc] dark:hover:bg-zinc-800"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Belum Dibayar
              </button>
            </div>
          </div>

          {/* Tanggal Bayar (jika sudah dibayar) */}
          {isPaid && (
            <div>
              <Label className="text-xs">Tanggal Terakhir Bayar</Label>
              <button
                type="button"
                onClick={() => setIsPayDateExpanded(!isPayDateExpanded)}
                className="mt-1 flex h-10 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-[#1d1d1f] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-[#7a7a7a] dark:text-[#cccccc]" />
                  <span>{format(payDate, "d MMMM yyyy", { locale: id })}</span>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-[#7a7a7a] transition-transform", isPayDateExpanded && "rotate-180")} />
              </button>
              {isPayDateExpanded && (
                <div className="mt-2 flex justify-center rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
                  <Calendar
                    mode="single"
                    selected={payDate}
                    onSelect={(d) => d && handlePayDateChange(d)}
                    />
                </div>
              )}
            </div>
          )}

          {/* Tanggal Jatuh Tempo */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tanggal Jatuh Tempo</Label>
              <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                Tagihan ke-{dueDate.getDate()}
              </span>
            </div>

            {/* Shortcut Chips */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleShortcut28}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut28
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +28 Hari
              </button>
              <button
                type="button"
                onClick={handleShortcut30}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut30
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +30 Hari
              </button>
              <button
                type="button"
                onClick={handleShortcut1Month}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut1Month
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +1 Bulan
              </button>
              <button
                type="button"
                onClick={handleShortcut1Year}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isShortcut1Year
                    ? "bg-[#0066cc] text-white dark:bg-[#2997ff]"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] dark:bg-[#2a2a2c] dark:text-white dark:hover:bg-[#343438]"
                )}
              >
                +1 Tahun
              </button>
            </div>

            {/* Date button + calendar */}
            <button
              type="button"
              onClick={() => setIsDueDateExpanded(!isDueDateExpanded)}
              className="mt-2 flex h-10 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-[#1d1d1f] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-[#7a7a7a] dark:text-[#cccccc]" />
                <span>{format(dueDate, "d MMMM yyyy", { locale: id })}</span>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-[#7a7a7a] transition-transform", isDueDateExpanded && "rotate-180")} />
            </button>
            {isDueDateExpanded && (
              <div className="mt-2 flex justify-center rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => {
                    if (d) {
                      setDueDate(d);
                      setIsDueDateExpanded(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
            Status dan tagihan langsung aktif tanpa membuat transaksi keuangan di masa lalu.
          </p>

          <DialogFooter className="pt-2">
            <Button
              onClick={submit}
              disabled={loading || !name.trim() || !price}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Simpan Langganan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}