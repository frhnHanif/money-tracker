"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export function BudgetWidget({
  budget,
  spent,
}: {
  budget: number;
  spent: number;
}) {
  const over = spent > budget;
  const pct = Math.min((spent / budget) * 100, 100);
  const remaining = budget - spent;

  return (
    <Link href="/budget" className="block">
      <div className="rounded-lg bg-[#f5f5f7] p-4 dark:bg-[#2a2a2c]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
            Batas Bulan Ini
          </p>
          <p
            className={`text-xs font-semibold ${
              over
                ? "text-red-500 dark:text-red-400"
                : "text-[#16a34a] dark:text-[#4ade80]"
            }`}
          >
            {over
              ? `Melebihi ${formatCurrency(Math.abs(remaining))}`
              : `Sisa ${formatCurrency(remaining)}`}
          </p>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#e0e0e0] dark:bg-[#3a3a3c]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: over ? "#ef4444" : "#0066cc",
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
          {formatCurrency(spent)} dari {formatCurrency(budget)} terpakai
        </p>
      </div>
    </Link>
  );
}