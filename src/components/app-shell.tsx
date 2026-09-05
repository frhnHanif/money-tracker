"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { NotificationBell } from "@/components/notification-bell";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi! ☀️";
  if (hour < 15) return "Selamat siang! 🌤️";
  if (hour < 18) return "Selamat sore! 🌅";
  return "Selamat malam! 🌙";
}

const pageTitles: Record<string, string> = {
  "/transactions": "Transaksi",
  "/statistics": "Statistik",
  "/piutang": "Piutang",
  "/subscriptions": "Langganan",
  "/settings": "Pengaturan",
  "/settings/accounts": "Akun & Rekening",
  "/settings/categories": "Kategori",
  "/settings/budgets": "Budget Bulanan",
  "/settings/import": "Import CSV",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  // Open the add-transaction sheet from anywhere (e.g. empty states)
  useEffect(() => {
    const openAdd = () => setAddOpen(true);
    window.addEventListener("money-tracker:open-add", openAdd);
    return () =>
      window.removeEventListener("money-tracker:open-add", openAdd);
  }, []);

  const isHome = pathname === "/";
  const title = pageTitles[pathname] || "";

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (res.status === 401) {
        router.push("/login");
        return [];
      }
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#000000]">
        <p className="text-[#7a7a7a]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 dark:bg-[#000000]">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#000000]">
        <div className="mx-auto max-w-lg px-5">
          {isHome ? (
            /* Home: Avatar + greeting + bell — thicker */
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0066cc]/10 text-xl font-semibold text-[#0066cc] dark:bg-[#2997ff]/15 dark:text-[#2997ff]">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                    {getGreeting()}
                  </p>
                  <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
                    {session?.user?.name || "User"}
                  </p>
                </div>
              </div>
              <NotificationBell />
            </div>
          ) : (
            /* Other pages: Back arrow + title + bell */
            <div className="flex items-center justify-between py-5">
              <button
                onClick={() => router.back()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#333333] ring-1 ring-[#e0e0e0] dark:bg-[#2a2a2c] dark:text-white dark:ring-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-[#1d1d1f] dark:text-white">
                {title}
              </h1>
              <NotificationBell />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5">{children}</main>

      <BottomNav onAddClick={() => setAddOpen(true)} />

      <AddTransactionSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={accounts}
        categories={categories}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
