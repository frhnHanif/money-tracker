"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Wrench,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface AccountLike {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface AccountBalance {
  balance: number;
  monthNet: number;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AccountLike | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: accounts = [] } = useQuery<AccountLike[]>({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.json()),
  });

  const { data: balances = {} } = useQuery<Record<number, AccountBalance>>({
    queryKey: ["balances"],
    queryFn: () => fetch("/api/accounts/balances").then((r) => r.json()),
  });

  const deleteAccount = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/accounts/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast.success("Akun dihapus");
    },
  });

  const reorderAccount = useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "up" | "down" }) =>
      fetch("/api/accounts/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["trend"] });
  };

  const typeLabel = (t: string) =>
    t === "cash" ? "Cash" : t === "ewallet" ? "E-Wallet" : "Bank";

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
            {accounts.length} akun • saldo terhitung otomatis
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </div>

        <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
          {accounts.map((account, idx) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-2 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: account.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                    {account.name}
                  </p>
                  <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                    {typeLabel(account.type)} •{" "}
                    {formatCurrency(balances[account.id]?.balance ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() =>
                    reorderAccount.mutate({ id: account.id, direction: "up" })
                  }
                  disabled={idx === 0 || reorderAccount.isPending}
                  aria-label="Naikkan urutan"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-30 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    reorderAccount.mutate({ id: account.id, direction: "down" })
                  }
                  disabled={idx === accounts.length - 1 || reorderAccount.isPending}
                  aria-label="Turunkan urutan"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-30 dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setAdjustTarget(account)}
                  aria-label="Perbaiki saldo"
                  title="Perbaiki saldo"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:bg-[#0066cc]/10 hover:text-[#0066cc] dark:text-[#cccccc] dark:hover:text-[#2997ff]"
                >
                  <Wrench className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(account)}
                  aria-label="Hapus akun"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:text-red-500 dark:text-[#cccccc] dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Wallet className="h-6 w-6 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
                Belum ada akun
              </p>
            </div>
          )}
        </div>

        <p className="text-xs leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
          Tip: gunakan tombol 🔧 untuk memperbaiki saldo tanpa membuat
          transaksi income/expense — cocok untuk selisih recap bulanan.
        </p>
      </div>

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />

      {adjustTarget && (
        <AdjustBalanceDialog
          account={adjustTarget}
          balance={balances[adjustTarget.id]?.balance ?? 0}
          onClose={() => setAdjustTarget(null)}
          onDone={() => {
            setAdjustTarget(null);
            invalidateAll();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus akun ${deleteTarget?.name}?`}
        description="Histori transaksi akun ini ikut terhapus dan tidak bisa dikembalikan."
        onConfirm={() => {
          if (deleteTarget) deleteAccount.mutate(deleteTarget.id);
        }}
      />
    </AppShell>
  );
}

/* ---------- Add account dialog ---------- */
function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [color, setColor] = useState("#0066cc");
  const [icon, setIcon] = useState("wallet");

  const mutation = useMutation({
    mutationFn: (data: { name: string; type: string; color: string; icon: string }) =>
      fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
      setName("");
      toast.success("Akun ditambahkan");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Tambah Akun</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Akun</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama akun"
            />
          </div>
          <div>
            <Label>Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="ewallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Warna</Label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => mutation.mutate({ name, type, color, icon })}
              disabled={!name}
              className="w-full"
            >
              Simpan
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Adjust balance dialog ---------- */
function AdjustBalanceDialog({
  account,
  balance,
  onClose,
  onDone,
}: {
  account: AccountLike;
  balance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [actual, setActual] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const actualNum = parseInt(actual.replace(/\D/g, ""), 10);
  const delta = (Number.isFinite(actualNum) ? actualNum : 0) - balance;
  const canSave = delta !== 0 && !!date;

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: delta > 0 ? "adjustment_in" : "adjustment_out",
          amount: Math.abs(delta),
          accountId: account.id,
          description: "Penyesuaian saldo",
          notes: `Recap saldo ke ${formatCurrency(actualNum)}`,
          date,
        }),
      });
      if (!res.ok) throw new Error("Gagal");
      toast.success("Saldo diperbaiki");
      onDone();
    } catch {
      toast.error("Gagal memperbaiki saldo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Perbaiki Saldo {account.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-[#f5f5f7] p-3 dark:bg-[#2a2a2c]">
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              Saldo terhitung (dari transaksi)
            </p>
            <p className="mt-0.5 text-lg font-semibold text-[#1d1d1f] dark:text-white">
              {formatCurrency(balance)}
            </p>
          </div>
          <div>
            <Label>Saldo sebenarnya</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={actual}
              onChange={(e) => setActual(formatInputCurrency(e.target.value))}
              placeholder="Rp0"
              className="h-12 text-center text-lg font-semibold"
            />
          </div>
          {delta !== 0 && (
            <p
              className={`text-sm font-medium ${
                delta > 0
                  ? "text-[#16a34a] dark:text-[#4ade80]"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {delta > 0
                ? `+${formatCurrency(delta)} akan ditambahkan ke saldo`
                : `${formatCurrency(Math.abs(delta))} akan dikurangi dari saldo`}
            </p>
          )}
          <div>
            <Label>Tanggal penyesuaian</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={loading || !canSave}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Perbaiki Saldo"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}