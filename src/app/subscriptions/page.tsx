"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { formatCurrency, formatInputCurrency } from "@/lib/utils";
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
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";

interface AccountLike {
  id: number;
  name: string;
}

const fmtDate = (d: Date) => format(d, "dd MMM");

const dueLabel = (sub: SubscriptionLike) => {
  if (sub.status === "inactive") return null;
  const paid = isPaidThisCycle(sub);
  const due = nextDue(sub);
  const days = daysUntil(sub);
  if (paid) {
    return {
      tone: "paid" as const,
      text: `✓ Dibayar ${fmtDate(new Date(sub.lastPaidAt!))} • Jatuh tempo ${fmtDate(due)}`,
    };
  }
  if (days < 0) {
    return {
      tone: "overdue" as const,
      text: `Lewat ${Math.abs(days)} hari — jatuh tempo ${fmtDate(due)}`,
    };
  }
  if (days <= 7) {
    return {
      tone: "soon" as const,
      text: `Jatuh tempo dalam ${days} hari (${fmtDate(due)})`,
    };
  }
  return {
    tone: "ok" as const,
    text: `Jatuh tempo ${fmtDate(due)}`,
  };
};

type Tab = "all" | "active" | "inactive";

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [payTarget, setPayTarget] = useState<SubscriptionLike | null>(null);
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
    return d >= 0 && d <= 7;
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
              minggu ini
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
                  className="rounded-lg bg-white p-4 ring-1 ring-[#f0f0f0] dark:bg-[#272729] dark:ring-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                          {sub.name}
                        </p>
                        {sub.status === "active" ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 px-1.5 py-0 text-[10px] leading-5 text-[#16a34a] dark:text-[#4ade80]"
                          >
                            Aktif
                          </Badge>
                        ) : (
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
                        {sub.interval === "yearly" &&
                          ` • ${formatCurrency(Math.round(monthlyPrice(sub)))}/bln`}
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
                          {label.tone === "overdue" ? (
                            <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                          ) : label.tone === "paid" ? (
                            <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                          ) : null}
                          {label.text}
                        </p>
                      )}
                      {sub.status === "inactive" && (
                        <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                          Berhenti — aktifkan kembali kapan saja
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {sub.status === "active" && (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => setPayTarget(sub)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Tandai Dibayar
                        </Button>
                      )}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => toggleStatus(sub)}
                          aria-label={
                            sub.status === "active"
                              ? "Nonaktifkan"
                              : "Aktifkan kembali"
                          }
                          title={
                            sub.status === "active"
                              ? "Nonaktifkan"
                              : "Aktifkan kembali"
                          }
                          className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                        >
                          {sub.status === "active" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditTarget(sub)}
                          aria-label="Edit langganan"
                          className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(sub)}
                          aria-label="Hapus langganan"
                          className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:text-red-500 dark:text-[#cccccc] dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
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

      {payTarget && (
        <PayDialog
          sub={payTarget}
          accounts={accounts}
          onClose={() => setPayTarget(null)}
          onDone={() => {
            setPayTarget(null);
            invalidateAll();
          }}
        />
      )}

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

      <AddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          setAddOpen(false);
          invalidateAll();
        }}
      />

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

/* ---------- Pay dialog (creates expense transaction + marks paid) ---------- */
function PayDialog({
  sub,
  accounts,
  onClose,
  onDone,
}: {
  sub: SubscriptionLike;
  accounts: AccountLike[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!accountId || !date) return;
    setLoading(true);
    try {
      // Get or create the "Langganan" category
      const cats = await fetch("/api/categories").then((r) => r.json());
      let catId: number | null = null;
      const found = (cats as any[]).find(
        (c) => c.name.toLowerCase() === "langganan"
      );
      if (found) {
        catId = found.id;
      } else {
        const created = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Langganan",
            type: "expense",
            color: "#8b5cf6",
          }),
        }).then((r) => r.json());
        catId = created?.id ?? null;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          amount: sub.price,
          accountId: parseInt(accountId),
          categoryId: catId,
          description: sub.name,
          notes: `Pembayaran ${sub.name}`,
          date,
        }),
      });
      if (!res.ok) throw new Error("Gagal simpan transaksi");

      const patchRes = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastPaidAt: date }),
      });
      if (!patchRes.ok) throw new Error("Gagal update status");

      toast.success(`${sub.name} dibayar & tercatat`);
      onDone();
    } catch {
      toast.error("Gagal menyimpan pembayaran");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Tandai Dibayar — {sub.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              Nominal {formatCurrency(sub.price)}/{formatInterval(sub)}
            </p>
            <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              Transaksi pengeluaran akan dibuat otomatis
            </p>
          </div>
          <div>
            <Label>Akun pembayaran</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun" />
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
          <div>
            <Label>Tanggal bayar</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={loading || !accountId}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Simpan & Catat Pembayaran"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
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
  const [billingDay, setBillingDay] = useState(String(sub.billingDay));
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseInt(price.replace(/\D/g, ""), 10);
    const day = parseInt(billingDay, 10);
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
          billingDay: day >= 1 && day <= 31 ? day : 1,
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Langganan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Harga</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(formatInputCurrency(e.target.value))}
            />
          </div>
          <div>
            <Label>Interval</Label>
            <Select value={interval} onValueChange={(v) => setInterval(v as "monthly" | "yearly")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal tagihan (1-31)</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            />
          </div>
          <DialogFooter>
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
  const [billingDay, setBillingDay] = useState(String(new Date().getDate()));
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseInt(price.replace(/\D/g, ""), 10);
    const day = parseInt(billingDay, 10);
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
          billingDay: day >= 1 && day <= 31 ? day : 1,
        }),
      });
      if (!res.ok) throw new Error("Gagal");
      toast.success("Langganan ditambahkan");
      setName("");
      setPrice("");
      onDone();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Tambah Langganan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama layanan</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Spotify, Netflix, Canva..."
            />
          </div>
          <div>
            <Label>Harga</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(formatInputCurrency(e.target.value))}
              placeholder="Rp0"
            />
          </div>
          <div>
            <Label>Interval</Label>
            <Select value={interval} onValueChange={(v) => setInterval(v as "monthly" | "yearly")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal tagihan (1-31)</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            />
          </div>
          <DialogFooter>
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