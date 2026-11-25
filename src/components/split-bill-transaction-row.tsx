"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type {
  SplitBillGroupItem,
  SplitBillSettlementGroupItem,
  SplitBillStatus,
  TxRow,
} from "@/lib/split-bill-grouping";
import {
  ChevronDown,
  HandCoins,
  MoreHorizontal,
  Users,
} from "lucide-react";

function getStatusConfig(status: SplitBillStatus): {
  label: string;
  className: string;
} {
  if (status === "settled") {
    return {
      label: "Lunas",
      className:
        "bg-[#16a34a]/15 text-[#16a34a] dark:bg-[#4ade80]/15 dark:text-[#4ade80]",
    };
  }
  if (status === "partial") {
    return {
      label: "Sebagian lunas",
      className:
        "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
    };
  }
  return {
    label: "Belum lunas",
    className:
      "bg-[#7a7a7a]/15 text-[#7a7a7a] dark:bg-white/10 dark:text-[#cccccc]",
  };
}

export function SplitBillGroupRow({
  item,
  onOpenMenu,
}: {
  item: SplitBillGroupItem;
  onOpenMenu: (tx: TxRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getStatusConfig(item.splitStatus);
  const friendCount = item.friends.length;

  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        expanded
          ? "bg-[#f5f5f7]/80 ring-1 ring-[#e8e8ed] dark:bg-[#242426] dark:ring-white/10"
          : "hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className="flex items-start justify-between gap-2 p-3 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#f59e0b20" }}
          >
            <Users className="h-4 w-4 text-amber-500" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                {item.eventTitle}
              </p>
              <Badge
                className="shrink-0 px-1.5 py-0 text-[10px] leading-5"
                style={{
                  backgroundColor: "#f59e0b20",
                  color: "#f59e0b",
                  borderColor: "transparent",
                }}
              >
                Split Bill
              </Badge>
            </div>

            <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              {item.accountName || "Akun"}
              {friendCount > 0 ? ` · ${friendCount} teman ditalangi` : ""}
              {item.splitStatus !== "open" && (
                <span
                  className={cn(
                    "ml-1.5 font-medium",
                    item.splitStatus === "settled"
                      ? "text-[#16a34a] dark:text-[#4ade80]"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  · {statusCfg.label}
                </span>
              )}
            </p>

            <p className="mt-0.5 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              Total dibayar {formatCurrency(item.totalPaid)} · Piutang{" "}
              {formatCurrency(item.talanganAmount)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pl-2 pt-0.5">
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-semibold",
                item.personalAmount > 0
                  ? "text-red-500 dark:text-red-400"
                  : "text-[#7a7a7a] dark:text-[#cccccc]"
              )}
            >
              {item.personalAmount > 0
                ? `-${formatCurrency(item.personalAmount)}`
                : formatCurrency(0)}
            </p>
            <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
              Porsi saya
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc] transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#e8e8ed] px-3 pb-3 pt-2.5 text-xs dark:border-white/10 space-y-2.5">
          {/* Metadata pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.categoryName && (
              <Badge
                className="px-1.5 py-0 text-[10px] leading-5"
                style={{
                  backgroundColor: (item.categoryColor || "#6b7280") + "20",
                  color: item.categoryColor || "#6b7280",
                  borderColor: "transparent",
                }}
              >
                {item.categoryName}
              </Badge>
            )}
            {item.accountName && (
              <Badge
                className="px-1.5 py-0 text-[10px] leading-5"
                style={{
                  backgroundColor: (item.accountColor || "#6b7280") + "20",
                  color: item.accountColor || "#6b7280",
                  borderColor: "transparent",
                }}
              >
                {item.accountName}
              </Badge>
            )}
            <Badge
              className={cn(
                "border-transparent px-1.5 py-0 text-[10px] leading-5",
                statusCfg.className
              )}
            >
              {statusCfg.label}
            </Badge>
          </div>

          {/* Breakdown lines */}
          <div className="space-y-1.5 rounded-md bg-white/80 p-2.5 dark:bg-[#1c1c1e]">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[#1d1d1f] dark:text-white font-medium">
                  Porsi pribadi
                </span>
                {item.categoryName && (
                  <span className="ml-1 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                    ({item.categoryName})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-medium text-[#1d1d1f] dark:text-white">
                  {formatCurrency(item.personalAmount)}
                </span>
                {item.personalTx && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMenu(item.personalTx!);
                    }}
                    aria-label="Opsi transaksi porsi pribadi"
                    title="Edit atau hapus transaksi porsi pribadi"
                    className="rounded p-0.5 text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {item.friends.map((f) => {
              const isFriendSettled =
                f.status === "settled" || f.settledSum >= f.amount;
              const isFriendPartial = !isFriendSettled && f.settledSum > 0;
              return (
                <div
                  key={f.dueId}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="truncate text-[#7a7a7a] dark:text-[#cccccc]">
                      Talangan {f.person}
                    </span>
                    {isFriendSettled && (
                      <span className="text-[10px] font-medium text-[#16a34a] dark:text-[#4ade80]">
                        (Lunas)
                      </span>
                    )}
                    {isFriendPartial && (
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        (Dibayar {formatCurrency(f.settledSum)})
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-medium text-[#1d1d1f] dark:text-white">
                    {formatCurrency(f.amount)}
                  </span>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-2 border-t border-[#f0f0f0] pt-1.5 font-semibold dark:border-white/10">
              <span className="text-[#1d1d1f] dark:text-white">
                Total pembayaran{item.accountName ? ` (${item.accountName})` : ""}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[#1d1d1f] dark:text-white">
                  {formatCurrency(item.totalPaid)}
                </span>
                {item.talanganTx && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMenu(item.talanganTx!);
                    }}
                    aria-label="Opsi transaksi talangan"
                    title="Edit atau hapus transaksi talangan"
                    className="rounded p-0.5 text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {item.notes && (
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              Catatan: {item.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SplitBillSettlementGroupRow({
  item,
  onOpenMenu,
}: {
  item: SplitBillSettlementGroupItem;
  onOpenMenu: (tx: TxRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getStatusConfig(item.splitStatus);

  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        expanded
          ? "bg-[#f5f5f7]/80 ring-1 ring-[#e8e8ed] dark:bg-[#242426] dark:ring-white/10"
          : "hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className="flex items-start justify-between gap-2 p-3 cursor-pointer select-none"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16a34a]/15 dark:bg-[#4ade80]/15">
            <HandCoins className="h-4 w-4 text-[#16a34a] dark:text-[#4ade80]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                {item.eventTitle} · Pelunasan
              </p>
              <Badge
                className={cn(
                  "shrink-0 border-transparent px-1.5 py-0 text-[10px] leading-5",
                  statusCfg.className
                )}
              >
                {statusCfg.label}
              </Badge>
            </div>

            <p className="mt-0.5 text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              {item.accountNames.length > 0
                ? `${item.accountNames.join(", ")} · `
                : ""}
              {item.uniqueFriendCount} teman telah melunasi
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pl-2 pt-0.5">
          <div className="text-right">
            <p className="text-sm font-semibold text-[#16a34a] dark:text-[#4ade80]">
              +{formatCurrency(item.totalSettledAmount)}
            </p>
            <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
              Pelunasan
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#7a7a7a] dark:text-[#cccccc] transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#e8e8ed] px-3 pb-3 pt-2.5 text-xs dark:border-white/10 space-y-2">
          <div className="space-y-1.5 rounded-md bg-white/80 p-2.5 dark:bg-[#1c1c1e]">
            {item.items.map((entry) => (
              <div
                key={entry.tx.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-medium text-[#1d1d1f] dark:text-white">
                    {entry.person}
                  </span>
                  <span className="ml-1.5 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                    {entry.accountName ? `${entry.accountName} · ` : ""}
                    {entry.date ? formatDate(entry.date, "short") : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-medium text-[#16a34a] dark:text-[#4ade80]">
                    +{formatCurrency(entry.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMenu(entry.tx);
                    }}
                    aria-label={`Opsi transaksi pelunasan ${entry.person}`}
                    title="Edit atau hapus pelunasan ini"
                    className="rounded p-0.5 text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-[#2a2a2c] dark:hover:text-white"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-2 border-t border-[#f0f0f0] pt-1.5 font-semibold dark:border-white/10">
              <span className="text-[#1d1d1f] dark:text-white">
                Total pelunasan
              </span>
              <span className="text-[#16a34a] dark:text-[#4ade80]">
                +{formatCurrency(item.totalSettledAmount)}
              </span>
            </div>
          </div>

          {item.totalReceivable > 0 && (
            <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
              Progres piutang Split Bill: {formatCurrency(item.totalSettledOverall)} /{" "}
              {formatCurrency(item.totalReceivable)} ({statusCfg.label})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
