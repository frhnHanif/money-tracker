"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BudgetEditDialog } from "@/components/budget-edit-dialog";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Target } from "lucide-react";
import { toast } from "sonner";

interface CategoryLike {
  id: number;
  name: string;
  type: string;
  color: string;
}

interface BudgetLike {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  amount: number;
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; categoryName?: string | null } | null>(null);

  const { data: categories = [] } = useQuery<CategoryLike[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const { data: budgets = [] } = useQuery<BudgetLike[]>({
    queryKey: ["budgets"],
    queryFn: () => fetch("/api/budgets").then((r) => r.json()),
  });

  const budgetMap = Object.fromEntries(
    budgets.map((b: { categoryId: number | null; amount: number; id: number }) => [
      b.categoryId,
      b,
    ])
  );

  const saveBudget = useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: number; amount: number }) =>
      fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget disimpan");
    },
  });

  const deleteBudget = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/budgets/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget dihapus");
    },
  });

  const expenseCats = categories.filter(
    (c: { type: string }) => c.type === "expense" || c.type === "both"
  );

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
          Batas pengeluaran per kategori setiap bulan. Progress terlihat di
          halaman Statistik dan Home.
        </p>

        <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
          {expenseCats.map((cat: { id: number; name: string; color: string }) => {
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
                    {b && (
                      <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                        {formatCurrency(b.amount)}/bulan
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <BudgetEditDialog
                    cat={cat}
                    current={b?.amount || 0}
                    onSave={(amount) =>
                      saveBudget.mutate({ categoryId: cat.id, amount })
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
          {expenseCats.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Target className="h-6 w-6 text-[#7a7a7a] dark:text-[#cccccc]" />
              <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
                Belum ada kategori pengeluaran
              </p>
            </div>
          )}
        </div>

        <Badge variant="secondary" className="text-[10px]">
          Tip: budget total bulanan (semua kategori) diatur lewat halaman Budget
          tab di bawah — untuk sekarang atur per kategori di sini.
        </Badge>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus budget ${deleteTarget?.categoryName || ""}?`}
        description="Kategori ini tidak lagi dipantau budgetnya."
        onConfirm={() => {
          if (deleteTarget) deleteBudget.mutate(deleteTarget.id);
        }}
      />
    </AppShell>
  );
}