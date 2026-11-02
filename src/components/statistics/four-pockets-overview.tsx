"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { useBudgetSettings } from "@/hooks/use-budget-settings";
import {
  Home,
  Shield,
  Sparkles,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CategoryDetail {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  budget: number;
  spent: number;
  isArchived?: boolean;
}

interface PocketSummary {
  pocket: "living" | "saving" | "playing" | "giving";
  name: string;
  targetBudget: number;
  spent: number;
  remaining: number;
  percentage: number;
  budgetRatio?: number;
  categories: CategoryDetail[];
}

interface FourPocketsResponse {
  month: number;
  year: number;
  totalTarget: number;
  totalSpent: number;
  monthIncome?: number;
  pockets: PocketSummary[];
}

const POCKET_UI_MAP = {
  living: {
    title: "Living",
    icon: Home,
    color: "#3b82f6",
    bgClass: "bg-blue-500",
  },
  saving: {
    title: "Saving",
    icon: Shield,
    color: "#10b981",
    bgClass: "bg-emerald-500",
  },
  playing: {
    title: "Playing",
    icon: Sparkles,
    color: "#f59e0b",
    bgClass: "bg-amber-500",
  },
  giving: {
    title: "Giving",
    icon: HeartHandshake,
    color: "#8b5cf6",
    bgClass: "bg-purple-500",
  },
};

export function FourPocketsOverview({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const [expandedPocket, setExpandedPocket] = useState<string | null>(null);
  const { isBudgetingEnabled, mounted } = useBudgetSettings();

  const { data, isLoading } = useQuery<FourPocketsResponse>({
    queryKey: ["four-pockets", month, year],
    queryFn: () =>
      fetch(`/api/statistics/four-pockets?month=${month}&year=${year}`).then(
        (r) => r.json()
      ),
    staleTime: 30 * 1000,
    enabled: isBudgetingEnabled,
  });

  if (!mounted || !isBudgetingEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#202022]">
        <div className="h-4 w-44 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  const pockets = data?.pockets || [];
  const totalTarget = data?.totalTarget || 0;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#202022]">
      <h3 className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
        4-Pockets Budgeting
      </h3>

      <div className="space-y-2.5">
        {pockets.map((p) => {
          const ui = POCKET_UI_MAP[p.pocket] || POCKET_UI_MAP.living;
          const Icon = ui.icon;
          const isOver = p.pocket !== "saving" && p.spent > p.targetBudget && p.targetBudget > 0;
          const isExpanded = expandedPocket === p.pocket;
          const pct = Math.min(Math.round((p.spent / (p.targetBudget || 1)) * 100), 100);

          // Adaptive pocket ratio based on total planned budget
          const ratio =
            p.budgetRatio !== undefined && p.budgetRatio > 0
              ? p.budgetRatio
              : totalTarget > 0
              ? Number(((p.targetBudget / totalTarget) * 100).toFixed(1))
              : 0;

          return (
            <div
              key={p.pocket}
              className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3 transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/50"
            >
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() =>
                  setExpandedPocket(isExpanded ? null : p.pocket)
                }
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${ui.color}18`, color: ui.color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {ui.title}
                      </p>
                      <span className="text-[10px] text-zinc-400">({ratio}%)</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatCurrency(p.spent)} dari {formatCurrency(p.targetBudget)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${
                      isOver
                        ? "text-red-500 dark:text-red-400"
                        : p.pocket === "saving" && p.spent >= p.targetBudget
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {p.percentage}%
                  </span>
                  {p.categories.length > 0 && (
                    <button
                      type="button"
                      aria-label="Toggle subcategories"
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOver ? "bg-red-500" : ui.bgClass
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Subcategories drilldown */}
              {isExpanded && p.categories.length > 0 && (
                <div className="mt-3 divide-y divide-zinc-200/50 border-t border-zinc-200/60 pt-2 dark:divide-zinc-800/50 dark:border-zinc-800">
                  {p.categories.map((c) => {
                    const catOver = c.budget > 0 && c.spent > c.budget;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-1.5 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: c.color || "#6b7280" }}
                          />
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {c.name}
                            {c.isArchived && (
                              <span className="ml-1 text-[9px] text-zinc-400 font-normal">
                                (Diarsipkan)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-semibold ${
                              catOver ? "text-red-500" : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {formatCurrency(c.spent)}
                          </span>
                          {c.budget > 0 && (
                            <span className="text-zinc-400">
                              {" "}
                              / {formatCurrency(c.budget)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
