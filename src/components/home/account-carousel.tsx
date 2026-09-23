"use client";

import {
  Wallet,
  Banknote,
  Landmark,
  Smartphone,
  ShoppingBag,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  banknote: Banknote,
  landmark: Landmark,
  smartphone: Smartphone,
  wallet: Wallet,
  "shopping-bag": ShoppingBag,
};

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

export function AccountCarousel({
  accounts,
  balances,
  showBalance,
  onToggleBalance,
  isLoading = false,
}: {
  accounts: AccountLike[];
  balances: Record<number, AccountBalance>;
  showBalance: boolean;
  onToggleBalance: () => void;
  isLoading?: boolean;
}) {
  const totalBalance = accounts.reduce(
    (sum, a) => sum + (balances[a.id]?.balance ?? 0),
    0
  );
  const totalMonthNet = accounts.reduce(
    (sum, a) => sum + (balances[a.id]?.monthNet ?? 0),
    0
  );

  const hasLoadedBalances = Object.keys(balances).length > 0;
  const isGlobalLoading = isLoading || (!hasLoadedBalances && accounts.length > 0);

  if (isLoading && accounts.length === 0) {
    return (
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex h-40 w-[78%] max-w-[300px] shrink-0 snap-center flex-col justify-between rounded-lg p-5 bg-[#f5f5f7] dark:bg-[#2a2a2c] ring-1 ring-[#f0f0f0] dark:ring-white/10"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                <div className="h-2.5 w-14 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-7 w-32 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
              <div className="h-3 w-20 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const renderCard = (
    key: string | number,
    name: string,
    typeLabel: string,
    icon: string,
    color: string,
    balance: number,
    monthNet: number,
    isTotal: boolean,
    cardLoading: boolean = false
  ) => {
    const Icon = iconMap[icon] || Wallet;
    const netText =
      monthNet >= 0
        ? `+${formatCurrency(monthNet)}`
        : `-${formatCurrency(Math.abs(monthNet))}`;
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={onToggleBalance}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleBalance();
          }
        }}
        className="relative flex h-40 w-[78%] max-w-[300px] shrink-0 snap-center flex-col justify-between rounded-lg p-5 ring-1 ring-[#f0f0f0] transition-transform active:scale-[0.98] dark:ring-white/10"
        style={{ backgroundColor: color + "10" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: color + "20" }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-[#1d1d1f] dark:text-white">
                {name}
              </p>
              <p className="text-[10px] text-[#7a7a7a] dark:text-[#cccccc]">
                {typeLabel}
              </p>
            </div>
          </div>
          {isTotal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBalance();
              }}
              aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#7a7a7a] hover:bg-black/5 dark:text-[#cccccc] dark:hover:bg-white/10"
            >
              {showBalance ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {cardLoading ? (
          <div className="space-y-2 py-1">
            <div className="h-7 w-32 rounded-md bg-black/10 dark:bg-white/10 animate-pulse" />
            <div className="h-3 w-20 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          </div>
        ) : (
          <div>
            <p
              className={`text-2xl font-semibold tracking-[-0.28px] ${
                balance >= 0
                  ? "text-[#1d1d1f] dark:text-white"
                  : "text-red-500"
              }`}
            >
              {showBalance ? formatCurrency(balance) : "••••••"}
            </p>
            <p
              className={`mt-0.5 text-[11px] font-medium ${
                monthNet >= 0
                  ? "text-[#16a34a] dark:text-[#4ade80]"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {showBalance ? `Bulan ini ${netText}` : "••••"}
            </p>
            {showBalance && balance < 0 && (
              <p className="mt-1 text-[10px] font-medium text-red-500">
                Saldo minus — kemungkinan ada salah input
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
      {renderCard(
        "total",
        "Semua Akun",
        `${accounts.length} akun`,
        "wallet",
        "#0066cc",
        totalBalance,
        totalMonthNet,
        true,
        isGlobalLoading
      )}
      {accounts.map((account) =>
        renderCard(
          account.id,
          account.name,
          account.type === "cash"
            ? "Cash"
            : account.type === "ewallet"
              ? "E-Wallet"
              : "Bank",
          account.icon,
          account.color,
          balances[account.id]?.balance ?? 0,
          balances[account.id]?.monthNet ?? 0,
          false,
          isLoading || balances[account.id] === undefined
        )
      )}
    </div>
  );
}