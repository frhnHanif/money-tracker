"use client";

import { useState } from "react";
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
import { dueRemaining, type DueItem, type DueDirection } from "@/lib/dues";
import {
  HandCoins,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";

interface AccountLike {
  id: number;
  name: string;
}

interface CategoryLike {
  id: number;
  name: string;
}

const remaining = dueRemaining;

export default function PiutangPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DueDirection>("receivable");
  const [settleTarget, setSettleTarget] = useState<DueItem | null>(null);
  const [editTarget, setEditTarget] = useState<DueItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DueItem | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const { data: dues = [] } = useQuery<DueItem[]>({
    queryKey: ["dues"],
    queryFn: () => fetch("/api/dues").then((r) => r.json()),
  });

  const { data: accounts = [] } = useQuery<AccountLike[]>({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.json()),
  });

  const { data: categories = [] } = useQuery<CategoryLike[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const receivables = dues.filter((d) => d.direction === "receivable");
  const payables = dues.filter((d) => d.direction === "payable");
  const active = tab === "receivable" ? receivables : payables;

  const openSum = (list: DueItem[]) =>
    list.filter((d) => remaining(d) > 0).reduce((sum, d) => sum + remaining(d), 0);

  const groups = (() => {
    const map = new Map<string, { person: string; items: DueItem[] }>();
    for (const d of active) {
      const key = (d.person || "").trim().toLowerCase() || "?";
      if (!map.has(key)) map.set(key, { person: d.person, items: [] });
      map.get(key)!.items.push(d);
    }
    return [...map.values()].sort((a, b) => {
      const aOpen = a.items.some((i) => remaining(i) > 0) ? 1 : 0;
      const bOpen = b.items.some((i) => remaining(i) > 0) ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return (
        b.items.reduce((s, i) => s + remaining(i), 0) -
        a.items.reduce((s, i) => s + remaining(i), 0)
      );
    });
  })();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dues"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["trend"] });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTab("receivable")}
            className={`rounded-lg p-3 text-left transition-colors ${
              tab === "receivable"
                ? "bg-[#16a34a]/8 dark:bg-[#4ade80]/10"
                : "bg-[#f5f5f7] dark:bg-[#2a2a2c]"
            }`}
          >
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">Piutang</p>
            <p className="mt-1 text-base font-semibold text-[#1d1d1f] dark:text-white">
              {formatCurrency(openSum(receivables))}
            </p>
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              {receivables.filter((d) => remaining(d) > 0).length} orang
              menunggak
            </p>
          </button>
          <button
            onClick={() => setTab("payable")}
            className={`rounded-lg p-3 text-left transition-colors ${
              tab === "payable"
                ? "bg-red-50 dark:bg-red-950/30"
                : "bg-[#f5f5f7] dark:bg-[#2a2a2c]"
            }`}
          >
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">Utang</p>
            <p className="mt-1 text-base font-semibold text-[#1d1d1f] dark:text-white">
              {formatCurrency(openSum(payables))}
            </p>
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              {payables.filter((d) => remaining(d) > 0).length} orang
              berpiutang
            </p>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-[#f5f5f7] p-1 dark:bg-[#2a2a2c]">
          <button
            onClick={() => setTab("receivable")}
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === "receivable"
                ? "bg-white text-[#1d1d1f] dark:bg-[#3a3a3c] dark:text-white"
                : "text-[#7a7a7a] dark:text-[#cccccc]"
            }`}
          >
            Piutang
          </button>
          <button
            onClick={() => setTab("payable")}
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === "payable"
                ? "bg-white text-[#1d1d1f] dark:bg-[#3a3a3c] dark:text-white"
                : "text-[#7a7a7a] dark:text-[#cccccc]"
            }`}
          >
            Utang
          </button>
        </div>

        {/* List */}
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f7] dark:bg-[#2a2a2c]">
              {tab === "receivable" ? (
                <HandCoins className="h-7 w-7 text-[#7a7a7a] dark:text-[#cccccc]" />
              ) : (
                <Wallet className="h-7 w-7 text-[#7a7a7a] dark:text-[#cccccc]" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                {tab === "receivable"
                  ? "Belum ada piutang"
                  : "Belum ada utang"}
              </p>
              <p className="mt-1 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                {tab === "receivable"
                  ? "Catat saat kamu bayarin orang lain dulu"
                  : "Catat saat kamu pinjam atau dibayarin orang"}
              </p>
            </div>
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4" />
              Catat {tab === "receivable" ? "Piutang" : "Utang"} Manual
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.person.toLowerCase()}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                    {g.person}
                  </p>
                  <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                    {formatCurrency(
                      g.items.reduce((s, i) => s + remaining(i), 0)
                    )}{" "}
                    terbuka
                  </p>
                </div>
                <div className="overflow-hidden rounded-lg ring-1 ring-[#f0f0f0] dark:ring-white/10">
                  {g.items.map((d) => {
                    const rem = remaining(d);
                    const settled = rem <= 0;
                    return (
                      <div
                        key={d.id}
                        className={`flex items-center justify-between gap-2 border-b border-[#f0f0f0] px-3 py-3 last:border-0 dark:border-white/10 ${
                          settled ? "opacity-60" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                              {d.title || "Tagihan"}
                            </p>
                            {settled ? (
                              <Badge
                                variant="secondary"
                                className="shrink-0 px-1.5 py-0 text-[10px] leading-5 text-[#16a34a] dark:text-[#4ade80]"
                              >
                                <CheckCircle2 className="mr-0.5 h-3 w-3" />
                                Lunas
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="shrink-0 px-1.5 py-0 text-[10px] leading-5"
                              >
                                Sisa {formatCurrency(rem)}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                            {format(d.createdAt, "dd MMM yyyy")} •{" "}
                            {formatCurrency(d.amount)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!settled && (
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => setSettleTarget(d)}
                            >
                              <Handshake className="mr-1 h-3.5 w-3.5" />
                              {tab === "receivable" ? "Lunasi" : "Bayar"}
                            </Button>
                          )}
                          <button
                            onClick={() => setEditTarget(d)}
                            aria-label="Edit tagihan"
                            className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(d)}
                            aria-label="Hapus tagihan"
                            className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:text-red-500 dark:text-[#cccccc] dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setManualOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Catat {tab === "receivable" ? "Piutang" : "Utang"} Manual
            </Button>
          </div>
        )}
      </div>

      {settleTarget && (
        <SettleDialog
          due={settleTarget}
          defaultAmount={remaining(settleTarget)}
          accounts={accounts}
          categories={categories}
          onClose={() => setSettleTarget(null)}
          onDone={() => {
            setSettleTarget(null);
            invalidateAll();
          }}
        />
      )}

      {editTarget && (
        <EditDueDialog
          due={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => {
            setEditTarget(null);
            queryClient.invalidateQueries({ queryKey: ["dues"] });
          }}
        />
      )}

      <ManualDueDialog
        open={manualOpen}
        direction={tab}
        onOpenChange={setManualOpen}
        onDone={() => {
          setManualOpen(false);
          queryClient.invalidateQueries({ queryKey: ["dues"] });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus tagihan ${deleteTarget?.title || ""}?`}
        description="Transaksi asalnya tetap tersimpan, hanya catatan tagihan yang dihapus."
        onConfirm={() => {
          if (deleteTarget) {
            fetch(`/api/dues/${deleteTarget.id}`, { method: "DELETE" })
              .then(() => {
                toast.success("Tagihan dihapus");
                invalidateAll();
              })
              .catch(() => toast.error("Gagal menghapus"));
          }
        }}
      />
    </AppShell>
  );
}

/* ---------- Settle dialog ---------- */
function SettleDialog({
  due,
  defaultAmount,
  accounts,
  categories,
  onClose,
  onDone,
}: {
  due: DueItem;
  defaultAmount: number;
  accounts: AccountLike[];
  categories: CategoryLike[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0 || !accountId) return;
    setLoading(true);
    try {
      const talangan = categories.find(
        (c) => c.name.toLowerCase() === "talangan/piutang"
      );
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: due.direction === "receivable" ? "income" : "expense",
          amount: amt,
          accountId: parseInt(accountId),
          categoryId: talangan?.id ?? null,
          description: due.title || "Pelunasan",
          notes: due.person,
          date,
        }),
      });
      if (!res.ok) throw new Error("Gagal simpan transaksi");
      const tx = await res.json();

      const settleRes = await fetch(`/api/dues/${due.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, transactionId: tx.id }),
      });
      if (!settleRes.ok) throw new Error("Gagal menautkan pelunasan");

      toast.success("Transaksi & pelunasan tersimpan");
      onDone();
    } catch {
      toast.error("Gagal menyimpan pelunasan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {due.direction === "receivable" ? "Catat Pelunasan" : "Bayar Utang"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              {due.person} — {due.title || "Tagihan"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-white">
              Sisa {formatCurrency(defaultAmount)} dari {formatCurrency(due.amount)}
            </p>
          </div>
          <div>
            <Label>Nominal dibayar</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatInputCurrency(e.target.value))}
              className="h-12 text-center text-lg font-semibold"
            />
          </div>
          <div>
            <Label>Akun</Label>
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
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={loading || !amount || !accountId}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Simpan Pelunasan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Edit dialog ---------- */
function EditDueDialog({
  due,
  onClose,
  onDone,
}: {
  due: DueItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [person, setPerson] = useState(due.person);
  const [title, setTitle] = useState(due.title);
  const [amount, setAmount] = useState(String(due.amount));
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0 || !person.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dues/${due.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: person.trim(), title, amount: amt }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success("Tagihan diperbarui");
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
          <DialogTitle className="text-base">Edit Tagihan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama orang</Label>
            <Input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
          </div>
          <div>
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Nominal</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatInputCurrency(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={loading || !amount || !person.trim()}
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

/* ---------- Manual create dialog ---------- */
function ManualDueDialog({
  open,
  direction,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  direction: DueDirection;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [person, setPerson] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt <= 0 || !person.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          person: person.trim(),
          title,
          amount: amt,
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success("Tagihan dicatat");
      setPerson("");
      setTitle("");
      setAmount("");
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
          <DialogTitle className="text-base">
            Catat {direction === "receivable" ? "Piutang" : "Utang"} Manual
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama orang</Label>
            <Input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder={
                direction === "receivable"
                  ? "Orang yang utang ke kamu"
                  : "Orang yang kamu utangi"
              }
            />
          </div>
          <div>
            <Label>Judul (opsional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: makan bareng, pinjam..."
            />
          </div>
          <div>
            <Label>Nominal</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatInputCurrency(e.target.value))}
              placeholder="Rp0"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={loading || !amount || !person.trim()}
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