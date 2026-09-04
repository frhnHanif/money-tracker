"use client";

import { CheckCircle2 } from "lucide-react";

interface BreakdownItem {
  categoryName: string;
  categoryColor: string | null;
  total: number;
}

export function ActivityWidget({
  breakdown,
  daysTracked,
  daysInMonth,
  monthLabel,
}: {
  breakdown: BreakdownItem[];
  daysTracked: number;
  daysInMonth: number;
  monthLabel: string;
}) {
  if (breakdown.length === 0) return null;

  const top5 = breakdown.slice(0, 5);
  const restTotal = breakdown
    .slice(5)
    .reduce((s: number, i) => s + i.total, 0);
  const items =
    restTotal > 0
      ? [
          ...top5,
          { categoryName: "Lainnya", categoryColor: "#9ca3af", total: restTotal },
        ]
      : top5;
  const total = items.reduce((s, i) => s + i.total, 0);

  let acc = 0;
  const stops = items.map((i) => {
    const from = (acc / total) * 100;
    acc += i.total;
    const to = (acc / total) * 100;
    return `${i.categoryColor || "#9ca3af"} ${from.toFixed(1)}% ${to.toFixed(1)}%`;
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
          Aktivitas {monthLabel}
        </h3>
        <span className="flex items-center gap-1 text-[11px] font-medium text-[#16a34a] dark:text-[#4ade80]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Tercatat {daysTracked}/{daysInMonth} hari
        </span>
      </div>
      <div className="flex items-center gap-5 rounded-lg bg-[#f5f5f7] p-4 dark:bg-[#2a2a2c]">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops.join(", ")})` }}
        >
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white dark:bg-[#000000]">
            <div className="text-center">
              <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
                Top 5
              </p>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">
                {daysTracked}/{daysInMonth}
              </p>
              <p className="text-[9px] text-[#7a7a7a] dark:text-[#cccccc]">
                hari
              </p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {items.map((i) => (
            <div key={i.categoryName} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: i.categoryColor || "#9ca3af" }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-[#333333] dark:text-[#cccccc]">
                {i.categoryName}
              </span>
              <span className="shrink-0 text-xs font-semibold text-[#1d1d1f] dark:text-white">
                {Math.round((i.total / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}