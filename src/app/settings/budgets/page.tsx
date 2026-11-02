"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BudgetEditDialog } from "@/components/budget-edit-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useBudgetSettings } from "@/hooks/use-budget-settings";
import {
  Trash2,
  Target,
  Home,
  Shield,
  Sparkles,
  HeartHandshake,
  Pencil,
  Power,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

interface CategoryLike {
  id: number;
  name: string;
  type: string;
  color: string;
  pocket?: "living" | "saving" | "playing" | "giving" | "none";
}

interface BudgetLike {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryPocket?: string | null;
  amount: number;
}

const POCKET_METADATA: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  living: {
    label: "Living",
    icon: Home,
    color: "#3b82f6",
  },
  saving: {
    label: "Saving",
    icon: Shield,
    color: "#10b981",
  },
  playing: {
    label: "Playing",
    icon: Sparkles,
    color: "#f59e0b",
  },
  giving: {
    label: "Giving",
    icon: HeartHandshake,
    color: "#8b5cf6",
  },
  none: {
    label: "Lainnya",
    icon: Target,
    color: "#6b7280",
  },
};

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; categoryName?: string | null } | null>(null);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);

  const {
    isBudgetingEnabled,
    setBudgetingEnabled,
    monthlySalary,
    setSalary,
    mounted,
  } = useBudgetSettings();

  const [tempSalary, setTempSalary] = useState(String(monthlySalary));

  const { data: categories = [] } = useQuery<CategoryLike[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const { data: budgets = [] } = useQuery<BudgetLike[]>({
    queryKey: ["budgets"],
    queryFn: () => fetch("/api/budgets").then((r) => r.json()),
  });

  const budgetMap = useMemo(
    () =>
      Object.fromEntries(
        budgets.map((b) => [b.categoryId, b])
      ),
    [budgets]
  );

  const saveBudget = useMutation({
    mutationFn: async ({
      categoryId,
      amount,
      pocket,
    }: {
      categoryId: number;
      amount: number;
      pocket: "living" | "saving" | "playing" | "giving" | "none";
    }) => {
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount }),
      });
      await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pocket }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["four-pockets"] });
      toast.success("Budget dan kantong disimpan");
    },
  });

  const deleteBudget = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/budgets/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["four-pockets"] });
      toast.success("Budget dihapus");
    },
  });

  const expenseCats = categories.filter(
    (c) => c.type === "expense" || c.type === "both"
  );

  // Group categories by pocket
  const groupedCategories = useMemo(() => {
    const order: ("living" | "saving" | "playing" | "giving" | "none")[] = [
      "living",
      "saving",
      "playing",
      "giving",
      "none",
    ];

    return order
      .map((pocketKey) => {
        const cats = expenseCats.filter((c) => (c.pocket || "none") === pocketKey);
        const subtotal = cats.reduce((sum, c) => sum + (budgetMap[c.id]?.amount || 0), 0);
        return {
          pocketKey,
          meta: POCKET_METADATA[pocketKey],
          cats,
          subtotal,
        };
      })
      .filter((group) => group.cats.length > 0);
  }, [expenseCats, budgetMap]);

  const totalAllBudgets = useMemo(() => {
    return Object.values(budgetMap).reduce((acc: number, b) => acc + ((b as BudgetLike)?.amount || 0), 0);
  }, [budgetMap]);

  const handleToggleBudgeting = () => {
    const next = !isBudgetingEnabled;
    setBudgetingEnabled(next);
    toast.success(next ? "Fitur budgeting diaktifkan" : "Fitur budgeting dinonaktifkan");
  };

  const handleSaveSalary = () => {
    const parsed = parseInt(tempSalary.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSalary(parsed);
      setSalaryDialogOpen(false);
      toast.success("Informasi gaji diperbarui");
    }
  };

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="space-y-6 pb-6">
        {/* Header & Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1d1d1f] dark:text-white">
              4-Pockets Budgeting
            </h2>
            <p className="mt-1 text-sm text-[#7a7a7a] dark:text-[#cccccc]">
              Atur batas pengeluaran bulanan per kategori. Anggaran otomatis dikelompokkan ke 4-Pockets.
            </p>
          </div>

          <button
            onClick={handleToggleBudgeting}
            type="button"
            aria-label="Toggle Fitur Budgeting"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              isBudgetingEnabled ? "bg-[#0066cc]" : "bg-[#e0e0e0] dark:bg-[#3a3a3c]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                isBudgetingEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Inactive State Banner */}
        {!isBudgetingEnabled && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-5 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
            <Power className="mx-auto h-7 w-7 text-zinc-400" />
            <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Budgeting Sedang Nonaktif
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Pengeluaran Anda tidak akan dibatasi dan widget budget di halaman Statistik disembunyikan.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleBudgeting}
              className="mt-3.5"
            >
              Aktifkan Budgeting
            </Button>
          </div>
        )}

        {/* Active Budgeting Content */}
        {isBudgetingEnabled && (
          <>
            {/* Gaji & Total Budget Card */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#202022]">
              {/* Row 1: Informasi Gaji */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Banknote className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Informasi Gaji Bulanan
                    </span>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(monthlySalary)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTempSalary(String(monthlySalary));
                    setSalaryDialogOpen(true);
                  }}
                  className="h-7 gap-1 px-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <Pencil className="h-3 w-3" />
                  Ubah
                </Button>
              </div>

              {/* Row 2: Total Budget */}
              <div className="pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#7a7a7a] dark:text-[#cccccc]">
                    Total Budget Terencana
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {monthlySalary > 0
                      ? `${((totalAllBudgets / monthlySalary) * 100).toFixed(0)}% dari Gaji`
                      : ""}
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">
                  {formatCurrency(totalAllBudgets)}
                </p>
              </div>

              {/* Row 3: Adaptive Pocket Percentage Grid */}
              <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {groupedCategories
                  .filter((g) => g.pocketKey !== "none")
                  .map((g) => {
                    // Adaptive calculation based on total allocated budget
                    const ratio = totalAllBudgets > 0 ? ((g.subtotal / totalAllBudgets) * 100).toFixed(1) : "0";
                    return (
                      <div key={g.pocketKey} className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900/60">
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 capitalize">
                          {g.pocketKey} ({ratio}%)
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(g.subtotal)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Grouped Pockets List */}
            <div className="space-y-5">
              {groupedCategories.map(({ pocketKey, meta, cats, subtotal }) => {
                const Icon = meta.icon;
                return (
                  <div key={pocketKey} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex size-6 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                            {meta.label}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        Subtotal {formatCurrency(subtotal)}
                      </span>
                    </div>

                    <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80 dark:divide-white/10 dark:bg-[#202022] dark:ring-zinc-800">
                      {cats.map((cat) => {
                        const b = budgetMap[cat.id];
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between gap-2 px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                                  {cat.name}
                                </p>
                                {b ? (
                                  <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                                    {formatCurrency(b.amount)}/bulan
                                  </p>
                                ) : (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Belum ada budget
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <BudgetEditDialog
                                cat={cat}
                                current={b?.amount || 0}
                                currentPocket={cat.pocket}
                                onSave={(amount, pocket) =>
                                  saveBudget.mutate({ categoryId: cat.id, amount, pocket })
                                }
                              />
                              {b && (
                                <button
                                  onClick={() => setDeleteTarget(b)}
                                  aria-label="Hapus budget"
                                  className="flex h-8 w-8 items-center justify-center rounded text-[#7a7a7a] hover:text-red-500 dark:text-[#cccccc] dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {expenseCats.length === 0 && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-800">
                  <Target className="h-8 w-8 text-zinc-400" />
                  <p className="text-sm text-zinc-500">
                    Belum ada kategori pengeluaran aktif
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Salary Edit Dialog */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Ubah Informasi Gaji</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="salary-input">Gaji Pokok / Pemasukan Bersih Bulanan</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-500">Rp</span>
                <Input
                  id="salary-input"
                  type="number"
                  value={tempSalary}
                  onChange={(e) => setTempSalary(e.target.value)}
                  placeholder="8780000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSalary} className="w-full">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus budget ${deleteTarget?.categoryName || ""}?`}
        description="Kategori ini tidak lagi dipantau budgetnya di sistem."
        onConfirm={() => {
          if (deleteTarget) deleteBudget.mutate(deleteTarget.id);
        }}
      />
    </AppShell>
  );
}
