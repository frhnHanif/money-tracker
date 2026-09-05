"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Home, List, BarChart3, Settings, Plus, Repeat } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transaksi", icon: List },
  { href: "/subscriptions", label: "Langganan", icon: Repeat },
  { href: "/statistics", label: "Statistik", icon: BarChart3 },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function BottomNav({ onAddClick }: { onAddClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center">
      {/* Floating Pill */}
      <nav className="pointer-events-auto mx-3 mb-5 flex w-[calc(100%-24px)] max-w-lg items-center rounded-full border border-[#e0e0e0] bg-white/90 px-1 py-2 backdrop-blur-lg dark:border-white/10 dark:bg-[#1d1d1f]/90">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-colors",
                isActive
                  ? "text-[#0066cc] dark:text-[#2997ff]"
                  : "text-[#7a7a7a] hover:text-[#333333] dark:text-[#cccccc] dark:hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute inset-x-1 inset-y-0 rounded-full bg-[#0066cc]/10 dark:bg-[#2997ff]/15" />
              )}
              <item.icon className="relative h-5 w-5" />
              <span className="relative text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Floating Action Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onAddClick?.();
        }}
        className="pointer-events-auto absolute bottom-[96px] right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0066cc] text-white transition-transform active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
